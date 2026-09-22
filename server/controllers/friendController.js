const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// @desc    Send friend request
// @route   POST /api/friends/request
// @access  Private
const sendFriendRequest = async (req, res) => {
    const { receiverId } = req.body;

    if (!receiverId) {
        return res.status(400).json({ message: 'Receiver ID is required' });
    }

    if (receiverId.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    try {
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already friends in either user's list
        const alreadyFriends = 
            (req.user.friends && req.user.friends.some(id => id.toString() === receiverId.toString())) ||
            (receiver.friends && receiver.friends.some(id => id.toString() === req.user._id.toString()));

        if (alreadyFriends) {
            return res.status(400).json({ message: 'Already friends' });
        }

        // Check if THEY sent ME a pending request
        const incomingRequest = await FriendRequest.findOne({
            sender: receiverId,
            receiver: req.user._id,
            status: 'pending'
        });

        if (incomingRequest) {
            return res.status(400).json({ message: 'They already sent you a request. Check your alerts!' });
        }

        // Check if I sent THEM a request
        let outgoingRequest = await FriendRequest.findOne({
            sender: req.user._id,
            receiver: receiverId
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
                outgoingRequest.status = 'pending';
                await outgoingRequest.save();

                const fullRequest = await FriendRequest.findById(outgoingRequest._id)
                    .populate('sender', 'name avatar userTag')
                    .populate('receiver', 'name avatar userTag');

                return res.status(201).json(fullRequest);
            }
        }

        // Also check if there is an accepted incoming request
        const acceptedIncoming = await FriendRequest.findOne({
            sender: receiverId,
            receiver: req.user._id,
            status: 'accepted'
        });
        if (acceptedIncoming) {
            return res.status(400).json({ message: 'Already friends' });
        }

        // Create new request
        const request = await FriendRequest.create({
            sender: req.user._id,
            receiver: receiverId,
        });

        const fullRequest = await FriendRequest.findById(request._id)
            .populate('sender', 'name avatar userTag')
            .populate('receiver', 'name avatar userTag');

        res.status(201).json(fullRequest);
    } catch (error) {
        console.error('sendFriendRequest error:', error);
        res.status(500).json({ message: error.message || 'Error sending friend request' });
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

        // Add to friends lists (ensure no duplicates using string comparison)
        const sender = await User.findById(request.sender);
        const receiver = await User.findById(request.receiver);

        if (receiver && !receiver.friends.some(id => id.toString() === request.sender.toString())) {
            receiver.friends.push(request.sender);
            await receiver.save();
        }

        if (sender && !sender.friends.some(id => id.toString() === request.receiver.toString())) {
            sender.friends.push(request.receiver);
            await sender.save();
        }

        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        console.error('acceptFriendRequest error:', error);
        res.status(500).json({ message: error.message || 'Error accepting friend request' });
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
        console.error('rejectFriendRequest error:', error);
        res.status(500).json({ message: error.message || 'Error rejecting friend request' });
    }
};

// @desc    Get all friends
// @route   GET /api/friends/list
// @access  Private
const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('friends', 'name userTag avatar email');
        res.json(user ? user.friends : []);
    } catch (error) {
        console.error('getFriends error:', error);
        res.status(500).json({ message: error.message || 'Error fetching friends' });
    }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/requests
// @access  Private
const getFriendRequests = async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            receiver: req.user._id,
            status: 'pending'
        }).populate('sender', 'name userTag avatar');

        res.json(requests);
    } catch (error) {
        console.error('getFriendRequests error:', error);
        res.status(500).json({ message: error.message || 'Error fetching friend requests' });
    }
};

// @desc    Remove a friend
// @route   POST /api/friends/remove
// @access  Private
const removeFriend = async (req, res) => {
    const { friendId } = req.body;

    try {
        const user = await User.findById(req.user._id);
        const friend = await User.findById(friendId);

        if (!friend) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.friends.some(id => id.toString() === friendId.toString())) {
            return res.status(400).json({ message: 'Not friends' });
        }

        // Remove from both users' friend lists
        user.friends = user.friends.filter(id => id.toString() !== friendId.toString());
        await user.save();

        friend.friends = friend.friends.filter(id => id.toString() !== user._id.toString());
        await friend.save();

        // Remove associated friend requests
        await FriendRequest.deleteMany({
            $or: [
                { sender: user._id, receiver: friendId },
                { sender: friendId, receiver: user._id }
            ]
        });

        res.json({ message: 'Friend removed' });
    } catch (error) {
        console.error('removeFriend error:', error);
        res.status(500).json({ message: error.message || 'Error removing friend' });
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

