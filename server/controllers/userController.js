const User = require('../models/User');

// @desc    Search user by tag
// @route   GET /api/users/search/:userTag
// @access  Private
const searchUser = async (req, res) => {
    const { userTag } = req.params;

    // Ensure the tag includes '#'
    const tagCoded = userTag.startsWith('#') ? userTag : `#${userTag}`;

    try {
        const user = await User.findOne({ userTag: tagCoded }).select('-password -googleId -email'); // Don't expose sensitive info

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if it's the current user
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot search specifically for yourself here, you are already you." });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { searchUser };
