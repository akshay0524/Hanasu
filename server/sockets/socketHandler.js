const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const ConversationReadState = require('../models/ConversationReadState');

// Track active sockets per user ID: userId (string) -> Set<socketId>
const userSockets = new Map();
// Track which user a socket belongs to: socketId -> userId (string)
const socketToUser = new Map();
// Track active voice calls: callId -> { callerId, calleeId, status }
const activeCalls = new Map();

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        // Join user room
        socket.on('join_room', async (rawUserId) => {
            if (!rawUserId) return;
            const userId = String(rawUserId);

            socket.join(userId);
            socket.userId = userId;
            socketToUser.set(socket.id, userId);

            if (!userSockets.has(userId)) {
                userSockets.set(userId, new Set());
            }
            const sockets = userSockets.get(userId);
            const wasOffline = sockets.size === 0;
            sockets.add(socket.id);

            // Update lastSeen in MongoDB
            try {
                await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
            } catch (err) {
                console.error('Error updating lastSeen:', err.message);
            }

            // If user transitioned from offline to online, broadcast
            if (wasOffline) {
                io.emit('user_status_change', { userId, status: 'online' });
            }

            // Send current list of online user IDs
            const onlineList = Array.from(userSockets.keys());
            socket.emit('online_users_list', onlineList);
        });

        // Request current online users list
        socket.on('get_online_users', () => {
            const onlineList = Array.from(userSockets.keys());
            socket.emit('online_users_list', onlineList);
        });

        // Join a specific conversation room (for group or direct)
        socket.on('join_conversation', (rawConvId) => {
            if (!rawConvId) return;
            const convId = String(rawConvId);
            socket.join(convId);
        });

        // Leave a conversation room
        socket.on('leave_conversation', (rawConvId) => {
            if (!rawConvId) return;
            const convId = String(rawConvId);
            socket.leave(convId);
        });

        // Send Message (supports both group with conversationId and direct with receiverId/conversationId)
        socket.on('send_message', async (data) => {
            const { senderId, receiverId, conversationId, content } = data;
            if (!senderId || !content || (!receiverId && !conversationId)) return;

            try {
                let targetConversationId = conversationId;
                let convDoc = null;

                if (targetConversationId) {
                    convDoc = await Conversation.findById(targetConversationId);
                } else if (receiverId) {
                    convDoc = await Conversation.getOrCreate(senderId, receiverId);
                    targetConversationId = convDoc._id;
                }

                if (!convDoc) {
                    console.error('send_message: conversation not found');
                    return;
                }

                // Verify sender is participant
                const isMember = convDoc.participants.some((p) => String(p) === String(senderId));
                if (!isMember) {
                    console.error(`send_message: user ${senderId} not a participant in ${targetConversationId}`);
                    return;
                }

                // Create message
                const msgPayload = {
                    sender: senderId,
                    conversation: targetConversationId,
                    content: content.trim(),
                    read: false,
                };
                if (receiverId) {
                    msgPayload.receiver = receiverId;
                }

                const createdMessage = await Message.create(msgPayload);

                // Update conversation's last message
                await Conversation.updateLastMessage(targetConversationId, createdMessage._id);

                const populatedMessage = await Message.findById(createdMessage._id)
                    .populate('sender', 'name userTag avatar')
                    .lean();

                // Broadcast to conversation room AND all participant user rooms in a single emit so Socket.IO deduplicates
                const targetRooms = Array.from(
                    new Set([
                        String(targetConversationId),
                        ...convDoc.participants.map((p) => String(p)),
                    ])
                );
                io.to(targetRooms).emit('receive_message', populatedMessage);
            } catch (error) {
                console.error('Error saving/sending message in socket:', error);
            }
        });

        // Real-time Read Receipts
        socket.on('mark_read', async (data) => {
            const { readerId, friendId, conversationId } = data || {};
            const rId = readerId || socket.userId;
            if (!rId) return;

            try {
                if (friendId) {
                    await Message.updateMany(
                        { sender: friendId, receiver: rId, read: false },
                        { $set: { read: true, readAt: new Date() } }
                    );

                    const conversation = await Conversation.findOne({
                        type: 'direct',
                        participants: { $all: [rId, friendId], $size: 2 },
                    });
                    if (conversation) {
                        await Message.updateMany(
                            { conversation: conversation._id, sender: friendId, read: false },
                            { $set: { read: true, readAt: new Date() } }
                        );
                        await ConversationReadState.findOneAndUpdate(
                            { user: rId, conversation: conversation._id },
                            { lastReadAt: new Date() },
                            { upsert: true }
                        );
                    }

                    // Notify sender in real time
                    io.to(String(friendId)).emit('messages_read', {
                        readerId: String(rId),
                        friendId: String(friendId),
                        readAt: new Date(),
                        conversationId: conversation ? String(conversation._id) : null,
                    });
                }

                if (conversationId) {
                    await ConversationReadState.findOneAndUpdate(
                        { user: rId, conversation: conversationId },
                        { lastReadAt: new Date() },
                        { upsert: true }
                    );
                    await Message.updateMany(
                        { conversation: conversationId, sender: { $ne: rId }, read: false },
                        { $set: { read: true, readAt: new Date() } }
                    );
                    io.to(String(conversationId)).emit('conversation_read', {
                        conversationId: String(conversationId),
                        readerId: String(rId),
                        lastReadAt: new Date(),
                    });
                    io.to(String(conversationId)).emit('messages_read', {
                        conversationId: String(conversationId),
                        readerId: String(rId),
                        readAt: new Date(),
                    });
                }
            } catch (err) {
                console.error('Error handling mark_read in socket:', err.message);
            }
        });

        // 1-on-1 Typing Indicators
        socket.on('typing', (data) => {
            const { receiverId, senderId } = data;
            if (receiverId) {
                io.to(String(receiverId)).emit('typing', { senderId });
            }
        });

        socket.on('stop_typing', (data) => {
            const { receiverId, senderId } = data;
            if (receiverId) {
                io.to(String(receiverId)).emit('stop_typing', { senderId });
            }
        });

        // Group Typing Indicators
        socket.on('group_typing', (data) => {
            const { conversationId, senderId, senderName } = data;
            if (conversationId) {
                socket.to(String(conversationId)).emit('group_typing', {
                    conversationId,
                    senderId,
                    senderName,
                });
            }
        });

        socket.on('group_stop_typing', (data) => {
            const { conversationId, senderId } = data;
            if (conversationId) {
                socket.to(String(conversationId)).emit('group_stop_typing', {
                    conversationId,
                    senderId,
                });
            }
        });

        // ─── VOICE CALL SIGNALING (WebRTC) ───────────────────────────────────────
        // All signaling is relayed; no audio goes through Socket.IO

        // Caller initiates a call
        socket.on('call:initiate', (data) => {
            const { calleeId, callerId, callerName, callerAvatar, callId } = data;
            if (!calleeId || !callerId || !callId) return;

            activeCalls.set(callId, {
                callerId: String(callerId),
                calleeId: String(calleeId),
                status: 'ringing',
            });

            // Notify callee
            io.to(String(calleeId)).emit('call:incoming', {
                callId,
                callerId: String(callerId),
                callerName,
                callerAvatar,
            });
        });

        // Callee accepts
        socket.on('call:accept', (data) => {
            const { callId, calleeId } = data;
            if (!callId) return;

            const call = activeCalls.get(callId);
            if (call) {
                call.status = 'connected';
                // Notify caller that callee accepted
                io.to(String(call.callerId)).emit('call:accepted', { callId, calleeId });
            }
        });

        // Callee rejects
        socket.on('call:reject', (data) => {
            const { callId } = data;
            if (!callId) return;

            const call = activeCalls.get(callId);
            if (call) {
                io.to(String(call.callerId)).emit('call:rejected', { callId });
                activeCalls.delete(callId);
            }
        });

        // Either side ends the call
        socket.on('call:end', (data) => {
            const { callId } = data;
            if (!callId) return;

            const call = activeCalls.get(callId);
            if (call) {
                // Notify both sides
                io.to(String(call.callerId)).emit('call:ended', { callId });
                io.to(String(call.calleeId)).emit('call:ended', { callId });
                activeCalls.delete(callId);
            }
        });

        // WebRTC SDP Offer
        socket.on('call:offer', (data) => {
            const { callId, offer, targetId } = data;
            if (!targetId || !offer) return;
            io.to(String(targetId)).emit('call:offer', { callId, offer });
        });

        // WebRTC SDP Answer
        socket.on('call:answer', (data) => {
            const { callId, answer, targetId } = data;
            if (!targetId || !answer) return;
            io.to(String(targetId)).emit('call:answer', { callId, answer });
        });

        // ICE Candidate relay
        socket.on('call:ice-candidate', (data) => {
            const { callId, candidate, targetId } = data;
            if (!targetId || !candidate) return;
            io.to(String(targetId)).emit('call:ice-candidate', { callId, candidate });
        });

        // Disconnect
        socket.on('disconnect', async () => {
            const userId = socketToUser.get(socket.id) || socket.userId;
            socketToUser.delete(socket.id);

            if (userId) {
                const sockets = userSockets.get(userId);
                if (sockets) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        userSockets.delete(userId);
                        io.emit('user_status_change', { userId, status: 'offline' });

                        try {
                            await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
                        } catch (err) {
                            console.error('Error updating lastSeen on disconnect:', err.message);
                        }

                        // End any active calls involving this user
                        for (const [callId, call] of activeCalls.entries()) {
                            if (call.callerId === userId || call.calleeId === userId) {
                                const otherId = call.callerId === userId ? call.calleeId : call.callerId;
                                io.to(String(otherId)).emit('call:ended', { callId, reason: 'disconnected' });
                                activeCalls.delete(callId);
                            }
                        }
                    }
                }
            }
        });
    });
};

module.exports = socketHandler;
