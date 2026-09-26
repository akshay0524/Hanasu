const mongoose = require('mongoose');

const conversationReadStateSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
            index: true,
        },
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: [true, 'Conversation is required'],
            index: true,
        },
        lastReadMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null,
        },
        lastReadAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

conversationReadStateSchema.index({ user: 1, conversation: 1 }, { unique: true });

const ConversationReadState = mongoose.model('ConversationReadState', conversationReadStateSchema);

module.exports = ConversationReadState;
