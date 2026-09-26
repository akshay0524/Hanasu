const express = require('express');
const router = express.Router();
const { uploadFile, toggleReaction } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// Upload a file/image and create a message
router.post('/upload', protect, upload.single('file'), uploadFile);

// Toggle emoji reaction on a message
router.post('/reactions/:messageId', protect, toggleReaction);

module.exports = router;
