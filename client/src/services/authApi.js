import api from './api';

export const googleAuth = async (token) => {
    const { data } = await api.post('/auth/google', { token });
    return data;
};

export const getMe = async () => {
    const { data } = await api.get('/auth/me');
    return data;
};
