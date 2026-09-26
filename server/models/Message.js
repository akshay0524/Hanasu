const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Sender is required'],
            immutable: true, // A message sender cannot be changed
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            default: null,
        },
        content: {
            type: String,
            default: '',
            trim: true,
            maxlength: [5000, 'Message cannot exceed 5000 characters'],
        },
        messageType: {
            type: String,
            enum: {
                values: ['text', 'image', 'file', 'system'],
                message: '{VALUE} is not a valid message type',
            },
            default: 'text',
        },
        // File/image attachment metadata
        attachment: {
            filename: { type: String, default: null },   // original filename
            storedName: { type: String, default: null }, // UUID-based server name
            mimeType: { type: String, default: null },
            size: { type: Number, default: null },       // bytes
            url: { type: String, default: null },        // served URL path
        },
        // Emoji reactions: { emoji: string, users: [userId, ...] }
        reactions: [
            {
                emoji: { type: String, required: true },
                users: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                    },
                ],
            },
        ],
        read: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
            default: null,
        },
        readBy: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                readAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true, // Provides createdAt and updatedAt
    }
);

// ─── Indexes ────────────────────────────────────────────────────────────────────
// Conversation-level message queries
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, createdAt: -1 });

// Primary query: fetch chat history between two users, sorted by time
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: 1 });

// Fetch unread messages for a user (for badges / notifications)
messageSchema.index({ receiver: 1, read: 1 });

// Sort by creation time (descending) for "latest messages" queries
messageSchema.index({ createdAt: -1 });

// ─── Pre-save middleware ────────────────────────────────────────────────────────
// Validate sender !== receiver and at least one destination
messageSchema.pre('validate', function () {
    if (this.sender && this.receiver && this.sender.toString() === this.receiver.toString()) {
        throw new Error('Sender and receiver cannot be the same user');
    }
    if (!this.receiver && !this.conversation) {
        throw new Error('Message must have either a receiver or a conversation');
    }
    // content is required only for text/system; file/image messages may have empty content
    if (['text', 'system'].includes(this.messageType) && (!this.content || this.content.trim() === '')) {
        throw new Error('Message content is required for text/system messages');
    }
});

// Auto-set readAt when read is toggled to true
messageSchema.pre('save', function () {
    if (this.isModified('read') && this.read && !this.readAt) {
        this.readAt = new Date();
    }
});

// ─── Statics ────────────────────────────────────────────────────────────────────
// Fetch chat history between two users with pagination
messageSchema.statics.getChatBetween = function (userId1, userId2, options = {}) {
    const { limit = 50, before } = options;

    const query = {
        $or: [
            { sender: userId1, receiver: userId2 },
            { sender: userId2, receiver: userId1 },
        ],
    };

    if (before) {
        query.createdAt = { $lt: before };
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// Count unread messages for a user from a specific sender
messageSchema.statics.getUnreadCount = function (userId, senderId) {
    const query = { receiver: userId, read: false };
    if (senderId) {
        query.sender = senderId;
    }
    return this.countDocuments(query);
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
