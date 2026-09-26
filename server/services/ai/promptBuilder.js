// Format messages into a sanitized text representation for AI consumption
// Minimizes tokens and strips unnecessary metadata
const formatMessagesForPrompt = (messages) => {
    return messages
        .map((m) => {
            const senderName = m.sender?.name || 'User';
            const id = m._id ? String(m._id) : '';
            const text = m.content || '';
            const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return `[ID: ${id}] [${time}] ${senderName}: ${text}`;
        })
        .join('\n');
};

const buildCatchMeUpPrompt = (messages, conversationName = 'Conversation') => {
    const formattedChat = formatMessagesForPrompt(messages);

    const systemPrompt = `You are Hanasu AI, an intelligent executive summarizer for team and group discussions.
Your task is to analyze unread messages and provide a structured catch-up report.
CRITICAL RULES:
1. ONLY use information explicitly present in the messages. DO NOT hallucinate or assume details.
2. For "importantMessages", reference ONLY real message IDs from the prompt. Never invent fake message IDs.
3. For action items, if assignee or deadline is not mentioned, set them to null.
4. Output MUST be valid JSON conforming strictly to the requested schema.`;

    const userPrompt = `Conversation: "${conversationName}"
Unread Messages (${messages.length} total):
---
${formattedChat}
---

Return a strict JSON object with this exact structure:
{
  "summary": "A clear 2-3 sentence overview of the conversation",
  "keyPoints": ["Main topic or discussion point 1", "Main topic 2"],
  "decisions": ["Any agreed decision or confirmed outcome"],
  "actionItems": [
    {
      "task": "Specific task",
      "assignee": "Name or null if unspecified",
      "deadline": "Timeframe/date or null if unspecified"
    }
  ],
  "unresolvedQuestions": ["Any open question that was not answered"],
  "importantMessages": [
    {
      "messageId": "exact ID from message list",
      "sender": "sender name",
      "snippet": "short excerpt (under 60 chars)",
      "reason": "why this message matters"
    }
  ]
}`;

    return { systemPrompt, userPrompt };
};

const buildChunkSummaryPrompt = (chunkMessages) => {
    const formatted = formatMessagesForPrompt(chunkMessages);

    const systemPrompt = `You are Hanasu AI. Summarize this segment of a discussion concisely.
Extract: key topics, decisions, actions, and notable points with message IDs.
Do not hallucinate. Output strict JSON.`;

    const userPrompt = `Discussion segment:
---
${formatted}
---

Return strict JSON:
{
  "summary": "Concise summary of this segment",
  "keyPoints": ["..."],
  "decisions": ["..."],
  "actionItems": [{ "task": "...", "assignee": null, "deadline": null }],
  "unresolvedQuestions": ["..."],
  "importantMessages": [{ "messageId": "exact ID", "sender": "name", "snippet": "...", "reason": "..." }]
}`;

    return { systemPrompt, userPrompt };
};

const buildSynthesisPrompt = (chunkSummaries, conversationName) => {
    const systemPrompt = `You are Hanasu AI. Synthesize multiple discussion summaries into one comprehensive, unified Catch Me Up report. Output strict JSON.`;

    const userPrompt = `Conversation: "${conversationName}"
Intermediate Summaries:
${JSON.stringify(chunkSummaries, null, 2)}

Produce the final consolidated JSON:
{
  "summary": "Overall synthesis across all segments",
  "keyPoints": ["Consolidated key point 1", "..."],
  "decisions": ["Consolidated decision 1", "..."],
  "actionItems": [{ "task": "...", "assignee": null, "deadline": null }],
  "unresolvedQuestions": ["..."],
  "importantMessages": [{ "messageId": "ID", "sender": "name", "snippet": "...", "reason": "..." }]
}`;

    return { systemPrompt, userPrompt };
};

const buildSummarizePrompt = (text) => {
    return {
        systemPrompt: `You are Hanasu AI. Provide a concise, clear summary of the user's message. Capture the core meaning in 1-3 bullet points or a brief sentence. Output strict JSON: { "summary": "..." }`,
        userPrompt: `Message to summarize:\n"${text}"`,
    };
};

const buildExplainPrompt = (text, context = '') => {
    return {
        systemPrompt: `You are Hanasu AI. Clearly explain the technical term, concept, phrasing, or subtext in the provided message. Keep the tone helpful, lucid, and easy to understand. Output strict JSON: { "explanation": "..." }`,
        userPrompt: `${context ? `Context:\n${context}\n\n` : ''}Message to explain:\n"${text}"`,
    };
};

const buildTranslatePrompt = (text, targetLang = 'English') => {
    return {
        systemPrompt: `You are Hanasu AI. Translate the given text accurately and naturally into ${targetLang}. Preserve the tone, nuance, and intent of the original message. Output strict JSON: { "translatedText": "...", "detectedSourceLang": "..." }`,
        userPrompt: `Text to translate:\n"${text}"`,
    };
};

const buildSmartReplyPrompt = (message, context = '') => {
    return {
        systemPrompt: `You are Hanasu AI. Suggest 2 to 3 concise, context-aware, natural replies to the message. The replies should vary in tone (e.g. affirmative, questioning, brief acknowledgment). Output strict JSON: { "suggestions": ["Reply 1", "Reply 2", "Reply 3"] }`,
        userPrompt: `${context ? `Recent conversation context:\n${context}\n\n` : ''}Last message received:\n"${message}"`,
    };
};

const buildMemoryExtractionPrompt = (message, context = '') => {
    return {
        systemPrompt: `You are Hanasu AI. Extract durable personal or project facts, preferences, dates, or contact info worth remembering from this message. If nothing durable exists, return a clear single takeaway. Output strict JSON:
{
  "content": "Clear extracted fact or memory statement",
  "category": "fact | preference | project | personal | decision | general",
  "tags": ["tag1", "tag2"]
}`,
        userPrompt: `${context ? `Context:\n${context}\n\n` : ''}Message:\n"${message}"`,
    };
};

const buildTaskExtractionPrompt = (message, context = '') => {
    return {
        systemPrompt: `You are Hanasu AI. Extract an actionable task item from the message. If an assignee or deadline is explicitly mentioned, extract it; otherwise set them to null. Do not invent missing information. Output strict JSON:
{
  "title": "Action-oriented task title",
  "description": "Additional context or notes if any",
  "assignee": "Name of assigned person or null",
  "deadline": "Deadline timeframe or null",
  "priority": "low | medium | high | urgent"
}`,
        userPrompt: `${context ? `Context:\n${context}\n\n` : ''}Message:\n"${message}"`,
    };
};

module.exports = {
    formatMessagesForPrompt,
    buildCatchMeUpPrompt,
    buildChunkSummaryPrompt,
    buildSynthesisPrompt,
    buildSummarizePrompt,
    buildExplainPrompt,
    buildTranslatePrompt,
    buildSmartReplyPrompt,
    buildMemoryExtractionPrompt,
    buildTaskExtractionPrompt,
};
