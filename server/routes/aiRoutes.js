const express = require('express');
const router = express.Router();
const {
    getCatchMeUp,
    summarizeAction,
    explainAction,
    translateAction,
    smartReplyAction,
    extractMemoryAction,
    saveMemory,
    getMemories,
    deleteMemory,
    extractTaskAction,
    saveTask,
    getTasks,
    updateTask,
    deleteTask,
    chatWithAI,
    getAIHistory,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Catch Me Up
router.get('/catch-me-up/:conversationId', protect, getCatchMeUp);

// AI Message Actions
router.post('/actions/summarize', protect, summarizeAction);
router.post('/actions/explain', protect, explainAction);
router.post('/actions/translate', protect, translateAction);
router.post('/actions/smart-reply', protect, smartReplyAction);

// Memories
router.post('/memory/extract', protect, extractMemoryAction);
router.post('/memory/save', protect, saveMemory);
router.get('/memory', protect, getMemories);
router.delete('/memory/:memoryId', protect, deleteMemory);

// Tasks
router.post('/task/extract', protect, extractTaskAction);
router.post('/task/save', protect, saveTask);
router.get('/task', protect, getTasks);
router.put('/task/:taskId', protect, updateTask);
router.delete('/task/:taskId', protect, deleteTask);

// 1-on-1 AI Assistant
router.post('/chat', protect, chatWithAI);
router.get('/history', protect, getAIHistory);

module.exports = router;
