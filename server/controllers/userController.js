const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// @desc    Search user by tag
// @route   GET /api/users/search/:userTag
// @access  Private
const searchUser = async (req, res) => {
    const { userTag } = req.params;

    // Ensure the tag includes '#'
    const tagCoded = userTag.startsWith('#') ? userTag : `#${userTag}`;

    try {
        const user = await User.findOne({ userTag: tagCoded }).select('-password -googleId -email');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if it's the current user
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot search specifically for yourself here, you are already you." });
        }

        // Check relationship status
        const currentUser = await User.findById(req.user._id);
        const isFriend = currentUser.friends.includes(user._id);

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
        res.status(500).json({ message: error.message });
    }
};

module.exports = { searchUser };
