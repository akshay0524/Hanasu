const OpenAI = require('openai');
const { prisma } = require('../config/db');

// Initialize OpenAI only if key exists (prevents crash on start if missing)
let openai;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

const SYSTEM_PROMPT = "You are a helpful, intelligent, and polite AI assistant. Explain answers clearly and step-by-step. Be concise but accurate. If unsure, ask clarifying questions. Never hallucinate information.";

// @desc    Chat with AI
// @route   POST /api/ai/chat
// @access  Private
const chatWithAI = async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ message: 'Message is required' });
    }

    try {
        // 1. Get or create chat history
        let aiChat = await prisma.aIChat.findUnique({
            where: { userId: req.user.id },
            include: {
                messages: {
                    orderBy: { timestamp: 'asc' },
                    take: -10 // Last 10 messages
                }
            }
        });

        if (!aiChat) {
            aiChat = await prisma.aIChat.create({
                data: {
                    userId: req.user.id,
                },
                include: {
                    messages: true
                }
            });
        }

        // 2. Prepare context for AI
        const historyContext = aiChat.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const messagesPayload = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...historyContext,
            { role: 'user', content: message }
        ];

        let aiResponseContent = "I am an AI assistant. Please configure your OPENAI_API_KEY to get real responses.";

        // 3. Call OpenAI API if configured
        if (openai) {
            try {
                const completion = await openai.chat.completions.create({
                    messages: messagesPayload,
                    model: 'gpt-3.5-turbo', // or gpt-4
                });
                aiResponseContent = completion.choices[0].message.content;
            } catch (apiError) {
                console.error("OpenAI API Error:", apiError);
                aiResponseContent = "Sorry, I am having trouble connecting to my brain right now. Please try again later.";
            }
        }

        // 4. Save to DB using transaction
        const [userMessage, assistantMessage] = await prisma.$transaction([
            prisma.aIMessage.create({
                data: {
                    chatId: aiChat.id,
                    role: 'user',
                    content: message
                }
            }),
            prisma.aIMessage.create({
                data: {
                    chatId: aiChat.id,
                    role: 'assistant',
                    content: aiResponseContent
                }
            })
        ]);

        // Return the assistant's response
        res.json({
            role: 'assistant',
            content: aiResponseContent,
            timestamp: assistantMessage.timestamp
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
        const aiChat = await prisma.aIChat.findUnique({
            where: { userId: req.user.id },
            include: {
                messages: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        if (!aiChat) {
            return res.json([]);
        }

        res.json(aiChat.messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { chatWithAI, getAIHistory };
