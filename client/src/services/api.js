import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
    } catch (e) {
        // Ignore parse error
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token is invalid or expired
            const isAuthRoute = error.config?.url?.includes('/auth/google');
            if (!isAuthRoute) {
                localStorage.removeItem('user');
                if (window.location.hash !== '#/login') {
                    window.location.hash = '#/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;

