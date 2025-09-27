const express = require('express');
const { registerUser, authUser, allUsers } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // Import protect

const router = express.Router();

// The GET request to this route is now protected
router.route('/').get(protect, allUsers).post(registerUser);
router.post('/login', authUser);

module.exports = router;