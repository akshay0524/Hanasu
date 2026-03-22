const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const onlineUsers = new Set();

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.id}`);

        // Join a room based on user ID
        socket.on('join_room', async (userId) => {
            socket.join(userId);
            socket.userId = userId; // Store userId on socket for disconnect handling

            // Add to online users
            onlineUsers.add(userId);

            // Update lastSeen
            try {
                await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
            } catch (err) {
                console.error('Error updating lastSeen:', err.message);
            }

            // Broadcast to all users that this user is online
            io.emit('user_status_change', { userId, status: 'online' });

            // Send current online users to this user
            socket.emit('online_users_list', Array.from(onlineUsers));

            console.log(`User ${userId} joined room ${userId} and is online`);
        });

        // Send Message
        socket.on('send_message', async (data) => {
            const { senderId, receiverId, content } = data;

            try {
                // Save to Database
                const newMessage = await prisma.message.create({
                    data: {
                        senderId,
                        receiverId,
                        content,
                        read: false,
                    },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true
                            }
                        },
                        receiver: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true
                            }
                        }
                    }
                });

                // Update the conversation's last message
                try {
                    await Conversation.updateLastMessage(senderId, receiverId, newMessage._id);
                } catch (convErr) {
                    console.error('Error updating conversation:', convErr.message);
                    // Non-critical: don't fail the message send
                }

                // Emit to receiver
                io.to(receiverId).emit('receive_message', newMessage);

                // Emit to the sender's room too so all their devices update
                io.to(senderId).emit('receive_message', newMessage);

            } catch (error) {
                console.error('Error saving message:', error);
                socket.emit('message_error', { error: 'Failed to send message' });
            }
        });

        // Typing Indicators
        socket.on('typing', (data) => {
            const { receiverId, senderId } = data;
            io.to(receiverId).emit('typing', { senderId });
        });

        socket.on('stop_typing', (data) => {
            const { receiverId, senderId } = data;
            io.to(receiverId).emit('stop_typing', { senderId });
        });

        socket.on('disconnect', async () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                io.emit('user_status_change', { userId: socket.userId, status: 'offline' });

                // Update lastSeen on disconnect
                try {
                    await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
                } catch (err) {
                    console.error('Error updating lastSeen on disconnect:', err.message);
                }

                console.log(`User ${socket.userId} disconnected`);
            }
            console.log('User Disconnected', socket.id);
        });
    });
};

module.exports = socketHandler;
