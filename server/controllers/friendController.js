const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// @desc    Send friend request
// @route   POST /api/friends/request
// @access  Private
const sendFriendRequest = async (req, res) => {
    const { receiverId } = req.body;

    if (receiverId === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    try {
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already friends
        if (req.user.friends.includes(receiverId)) {
            return res.status(400).json({ message: 'Already friends' });
        }

        // Check if request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: req.user._id, receiver: receiverId },
                { sender: receiverId, receiver: req.user._id },
            ],
            status: 'pending',
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'Friend request already pending' });
        }

        const request = await FriendRequest.create({
            sender: req.user._id,
            receiver: receiverId,
        });

        const fullRequest = await FriendRequest.findById(request._id).populate('sender', 'name avatar userTag').populate('receiver', 'name avatar userTag');

        res.status(201).json(fullRequest);
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
        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Only receiver can accept
        if (request.receiver.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already handled' });
        }

        request.status = 'accepted';
        await request.save();

        // Add to friends lists
        const sender = await User.findById(request.sender);
        const receiver = await User.findById(request.receiver);

        if (!receiver.friends.includes(request.sender)) {
            receiver.friends.push(request.sender);
            await receiver.save();
        }

        if (!sender.friends.includes(request.receiver)) {
            sender.friends.push(request.receiver);
            await sender.save();
        }

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
        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Only receiver can reject
        if (request.receiver.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request already handled' });
        }

        request.status = 'rejected';
        await request.save();

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
        const user = await User.findById(req.user._id).populate('friends', 'name userTag avatar email');
        res.json(user.friends);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/requests
// @access  Private
const getFriendRequests = async (req, res) => {
    try {
        // Incoming requests
        const requests = await FriendRequest.find({
            receiver: req.user._id,
            status: 'pending'
        }).populate('sender', 'name userTag avatar');

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    getFriendRequests
};
