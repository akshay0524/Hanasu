import React, { useState, useEffect, useRef } from 'react';
import { getChatHistory } from '../../services/chatApi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { removeFriend } from '../../services/userApi';
import { FiSend, FiChevronLeft, FiMoreVertical, FiTrash2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const ChatWindow = ({ chat, onBack }) => {
    const { user } = useAuth();
    const { socket, onlineUsers } = useSocket();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!chat) return;
        const loadHistory = async () => {
            try {
                const data = await getChatHistory(chat.id);
                setMessages(data);
            } catch (error) { console.error(error); }
        };
        loadHistory();

        if (socket) {
            socket.on('receive_message', (newMessage) => {
                if (
                    (newMessage.sender === chat.id && newMessage.receiver === user.id) ||
                    (newMessage.sender === user.id && newMessage.receiver === chat.id)
                ) {
                    setMessages((prev) => [...prev, newMessage]);
                }
            });
        }
        return () => { if (socket) socket.off('receive_message'); }
    }, [chat, socket, user.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.on('typing', ({ senderId }) => {
            if (senderId === chat.id) setIsTyping(true);
        });

        socket.on('stop_typing', ({ senderId }) => {
            if (senderId === chat.id) setIsTyping(false);
        });

        return () => {
            socket.off('typing');
            socket.off('stop_typing');
        };
    }, [socket, chat]);

    let typingTimeout = null;
    const handleInput = (e) => {
        setInput(e.target.value);
        if (!socket) return;

        socket.emit('typing', { senderId: user.id, receiverId: chat.id });

        if (typingTimeout) clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
            socket.emit('stop_typing', { senderId: user.id, receiverId: chat.id });
        }, 2000);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        if (socket) {
            const msgData = { senderId: user.id, receiverId: chat.id, content: input };
            socket.emit('send_message', msgData);
            socket.emit('stop_typing', { senderId: user.id, receiverId: chat.id }); // Stop immediately on send
        }
        setInput('');
    };

    const [showMenu, setShowMenu] = useState(false);

    const handleUnfriend = async () => {
        if (window.confirm(`Are you sure you want to remove ${chat.name}?`)) {
            try {
                await removeFriend(chat.id);
                onBack(); // Go back to list
                window.location.reload(); // Refresh to update list
            } catch (error) {
                alert("Failed to remove friend");
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[var(--bg-primary)]/40 relative">
            {/* Minimal Floating Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="md:hidden p-2 rounded-full bg-white/5 text-[var(--text-primary)] hover:bg-white/10 transition backdrop-blur-md"
                    >
                        <FiChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3 bg-[var(--bg-panel)] p-2 pr-6 rounded-full border border-white/5 backdrop-blur-md">
                        <img src={chat.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                        <div>
                            <h3 className="font-medium text-[var(--text-primary)] text-sm">{chat.name}</h3>
                            <span className={`text-[10px] block ${onlineUsers?.has(chat.id) ? 'text-green-400' : 'text-gray-500'}`}>
                                {onlineUsers?.has(chat.id) ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 rounded-full bg-[var(--bg-panel)] text-[var(--text-primary)] hover:bg-white/10 transition backdrop-blur-md border border-white/5"
                    >
                        <FiMoreVertical />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-12 bg-[var(--bg-secondary)] border border-white/10 rounded-xl shadow-xl w-40 overflow-hidden z-50">
                            <button
                                onClick={handleUnfriend}
                                className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 text-sm flex items-center gap-2"
                            >
                                <FiTrash2 size={16} /> Unfriend
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 pt-24 pb-4 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => {
                        const isMe = msg.sender === user.id;
                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                key={index}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] px-5 py-2.5 rounded-2xl text-sm leading-relaxed backdrop-blur-sm shadow-sm ${isMe
                                        ? 'bg-[var(--accent-primary)] text-white rounded-tr-none'
                                        : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] rounded-tl-none border border-white/5'
                                        }`}
                                >
                                    <p>{msg.content}</p>
                                    <span className={`text-[9px] mt-1 block tracking-wider opacity-60 ${isMe ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                {isTyping && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start px-2">
                        <div className="bg-[var(--bg-panel)] px-4 py-2 rounded-2xl rounded-tl-none border border-white/5 flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce delay-150"></span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Floating Input */}
            <div className="p-4 bg-transparent">
                <form onSubmit={handleSend} className="bg-[var(--bg-panel)] border border-white/10 rounded-full px-2 py-2 flex items-center gap-2 shadow-lg backdrop-blur-xl">
                    <input
                        type="text"
                        className="flex-1 bg-transparent text-[var(--text-primary)] px-4 py-2 focus:outline-none text-sm placeholder-gray-500"
                        placeholder="Type a message..."
                        value={input}
                        onChange={handleInput}
                    />
                    <button
                        type="submit"
                        className="w-10 h-10 bg-[var(--accent-primary)] rounded-full text-white flex items-center justify-center hover:bg-[var(--accent-hover)] transition shadow-lg shadow-[var(--accent-glow)] group"
                    >
                        <FiSend className="ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
