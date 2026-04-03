const mongoose = require('mongoose');

const aiMessageSchema = mongoose.Schema({
    role: {
        type: String,
        enum: {
            values: ['user', 'assistant', 'system'],
            message: '{VALUE} is not a valid message role',
        },
        required: [true, 'Message role is required'],
    },
    content: {
        type: String,
        required: [true, 'Message content is required'],
        trim: true,
        maxlength: [10000, 'AI message cannot exceed 10000 characters'],
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
            required: [true, 'User reference is required'],
            unique: true, // One AI chat history per user
            immutable: true,
        },
        messages: {
            type: [aiMessageSchema],
            validate: {
                validator: function (arr) {
                    // Cap at 500 messages to prevent unbounded growth
                    return arr.length <= 500;
                },
                message: 'AI chat history cannot exceed 500 messages. Please clear your history.',
            },
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ────────────────────────────────────────────────────────────────────
// Fast lookup by user (unique already creates this, but explicit for clarity)

// ─── Statics ────────────────────────────────────────────────────────────────────
// Get the last N messages for context window
aiChatSchema.statics.getRecentMessages = async function (userId, count = 10) {
    const chat = await this.findOne({ user: userId }).lean();
    if (!chat || !chat.messages || chat.messages.length === 0) {
        return [];
    }
    return chat.messages.slice(-count);
};

// Clear chat history for a user
aiChatSchema.statics.clearHistory = async function (userId) {
    return this.findOneAndUpdate(
        { user: userId },
        { $set: { messages: [] } },
        { new: true }
    );
};

const AIChat = mongoose.model('AIChat', aiChatSchema);

module.exports = AIChat;
