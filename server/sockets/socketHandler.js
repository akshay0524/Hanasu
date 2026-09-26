const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Track active sockets per user ID: userId (string) -> Set<socketId>
const userSockets = new Map();
// Track which user a socket belongs to: socketId -> userId (string)
const socketToUser = new Map();

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

                // Broadcast to conversation room
                io.to(String(targetConversationId)).emit('receive_message', populatedMessage);

                // Also emit to all participants' user rooms (so unread counts update in sidebar)
                convDoc.participants.forEach((participantId) => {
                    const pidStr = String(participantId);
                    // Avoid duplicate if socket is already in conversation room
                    io.to(pidStr).emit('receive_message', populatedMessage);
                });
            } catch (error) {
                console.error('Error saving/sending message in socket:', error);
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
                    }
                }
            }
        });
    });
};

module.exports = socketHandler;
