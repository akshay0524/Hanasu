const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to generate unique user tag
const generateUserTag = async () => {
    let tag;
    let isUnique = false;
    while (!isUnique) {
        tag = '#' + Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
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
        // Use the access token to fetch user info from Google.
        // This works with the implicit-flow access_token returned by
        // useGoogleLogin() on the frontend — avoids COOP popup issues.
        client.setCredentials({ access_token: token });
        const userInfoResponse = await client.request({
            url: 'https://www.googleapis.com/oauth2/v3/userinfo',
        });

        const { sub, name, email, picture } = userInfoResponse.data;

        if (!sub || !email) {
            return res.status(400).json({ message: 'Google Authentication Failed: missing user info' });
        }

        let user = await User.findOne({ googleId: sub });

        if (!user) {
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
        console.error('authGoogle error:', error.message || error);
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
