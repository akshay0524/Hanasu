const express = require('express');
const router = express.Router();
const { chatWithAI, getAIHistory } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/chat', protect, chatWithAI);
router.get('/history', protect, getAIHistory);

module.exports = router;
