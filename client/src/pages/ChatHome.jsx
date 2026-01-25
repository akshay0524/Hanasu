import React, { useState } from 'react';
import Sidebar from '../components/Chat/Sidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import AIChatWindow from '../components/AIChat/AIChatWindow';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ChatHome = () => {
    const [activeChat, setActiveChat] = useState(null);

    return (
        <div className="flex h-screen w-full bg-dark-900 overflow-hidden text-white">
            {/* Sidebar */}
            <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] h-full flex-col z-20`}>
                <Sidebar
                    activeChat={activeChat}
                    onSelectChat={(chat) => setActiveChat(chat)}
                />
            </div>

            {/* Main Chat Area */}
            <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 h-full relative bg-dark-900 md:border-l border-dark-700`}>
                {activeChat ? (
                    activeChat.type === 'ai' ? (
                        <AIChatWindow onBack={() => setActiveChat(null)} />
                    ) : (
                        <ChatWindow chat={activeChat} onBack={() => setActiveChat(null)} />
                    )
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-dots-pattern">
                        <div className="w-24 h-24 bg-dark-800 rounded-full flex items-center justify-center mb-6 border border-dark-700">
                            <span className="text-4xl">👋</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Hanasu!</h2>
                        <p className="max-w-md">Select a friend or the AI assistant from the sidebar to start messaging.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatHome;
