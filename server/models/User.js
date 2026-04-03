const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [1, 'Name cannot be empty'],
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                'Please provide a valid email address',
            ],
        },
        googleId: {
            type: String,
            required: [true, 'Google ID is required'],
            unique: true,
            immutable: true, // Cannot be changed after creation
        },
        userTag: {
            type: String,
            required: [true, 'User tag is required'],
            unique: true,
            match: [
                /^#[0-9A-F]{4}$/,
                'User tag must be in the format #XXXX (4 hex characters)',
            ],
        },
        avatar: {
            type: String,
            default: '',
        },
        friends: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        lastSeen: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ────────────────────────────────────────────────────────────────────
// Unique fields (email, googleId, userTag) already have automatic indexes.
// Support efficient friends list population
userSchema.index({ friends: 1 });
// TTL-friendly: index on lastSeen for potential analytics
userSchema.index({ lastSeen: -1 });

// ─── Instance Methods ───────────────────────────────────────────────────────────
// Exclude sensitive fields from JSON
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.googleId;
    delete user.__v;
    return user;
};

// ─── Virtuals ───────────────────────────────────────────────────────────────────
userSchema.virtual('friendCount').get(function () {
    return this.friends ? this.friends.length : 0;
});

const User = mongoose.model('User', userSchema);

module.exports = User;
