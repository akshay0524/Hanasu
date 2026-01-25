import React, { useState, useEffect, useRef } from 'react';
import { chatWithAI, getAIHistory } from '../../services/aiApi';
import { FiSend, FiMenu, FiCpu } from 'react-icons/fi';
import { motion } from 'framer-motion';

const AIChatWindow = ({ onBack }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await getAIHistory();
                setMessages(data);
            } catch (error) {
                console.error("Failed to load AI history", error);
            }
        };
        loadHistory();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');

        // Optimistic UI
        const tempMsg = { role: 'user', content: userMsg, createdAt: new Date() };
        setMessages(prev => [...prev, tempMsg]);
        setLoading(true);

        try {
            const response = await chatWithAI(userMsg);
            setMessages(prev => [...prev, response]);
        } catch (error) {
            console.error("AI Error", error);
            // Maybe add error message to chat
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-dark-900 w-full relative">
            {/* Header */}
            <div className="p-4 border-b border-dark-700 flex items-center gap-3 bg-dark-800">
                <button onClick={onBack} className="md:hidden text-gray-400">
                    <FiMenu size={24} />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <FiCpu size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-white">AI Assistant</h3>
                    <p className="text-xs text-gray-400">Powered by OpenAI</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                    const isMe = msg.role === 'user';
                    return (
                        <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe
                                        ? 'bg-primary text-white rounded-br-none'
                                        : 'bg-dark-700 text-gray-200 rounded-bl-none border border-dark-600'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    );
                })}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-dark-700 px-4 py-3 rounded-2xl rounded-bl-none border border-dark-600">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-dark-800 border-t border-dark-700 flex gap-2">
                <input
                    type="text"
                    className="flex-1 bg-dark-900 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary border border-dark-700"
                    placeholder="Ask anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                />
                <button type="submit" disabled={loading} className="bg-primary p-3 rounded-full text-white hover:bg-primary/90 transition shadow-lg shadow-primary/20 disabled:opacity-50">
                    <FiSend />
                </button>
            </form>
        </div>
    );
};

export default AIChatWindow;
