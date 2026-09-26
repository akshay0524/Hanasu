import api from './api';

// Conversations
export const getConversations = async () => {
    const { data } = await api.get('/chat/conversations');
    return data;
};

export const getUnreadCounts = async () => {
    const { data } = await api.get('/chat/unread/counts');
    return data;
};

// Group Management
export const createGroup = async (groupData) => {
    const { data } = await api.post('/chat/groups', groupData);
    return data;
};

export const getGroupDetails = async (groupId) => {
    const { data } = await api.get(`/chat/groups/${groupId}`);
    return data;
};

export const updateGroup = async (groupId, updateData) => {
    const { data } = await api.put(`/chat/groups/${groupId}`, updateData);
    return data;
};

export const addGroupMembers = async (groupId, memberIds) => {
    const { data } = await api.post(`/chat/groups/${groupId}/members`, { memberIds });
    return data;
};

export const removeGroupMember = async (groupId, targetUserId) => {
    const { data } = await api.delete(`/chat/groups/${groupId}/members/${targetUserId}`);
    return data;
};

export const updateGroupAdmin = async (groupId, { targetUserId, action }) => {
    const { data } = await api.put(`/chat/groups/${groupId}/admins`, { targetUserId, action });
    return data;
};

// Unified Messages & Read State
export const getConversationMessages = async (conversationId, params = {}) => {
    const { data } = await api.get(`/chat/conversation/${conversationId}/messages`, { params });
    return data;
};

export const markConversationAsRead = async (conversationId) => {
    const { data } = await api.put(`/chat/conversation/${conversationId}/read`);
    return data;
};

// Legacy Direct Chat compatibility
export const getChatHistory = async (friendId) => {
    const { data } = await api.get(`/chat/${friendId}`);
    return data;
};

export const markMessagesAsRead = async (friendId) => {
    const { data } = await api.put(`/chat/${friendId}/read`);
    return data;
};
