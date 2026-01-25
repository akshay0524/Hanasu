const express = require('express');
const router = express.Router();
const { searchUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search/:userTag', protect, searchUser);

module.exports = router;
