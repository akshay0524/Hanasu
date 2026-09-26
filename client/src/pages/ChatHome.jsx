import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Chat/Sidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import AIChatWindow from '../components/AIChat/AIChatWindow';
import { VoiceCallOverlay, IncomingCallBanner } from '../components/Chat/VoiceCall';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ChatHome = () => {
    const [activeChat, setActiveChat] = useState(null);
    const { user } = useAuth();
    const { socket } = useSocket();

    // Global voice call states — persists across chats, sidebar, and empty view
    const [incomingCall, setIncomingCall] = useState(null);
    const [callState, setCallState] = useState({
        active: false,
        type: null, // 'caller' | 'callee'
        callId: null,
        peerId: null,
        peerName: null,
        peerAvatar: null,
    });

    // ─── Global Call Socket Listeners ──────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = ({ callId, callerId, callerName, callerAvatar }) => {
            console.log('[VoiceCall] Incoming call received in ChatHome:', callerName, callId);
            setIncomingCall({ callId, callerId, callerName, callerAvatar });
        };

        const handleCallRejected = () => {
            console.log('[VoiceCall] Call rejected');
            setCallState({ active: false, type: null, callId: null, peerId: null, peerName: null, peerAvatar: null });
        };

        const handleCallEnded = () => {
            console.log('[VoiceCall] Call ended remotely');
            setCallState({ active: false, type: null, callId: null, peerId: null, peerName: null, peerAvatar: null });
            setIncomingCall(null);
        };

        socket.on('call:incoming', handleIncomingCall);
        socket.on('call:rejected', handleCallRejected);
        socket.on('call:ended', handleCallEnded);

        return () => {
            socket.off('call:incoming', handleIncomingCall);
            socket.off('call:rejected', handleCallRejected);
            socket.off('call:ended', handleCallEnded);
        };
    }, [socket]);

    // ─── Call Handlers ─────────────────────────────────────────────────────────
    const handleStartCall = (targetChat) => {
        if (!socket || !user || !targetChat) return;

        const callId = `${user._id}-${targetChat._id}-${Date.now()}`;
        console.log('[VoiceCall] Initiating call to:', targetChat.name, callId);

        socket.emit('call:initiate', {
            callId,
            callerId: user._id,
            calleeId: targetChat._id,
            callerName: user.name,
            callerAvatar: user.avatar,
        });

        setCallState({
            active: true,
            type: 'caller',
            callId,
            peerId: targetChat._id,
            peerName: targetChat.name,
            peerAvatar: targetChat.avatar,
        });
    };

    const handleAcceptCall = () => {
        if (!incomingCall || !socket || !user) return;

        console.log('[VoiceCall] Accepting incoming call:', incomingCall.callId);
        socket.emit('call:accept', {
            callId: incomingCall.callId,
            calleeId: user._id,
        });

        setCallState({
            active: true,
            type: 'callee',
            callId: incomingCall.callId,
            peerId: incomingCall.callerId,
            peerName: incomingCall.callerName,
            peerAvatar: incomingCall.callerAvatar,
        });
        setIncomingCall(null);
    };

    const handleRejectCall = () => {
        if (!incomingCall || !socket) return;
        console.log('[VoiceCall] Declining incoming call:', incomingCall.callId);
        socket.emit('call:reject', {
            callId: incomingCall.callId,
            targetId: incomingCall.callerId,
        });
        setIncomingCall(null);
    };

    const handleCallEnd = () => {
        setCallState({ active: false, type: null, callId: null, peerId: null, peerName: null, peerAvatar: null });
    };

    return (
        <div className="flex h-dvh w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] relative transition-colors duration-500">
            {/* ─── Global Call Overlays (Renders anywhere in the app) ─────────── */}
            <AnimatePresence>
                {callState.active && (
                    <VoiceCallOverlay
                        key="call-overlay"
                        socket={socket}
                        currentUser={user}
                        callState={callState}
                        onCallEnd={handleCallEnd}
                    />
                )}
                {incomingCall && !callState.active && (
                    <IncomingCallBanner
                        key="incoming-call"
                        callInfo={incomingCall}
                        onAccept={handleAcceptCall}
                        onReject={handleRejectCall}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar (Full width on mobile, 380px on Desktop) */}
            <div className={`
                ${activeChat ? 'hidden md:flex' : 'flex'} 
                w-full md:w-[380px] h-full flex-col z-20 
                border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] backdrop-blur-sm
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
                            <ChatWindow
                                chat={activeChat}
                                onBack={() => setActiveChat(null)}
                                onStartCall={handleStartCall}
                                isCallActive={callState.active}
                            />
                        )
                    ) : (
                        // Empty State (Hanasu Zen Identity)
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-primary)] relative overflow-hidden select-none">
                            {/* Subtle Ambient Warm Glow */}
                            <div className="absolute w-96 h-96 rounded-full bg-gradient-to-tr from-[#FF6A00]/10 via-[#FFB000]/5 to-transparent blur-3xl pointer-events-none" />

                            {/* Minimal Ring with Kanji */}
                            <div className="w-28 h-28 rounded-full border border-[var(--border-strong)] flex items-center justify-center mb-6 relative shadow-[0_0_35px_rgba(255,106,0,0.15)] bg-[var(--bg-card)] backdrop-blur-md">
                                <span className="text-4xl text-[var(--text-accent)] font-japanese font-medium tracking-widest">話す</span>
                                <div className="absolute -inset-1 border border-[#FF6A00]/20 rounded-full animate-ping opacity-20 pointer-events-none" style={{ animationDuration: '4s' }}></div>
                            </div>

                            <h2 className="text-2xl font-display font-bold tracking-[0.22em] text-[var(--text-primary)] mb-1">HANASU</h2>
                            <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--text-accent)] font-medium mb-3">Talk freely · Stay connected</p>
                            <p className="max-w-xs text-sm text-[var(--text-muted)] font-medium leading-relaxed">
                                Select a conversation to begin.
                            </p>

                            <div className="mt-8 flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] font-mono text-[var(--text-muted)] shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_6px_#FF6A00]"></span>
                                <span>Real-time presence</span>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ChatHome;
