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
                const data = await getChatHistory(chat._id);
                setMessages(data);
            } catch (error) { console.error(error); }
        };
        loadHistory();

        if (socket) {
            socket.on('receive_message', (newMessage) => {
                if (
                    (newMessage.sender === chat._id && newMessage.receiver === user._id) ||
                    (newMessage.sender === user._id && newMessage.receiver === chat._id)
                ) {
                    setMessages((prev) => [...prev, newMessage]);
                }
            });
        }
        return () => { if (socket) socket.off('receive_message'); }
    }, [chat, socket, user._id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.on('typing', ({ senderId }) => {
            if (senderId === chat._id) setIsTyping(true);
        });

        socket.on('stop_typing', ({ senderId }) => {
            if (senderId === chat._id) setIsTyping(false);
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

        socket.emit('typing', { senderId: user._id, receiverId: chat._id });

        if (typingTimeout) clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
            socket.emit('stop_typing', { senderId: user._id, receiverId: chat._id });
        }, 2000);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        if (socket) {
            const msgData = { senderId: user._id, receiverId: chat._id, content: input };
            socket.emit('send_message', msgData);
            socket.emit('stop_typing', { senderId: user._id, receiverId: chat._id });
        }
        setInput('');
    };

    const [showMenu, setShowMenu] = useState(false);

    const handleUnfriend = async () => {
        if (window.confirm(`Are you sure you want to remove ${chat.name}?`)) {
            try {
                await removeFriend(chat._id);
                onBack();
                window.location.reload();
            } catch (error) {
                alert("Failed to remove friend");
            }
        }
    };

    const isOnline = onlineUsers?.has(String(chat._id));

    return (
        <div className="flex flex-col h-full w-full bg-[var(--bg-primary)] relative">
            {/* Minimal Floating Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-primary)]/95 to-transparent border-b border-[var(--border-subtle)]/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="md:hidden p-2 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition backdrop-blur-md shadow-sm"
                    >
                        <FiChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3 bg-[var(--bg-panel)] p-2 pr-6 rounded-full border border-[var(--border-subtle)] shadow-sm backdrop-blur-md">
                        <img src={chat.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-[var(--border-subtle)]" />
                        <div>
                            <h3 className="font-bold text-[var(--text-primary)] text-sm">{chat.name}</h3>
                            <span className={`text-[10px] font-bold block ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 rounded-full bg-[var(--bg-panel)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition backdrop-blur-md border border-[var(--border-subtle)] shadow-sm"
                    >
                        <FiMoreVertical />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-12 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-xl w-40 overflow-hidden z-50">
                            <button
                                onClick={handleUnfriend}
                                className="w-full text-left px-4 py-3 text-red-600 dark:text-red-400 font-semibold hover:bg-red-500/10 text-sm flex items-center gap-2"
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
                        const isMe = msg.sender === user._id;
                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                key={index}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] px-5 py-2.5 rounded-2xl text-sm leading-relaxed backdrop-blur-sm shadow-sm ${isMe
                                        ? 'bg-[var(--accent-primary)] text-white font-medium rounded-tr-none'
                                        : 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold rounded-tl-none border border-[var(--border-subtle)]'
                                        }`}
                                >
                                    <p>{msg.content}</p>
                                    <span className={`text-[10px] mt-1 block tracking-wider font-medium opacity-75 ${isMe ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                {isTyping && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start px-2">
                        <div className="bg-[var(--bg-card)] px-4 py-2 rounded-2xl rounded-tl-none border border-[var(--border-subtle)] flex gap-1 items-center">
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
                <form onSubmit={handleSend} className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-full px-3 py-2 flex items-center gap-2 shadow-lg backdrop-blur-xl">
                    <input
                        type="text"
                        className="flex-1 bg-transparent text-[var(--text-primary)] font-semibold px-4 py-2 focus:outline-none text-sm placeholder-[var(--text-secondary)]/70"
                        placeholder="Type a message..."
                        value={input}
                        onChange={handleInput}
                    />
                    <button
                        type="submit"
                        className="w-10 h-10 bg-[var(--accent-primary)] rounded-full text-white flex items-center justify-center hover:bg-[var(--accent-hover)] transition shadow-lg shadow-[var(--accent-glow)] group font-bold"
                    >
                        <FiSend className="ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
};


export default ChatWindow;
