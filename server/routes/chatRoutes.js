const express = require('express');
const router = express.Router();
const {
    getConversations,
    createGroup,
    getGroupDetails,
    updateGroup,
    addGroupMembers,
    removeGroupMember,
    updateGroupAdmin,
    getConversationMessages,
    markConversationAsRead,
    getChatHistory,
    markMessagesAsRead,
    getUnreadCounts,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// Specific routes first to avoid route parameter collisions
router.get('/conversations', protect, getConversations);
router.get('/unread/counts', protect, getUnreadCounts);

// Group management routes
router.post('/groups', protect, createGroup);
router.get('/groups/:groupId', protect, getGroupDetails);
router.put('/groups/:groupId', protect, updateGroup);
router.post('/groups/:groupId/members', protect, addGroupMembers);
router.delete('/groups/:groupId/members/:targetUserId', protect, removeGroupMember);
router.put('/groups/:groupId/admins', protect, updateGroupAdmin);

// Unified conversation messages and read state
router.get('/conversation/:conversationId/messages', protect, getConversationMessages);
router.put('/conversation/:conversationId/read', protect, markConversationAsRead);

// Legacy direct chat routes
router.get('/:friendId', protect, getChatHistory);
router.put('/:friendId/read', protect, markMessagesAsRead);

module.exports = router;
