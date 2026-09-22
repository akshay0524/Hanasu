const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Track active sockets per user ID: userId (string) -> Set<socketId>
const userSockets = new Map();
// Track which user a socket belongs to: socketId -> userId (string)
const socketToUser = new Map();

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.id}`);

        // Join a room based on user ID
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

            // If user just transitioned from offline to online, broadcast to everyone
            if (wasOffline) {
                io.emit('user_status_change', { userId, status: 'online' });
            }

            // Immediately send current list of all online user IDs to the connected client
            const onlineList = Array.from(userSockets.keys());
            socket.emit('online_users_list', onlineList);

            console.log(`User ${userId} joined room (${sockets.size} active sockets). Total online users: ${onlineList.length}`);
        });

        // Request current online users list
        socket.on('get_online_users', () => {
            const onlineList = Array.from(userSockets.keys());
            socket.emit('online_users_list', onlineList);
        });

        // Send Message
        socket.on('send_message', async (data) => {
            const { senderId, receiverId, content } = data;
            if (!senderId || !receiverId || !content) return;

            try {
                // Save to MongoDB
                const newMessage = await Message.create({
                    sender: senderId,
                    receiver: receiverId,
                    content,
                    read: false,
                });

                // Update the conversation's last message
                try {
                    await Conversation.updateLastMessage(senderId, receiverId, newMessage._id);
                } catch (convErr) {
                    console.error('Error updating conversation:', convErr.message);
                }

                // Emit to receiver and sender
                io.to(String(receiverId)).emit('receive_message', newMessage);
                io.to(String(senderId)).emit('receive_message', newMessage);

            } catch (error) {
                console.error('Error saving message:', error);
            }
        });

        // Typing Indicators
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

                        console.log(`User ${userId} disconnected (0 active sockets left, now offline)`);
                    } else {
                        console.log(`User ${userId} closed 1 socket (${sockets.size} active sockets remaining)`);
                    }
                }
            }
            console.log('Socket Disconnected', socket.id);
        });
    });
};

module.exports = socketHandler;

