const path = require('path');
const fs = require('fs');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { UPLOAD_DIR } = require('../middleware/uploadMiddleware');

/**
 * @desc    Upload a file/image and create a message
 * @route   POST /api/files/upload
 * @access  Private
 *
 * Body (multipart/form-data):
 *   file        — the binary file
 *   senderId    — authenticated user id (validated against req.user)
 *   conversationId — target conversation
 *   receiverId  — (optional) for direct chat, the other user's id
 *   caption     — (optional) text caption alongside the file
 */
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        const { conversationId, receiverId, caption } = req.body;
        const senderId = req.user._id;

        if (!conversationId && !receiverId) {
            // Clean up orphaned upload
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: 'conversationId or receiverId is required' });
        }

        // Resolve conversation
        let convDoc;
        let targetConversationId = conversationId;

        if (conversationId) {
            convDoc = await Conversation.findById(conversationId);
        } else if (receiverId) {
            convDoc = await Conversation.getOrCreate(senderId, receiverId);
            targetConversationId = convDoc._id;
        }

        if (!convDoc) {
            fs.unlink(req.file.path, () => {});
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Verify sender is a participant
        const isMember = convDoc.participants.some((p) => String(p) === String(senderId));
        if (!isMember) {
            fs.unlink(req.file.path, () => {});
            return res.status(403).json({ message: 'You are not a participant in this conversation' });
        }

        // Determine message type (image vs generic file)
        const isImage = req.file.mimetype.startsWith('image/');
        const messageType = isImage ? 'image' : 'file';

        // Public URL: served as /uploads/<filename> — do NOT expose full server path
        const servePath = `/uploads/${req.file.filename}`;

        const msgPayload = {
            sender: senderId,
            conversation: targetConversationId,
            content: caption ? caption.trim().slice(0, 500) : '',
            messageType,
            attachment: {
                filename: req.file.originalname,
                storedName: req.file.filename,
                mimeType: req.file.mimetype,
                size: req.file.size,
                url: servePath,
            },
        };

        if (receiverId) {
            msgPayload.receiver = receiverId;
        }

        const createdMessage = await Message.create(msgPayload);

        // Update conversation's last message
        await Conversation.updateLastMessage(targetConversationId, createdMessage._id);

        const populatedMessage = await Message.findById(createdMessage._id)
            .populate('sender', 'name userTag avatar')
            .lean();

        // Real-time broadcast via Socket.IO
        const io = req.app.get('io');
        if (io) {
            const targetRooms = Array.from(
                new Set([
                    String(targetConversationId),
                    ...convDoc.participants.map((p) => String(p)),
                ])
            );
            io.to(targetRooms).emit('receive_message', populatedMessage);
        }

        res.status(201).json(populatedMessage);
    } catch (err) {
        // Clean up file if DB failed
        if (req.file) fs.unlink(req.file.path, () => {});
        console.error('uploadFile error:', err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Serve an uploaded file (static serving is registered in server.js,
 *          but this endpoint adds auth-checking if needed in future)
 *          For now we simply rely on the express.static middleware.
 */
const serveFile = async (req, res) => {
    try {
        const { filename } = req.params;
        // Sanitize: no path traversal
        const safeName = path.basename(filename);
        const filePath = path.join(UPLOAD_DIR, safeName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.sendFile(filePath);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * @desc    Toggle an emoji reaction on a message
 * @route   POST /api/files/reactions/:messageId
 * @access  Private
 *
 * Body: { emoji: '👍' }
 */
const toggleReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        if (!emoji) {
            return res.status(400).json({ message: 'emoji is required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Verify user has access to this message's conversation
        if (message.conversation) {
            const conv = await Conversation.findById(message.conversation);
            if (!conv || !conv.participants.some((p) => String(p) === String(userId))) {
                return res.status(403).json({ message: 'Access denied' });
            }
        } else {
            // Direct message: user must be sender or receiver
            const isInvolved =
                String(message.sender) === String(userId) ||
                String(message.receiver) === String(userId);
            if (!isInvolved) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        // Find existing reaction entry for this emoji
        let reaction = message.reactions.find((r) => r.emoji === emoji);

        if (reaction) {
            const hasReacted = reaction.users.some((u) => String(u) === String(userId));
            if (hasReacted) {
                // Remove user from this reaction
                reaction.users = reaction.users.filter((u) => String(u) !== String(userId));
                // Remove empty reaction
                if (reaction.users.length === 0) {
                    message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
                }
            } else {
                // Add user to this reaction
                reaction.users.push(userId);
            }
        } else {
            // Create new reaction
            message.reactions.push({ emoji, users: [userId] });
        }

        await message.save();

        const populatedMessage = await Message.findById(messageId)
            .populate('sender', 'name userTag avatar')
            .lean();

        // Broadcast update via Socket.IO
        const io = req.app.get('io');
        if (io) {
            const rooms = [String(messageId)];
            if (message.conversation) {
                rooms.push(String(message.conversation));
                const conv = await Conversation.findById(message.conversation);
                if (conv) {
                    conv.participants.forEach((p) => rooms.push(String(p)));
                }
            } else {
                if (message.sender) rooms.push(String(message.sender));
                if (message.receiver) rooms.push(String(message.receiver));
            }
            const uniqueRooms = Array.from(new Set(rooms));
            io.to(uniqueRooms).emit('reaction_updated', {
                messageId: String(messageId),
                reactions: populatedMessage.reactions,
            });
        }

        res.json({ reactions: populatedMessage.reactions });
    } catch (err) {
        console.error('toggleReaction error:', err);
        res.status(500).json({ message: err.message });
    }
};

module.exports = { uploadFile, serveFile, toggleReaction };
