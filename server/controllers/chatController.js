const Message = require('../models/Message');

// @desc    Get chat history with a friend
// @route   GET /api/chat/:friendId
// @access  Private
const getChatHistory = async (req, res) => {
    const { friendId } = req.params;

    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user._id, receiver: friendId },
                { sender: friendId, receiver: req.user._id },
            ],
        }).sort({ createdAt: 1 }); // Oldest first

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getChatHistory };
