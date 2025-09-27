const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { accessChat, fetchChats } = require('../controllers/chatController');

const router = express.Router();

router.route('/').post(protect, accessChat); // For accessing/creating a chat
router.route('/').get(protect, fetchChats);   // For getting all chats

module.exports = router;