const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// @desc    Get chat history with a friend
// @route   GET /api/chat/:friendId
// @access  Private
const getChatHistory = async (req, res) => {
    const { friendId } = req.params;
    const { before, limit } = req.query;

    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user._id, receiver: friendId },
                { sender: friendId, receiver: req.user._id },
            ],
            ...(before && { createdAt: { $lt: new Date(before) } }),
        })
            .sort({ createdAt: 1 }) // Oldest first
            .limit(parseInt(limit) || 100)
            .lean(); // Use lean() for read-only data — faster

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark messages from a user as read
// @route   PUT /api/chat/:friendId/read
// @access  Private
const markMessagesAsRead = async (req, res) => {
    const { friendId } = req.params;

    try {
        const result = await Message.updateMany(
            {
                sender: friendId,
                receiver: req.user._id,
                read: false,
            },
            {
                $set: { read: true, readAt: new Date() },
            }
        );

        res.json({
            message: 'Messages marked as read',
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get unread message counts
// @route   GET /api/chat/unread/counts
// @access  Private
const getUnreadCounts = async (req, res) => {
    try {
        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    receiver: req.user._id,
                    read: false,
                },
            },
            {
                $group: {
                    _id: '$sender',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Transform to a map: { senderId: count }
        const counts = {};
        unreadCounts.forEach((item) => {
            counts[item._id.toString()] = item.count;
        });

        res.json(counts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getChatHistory, markMessagesAsRead, getUnreadCounts };
