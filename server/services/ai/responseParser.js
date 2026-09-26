// Safely parse JSON from LLM output (handles ```json fences, whitespace, etc.)
const parseAIResponse = (text) => {
    if (!text || typeof text !== 'string') {
        return null;
    }

    let cleaned = text.trim();

    // Strip markdown code fences if present
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    try {
        return JSON.parse(cleaned);
    } catch (err) {
        // Attempt to extract first matching JSON block {...}
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (innerErr) {
                console.error('Failed to parse extracted JSON block:', innerErr.message);
            }
        }
        console.error('JSON parse error from AI output:', err.message, '\nRaw text:', text);
        return null;
    }
};

const sanitizeCatchMeUp = (parsed, fallbackCount = 0) => {
    const safeObj = parsed || {};
    return {
        summary: typeof safeObj.summary === 'string' ? safeObj.summary : 'Summary unavailable.',
        keyPoints: Array.isArray(safeObj.keyPoints) ? safeObj.keyPoints : [],
        decisions: Array.isArray(safeObj.decisions) ? safeObj.decisions : [],
        actionItems: Array.isArray(safeObj.actionItems)
            ? safeObj.actionItems.map((item) => ({
                  task: item.task || 'Unspecified task',
                  assignee: item.assignee || null,
                  deadline: item.deadline || null,
              }))
            : [],
        unresolvedQuestions: Array.isArray(safeObj.unresolvedQuestions) ? safeObj.unresolvedQuestions : [],
        importantMessages: Array.isArray(safeObj.importantMessages)
            ? safeObj.importantMessages.map((m) => ({
                  messageId: m.messageId || null,
                  sender: m.sender || 'Member',
                  snippet: m.snippet || '',
                  reason: m.reason || '',
              }))
            : [],
    };
};

module.exports = {
    parseAIResponse,
    sanitizeCatchMeUp,
};
