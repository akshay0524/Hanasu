const Message = require('../models/Message');

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.id}`);

        // Join a room based on user ID
        socket.on('join_room', (userId) => {
            socket.join(userId);
            console.log(`User ${userId} joined room ${userId}`);
        });

        // Send Message
        socket.on('send_message', async (data) => {
            const { senderId, receiverId, content } = data;

            try {
                // Save to Database
                const newMessage = await Message.create({
                    sender: senderId,
                    receiver: receiverId,
                    content,
                    read: false,
                });

                // Emit to receiver
                io.to(receiverId).emit('receive_message', newMessage);

                // Also emit back to sender to confirm/append? 
                // Typically the sender appends optimistically or waits for this.
                // We can emit 'message_sent' or just let the sender handle it.
                // Using 'receive_message' for the sender too if they have multiple tabs open?
                // Let's emit to the sender's room too so all their devices update.
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

        socket.on('disconnect', () => {
            console.log('User Disconnected', socket.id);
        });
    });
};

module.exports = socketHandler;
