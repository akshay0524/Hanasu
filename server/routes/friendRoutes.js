const express = require('express');
const router = express.Router();
const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    getFriendRequests,
} = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

router.post('/request', protect, sendFriendRequest);
router.post('/accept', protect, acceptFriendRequest);
router.post('/reject', protect, rejectFriendRequest);
router.get('/list', protect, getFriends);
router.get('/requests', protect, getFriendRequests);

module.exports = router;
