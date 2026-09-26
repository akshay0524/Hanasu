const mongoose = require('mongoose');
const User = require('../models/User');
const AIChat = require('../models/AIChat');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const ConversationReadState = require('../models/ConversationReadState');
const UserMemory = require('../models/UserMemory');
const UserTask = require('../models/UserTask');
const aiService = require('../services/ai/aiService');
const { getAIClient, getModelName } = require('../services/ai/aiClient');

const SYSTEM_PROMPT =
    'You are Hanasu AI, an intelligent, helpful, and polite assistant. Explain answers clearly and step-by-step. Be concise and accurate.';

// Helper to verify user has access to a message
const verifyMessageAccess = async (userId, messageId) => {
    if (!messageId) return true; // Direct content analysis
    if (!mongoose.Types.ObjectId.isValid(messageId)) return false;
    const message = await Message.findById(messageId);
    if (!message) return false;

    if (message.conversation) {
        const conv = await Conversation.findById(message.conversation);
        if (!conv) return false;
        return conv.participants.some((p) => String(p) === String(userId));
    }

    return (
        String(message.sender) === String(userId) ||
        String(message.receiver) === String(userId)
    );
};

// ─── CATCH ME UP ───────────────────────────────────────────────────────────────

// @desc    Get Catch Me Up summary of unread messages for a conversation
// @route   GET /api/ai/catch-me-up/:conversationId
// @access  Private
const getCatchMeUp = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid conversation ID' });
        }

        let conversation = await Conversation.findById(conversationId);

        // If not found by conversation ID, check if it's a direct friend's user ID
        if (!conversation) {
            conversation = await Conversation.findOne({
                type: 'direct',
                participants: { $all: [userId, conversationId], $size: 2 },
            });
            if (!conversation) {
                conversation = await Conversation.getOrCreate(userId, conversationId);
            }
        }

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const isMember = conversation.participants.some((p) => String(p) === String(userId));
        if (!isMember) {
            return res.status(403).json({ message: 'Access denied: not a member of this conversation' });
        }

        // Fetch user's read state
        const readState = await ConversationReadState.findOne({
            user: userId,
            conversation: conversation._id,
        });

        const otherParticipant = conversation.participants.find(
            (p) => String(p) !== String(userId)
        );

        const baseMatch = {
            $or: [
                { conversation: conversation._id },
                ...(otherParticipant
                    ? [
                          { sender: userId, receiver: otherParticipant },
                          { sender: otherParticipant, receiver: userId },
                      ]
                    : []),
            ],
        };

        // Query unread messages
        const unreadQuery = {
            ...baseMatch,
            sender: { $ne: userId },
        };

        if (readState && readState.lastReadAt) {
            unreadQuery.createdAt = { $gt: readState.lastReadAt };
        } else {
            unreadQuery.read = false;
        }

        let unreadMessages = await Message.find(unreadQuery)
            .populate('sender', 'name userTag')
            .sort({ createdAt: 1 })
            .lean();

        const actualUnreadCount = unreadMessages.length;

        // If no unread messages (e.g. user just opened chat), provide context from recent messages (up to 20)
        let messagesToSummarize = unreadMessages;
        if (messagesToSummarize.length === 0) {
            messagesToSummarize = await Message.find(baseMatch)
                .populate('sender', 'name userTag')
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();
            messagesToSummarize.reverse();
        }

        let convName =
            conversation.type === 'group'
                ? conversation.name || 'Group Chat'
                : 'Direct Conversation';

        if (conversation.type === 'direct' && otherParticipant) {
            const partnerUser = await User.findById(otherParticipant).select('name');
            if (partnerUser) convName = partnerUser.name;
        }

        const result = await aiService.catchMeUp(
            messagesToSummarize,
            convName,
            String(conversation._id)
        );

        res.json({
            ...result,
            unreadCount: actualUnreadCount,
        });
    } catch (error) {
        console.error('getCatchMeUp error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── AI MESSAGE ACTIONS ────────────────────────────────────────────────────────

// @desc    Summarize a single message
// @route   POST /api/ai/actions/summarize
// @access  Private
const summarizeAction = async (req, res) => {
    try {
        const { messageId, content } = req.body;
        const userId = req.user._id;

        if (messageId) {
            const hasAccess = await verifyMessageAccess(userId, messageId);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied to this message' });
            }
        }

        let text = content;
        if (!text && messageId) {
            const msg = await Message.findById(messageId);
            text = msg ? msg.content : '';
        }

        const result = await aiService.summarizeMessage(text);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Explain a single message
// @route   POST /api/ai/actions/explain
// @access  Private
const explainAction = async (req, res) => {
    try {
        const { messageId, content, context } = req.body;
        const userId = req.user._id;

        if (messageId) {
            const hasAccess = await verifyMessageAccess(userId, messageId);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied to this message' });
            }
        }

        let text = content;
        if (!text && messageId) {
            const msg = await Message.findById(messageId);
            text = msg ? msg.content : '';
        }

        const result = await aiService.explainMessage(text, context);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Translate a single message
// @route   POST /api/ai/actions/translate
// @access  Private
const translateAction = async (req, res) => {
    try {
        const { messageId, content, targetLang } = req.body;
        const userId = req.user._id;

        if (messageId) {
            const hasAccess = await verifyMessageAccess(userId, messageId);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied to this message' });
            }
        }

        let text = content;
        if (!text && messageId) {
            const msg = await Message.findById(messageId);
            text = msg ? msg.content : '';
        }

        const result = await aiService.translateMessage(text, targetLang || 'English');
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate smart replies for a message
// @route   POST /api/ai/actions/smart-reply
// @access  Private
const smartReplyAction = async (req, res) => {
    try {
        const { messageId, content, context } = req.body;
        const userId = req.user._id;

        if (messageId) {
            const hasAccess = await verifyMessageAccess(userId, messageId);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied to this message' });
            }
        }

        let text = content;
        if (!text && messageId) {
            const msg = await Message.findById(messageId);
            text = msg ? msg.content : '';
        }

        const result = await aiService.generateSmartReplies(text, context);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── MEMORY ────────────────────────────────────────────────────────────────────

// @desc    Extract memory preview from message
// @route   POST /api/ai/memory/extract
// @access  Private
const extractMemoryAction = async (req, res) => {
    try {
        const { messageId, content, context } = req.body;
        const userId = req.user._id;

        if (messageId) {
            const hasAccess = await verifyMessageAccess(userId, messageId);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied to this message' });
            }
        }

        let text = content;
        if (!text && messageId) {
            const msg = await Message.findById(messageId);
            text = msg ? msg.content : '';
        }

        const result = await aiService.extractMemory(text, context);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save confirmed memory
// @route   POST /api/ai/memory/save
// @access  Private
const saveMemory = async (req, res) => {
    try {
        const { messageId, conversationId, content, category, tags } = req.body;
        const userId = req.user._id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Memory content is required' });
        }

        const memory = await UserMemory.create({
            user: userId,
            message: messageId || null,
            conversation: conversationId || null,
            content: content.trim(),
            category: category || 'general',
            tags: Array.isArray(tags) ? tags : [],
        });

        res.status(201).json(memory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user memories
// @route   GET /api/ai/memory
// @access  Private
const getMemories = async (req, res) => {
    try {
        const userId = req.user._id;
        const memories = await UserMemory.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.json(memories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a memory
// @route   DELETE /api/ai/memory/:memoryId
// @access  Private
const deleteMemory = async (req, res) => {
    try {
        const { memoryId } = req.params;
        const userId = req.user._id;

        const memory = await UserMemory.findOne({ _id: memoryId, user: userId });
        if (!memory) {
            return res.status(404).json({ message: 'Memory not found' });
        }

        await UserMemory.findByIdAndDelete(memoryId);
        res.json({ message: 'Memory deleted successfully', memoryId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── TASKS ─────────────────────────────────────────────────────────────────────

// @desc    Extract task preview from message
// @route   POST /api/ai/task/extract
// @access  Private
const extractTaskAction = async (req, res) => {
    try {
        const { messageId, content, context } = req.body;
        const userId = req.user._id;

        if (messageId) {
            const hasAccess = await verifyMessageAccess(userId, messageId);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Access denied to this message' });
            }
        }

        let text = content;
        if (!text && messageId) {
            const msg = await Message.findById(messageId);
            text = msg ? msg.content : '';
        }

        const result = await aiService.extractTask(text, context);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save confirmed task
// @route   POST /api/ai/task/save
// @access  Private
const saveTask = async (req, res) => {
    try {
        const { messageId, conversationId, title, description, assignee, deadline, priority } = req.body;
        const userId = req.user._id;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        const task = await UserTask.create({
            user: userId,
            message: messageId || null,
            conversation: conversationId || null,
            title: title.trim(),
            description: description || '',
            assignee: assignee || null,
            deadline: deadline || null,
            priority: priority || 'medium',
            status: 'pending',
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user tasks
// @route   GET /api/ai/task
// @access  Private
const getTasks = async (req, res) => {
    try {
        const userId = req.user._id;
        const tasks = await UserTask.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a task (status, title, deadline)
// @route   PUT /api/ai/task/:taskId
// @access  Private
const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user._id;
        const { status, title, description, assignee, deadline, priority } = req.body;

        const task = await UserTask.findOne({ _id: taskId, user: userId });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (status) task.status = status;
        if (title) task.title = title.trim();
        if (description !== undefined) task.description = description;
        if (assignee !== undefined) task.assignee = assignee;
        if (deadline !== undefined) task.deadline = deadline;
        if (priority) task.priority = priority;

        await task.save();
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a task
// @route   DELETE /api/ai/task/:taskId
// @access  Private
const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user._id;

        const task = await UserTask.findOne({ _id: taskId, user: userId });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        await UserTask.findByIdAndDelete(taskId);
        res.json({ message: 'Task deleted successfully', taskId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── 1-ON-1 AI CHAT (EXISTING HANASU ASSISTANT) ────────────────────────────────

// @desc    Chat with AI Assistant
// @route   POST /api/ai/chat
// @access  Private
const chatWithAI = async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ message: 'Message is required' });
    }

    try {
        let aiChat = await AIChat.findOne({ user: req.user._id });
        if (!aiChat) {
            aiChat = await AIChat.create({
                user: req.user._id,
                messages: [],
            });
        }

        const historyContext = aiChat.messages.slice(-10).map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));

        const messagesPayload = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...historyContext,
            { role: 'user', content: message },
        ];

        let aiResponseContent =
            'I am Hanasu AI assistant. Please configure your GEMINI_API_KEY or OPENAI_API_KEY for live responses.';

        const client = getAIClient();
        if (client) {
            try {
                const completion = await client.chat.completions.create({
                    messages: messagesPayload,
                    model: getModelName(),
                });
                aiResponseContent = completion.choices[0].message.content;
            } catch (apiError) {
                console.error('AI chat completion error:', apiError);
                aiResponseContent =
                    'Sorry, I am having trouble connecting to my brain right now. Please try again later.';
            }
        }

        aiChat.messages.push({ role: 'user', content: message });
        aiChat.messages.push({ role: 'assistant', content: aiResponseContent });
        await aiChat.save();

        res.json({
            role: 'assistant',
            content: aiResponseContent,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get AI Chat History
// @route   GET /api/ai/history
// @access  Private
const getAIHistory = async (req, res) => {
    try {
        const aiChat = await AIChat.findOne({ user: req.user._id });
        if (!aiChat) {
            return res.json([]);
        }
        res.json(aiChat.messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCatchMeUp,
    summarizeAction,
    explainAction,
    translateAction,
    smartReplyAction,
    extractMemoryAction,
    saveMemory,
    getMemories,
    deleteMemory,
    extractTaskAction,
    saveTask,
    getTasks,
    updateTask,
    deleteTask,
    chatWithAI,
    getAIHistory,
};
