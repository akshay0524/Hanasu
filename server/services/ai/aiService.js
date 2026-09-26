const { getAIClient, getModelName } = require('./aiClient');
const {
    buildCatchMeUpPrompt,
    buildChunkSummaryPrompt,
    buildSynthesisPrompt,
    buildSummarizePrompt,
    buildExplainPrompt,
    buildTranslatePrompt,
    buildSmartReplyPrompt,
    buildMemoryExtractionPrompt,
    buildTaskExtractionPrompt,
} = require('./promptBuilder');
const { parseAIResponse, sanitizeCatchMeUp } = require('./responseParser');
const { getCacheKey, withDeduplication } = require('./aiCache');

const CHUNK_SIZE = 50;

// Central call method with error handling and fallback
const callLLM = async (systemPrompt, userPrompt, jsonMode = true) => {
    const client = getAIClient();
    const model = getModelName();

    if (!client) {
        // Fallback for offline/no-key development mode
        return {
            isFallback: true,
            rawText: '',
            data: null,
        };
    }

    try {
        const payload = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.2, // Low temperature for high factual accuracy
        };

        if (jsonMode) {
            payload.response_format = { type: 'json_object' };
        }

        const completion = await client.chat.completions.create(payload);
        const text = completion.choices[0]?.message?.content || '';
        const data = jsonMode ? parseAIResponse(text) : null;

        return {
            isFallback: false,
            rawText: text,
            data,
        };
    } catch (err) {
        console.error('LLM API Error:', err.message || err);
        return {
            isFallback: true,
            error: err.message,
            rawText: '',
            data: null,
        };
    }
};

// ─── CATCH ME UP ───────────────────────────────────────────────────────────────

const catchMeUp = async (messages, conversationName = 'Conversation', conversationId = 'default') => {
    if (!messages || messages.length === 0) {
        return {
            unreadCount: 0,
            summary: 'You are all caught up! No unread messages in this conversation.',
            keyPoints: [],
            decisions: [],
            actionItems: [],
            unresolvedQuestions: [],
            importantMessages: [],
        };
    }

    const firstId = messages[0]?._id ? String(messages[0]._id) : '';
    const lastId = messages[messages.length - 1]?._id ? String(messages[messages.length - 1]._id) : '';
    const cacheKey = getCacheKey(conversationId, firstId, lastId, messages.length);

    return withDeduplication(cacheKey, async () => {
        // Single pass if message count is manageable (<= 60)
        if (messages.length <= 60) {
            const { systemPrompt, userPrompt } = buildCatchMeUpPrompt(messages, conversationName);
            const response = await callLLM(systemPrompt, userPrompt, true);

            if (!response.isFallback && response.data) {
                const sanitized = sanitizeCatchMeUp(response.data, messages.length);
                return {
                    unreadCount: messages.length,
                    ...sanitized,
                };
            }

            // Fallback generation from messages
            return generateLocalFallbackCatchMeUp(messages, conversationName);
        }

        // Hierarchical summarization for large conversations (> 60 messages)
        const chunks = [];
        for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
            chunks.push(messages.slice(i, i + CHUNK_SIZE));
        }

        const chunkSummaries = [];
        for (const chunk of chunks) {
            const { systemPrompt, userPrompt } = buildChunkSummaryPrompt(chunk);
            const chunkRes = await callLLM(systemPrompt, userPrompt, true);
            if (!chunkRes.isFallback && chunkRes.data) {
                chunkSummaries.push(chunkRes.data);
            }
        }

        if (chunkSummaries.length > 0) {
            const { systemPrompt, userPrompt } = buildSynthesisPrompt(chunkSummaries, conversationName);
            const synthRes = await callLLM(systemPrompt, userPrompt, true);
            if (!synthRes.isFallback && synthRes.data) {
                const sanitized = sanitizeCatchMeUp(synthRes.data, messages.length);
                return {
                    unreadCount: messages.length,
                    ...sanitized,
                };
            }
        }

        return generateLocalFallbackCatchMeUp(messages, conversationName);
    });
};

const generateLocalFallbackCatchMeUp = (messages, conversationName) => {
    const senders = Array.from(new Set(messages.map((m) => m.sender?.name || 'A member')));
    const lastThree = messages.slice(-3);

    return {
        unreadCount: messages.length,
        summary: `In ${conversationName}, ${senders.join(', ')} shared ${messages.length} messages covering updates and project discussions.`,
        keyPoints: [
            `Active participants: ${senders.join(', ')}`,
            `Total unread messages: ${messages.length}`,
        ],
        decisions: [],
        actionItems: [],
        unresolvedQuestions: [],
        importantMessages: lastThree.map((m) => ({
            messageId: m._id ? String(m._id) : null,
            sender: m.sender?.name || 'Member',
            snippet: (m.content || '').slice(0, 60),
            reason: 'Recent update from discussion',
        })),
    };
};

// ─── AI MESSAGE ACTIONS ────────────────────────────────────────────────────────

const summarizeMessage = async (text) => {
    if (!text || !text.trim()) return { summary: 'No text provided.' };
    const { systemPrompt, userPrompt } = buildSummarizePrompt(text);
    const res = await callLLM(systemPrompt, userPrompt, true);
    if (!res.isFallback && res.data?.summary) {
        return { summary: res.data.summary };
    }
    return { summary: text.length > 100 ? `${text.slice(0, 97)}...` : text };
};

const explainMessage = async (text, context = '') => {
    if (!text || !text.trim()) return { explanation: 'No text provided.' };
    const { systemPrompt, userPrompt } = buildExplainPrompt(text, context);
    const res = await callLLM(systemPrompt, userPrompt, true);
    if (!res.isFallback && res.data?.explanation) {
        return { explanation: res.data.explanation };
    }
    return {
        explanation: `This message discusses "${text}". In the context of the conversation, it provides direct updates or questions between participants.`,
    };
};

const translateMessage = async (text, targetLang = 'English') => {
    if (!text || !text.trim()) return { translatedText: '', detectedSourceLang: 'unknown' };
    const { systemPrompt, userPrompt } = buildTranslatePrompt(text, targetLang);
    const res = await callLLM(systemPrompt, userPrompt, true);
    if (!res.isFallback && res.data?.translatedText) {
        return {
            translatedText: res.data.translatedText,
            detectedSourceLang: res.data.detectedSourceLang || 'auto',
        };
    }
    return {
        translatedText: `[Translated to ${targetLang}]: ${text}`,
        detectedSourceLang: 'auto',
    };
};

const generateSmartReplies = async (message, context = '') => {
    if (!message || !message.trim()) {
        return { suggestions: ['Got it!', 'Sounds good.', 'Let me check on that.'] };
    }
    const { systemPrompt, userPrompt } = buildSmartReplyPrompt(message, context);
    const res = await callLLM(systemPrompt, userPrompt, true);
    if (!res.isFallback && Array.isArray(res.data?.suggestions) && res.data.suggestions.length > 0) {
        return { suggestions: res.data.suggestions.slice(0, 3) };
    }
    return {
        suggestions: ['Sounds good!', 'Understood, thanks.', 'Will get back to you shortly.'],
    };
};

const extractMemory = async (message, context = '') => {
    const { systemPrompt, userPrompt } = buildMemoryExtractionPrompt(message, context);
    const res = await callLLM(systemPrompt, userPrompt, true);
    if (!res.isFallback && res.data?.content) {
        return {
            content: res.data.content,
            category: res.data.category || 'general',
            tags: Array.isArray(res.data.tags) ? res.data.tags : [],
        };
    }
    return {
        content: message.trim(),
        category: 'general',
        tags: ['note'],
    };
};

const extractTask = async (message, context = '') => {
    const { systemPrompt, userPrompt } = buildTaskExtractionPrompt(message, context);
    const res = await callLLM(systemPrompt, userPrompt, true);
    if (!res.isFallback && res.data?.title) {
        return {
            title: res.data.title,
            description: res.data.description || '',
            assignee: res.data.assignee || null,
            deadline: res.data.deadline || null,
            priority: res.data.priority || 'medium',
        };
    }
    return {
        title: message.slice(0, 60),
        description: message,
        assignee: null,
        deadline: null,
        priority: 'medium',
    };
};

module.exports = {
    catchMeUp,
    summarizeMessage,
    explainMessage,
    translateMessage,
    generateSmartReplies,
    extractMemory,
    extractTask,
};
