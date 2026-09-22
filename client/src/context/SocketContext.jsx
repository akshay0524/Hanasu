import { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const socketRef = useRef(null);

    const userId = user?._id ? String(user._id) : null;

    useEffect(() => {
        if (!userId) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setOnlineUsers(new Set());
            }
            return;
        }

        const socketUrl = import.meta.env.VITE_SOCKET_URL;
        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });

        const handleJoin = () => {
            newSocket.emit('join_room', userId);
            newSocket.emit('get_online_users');
        };

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            handleJoin();
        });

        // Also emit join if already connected
        if (newSocket.connected) {
            handleJoin();
        }

        newSocket.io.on('reconnect', () => {
            console.log('Socket reconnected');
            handleJoin();
        });

        // Listeners for online status
        newSocket.on('online_users_list', (users) => {
            if (Array.isArray(users)) {
                setOnlineUsers(new Set(users.map(u => String(u))));
            }
        });

        newSocket.on('user_status_change', ({ userId: changedId, status }) => {
            if (!changedId) return;
            const idStr = String(changedId);
            setOnlineUsers(prev => {
                const next = new Set(prev);
                if (status === 'online') {
                    next.add(idStr);
                } else {
                    next.delete(idStr);
                }
                return next;
            });
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
            socketRef.current = null;
        };
    }, [userId]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};

