const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');

dotenv.config();
connectDB();
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, console.log(`Server started on PORT ${PORT}`));

// --- SOCKET.IO INTEGRATION STARTS HERE ---
const io = require('socket.io')(server, {
    pingTimeout: 60000, // Close the connection after 60s of inactivity
    cors: {
        origin: "http://localhost:3000", // Allow our frontend to connect
    },
});

io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    // Create a personal room for the logged-in user
    socket.on('setup', (userData) => {
        socket.join(userData._id);
        socket.emit('connected');
    });

    // Join a specific chat room
    socket.on('join chat', (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });

    // Handle a new message
    socket.on('new message', (newMessageReceived) => {
        var chat = newMessageReceived.chat;

        if (!chat.users) return console.log('chat.users not defined');

        // Send the message to all other users in the chat room
        chat.users.forEach(user => {
            if (user._id == newMessageReceived.sender._id) return;

            socket.in(user._id).emit("message received", newMessageReceived);
        });
    });
});