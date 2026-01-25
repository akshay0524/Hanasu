import api from './api';

export const searchUser = async (userTag) => {
    // Encode # if present, though axios handles it usually. 
    // But # in URL param is fragment. Must encode.
    const tag = encodeURIComponent(userTag);
    const { data } = await api.get(`/users/search/${tag}`);
    return data;
};

export const sendFriendRequest = async (receiverId) => {
    const { data } = await api.post('/friends/request', { receiverId });
    return data;
};

export const acceptFriendRequest = async (requestId) => {
    const { data } = await api.post('/friends/accept', { requestId });
    return data;
};

export const rejectFriendRequest = async (requestId) => {
    const { data } = await api.post('/friends/reject', { requestId });
    return data;
};

export const getFriends = async () => {
    const { data } = await api.get('/friends/list');
    return data;
};

export const getFriendRequests = async () => {
    const { data } = await api.get('/friends/requests');
    return data;
};
