const mongoose = require('mongoose');

const aiMessageSchema = mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const aiChatSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true, // One AI chat history per user
        },
        messages: [aiMessageSchema],
    },
    {
        timestamps: true,
    }
);

const AIChat = mongoose.model('AIChat', aiChatSchema);

module.exports = AIChat;
