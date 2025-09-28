const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { 
    accessChat, 
    fetchChats, 
    createGroupChat, 
    renameGroup,
    addToGroup,
    removeFromGroup,
    markMessagesAsRead,
    deleteGroup
} = require('../controllers/chatController');

const router = express.Router();

router.route('/').post(protect, accessChat);
router.route('/').get(protect, fetchChats);
router.route('/group').post(protect, createGroupChat);       // For creating a group
router.route('/rename').put(protect, renameGroup);           // For renaming a group
router.route('/groupremove').put(protect, removeFromGroup);  // For removing a user
router.route('/groupadd').put(protect, addToGroup);          // For adding a user
router.route('/:chatId/read').put(protect, markMessagesAsRead);
router.route('/group/:chatId').delete(protect, deleteGroup);

module.exports = router;