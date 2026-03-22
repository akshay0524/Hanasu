const express = require('express');
const router = express.Router();
const { getChatHistory, markMessagesAsRead, getUnreadCounts } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// Must be before /:friendId to avoid route conflict
router.get('/unread/counts', protect, getUnreadCounts);

router.get('/:friendId', protect, getChatHistory);
router.put('/:friendId/read', protect, markMessagesAsRead);

module.exports = router;
