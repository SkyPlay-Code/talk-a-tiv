const asyncHandler = require('express-async-handler');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');

// @desc    Create or fetch one-on-one chat
// @route   POST /api/chat
const accessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        console.log("UserId param not sent with request");
        return res.sendStatus(400);
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } },
            { users: { $elemMatch: { $eq: userId } } },
        ],
    })
        .populate("users", "-password")
        .populate("latestMessage");

    isChat = await User.populate(isChat, {
        path: 'latestMessage.sender',
        select: 'name pic email',
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        var chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.user._id, userId],
        };

        try {
            const createdChat = await Chat.create(chatData);
            const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                "users",
                "-password"
            );
            res.status(200).send(FullChat);
        } catch (error) {
            res.status(400);
            throw new Error(error.message);
        }
    }
});

// @desc    Fetch all chats for a user
// @route   GET /api/chat
const fetchChats = asyncHandler(async (req, res) => {
    try {
        Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                 results = await User.populate(results, {
                    path: "latestMessage.sender",
                    select: "name pic email",
                });
                res.status(200).send(results);
            });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Create New Group Chat
// @route   POST /api/chat/group
const createGroupChat = asyncHandler(async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: "Please Fill all the fields" });
    }

    // The frontend will send a JSON string of user IDs
    var users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res
            .status(400)
            .send("More than 2 users are required to form a group chat");
    }

    // The current logged-in user is the one creating the group
    users.push(req.user);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user, // The creator is the admin
        });

        // Fetch the newly created chat and populate the user details
        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
const renameGroup = asyncHandler(async (req, res) => {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        { chatName: chatName },
        { new: true } // 'new: true' makes it return the updated document
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!updatedChat) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(updatedChat);
    }
});

// @desc    Add user to Group
// @route   PUT /api/chat/groupadd
const addToGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    const added = await Chat.findByIdAndUpdate(
        chatId,
        { $push: { users: userId } }, // $push adds a value to an array
        { new: true }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");
    
    if (!added) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(added);
    }
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
const removeFromGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;

    const removed = await Chat.findByIdAndUpdate(
        chatId,
        { $pull: { users: userId } }, // $pull removes a value from an array
        { new: true }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");
    
    if (!removed) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(removed);
    }
});

// @desc    Mark messages as read in a chat
// @route   PUT /api/chat/:chatId/read
const markMessagesAsRead = asyncHandler(async (req, res) => {
    try {
        // Update all messages in the chat that are not yet read by the user
        await Message.updateMany(
            { chat: req.params.chatId, readBy: { $ne: req.user._id } },
            { $addToSet: { readBy: req.user._id } } // $addToSet ensures no duplicate user IDs
        );

        // We can emit a socket event here later if needed, but for now, this is enough
        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Delete a group chat
// @route   DELETE /api/chat/group/:chatId
const deleteGroup = asyncHandler(async (req, res) => {
    const chatId = req.params.chatId;

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            res.status(404);
            throw new Error("Chat Not Found");
        }

        // Check if the user is the admin
        if (chat.groupAdmin.toString() !== req.user._id.toString()) {
            res.status(403); // Forbidden
            throw new Error("Only the group admin can delete the chat");
        }
        
        // First, delete all messages associated with the chat
        await Message.deleteMany({ chat: chatId });

        // Then, delete the chat itself
        await Chat.findByIdAndDelete(chatId);

        res.status(200).json({ message: "Group chat and all its messages have been deleted" });

    } catch (error) {
        res.status(res.statusCode === 403 || res.statusCode === 404 ? res.statusCode : 400);
        throw new Error(error.message || "Could not delete group chat");
    }
});


module.exports = { accessChat, fetchChats, createGroupChat, renameGroup, addToGroup, removeFromGroup, markMessagesAsRead, deleteGroup };