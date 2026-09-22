const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// @desc    Search user by tag
// @route   GET /api/users/search/:userTag
// @access  Private
const searchUser = async (req, res) => {
    const { userTag } = req.params;

    if (!userTag) {
        return res.status(400).json({ message: 'User tag is required' });
    }

    // Ensure the tag includes '#' and is uppercase
    const tagCoded = (userTag.startsWith('#') ? userTag : `#${userTag}`).toUpperCase();

    try {
        const user = await User.findOne({ userTag: tagCoded }).select('-password -googleId -email');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if it's the current user
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot search specifically for yourself here, you are already you." });
        }

        // Check relationship status (use string comparison on ObjectIds)
        const currentUser = await User.findById(req.user._id);
        const isFriend = currentUser.friends && currentUser.friends.some(
            (id) => id.toString() === user._id.toString()
        );

        let requestSent = false;
        let hasPendingRequest = false;

        if (!isFriend) {
            const sentReq = await FriendRequest.findOne({
                sender: req.user._id,
                receiver: user._id,
                status: 'pending'
            });
            if (sentReq) requestSent = true;

            const receivedReq = await FriendRequest.findOne({
                sender: user._id,
                receiver: req.user._id,
                status: 'pending'
            });
            if (receivedReq) hasPendingRequest = true;
        }

        res.json({
            ...user.toObject(),
            isFriend,
            requestSent,
            hasPendingRequest
        });
    } catch (error) {
        console.error('searchUser error:', error);
        res.status(500).json({ message: error.message || 'Error searching user' });
    }
};

module.exports = { searchUser };

