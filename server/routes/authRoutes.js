const express = require('express');
const router = express.Router();
const { authGoogle, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/google', authGoogle);
router.get('/me', protect, getMe);

module.exports = router;
