const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to generate unique user tag
const generateUserTag = async () => {
    let tag;
    let isUnique = false;
    while (!isUnique) {
        // Generate 4 digit hex string
        tag = '#' + Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
        // Check if exists
        const existingUser = await User.findOne({ userTag: tag });
        if (!existingUser) {
            isUnique = true;
        }
    }
    return tag;
};

// @desc    Auth with Google
// @route   POST /api/auth/google
// @access  Public
const authGoogle = async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email, picture, sub } = ticket.getPayload();

        let user = await User.findOne({ googleId: sub });

        if (!user) {
            // Create new user
            const userTag = await generateUserTag();
            user = await User.create({
                name,
                email,
                googleId: sub,
                avatar: picture,
                userTag,
            });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            userTag: user.userTag,
            avatar: user.avatar,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Google Authentication Failed' });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            userTag: user.userTag,
            avatar: user.avatar,
            friends: user.friends,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

module.exports = { authGoogle, getMe };
