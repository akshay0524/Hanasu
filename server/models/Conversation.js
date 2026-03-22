const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema(
    {
        participants: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
            ],
            validate: {
                validator: function (arr) {
                    return arr.length === 2;
                },
                message: 'A conversation must have exactly 2 participants',
            },
            required: [true, 'Participants are required'],
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null,
        },
        lastMessageAt: {
            type: Date,
            default: null,
        },
        unreadCount: {
            type: Map,
            of: Number,
            default: new Map(),
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ────────────────────────────────────────────────────────────────────
// Fast lookup: find conversations for a user
conversationSchema.index({ participants: 1 });

// Sort conversations by last activity (for sidebar ordering)
conversationSchema.index({ lastMessageAt: -1 });

// Compound index: efficiently find a specific conversation between two users
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

// ─── Statics ────────────────────────────────────────────────────────────────────
// Get or create a conversation between two users
conversationSchema.statics.getOrCreate = async function (userId1, userId2) {
    // Normalize the participants order for consistent lookups
    const participants = [userId1, userId2].sort();

    let conversation = await this.findOne({
        participants: { $all: participants, $size: 2 },
    }).populate('lastMessage');

    if (!conversation) {
        conversation = await this.create({ participants });
    }

    return conversation;
};

// Update the last message in a conversation
conversationSchema.statics.updateLastMessage = async function (userId1, userId2, messageId) {
    const participants = [userId1, userId2].sort();

    return this.findOneAndUpdate(
        { participants: { $all: participants, $size: 2 } },
        {
            lastMessage: messageId,
            lastMessageAt: new Date(),
        },
        { new: true, upsert: true }
    );
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
