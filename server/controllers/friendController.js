const { prisma } = require('../config/db');

// @desc    Send friend request
// @route   POST /api/friends/request
// @access  Private
const sendFriendRequest = async (req, res) => {
    const { receiverId } = req.body;

    if (receiverId === req.user.id) {
        return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    try {
        const receiver = await prisma.user.findUnique({
            where: { id: receiverId }
        });

        if (!receiver) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already friends
        const existingFriendship = await prisma.friend.findFirst({
            where: {
                OR: [
                    { userId: req.user.id, friendId: receiverId },
                    { userId: receiverId, friendId: req.user.id }
                ]
            }
        });

        if (existingFriendship) {
            return res.status(400).json({ message: 'Already friends' });
        }

        // Check if THEY sent ME a request (Pending)
        const incomingRequest = await prisma.friendRequest.findFirst({
            where: {
                senderId: receiverId,
                receiverId: req.user.id,
                status: 'pending'
            }
        });

        if (incomingRequest) {
            return res.status(400).json({ message: 'They already sent you a request. Check your alerts!' });
        }

        // Check if I sent THEM a request
        let outgoingRequest = await prisma.friendRequest.findFirst({
            where: {
                senderId: req.user.id,
                receiverId: receiverId
            }
        });

        if (outgoingRequest) {
            if (outgoingRequest.status === 'pending') {
                return res.status(400).json({ message: 'Friend request already pending' });
            }
            if (outgoingRequest.status === 'accepted') {
                return res.status(400).json({ message: 'Already friends' });
            }
            if (outgoingRequest.status === 'rejected') {
                // Reactivate request
                outgoingRequest = await prisma.friendRequest.update({
                    where: { id: outgoingRequest.id },
                    data: { status: 'pending' },
                    include: {
                        sender: {
                            select: { id: true, name: true, avatar: true, userTag: true }
                        },
                        receiver: {
                            select: { id: true, name: true, avatar: true, userTag: true }
                        }
                    }
                });

                return res.status(201).json(outgoingRequest);
            }
        }

        // Create new request
        const request = await prisma.friendRequest.create({
            data: {
                senderId: req.user.id,
                receiverId: receiverId,
            },
            include: {
                sender: {
                    select: { id: true, name: true, avatar: true, userTag: true }
                },
                receiver: {
                    select: { id: true, name: true, avatar: true, userTag: true }
                }
            }
        });

        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Accept friend request
// @route   POST /api/friends/accept
// @access  Private
const acceptFriendRequest = async (req, res) => {
    const { requestId } = req.body;

    try {
        const request = await prisma.friendRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Only receiver can accept
        if (request.receiverId !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already handled' });
        }

        // Use transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
            // Update request status
            await tx.friendRequest.update({
                where: { id: requestId },
                data: { status: 'accepted' }
            });

            // Create bidirectional friendship
            await tx.friend.createMany({
                data: [
                    { userId: request.senderId, friendId: request.receiverId },
                    { userId: request.receiverId, friendId: request.senderId }
                ],
                skipDuplicates: true
            });
        });

        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject friend request
// @route   POST /api/friends/reject
// @access  Private
const rejectFriendRequest = async (req, res) => {
    const { requestId } = req.body;

    try {
        const request = await prisma.friendRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Only receiver can reject
        if (request.receiverId !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already handled' });
        }

        await prisma.friendRequest.update({
            where: { id: requestId },
            data: { status: 'rejected' }
        });

        res.json({ message: 'Friend request rejected' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all friends
// @route   GET /api/friends/list
// @access  Private
const getFriends = async (req, res) => {
    try {
        const friendships = await prisma.friend.findMany({
            where: { userId: req.user.id },
            include: {
                friend: {
                    select: {
                        id: true,
                        name: true,
                        userTag: true,
                        avatar: true,
                        email: true
                    }
                }
            }
        });

        const friends = friendships.map(f => f.friend);
        res.json(friends);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/requests
// @access  Private
const getFriendRequests = async (req, res) => {
    try {
        const requests = await prisma.friendRequest.findMany({
            where: {
                receiverId: req.user.id,
                status: 'pending'
            },
            include: {
                sender: {
                    select: { id: true, name: true, userTag: true, avatar: true }
                }
            }
        });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a friend
// @route   POST /api/friends/remove
// @access  Private
const removeFriend = async (req, res) => {
    const { friendId } = req.body;

    try {
        const friend = await prisma.user.findUnique({
            where: { id: friendId }
        });

        if (!friend) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if they are friends
        const friendship = await prisma.friend.findFirst({
            where: {
                OR: [
                    { userId: req.user.id, friendId: friendId },
                    { userId: friendId, friendId: req.user.id }
                ]
            }
        });

        if (!friendship) {
            return res.status(400).json({ message: 'Not friends' });
        }

        // Use transaction to remove bidirectional friendship and requests
        await prisma.$transaction(async (tx) => {
            // Remove both friendship records
            await tx.friend.deleteMany({
                where: {
                    OR: [
                        { userId: req.user.id, friendId: friendId },
                        { userId: friendId, friendId: req.user.id }
                    ]
                }
            });

            // Remove associated friend requests
            await tx.friendRequest.deleteMany({
                where: {
                    OR: [
                        { senderId: req.user.id, receiverId: friendId },
                        { senderId: friendId, receiverId: req.user.id }
                    ]
                }
            });
        });

        res.json({ message: 'Friend removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    getFriendRequests,
    removeFriend
};
