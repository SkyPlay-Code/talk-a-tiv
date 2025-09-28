const express = require('express');
const { registerUser, authUser, allUsers, getUserById } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // Import protect

const router = express.Router();

// The GET request to this route is now protected
router.route('/').get(protect, allUsers).post(registerUser);
router.post('/login', authUser);
router.route('/:id').get(protect, getUserById);

module.exports = router;