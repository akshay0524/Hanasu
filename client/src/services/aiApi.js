import api from './api';

// Catch Me Up
export const getCatchMeUp = async (conversationId) => {
    const { data } = await api.get(`/ai/catch-me-up/${conversationId}`);
    return data;
};

// AI Message Actions
export const summarizeMessage = async ({ messageId, content }) => {
    const { data } = await api.post('/ai/actions/summarize', { messageId, content });
    return data;
};

export const explainMessage = async ({ messageId, content, context }) => {
    const { data } = await api.post('/ai/actions/explain', { messageId, content, context });
    return data;
};

export const translateMessage = async ({ messageId, content, targetLang }) => {
    const { data } = await api.post('/ai/actions/translate', { messageId, content, targetLang });
    return data;
};

export const getSmartReplies = async ({ messageId, content, context }) => {
    const { data } = await api.post('/ai/actions/smart-reply', { messageId, content, context });
    return data;
};

// Memories
export const extractMemory = async ({ messageId, content, context }) => {
    const { data } = await api.post('/ai/memory/extract', { messageId, content, context });
    return data;
};

export const saveMemory = async (memoryData) => {
    const { data } = await api.post('/ai/memory/save', memoryData);
    return data;
};

export const getMemories = async () => {
    const { data } = await api.get('/ai/memory');
    return data;
};

export const deleteMemory = async (memoryId) => {
    const { data } = await api.delete(`/ai/memory/${memoryId}`);
    return data;
};

// Tasks
export const extractTask = async ({ messageId, content, context }) => {
    const { data } = await api.post('/ai/task/extract', { messageId, content, context });
    return data;
};

export const saveTask = async (taskData) => {
    const { data } = await api.post('/ai/task/save', taskData);
    return data;
};

export const getTasks = async () => {
    const { data } = await api.get('/ai/task');
    return data;
};

export const updateTask = async (taskId, updateData) => {
    const { data } = await api.put(`/ai/task/${taskId}`, updateData);
    return data;
};

export const deleteTask = async (taskId) => {
    const { data } = await api.delete(`/ai/task/${taskId}`);
    return data;
};

// 1-on-1 AI Assistant
export const chatWithAI = async (message) => {
    const { data } = await api.post('/ai/chat', { message });
    return data;
};

export const getAIHistory = async () => {
    const { data } = await api.get('/ai/history');
    return data;
};
