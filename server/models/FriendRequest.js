const mongoose = require('mongoose');

const friendRequestSchema = mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Sender is required'],
            immutable: true, // Once created, the sender cannot be changed
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Receiver is required'],
            immutable: true, // Once created, the receiver cannot be changed
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'accepted', 'rejected'],
                message: '{VALUE} is not a valid request status',
            },
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ────────────────────────────────────────────────────────────────────
// Ensure a user cannot send multiple requests to the same person
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

// Fast lookup: incoming pending requests for a user (for alerts/badges)
friendRequestSchema.index({ receiver: 1, status: 1 });

// Fast lookup: outgoing requests from a user
friendRequestSchema.index({ sender: 1, status: 1 });

// ─── Pre-validate middleware ────────────────────────────────────────────────────
// Validate sender !== receiver
friendRequestSchema.pre('validate', function (next) {
    if (this.sender && this.receiver && this.sender.equals(this.receiver)) {
        next(new Error('Cannot send a friend request to yourself'));
    } else {
        next();
    }
});

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequest;
