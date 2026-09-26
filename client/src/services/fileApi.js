import api from './api';

/**
 * Upload a file and create a message.
 * @param {FormData} formData  Must contain: file, conversationId or receiverId, optional caption
 * @param {function} onProgress  Progress callback (0–100)
 */
export const uploadFile = async (formData, onProgress) => {
    const { data } = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
            if (onProgress && e.total) {
                onProgress(Math.round((e.loaded * 100) / e.total));
            }
        },
    });
    return data;
};

/**
 * Toggle an emoji reaction on a message.
 * @param {string} messageId
 * @param {string} emoji  e.g. '👍'
 */
export const toggleReaction = async (messageId, emoji) => {
    const { data } = await api.post(`/files/reactions/${messageId}`, { emoji });
    return data;
};
