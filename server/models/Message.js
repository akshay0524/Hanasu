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
            required: [true, 'Receiver is required'],
            immutable: true, // A message receiver cannot be changed
        },
        content: {
            type: String,
            required: [true, 'Message content is required'],
            trim: true,
            minlength: [1, 'Message cannot be empty'],
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
        read: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true, // Provides createdAt and updatedAt
    }
);

// ─── Indexes ────────────────────────────────────────────────────────────────────
// Primary query: fetch chat history between two users, sorted by time
// This compound index covers the $or query in chatController
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: 1 });

// Fetch unread messages for a user (for badges / notifications)
messageSchema.index({ receiver: 1, read: 1 });

// Sort by creation time (descending) for "latest messages" queries
messageSchema.index({ createdAt: -1 });

// ─── Pre-save middleware ────────────────────────────────────────────────────────
// Validate sender !== receiver
messageSchema.pre('validate', function (next) {
    if (this.sender && this.receiver && this.sender.equals(this.receiver)) {
        next(new Error('Sender and receiver cannot be the same user'));
    } else {
        next();
    }
});

// Auto-set readAt when read is toggled to true
messageSchema.pre('save', function (next) {
    if (this.isModified('read') && this.read && !this.readAt) {
        this.readAt = new Date();
    }
    next();
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
