import { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    useEffect(() => {
        if (user) {
            const newSocket = io(import.meta.env.VITE_SOCKET_URL);

            newSocket.on('connect', () => {
                console.log('Socket connected');
                newSocket.emit('join_room', user.id);
            });

            // Listeners for online status
            newSocket.on('online_users_list', (users) => {
                setOnlineUsers(new Set(users));
            });

            newSocket.on('user_status_change', ({ userId, status }) => {
                setOnlineUsers(prev => {
                    const newSet = new Set(prev);
                    if (status === 'online') newSet.add(userId);
                    else newSet.delete(userId);
                    return newSet;
                });
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        } else {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
