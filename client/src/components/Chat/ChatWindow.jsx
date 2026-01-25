import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getChatHistory } from '../../services/chatApi';
import { FiSend, FiMenu } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const ChatWindow = ({ chat, onBack }) => {
    const { user } = useAuth();
    const socket = useSocket();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!chat) return;

        // Load History
        const loadHistory = async () => {
            try {
                const data = await getChatHistory(chat._id);
                setMessages(data);
            } catch (error) {
                console.error("Failed to load history", error);
            }
        };
        loadHistory();

        // Listen for incoming
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

        return () => {
            if (socket) socket.off('receive_message');
        }
    }, [chat, socket, user._id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        if (socket) {
            const msgData = {
                senderId: user._id,
                receiverId: chat._id,
                content: input
            };
            socket.emit('send_message', msgData);
            // Optimistically add? or wait for socket loopback?
            // SocketHandler emits to sender too, so we wait for loopback.
        }
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-dark-900 w-full relative">
            {/* Header */}
            <div className="p-4 border-b border-dark-700 flex items-center gap-3 bg-dark-800">
                <button onClick={onBack} className="md:hidden text-gray-400">
                    <FiMenu size={24} />
                </button>
                <img src={chat.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                <div>
                    <h3 className="font-semibold text-white">{chat.name}</h3>
                    <p className="text-xs text-gray-400">Active now</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                    const isMe = msg.sender === user._id;
                    return (
                        <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${isMe
                                        ? 'bg-primary text-white rounded-br-none'
                                        : 'bg-dark-700 text-gray-200 rounded-bl-none'
                                    }`}
                            >
                                <p>{msg.content}</p>
                                <span className={`text-[10px] mt-1 block text-right opacity-70`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-dark-800 border-t border-dark-700 flex gap-2">
                <input
                    type="text"
                    className="flex-1 bg-dark-900 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary border border-dark-700"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" className="bg-primary p-3 rounded-full text-white hover:bg-primary/90 transition shadow-lg shadow-primary/20">
                    <FiSend />
                </button>
            </form>
        </div>
    );
};

export default ChatWindow;
