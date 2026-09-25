import React, { useState, useEffect, useRef } from 'react';
import { chatWithAI, getAIHistory } from '../../services/aiApi';
import { FiSend, FiChevronLeft, FiCpu } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

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
            } catch (error) { console.error(error); }
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
        const tempMsg = { role: 'user', content: userMsg };
        setMessages(prev => [...prev, tempMsg]);
        setLoading(true);

        try {
            const response = await chatWithAI(userMsg);
            setMessages(prev => [...prev, response]);
        } catch (error) {
            // Handle error
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[var(--bg-primary)] relative">
            {/* Minimal Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-transparent flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="md:hidden p-2 rounded-full bg-white/5 text-[var(--text-primary)] hover:bg-white/10 transition backdrop-blur-md"
                >
                    <FiChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-3 bg-[var(--bg-panel)] p-2 pr-6 rounded-full border border-[var(--border-subtle)] backdrop-blur-md shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-[#090705] font-bold shadow-[0_0_10px_rgba(255,106,0,0.3)]">
                        <FiCpu size={14} />
                    </div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)] text-sm">AI Assistant</h3>
                        <span className="text-[10px] text-[#FFB000] font-mono">✦ Live</span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 pt-24 pb-4 space-y-4 custom-scrollbar">
                {messages.map((msg, index) => {
                    const isMe = msg.role === 'user';
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={index}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed backdrop-blur-sm shadow-sm ${isMe
                                    ? 'bg-[#FF6A00] text-[#090705] rounded-tr-none font-semibold shadow-md shadow-[rgba(255,106,0,0.2)]'
                                    : 'bg-[var(--bg-card)] text-[var(--text-primary)] font-medium rounded-tl-none border border-[var(--border-subtle)]'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </motion.div>
                    );
                })}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-[var(--bg-card)] px-4 py-3 rounded-2xl rounded-tl-none border border-[var(--border-subtle)] flex gap-1.5 items-center">
                            <span className="w-1.5 h-1.5 bg-[#FF6A00] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-[#FFB000] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-[#FFD166] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-transparent">
                <form onSubmit={handleSend} className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-full px-3 py-2 flex items-center gap-2 shadow-lg backdrop-blur-xl">
                    <input
                        type="text"
                        className="flex-1 bg-transparent text-[var(--text-primary)] font-semibold px-4 py-2 focus:outline-none text-sm placeholder-[var(--text-secondary)]/70"
                        placeholder="Ask anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-10 h-10 bg-[#FF6A00] rounded-full text-[#090705] flex items-center justify-center hover:bg-[#E05D00] transition shadow-lg shadow-[rgba(255,106,0,0.25)] disabled:opacity-50 font-bold"
                    >
                        <FiSend className="ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIChatWindow;
