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
            socket.userId = userId;

            onlineUsers.add(userId);

            // Update lastSeen
            try {
                await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
            } catch (err) {
                console.error('Error updating lastSeen:', err.message);
            }

            io.emit('user_status_change', { userId, status: 'online' });
            socket.emit('online_users_list', Array.from(onlineUsers));

            console.log(`User ${userId} joined room ${userId} and is online`);
        });

        // Send Message
        socket.on('send_message', async (data) => {
            const { senderId, receiverId, content } = data;

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

                // Emit to receiver
                io.to(receiverId).emit('receive_message', newMessage);
                // Emit to sender's room too
                io.to(senderId).emit('receive_message', newMessage);

            } catch (error) {
                console.error('Error saving message:', error);
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
