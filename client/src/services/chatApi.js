import api from './api';

export const getChatHistory = async (friendId) => {
    const { data } = await api.get(`/chat/${friendId}`);
    return data;
};
