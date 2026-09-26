import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPhone, FiPhoneOff, FiMic, FiMicOff, FiVolume2 } from 'react-icons/fi';

/**
 * VoiceCallOverlay
 *
 * Handles WebRTC 1-on-1 voice calls using Socket.IO for signaling.
 * No audio is sent through Socket.IO — only SDP / ICE candidates.
 *
 * Props:
 *   socket          — Socket.IO client instance
 *   currentUser     — { _id, name, avatar }
 *   callState       — { active, type, callId, peerId, peerName, peerAvatar }
 *   onCallEnd       — callback when the call ends
 */
const VoiceCallOverlay = ({ socket, currentUser, callState, onCallEnd }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [connectionState, setConnectionState] = useState('connecting');

    const localStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const timerRef = useRef(null);

    // TURN/STUN configuration — uses env vars if available
    const ICE_SERVERS = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // TURN server from env (populated server-side; client reads VITE_ vars)
        ...(import.meta.env.VITE_TURN_URL
            ? [{
                urls: import.meta.env.VITE_TURN_URL,
                username: import.meta.env.VITE_TURN_USERNAME || '',
                credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
            }]
            : []),
    ];

    const cleanup = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        setCallDuration(0);
        setIsMuted(false);
        setConnectionState('connecting');
    }, []);

    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('call:ice-candidate', {
                    callId: callState.callId,
                    candidate: event.candidate,
                    targetId: callState.peerId,
                });
            }
        };

        pc.ontrack = (event) => {
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = event.streams[0];
            }
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            setConnectionState(state);
            if (state === 'connected') {
                timerRef.current = setInterval(() => {
                    setCallDuration((prev) => prev + 1);
                }, 1000);
            }
            if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                handleEndCall();
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    }, [socket, callState]);

    const startLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            console.error('Microphone access denied:', err);
            return null;
        }
    }, []);

    // CALLER: send offer after getting media
    const startCallAsCaller = useCallback(async () => {
        const stream = await startLocalStream();
        if (!stream) return;

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);

        socket.emit('call:offer', {
            callId: callState.callId,
            offer,
            targetId: callState.peerId,
        });
    }, [socket, callState, startLocalStream, createPeerConnection]);

    // CALLEE: get offer, send answer
    const startCallAsCallee = useCallback(async (offer) => {
        const stream = await startLocalStream();
        if (!stream) return;

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('call:answer', {
            callId: callState.callId,
            answer,
            targetId: callState.peerId,
        });
    }, [socket, callState, startLocalStream, createPeerConnection]);

    // Initiate call after component mounts (caller side)
    useEffect(() => {
        if (!callState.active || !socket) return;

        if (callState.type === 'caller') {
            startCallAsCaller();
        }
        // Callee side is triggered by 'call:offer' socket event below
    }, [callState.active, callState.type, socket]);

    // Socket event listeners for signaling
    useEffect(() => {
        if (!socket) return;

        const handleOffer = async ({ offer }) => {
            if (callState.type === 'callee') {
                await startCallAsCallee(offer);
            }
        };

        const handleAnswer = async ({ answer }) => {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );
            }
        };

        const handleIceCandidate = async ({ candidate }) => {
            if (peerConnectionRef.current && candidate) {
                try {
                    await peerConnectionRef.current.addIceCandidate(
                        new RTCIceCandidate(candidate)
                    );
                } catch (err) {
                    console.warn('ICE candidate error:', err.message);
                }
            }
        };

        const handleCallEnded = () => {
            cleanup();
            onCallEnd();
        };

        socket.on('call:offer', handleOffer);
        socket.on('call:answer', handleAnswer);
        socket.on('call:ice-candidate', handleIceCandidate);
        socket.on('call:ended', handleCallEnded);

        return () => {
            socket.off('call:offer', handleOffer);
            socket.off('call:answer', handleAnswer);
            socket.off('call:ice-candidate', handleIceCandidate);
            socket.off('call:ended', handleCallEnded);
        };
    }, [socket, callState.type, startCallAsCallee, cleanup, onCallEnd]);

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const handleEndCall = useCallback(() => {
        if (socket) {
            socket.emit('call:end', { callId: callState.callId });
        }
        cleanup();
        onCallEnd();
    }, [socket, callState.callId, cleanup, onCallEnd]);

    const handleToggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => {
                t.enabled = !t.enabled;
            });
            setIsMuted((prev) => !prev);
        }
    };

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const stateLabel = {
        connecting: 'Connecting...',
        connected: formatDuration(callDuration),
        disconnected: 'Reconnecting...',
        failed: 'Connection failed',
        new: 'Calling...',
        checking: 'Establishing...',
    };

    return (
        <>
            {/* Hidden audio element for remote stream */}
            <audio ref={remoteAudioRef} autoPlay playsInline />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[320px] sm:w-[380px]"
            >
                <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
                    {/* Green gradient header */}
                    <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-emerald-600/20 to-transparent">
                        {/* Animated rings */}
                        <div className="relative mx-auto w-20 h-20 mb-4">
                            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
                            <div className="absolute inset-2 rounded-full border-2 border-emerald-500/20 animate-ping" style={{ animationDelay: '0.3s' }} />
                            <img
                                src={callState.peerAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${callState.peerName}`}
                                alt={callState.peerName}
                                className="relative w-full h-full rounded-full object-cover border-2 border-emerald-500/60"
                            />
                        </div>

                        <div className="text-center">
                            <h3 className="font-bold text-[var(--text-primary)] text-base">{callState.peerName}</h3>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                <FiVolume2 size={12} className="text-emerald-400" />
                                <span className="text-xs text-emerald-400 font-mono font-semibold">
                                    {stateLabel[connectionState] || 'Calling...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="px-6 pb-6 flex items-center justify-center gap-6">
                        {/* Mute Button */}
                        <button
                            onClick={handleToggleMute}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                                isMuted
                                    ? 'bg-red-500/20 border-2 border-red-500/60 text-red-400'
                                    : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50'
                            }`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
                        </button>

                        {/* End Call Button */}
                        <button
                            onClick={handleEndCall}
                            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-xl shadow-red-500/30 active:scale-95"
                            title="End call"
                        >
                            <FiPhoneOff size={22} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

/**
 * IncomingCallBanner
 * Shown to the callee when receiving an incoming call.
 */
const IncomingCallBanner = ({ callInfo, onAccept, onReject }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[320px] sm:w-[380px]"
        >
            <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl p-5">
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping" />
                        <img
                            src={callInfo.callerAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${callInfo.callerName}`}
                            alt={callInfo.callerName}
                            className="relative w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50"
                        />
                    </div>
                    <div>
                        <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Incoming Voice Call</p>
                        <h3 className="font-bold text-[var(--text-primary)] text-sm">{callInfo.callerName}</h3>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onReject}
                        className="flex-1 py-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/25 transition"
                    >
                        <FiPhoneOff size={16} /> Decline
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/25 transition"
                    >
                        <FiPhone size={16} /> Accept
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export { VoiceCallOverlay, IncomingCallBanner };
