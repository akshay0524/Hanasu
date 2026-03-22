const { OAuth2Client } = require('google-auth-library');
const { prisma } = require('../config/db');
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
        const existingUser = await prisma.user.findUnique({
            where: { userTag: tag }
        });
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

        let user = await prisma.user.findUnique({
            where: { googleId: sub }
        });

        if (!user) {
            // Create new user
            const userTag = await generateUserTag();
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    googleId: sub,
                    avatar: picture || '',
                    userTag,
                }
            });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            userTag: user.userTag,
            avatar: user.avatar,
            token: generateToken(user.id),
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
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
            friends: {
                include: {
                    friend: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            userTag: true,
                            avatar: true
                        }
                    }
                }
            }
        }
    });

    if (user) {
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            userTag: user.userTag,
            avatar: user.avatar,
            friends: user.friends.map(f => f.friend),
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

module.exports = { authGoogle, getMe };
