const mongoose = require('mongoose');

const userMemorySchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
            index: true,
        },
        message: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null,
        },
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            default: null,
        },
        content: {
            type: String,
            required: [true, 'Memory content is required'],
            trim: true,
            maxlength: [2000, 'Memory content cannot exceed 2000 characters'],
        },
        category: {
            type: String,
            enum: ['fact', 'preference', 'project', 'personal', 'decision', 'general'],
            default: 'general',
        },
        tags: [
            {
                type: String,
                trim: true,
            },
        ],
    },
    {
        timestamps: true,
    }
);

userMemorySchema.index({ user: 1, createdAt: -1 });

const UserMemory = mongoose.model('UserMemory', userMemorySchema);

module.exports = UserMemory;
