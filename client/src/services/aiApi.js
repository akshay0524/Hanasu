import api from './api';

export const chatWithAI = async (message) => {
    const { data } = await api.post('/ai/chat', { message });
    return data;
};

export const getAIHistory = async () => {
    const { data } = await api.get('/ai/history');
    return data;
};
