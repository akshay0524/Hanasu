const mongoose = require('mongoose');

const userTaskSchema = mongoose.Schema(
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
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true,
            maxlength: [300, 'Title cannot exceed 300 characters'],
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        assignee: {
            type: String,
            trim: true,
            default: null,
        },
        deadline: {
            type: String,
            trim: true,
            default: null,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
);

userTaskSchema.index({ user: 1, createdAt: -1 });
userTaskSchema.index({ user: 1, status: 1 });

const UserTask = mongoose.model('UserTask', userTaskSchema);

module.exports = UserTask;
