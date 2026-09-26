const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const ConversationReadState = require('../models/ConversationReadState');
const User = require('../models/User');

// Helper to emit to a room or user
const emitToUsers = (io, userIds, event, data) => {
    if (!io) return;
    userIds.forEach((uid) => {
        io.to(String(uid)).emit(event, data);
    });
};

// ─── CONVERSATIONS ─────────────────────────────────────────────────────────────

// @desc    Get all conversations (direct + group) for current user
// @route   GET /api/chat/conversations
// @access  Private
const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({
            participants: userId,
        })
            .populate('participants', 'name userTag avatar lastSeen')
            .populate('admins', 'name userTag avatar')
            .populate('creator', 'name userTag avatar')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'name userTag avatar' },
            })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .lean();

        // Calculate unread count for each conversation
        const conversationIds = conversations.map((c) => c._id);
        const readStates = await ConversationReadState.find({
            user: userId,
            conversation: { $in: conversationIds },
        }).lean();

        const readStateMap = new Map();
        readStates.forEach((rs) => {
            readStateMap.set(String(rs.conversation), rs.lastReadAt);
        });

        // Parallel count queries for unread counts
        const enrichedConversations = await Promise.all(
            conversations.map(async (conv) => {
                const convIdStr = String(conv._id);
                const lastReadAt = readStateMap.get(convIdStr);

                const unreadQuery = {
                    conversation: conv._id,
                    sender: { $ne: userId },
                };

                if (lastReadAt) {
                    unreadQuery.createdAt = { $gt: new Date(lastReadAt) };
                }

                let unreadCount = await Message.countDocuments(unreadQuery);

                // If unread is 0 and it's a direct conversation, fallback check for legacy direct messages without conversation ref
                if (unreadCount === 0 && conv.type === 'direct') {
                    const otherParticipant = conv.participants.find(
                        (p) => String(p._id) !== String(userId)
                    );
                    if (otherParticipant) {
                        const legacyUnread = await Message.countDocuments({
                            sender: otherParticipant._id,
                            receiver: userId,
                            read: false,
                        });
                        unreadCount = Math.max(unreadCount, legacyUnread);
                    }
                }

                return {
                    ...conv,
                    unreadCount,
                };
            })
        );

        res.json(enrichedConversations);
    } catch (error) {
        console.error('getConversations error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── GROUP MANAGEMENT ──────────────────────────────────────────────────────────

// @desc    Create a new group
// @route   POST /api/chat/groups
// @access  Private
const createGroup = async (req, res) => {
    try {
        const { name, members, avatar } = req.body;
        const creatorId = req.user._id;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Group name is required' });
        }

        if (name.trim().length > 100) {
            return res.status(400).json({ message: 'Group name cannot exceed 100 characters' });
        }

        const memberSet = new Set(
            (Array.isArray(members) ? members : []).map((m) => String(m))
        );
        // Ensure creator is included
        memberSet.add(String(creatorId));

        const participantIds = Array.from(memberSet);

        if (participantIds.length < 2) {
            return res.status(400).json({ message: 'A group must have at least 2 members' });
        }

        // Verify that all member IDs actually exist
        const validUsers = await User.find({ _id: { $in: participantIds } }).select('_id name');
        if (validUsers.length !== participantIds.length) {
            return res.status(400).json({ message: 'One or more selected members do not exist' });
        }

        const newGroup = await Conversation.create({
            type: 'group',
            name: name.trim(),
            avatar: avatar || '',
            creator: creatorId,
            admins: [creatorId],
            participants: participantIds,
        });

        // Create initial system message
        const systemMessage = await Message.create({
            sender: creatorId,
            conversation: newGroup._id,
            content: `${req.user.name} created the group "${name.trim()}"`,
            messageType: 'system',
        });

        newGroup.lastMessage = systemMessage._id;
        newGroup.lastMessageAt = new Date();
        await newGroup.save();

        // Mark as read for creator
        await ConversationReadState.findOneAndUpdate(
            { user: creatorId, conversation: newGroup._id },
            { lastReadAt: new Date(), lastReadMessage: systemMessage._id },
            { upsert: true, new: true }
        );

        const populatedGroup = await Conversation.findById(newGroup._id)
            .populate('participants', 'name userTag avatar lastSeen')
            .populate('admins', 'name userTag avatar')
            .populate('creator', 'name userTag avatar')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'name userTag avatar' },
            })
            .lean();

        // Real-time broadcast
        const io = req.app.get('io');
        if (io) {
            emitToUsers(io, participantIds, 'group_created', {
                ...populatedGroup,
                unreadCount: 0,
            });
        }

        res.status(201).json({
            ...populatedGroup,
            unreadCount: 0,
        });
    } catch (error) {
        console.error('createGroup error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get group details
// @route   GET /api/chat/groups/:groupId
// @access  Private
const getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Conversation.findOne({
            _id: groupId,
            type: 'group',
            participants: userId,
        })
            .populate('participants', 'name userTag avatar lastSeen')
            .populate('admins', 'name userTag avatar')
            .populate('creator', 'name userTag avatar')
            .lean();

        if (!group) {
            return res.status(404).json({ message: 'Group not found or you are not a member' });
        }

        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update group metadata (name, avatar)
// @route   PUT /api/chat/groups/:groupId
// @access  Private (Admin only)
const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, avatar } = req.body;
        const userId = req.user._id;

        const group = await Conversation.findById(groupId);
        if (!group || group.type !== 'group') {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isAdmin = group.admins.some((adminId) => String(adminId) === String(userId));
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only group admins can update group details' });
        }

        const updates = {};
        if (name && name.trim()) {
            updates.name = name.trim().slice(0, 100);
        }
        if (avatar !== undefined) {
            updates.avatar = avatar;
        }

        const updatedGroup = await Conversation.findByIdAndUpdate(groupId, updates, { new: true })
            .populate('participants', 'name userTag avatar lastSeen')
            .populate('admins', 'name userTag avatar')
            .populate('creator', 'name userTag avatar')
            .populate('lastMessage')
            .lean();

        const io = req.app.get('io');
        if (io) {
            emitToUsers(io, updatedGroup.participants.map((p) => p._id), 'group_updated', updatedGroup);
        }

        res.json(updatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add members to group
// @route   POST /api/chat/groups/:groupId/members
// @access  Private (Admin only)
const addGroupMembers = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { memberIds } = req.body;
        const userId = req.user._id;

        if (!Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: 'memberIds array is required' });
        }

        const group = await Conversation.findById(groupId);
        if (!group || group.type !== 'group') {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isAdmin = group.admins.some((adminId) => String(adminId) === String(userId));
        if (!isAdmin) {
            return res.status(403).json({ message: 'Only group admins can add members' });
        }

        const existingMemberIds = new Set(group.participants.map((id) => String(id)));
        const newMemberIds = memberIds.filter((id) => !existingMemberIds.has(String(id)));

        if (newMemberIds.length === 0) {
            return res.status(400).json({ message: 'All specified users are already in the group' });
        }

        const validNewUsers = await User.find({ _id: { $in: newMemberIds } }).select('_id name');
        if (validNewUsers.length === 0) {
            return res.status(400).json({ message: 'No valid new users found to add' });
        }

        validNewUsers.forEach((u) => {
            group.participants.push(u._id);
        });

        // Create system message
        const addedNames = validNewUsers.map((u) => u.name).join(', ');
        const systemMessage = await Message.create({
            sender: userId,
            conversation: group._id,
            content: `${req.user.name} added ${addedNames}`,
            messageType: 'system',
        });

        group.lastMessage = systemMessage._id;
        group.lastMessageAt = new Date();
        await group.save();

        const updatedGroup = await Conversation.findById(groupId)
            .populate('participants', 'name userTag avatar lastSeen')
            .populate('admins', 'name userTag avatar')
            .populate('creator', 'name userTag avatar')
            .populate('lastMessage')
            .lean();

        const io = req.app.get('io');
        if (io) {
            emitToUsers(io, updatedGroup.participants.map((p) => p._id), 'group_updated', updatedGroup);
            emitToUsers(io, validNewUsers.map((u) => u._id), 'group_created', updatedGroup);
            io.to(String(groupId)).emit('receive_message', systemMessage);
        }

        res.json(updatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove member from group or leave group
// @route   DELETE /api/chat/groups/:groupId/members/:targetUserId
// @access  Private (Admin for removing others, any member for leaving)
const removeGroupMember = async (req, res) => {
    try {
        const { groupId, targetUserId } = req.params;
        const requesterId = String(req.user._id);
        const isSelfLeaving = requesterId === String(targetUserId);

        const group = await Conversation.findById(groupId);
        if (!group || group.type !== 'group') {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isRequesterAdmin = group.admins.some((a) => String(a) === requesterId);
        const isTargetInGroup = group.participants.some((p) => String(p) === String(targetUserId));

        if (!isTargetInGroup) {
            return res.status(400).json({ message: 'User is not a member of this group' });
        }

        // Authorization checks
        if (!isSelfLeaving) {
            if (!isRequesterAdmin) {
                return res.status(403).json({ message: 'Only group admins can remove other members' });
            }
            // Cannot remove the creator
            if (String(group.creator) === String(targetUserId)) {
                return res.status(403).json({ message: 'Cannot remove the group creator' });
            }
            // An admin cannot remove another admin unless requester is the creator
            const isTargetAdmin = group.admins.some((a) => String(a) === String(targetUserId));
            if (isTargetAdmin && String(group.creator) !== requesterId) {
                return res.status(403).json({ message: 'Only the creator can remove another admin' });
            }
        }

        // Remove from participants and admins
        group.participants = group.participants.filter((p) => String(p) !== String(targetUserId));
        group.admins = group.admins.filter((a) => String(a) !== String(targetUserId));

        const targetUserDoc = await User.findById(targetUserId).select('name');
        const targetUserName = targetUserDoc ? targetUserDoc.name : 'A member';

        // If creator left, transfer creator role to another admin, or first remaining member
        if (String(group.creator) === String(targetUserId)) {
            if (group.admins.length > 0) {
                group.creator = group.admins[0];
            } else if (group.participants.length > 0) {
                group.creator = group.participants[0];
                group.admins.push(group.participants[0]);
            } else {
                group.creator = null;
            }
        }

        // Create system message
        const sysContent = isSelfLeaving
            ? `${targetUserName} left the group`
            : `${req.user.name} removed ${targetUserName}`;

        const systemMessage = await Message.create({
            sender: req.user._id,
            conversation: group._id,
            content: sysContent,
            messageType: 'system',
        });

        group.lastMessage = systemMessage._id;
        group.lastMessageAt = new Date();
        await group.save();

        const updatedGroup = await Conversation.findById(groupId)
            .populate('participants', 'name userTag avatar lastSeen')
            .populate('admins', 'name userTag avatar')
            .populate('creator', 'name userTag avatar')
            .populate('lastMessage')
            .lean();

        const io = req.app.get('io');
        if (io) {
            emitToUsers(io, group.participants, 'group_updated', updatedGroup);
            io.to(String(targetUserId)).emit('member_removed', {
                groupId,
                groupName: group.name,
                removedBy: req.user.name,
            });
            io.to(String(groupId)).emit('receive_message', systemMessage);
        }

        res.json({
            message: isSelfLeaving ? 'You left the group' : `${targetUserName} was removed`,
            group: updatedGroup,
        });
    } catch (error) {
        console.error('removeGroupMember error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Promote or demote group admin
// @route   PUT /api/chat/groups/:groupId/admins
// @access  Private (Admin only)
const updateGroupAdmin = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { targetUserId, action } = req.body;
        const requesterId = String(req.user._id);

        if (!targetUserId || !['promote', 'demote'].includes(action)) {
            return res.status(400).json({ message: 'targetUserId and action ("promote" or "demote") are required' });
        }

        const group = await Conversation.findById(groupId);
        if (!group || group.type !== 'group') {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isRequesterAdmin = group.admins.some((a) => String(a) === requesterId);
        if (!isRequesterAdmin) {
            return res.status(403).json({ message: 'Only group admins can manage admin roles' });
        }

        const isTargetMember = group.participants.some((p) => String(p) === String(targetUserId));
        if (!isTargetMember) {
            return res.status(400).json({ message: 'Target user is not a member of this group' });
        }

        if (action === 'promote') {
            const alreadyAdmin = group.admins.some((a) => String(a) === String(targetUserId));
            if (alreadyAdmin) {
                return res.status(400).json({ message: 'User is already an admin' });
            }
            group.admins.push(targetUserId);
        } else if (action === 'demote') {
            if (String(group.creator) === String(targetUserId)) {
                return res.status(400).json({ message: 'Cannot demote the group creator' });
            }
            if (String(group.creator) !== requesterId) {
                return res.status(403).json({ message: 'Only the creator can demote other admins' });
            }
            group.admins = group.admins.filter((a) => String(a) !== String(targetUserId));
        }

        const targetUserDoc = await User.findById(targetUserId).select('name');
        const targetUserName = targetUserDoc ? targetUserDoc.name : 'User';

        const systemMessage = await Message.create({
            sender: req.user._id,
            conversation: group._id,
            content: `${req.user.name} ${action === 'promote' ? 'promoted' : 'demoted'} ${targetUserName} ${action === 'promote' ? 'to admin' : 'to member'}`,
            messageType: 'system',
        });

        group.lastMessage = systemMessage._id;
        group.lastMessageAt = new Date();
        await group.save();

        const updatedGroup = await Conversation.findById(groupId)
            .populate('participants', 'name userTag avatar lastSeen')
            .populate('admins', 'name userTag avatar')
            .populate('creator', 'name userTag avatar')
            .populate('lastMessage')
            .lean();

        const io = req.app.get('io');
        if (io) {
            emitToUsers(io, group.participants, 'group_updated', updatedGroup);
            emitToUsers(io, group.participants, 'admin_changed', {
                groupId,
                targetUserId,
                action,
                updatedGroup,
            });
            io.to(String(groupId)).emit('receive_message', systemMessage);
        }

        res.json(updatedGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── MESSAGES & READ STATE ─────────────────────────────────────────────────────

// @desc    Get messages for a conversation (direct or group)
// @route   GET /api/chat/conversation/:conversationId/messages
// @access  Private
const getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { before, limit } = req.query;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some((p) => String(p) === String(userId));
        if (!isParticipant) {
            return res.status(403).json({ message: 'Access denied: you are not a participant' });
        }

        const query = {
            conversation: conversationId,
            ...(before && { createdAt: { $lt: new Date(before) } }),
        };

        const messages = await Message.find(query)
            .populate('sender', 'name userTag avatar')
            .sort({ createdAt: 1 })
            .limit(parseInt(limit, 10) || 100)
            .lean();

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark conversation as read
// @route   PUT /api/chat/conversation/:conversationId/read
// @access  Private
const markConversationAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const isParticipant = conversation.participants.some((p) => String(p) === String(userId));
        if (!isParticipant) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Fetch latest message
        const latestMessage = await Message.findOne({ conversation: conversationId })
            .sort({ createdAt: -1 })
            .select('_id createdAt');

        const readState = await ConversationReadState.findOneAndUpdate(
            { user: userId, conversation: conversationId },
            {
                lastReadAt: new Date(),
                lastReadMessage: latestMessage ? latestMessage._id : null,
            },
            { upsert: true, new: true }
        );

        // Also update messages in conversation
        await Message.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: userId },
                read: false,
            },
            {
                $set: { read: true, readAt: new Date() },
                $addToSet: { readBy: { user: userId, readAt: new Date() } },
            }
        );

        const io = req.app.get('io');
        if (io) {
            io.to(String(conversationId)).emit('conversation_read', {
                conversationId: String(conversationId),
                readerId: String(userId),
                lastReadAt: readState.lastReadAt,
            });
            io.to(String(conversationId)).emit('messages_read', {
                conversationId: String(conversationId),
                readerId: String(userId),
                readAt: readState.lastReadAt,
            });
            conversation.participants.forEach((p) => {
                if (String(p) !== String(userId)) {
                    io.to(String(p)).emit('messages_read', {
                        conversationId: String(conversationId),
                        readerId: String(userId),
                        readAt: readState.lastReadAt,
                    });
                }
            });
        }

        res.json({ message: 'Conversation marked as read', readState });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── BACKWARD COMPATIBLE DIRECT CHAT ENDPOINTS ─────────────────────────────────

// @desc    Get chat history with a friend (Legacy 1-on-1)
// @route   GET /api/chat/:friendId
// @access  Private
const getChatHistory = async (req, res) => {
    const { friendId } = req.params;
    const { before, limit } = req.query;

    try {
        const conversation = await Conversation.getOrCreate(req.user._id, friendId);

        const messages = await Message.find({
            $or: [
                { conversation: conversation._id },
                { sender: req.user._id, receiver: friendId },
                { sender: friendId, receiver: req.user._id },
            ],
            ...(before && { createdAt: { $lt: new Date(before) } }),
        })
            .populate('sender', 'name userTag avatar')
            .sort({ createdAt: 1 })
            .limit(parseInt(limit, 10) || 100)
            .lean();

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark messages from a user as read (Legacy)
// @route   PUT /api/chat/:friendId/read
// @access  Private
const markMessagesAsRead = async (req, res) => {
    const { friendId } = req.params;

    try {
        const result = await Message.updateMany(
            {
                sender: friendId,
                receiver: req.user._id,
                read: false,
            },
            {
                $set: { read: true, readAt: new Date() },
            }
        );

        const conversation = await Conversation.findOne({
            type: 'direct',
            participants: { $all: [req.user._id, friendId], $size: 2 },
        });

        if (conversation) {
            await Message.updateMany(
                { conversation: conversation._id, sender: friendId, read: false },
                { $set: { read: true, readAt: new Date() } }
            );

            const latestMsg = await Message.findOne({ conversation: conversation._id })
                .sort({ createdAt: -1 })
                .select('_id');

            await ConversationReadState.findOneAndUpdate(
                { user: req.user._id, conversation: conversation._id },
                {
                    lastReadAt: new Date(),
                    lastReadMessage: latestMsg ? latestMsg._id : null,
                },
                { upsert: true }
            );
        }

        const io = req.app.get('io');
        if (io) {
            const readEvent = {
                readerId: String(req.user._id),
                friendId: String(friendId),
                readAt: new Date(),
                conversationId: conversation ? String(conversation._id) : null,
            };
            io.to(String(friendId)).emit('messages_read', readEvent);
            if (conversation) {
                io.to(String(conversation._id)).emit('messages_read', readEvent);
            }
        }

        res.json({
            message: 'Messages marked as read',
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get unread message counts (Direct + Groups)
// @route   GET /api/chat/unread/counts
// @access  Private
const getUnreadCounts = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Direct messages legacy counts
        const unreadDirect = await Message.aggregate([
            {
                $match: {
                    receiver: userId,
                    read: false,
                },
            },
            {
                $group: {
                    _id: '$sender',
                    count: { $sum: 1 },
                },
            },
        ]);

        const counts = {};
        unreadDirect.forEach((item) => {
            counts[item._id.toString()] = item.count;
        });

        // 2. Group conversation unread counts
        const groupConversations = await Conversation.find({
            type: 'group',
            participants: userId,
        }).select('_id');

        for (const grp of groupConversations) {
            const readState = await ConversationReadState.findOne({
                user: userId,
                conversation: grp._id,
            });

            const unreadQuery = {
                conversation: grp._id,
                sender: { $ne: userId },
            };
            if (readState && readState.lastReadAt) {
                unreadQuery.createdAt = { $gt: readState.lastReadAt };
            }

            const count = await Message.countDocuments(unreadQuery);
            if (count > 0) {
                counts[grp._id.toString()] = count;
            }
        }

        res.json(counts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getConversations,
    createGroup,
    getGroupDetails,
    updateGroup,
    addGroupMembers,
    removeGroupMember,
    updateGroupAdmin,
    getConversationMessages,
    markConversationAsRead,
    getChatHistory,
    markMessagesAsRead,
    getUnreadCounts,
};
