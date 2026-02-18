const { prisma } = require('../config/db');

// @desc    Get chat history with a friend
// @route   GET /api/chat/:friendId
// @access  Private
const getChatHistory = async (req, res) => {
    const { friendId } = req.params;

    try {
        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: req.user.id, receiverId: friendId },
                    { senderId: friendId, receiverId: req.user.id },
                ],
            },
            orderBy: {
                createdAt: 'asc' // Oldest first
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

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getChatHistory };
