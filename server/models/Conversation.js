const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['direct', 'group'],
            default: 'direct',
        },
        name: {
            type: String,
            trim: true,
            maxlength: [100, 'Group name cannot exceed 100 characters'],
            default: '',
        },
        avatar: {
            type: String,
            default: '',
        },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        admins: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        participants: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
            ],
            validate: {
                validator: function (arr) {
                    if (!arr || arr.length === 0) return false;
                    if (this.type === 'direct') {
                        return arr.length === 2;
                    }
                    return arr.length >= 1;
                },
                message: 'Invalid number of participants for conversation type',
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
conversationSchema.index({ type: 1 });
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

// ─── Statics ────────────────────────────────────────────────────────────────────
// Get or create a direct conversation between two users
conversationSchema.statics.getOrCreate = async function (userId1, userId2) {
    const participants = [userId1, userId2].sort();

    let conversation = await this.findOne({
        type: 'direct',
        participants: { $all: participants, $size: 2 },
    }).populate('lastMessage');

    if (!conversation) {
        conversation = await this.create({
            type: 'direct',
            participants,
            admins: [],
        });
    }

    return conversation;
};

// Update the last message in a conversation (supports both (userId1, userId2, msgId) and (convId, msgId))
conversationSchema.statics.updateLastMessage = async function (arg1, arg2, arg3) {
    if (arg3 !== undefined) {
        // Direct conversation lookup: arg1=userId1, arg2=userId2, arg3=messageId
        const participants = [arg1, arg2].sort();
        return this.findOneAndUpdate(
            { type: 'direct', participants: { $all: participants, $size: 2 } },
            {
                lastMessage: arg3,
                lastMessageAt: new Date(),
            },
            { new: true, upsert: true }
        );
    } else {
        // By conversationId: arg1=convId, arg2=messageId
        return this.findByIdAndUpdate(
            arg1,
            {
                lastMessage: arg2,
                lastMessageAt: new Date(),
            },
            { new: true }
        );
    }
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;

