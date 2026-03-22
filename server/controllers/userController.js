const { prisma } = require('../config/db');

// @desc    Search user by tag
// @route   GET /api/users/search/:userTag
// @access  Private
const searchUser = async (req, res) => {
    const { userTag } = req.params;

    // Ensure the tag includes '#'
    const tagCoded = userTag.startsWith('#') ? userTag : `#${userTag}`;

    try {
        const user = await prisma.user.findUnique({
            where: { userTag: tagCoded },
            select: {
                id: true,
                name: true,
                userTag: true,
                avatar: true,
                // Don't expose sensitive info like email, googleId
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if it's the current user
        if (user.id === req.user.id) {
            return res.status(400).json({ message: "You cannot search specifically for yourself here, you are already you." });
        }

        // Check relationship status
        const friendship = await prisma.friend.findFirst({
            where: {
                OR: [
                    { userId: req.user.id, friendId: user.id },
                    { userId: user.id, friendId: req.user.id }
                ]
            }
        });

        const isFriend = !!friendship;

        let requestSent = false;
        let hasPendingRequest = false;

        if (!isFriend) {
            const sentReq = await prisma.friendRequest.findFirst({
                where: {
                    senderId: req.user.id,
                    receiverId: user.id,
                    status: 'pending'
                }
            });
            if (sentReq) requestSent = true;

            const receivedReq = await prisma.friendRequest.findFirst({
                where: {
                    senderId: user.id,
                    receiverId: req.user.id,
                    status: 'pending'
                }
            });
            if (receivedReq) hasPendingRequest = true;
        }

        res.json({
            ...user,
            isFriend,
            requestSent,
            hasPendingRequest
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { searchUser };
