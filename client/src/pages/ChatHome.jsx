import React, { useState } from 'react';
import Sidebar from '../components/Chat/Sidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import AIChatWindow from '../components/AIChat/AIChatWindow';
import { motion, AnimatePresence } from 'framer-motion';

const ChatHome = () => {
    const [activeChat, setActiveChat] = useState(null);

    // Responsive logic handled by CSS classes (hidden/flex) 
    // and passing "onBack" handler to windows.

    return (
        <div className="flex h-dvh w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] relative transition-colors duration-500">
            {/* Background Texture - Optional, maybe remove for cleaner look or invert opacity based on theme if needed. Keeping simple for now */}

            {/* Sidebar (Full width on mobile, 400px on Desktop) */}
            <div className={`
                ${activeChat ? 'hidden md:flex' : 'flex'} 
                w-full md:w-[380px] h-full flex-col z-20 
                border-r border-white/5 bg-[var(--bg-primary)] backdrop-blur-sm
            `}>
                <Sidebar
                    activeChat={activeChat}
                    onSelectChat={(chat) => setActiveChat(chat)}
                />
            </div>

            {/* Main Chat Area (Full width on mobile, Flex-1 on Desktop) */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeChat ? (activeChat._id || activeChat.id) : 'empty'}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`
                        ${!activeChat ? 'hidden md:flex' : 'flex'} 
                        flex-1 h-full relative z-10
                    `}
                >
                    {activeChat ? (
                        activeChat.type === 'ai' ? (
                            <AIChatWindow onBack={() => setActiveChat(null)} />
                        ) : (
                            <ChatWindow chat={activeChat} onBack={() => setActiveChat(null)} />
                        )
                    ) : (
                        // Empty State (Zen Mode)
                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)] p-8 text-center bg-[var(--bg-primary)]">
                            <div className="w-32 h-32 border border-[var(--text-secondary)]/10 rounded-full flex items-center justify-center mb-8 relative">
                                <span className="text-6xl text-[var(--text-secondary)]/20 font-japanese">空</span>
                                <div className="absolute inset-0 border border-[var(--text-secondary)]/5 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }}></div>
                            </div>
                            <h2 className="text-3xl font-japanese text-[var(--text-primary)]/80 mb-2">Hanasu</h2>
                            <p className="max-w-md font-light text-sm tracking-wide text-[var(--text-secondary)]">
                                Select a conversation to begin.
                            </p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ChatHome;
