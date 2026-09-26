import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPhone, FiPhoneOff, FiMic, FiMicOff, FiVolume2 } from 'react-icons/fi';

// Public STUN servers for reliable NAT traversal across WAN and LAN
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    ...(import.meta.env.VITE_TURN_URL
        ? [{
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME || '',
            credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
        }]
        : []),
];

// Synthesize pleasant ringing/ringback tones using Web Audio API (zero external assets needed)
const playSoundTone = (type = 'incoming') => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return () => {};
        const ctx = new AudioCtx();
        let isStopped = false;

        const beep = () => {
            if (isStopped || ctx.state === 'closed') return;
            try {
                if (ctx.state === 'suspended') {
                    ctx.resume();
                }
                const now = ctx.currentTime;
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();

                osc1.type = 'sine';
                osc2.type = 'sine';

                if (type === 'incoming') {
                    // Soft dual-tone incoming chime (440Hz + 480Hz)
                    osc1.frequency.setValueAtTime(440, now);
                    osc2.frequency.setValueAtTime(480, now);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
                    gain.gain.setValueAtTime(0.06, now + 1.2);
                    gain.gain.linearRampToValueAtTime(0, now + 1.3);

                    osc1.connect(gain);
                    osc2.connect(gain);
                    gain.connect(ctx.destination);

                    osc1.start(now);
                    osc2.start(now);
                    osc1.stop(now + 1.3);
                    osc2.stop(now + 1.3);
                } else {
                    // Outgoing ringback tone (400Hz + 450Hz pulse)
                    osc1.frequency.setValueAtTime(400, now);
                    osc2.frequency.setValueAtTime(450, now);
                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
                    gain.gain.setValueAtTime(0.04, now + 0.8);
                    gain.gain.linearRampToValueAtTime(0, now + 0.85);

                    osc1.connect(gain);
                    osc2.connect(gain);
                    gain.connect(ctx.destination);

                    osc1.start(now);
                    osc2.start(now);
                    osc1.stop(now + 0.85);
                    osc2.stop(now + 0.85);
                }
            } catch (_) {}
        };

        beep();
        const interval = setInterval(beep, type === 'incoming' ? 3000 : 3500);

        return () => {
            isStopped = true;
            clearInterval(interval);
            try {
                ctx.close();
            } catch (_) {}
        };
    } catch (_) {
        return () => {};
    }
};

/**
 * VoiceCallOverlay
 *
 * Robust WebRTC signaling sequence:
 *   CALLER:  emit call:initiate → wait for call:accepted → get media → create PC → send offer
 *   CALLEE:  accept call → wait for call:offer → get media → create PC → set remote offer → send answer
 *
 * This ensures the callee's socket listener is ready BEFORE the caller creates and transmits the offer.
 */
const VoiceCallOverlay = ({ socket, currentUser, callState, onCallEnd }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    // 'ringing' | 'connecting' | 'connected' | 'failed'
    const [phase, setPhase] = useState(callState.type === 'caller' ? 'ringing' : 'connecting');

    const localStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const timerRef = useRef(null);
    const pendingCandidatesRef = useRef([]);

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        pendingCandidatesRef.current = [];
    }, []);

    // ─── Play ringback sound while caller is waiting for callee to accept ─────
    useEffect(() => {
        if (phase === 'ringing' && callState.type === 'caller') {
            const stopTone = playSoundTone('ringback');
            return () => stopTone();
        }
    }, [phase, callState.type]);

    // ─── Peer Connection Factory ──────────────────────────────────────────────
    const createPC = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }

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
            console.log('[WebRTC] ontrack received stream/track:', event);
            let stream = null;
            if (event.streams && event.streams[0]) {
                stream = event.streams[0];
            } else if (event.track) {
                stream = new MediaStream([event.track]);
            }

            if (stream) {
                remoteStreamRef.current = stream;
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = stream;
                    remoteAudioRef.current.play().catch((e) => {
                        console.warn('[WebRTC] Audio autoplay notice:', e.message);
                    });
                }
            }
        };

        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            console.log('[WebRTC] connectionState:', s);
            if (s === 'connected') {
                setPhase('connected');
                if (!timerRef.current) {
                    timerRef.current = setInterval(() => {
                        setCallDuration((prev) => prev + 1);
                    }, 1000);
                }
            }
            if (s === 'failed') {
                setPhase('failed');
                setTimeout(() => {
                    handleEndCall();
                }, 2000);
            }
        };

        pc.oniceconnectionstatechange = () => {
            const ice = pc.iceConnectionState;
            console.log('[WebRTC] iceConnectionState:', ice);
            if (ice === 'connected' || ice === 'completed') {
                setPhase('connected');
                if (!timerRef.current) {
                    timerRef.current = setInterval(() => {
                        setCallDuration((prev) => prev + 1);
                    }, 1000);
                }
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    }, [socket, callState.callId, callState.peerId]);

    // ─── Get Local Microphone ──────────────────────────────────────────────────
    const getLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            console.error('[WebRTC] Microphone access denied/unavailable:', err);
            return null;
        }
    }, []);

    // ─── Flush Buffered ICE Candidates ─────────────────────────────────────────
    const flushPendingCandidates = useCallback(async (pc) => {
        while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift();
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.warn('[WebRTC] Buffered ICE candidate notice:', err.message);
            }
        }
    }, []);

    // ─── CALLER: Triggered once callee accepts the call ────────────────────────
    const startAsCaller = useCallback(async () => {
        setPhase('connecting');
        const stream = await getLocalStream();
        if (!stream) {
            handleEndCall();
            return;
        }

        const pc = createPC();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
            await pc.setLocalDescription(offer);

            console.log('[WebRTC] Caller sending offer to target:', callState.peerId);
            socket.emit('call:offer', {
                callId: callState.callId,
                offer,
                targetId: callState.peerId,
            });
        } catch (err) {
            console.error('[WebRTC] Error creating offer:', err);
            handleEndCall();
        }
    }, [socket, callState.callId, callState.peerId, getLocalStream, createPC]);

    // ─── CALLEE: Triggered once offer arrives from caller ──────────────────────
    const startAsCallee = useCallback(async (offer) => {
        setPhase('connecting');
        const stream = await getLocalStream();
        if (!stream) {
            handleEndCall();
            return;
        }

        const pc = createPC();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        try {
            console.log('[WebRTC] Callee setting remote description from offer');
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // Flush buffered ICE candidates
            await flushPendingCandidates(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log('[WebRTC] Callee sending answer to target:', callState.peerId);
            socket.emit('call:answer', {
                callId: callState.callId,
                answer,
                targetId: callState.peerId,
            });
        } catch (err) {
            console.error('[WebRTC] Error creating answer:', err);
            handleEndCall();
        }
    }, [socket, callState.callId, callState.peerId, getLocalStream, createPC, flushPendingCandidates]);

    // ─── End Call Handler ─────────────────────────────────────────────────────
    const handleEndCall = useCallback(() => {
        if (socket && callState.callId) {
            socket.emit('call:end', {
                callId: callState.callId,
                targetId: callState.peerId,
            });
        }
        cleanup();
        onCallEnd();
    }, [socket, callState.callId, callState.peerId, cleanup, onCallEnd]);

    // ─── Socket Event Listeners ────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        // Callee receives offer from caller
        const handleOffer = async ({ offer }) => {
            console.log('[WebRTC] Received offer, type:', callState.type);
            if (callState.type === 'callee') {
                await startAsCallee(offer);
            }
        };

        // Caller receives answer from callee
        const handleAnswer = async ({ answer }) => {
            const pc = peerConnectionRef.current;
            if (!pc) return;
            console.log('[WebRTC] Received answer, setting remote description');
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                await flushPendingCandidates(pc);
            } catch (err) {
                console.error('[WebRTC] setRemoteDescription (answer) failed:', err);
            }
        };

        // Both sides receive ICE candidates
        const handleIceCandidate = async ({ candidate }) => {
            const pc = peerConnectionRef.current;
            if (!candidate) return;

            if (pc && pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.warn('[WebRTC] ICE candidate notice:', err.message);
                }
            } else {
                pendingCandidatesRef.current.push(candidate);
            }
        };

        // Caller receives acceptance notification — NOW begin WebRTC
        const handleCallAccepted = async ({ callId }) => {
            if (callState.type === 'caller' && callId === callState.callId) {
                console.log('[WebRTC] Callee accepted call — starting WebRTC offer as caller');
                await startAsCaller();
            }
        };

        // Callee declined or call ended remotely
        const handleCallRejected = () => {
            console.log('[WebRTC] Call was declined by remote');
            cleanup();
            onCallEnd();
        };

        const handleCallEnded = () => {
            console.log('[WebRTC] Call ended by remote');
            cleanup();
            onCallEnd();
        };

        socket.on('call:offer', handleOffer);
        socket.on('call:answer', handleAnswer);
        socket.on('call:ice-candidate', handleIceCandidate);
        socket.on('call:accepted', handleCallAccepted);
        socket.on('call:rejected', handleCallRejected);
        socket.on('call:ended', handleCallEnded);

        return () => {
            socket.off('call:offer', handleOffer);
            socket.off('call:answer', handleAnswer);
            socket.off('call:ice-candidate', handleIceCandidate);
            socket.off('call:accepted', handleCallAccepted);
            socket.off('call:rejected', handleCallRejected);
            socket.off('call:ended', handleCallEnded);
        };
    }, [socket, callState.type, callState.callId, startAsCaller, startAsCallee, flushPendingCandidates, cleanup, onCallEnd]);

    // Unmount cleanup
    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    // Ensure audio element binds to remote stream whenever ref attaches
    useEffect(() => {
        if (remoteAudioRef.current && remoteStreamRef.current) {
            remoteAudioRef.current.srcObject = remoteStreamRef.current;
            remoteAudioRef.current.play().catch(() => {});
        }
    }, [phase]);

    // ─── UI Actions ────────────────────────────────────────────────────────────
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

    const phaseLabel = {
        ringing: 'Ringing...',
        connecting: 'Connecting...',
        connected: formatDuration(callDuration),
        failed: 'Call failed',
    };

    return (
        <>
            {/* Hidden audio element for remote audio playback */}
            <audio ref={remoteAudioRef} autoPlay playsInline />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="fixed top-4 inset-x-4 max-w-[380px] mx-auto z-[9999]"
            >
                <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
                    {/* Header gradient */}
                    <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-emerald-600/20 to-transparent">
                        {/* Animated pulsing rings */}
                        <div className="relative mx-auto w-20 h-20 mb-4">
                            {phase !== 'connected' && (
                                <>
                                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping" />
                                    <div className="absolute inset-2 rounded-full border-2 border-emerald-500/25 animate-ping" style={{ animationDelay: '0.4s' }} />
                                </>
                            )}
                            <img
                                src={callState.peerAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${callState.peerName}`}
                                alt={callState.peerName}
                                className="relative w-full h-full rounded-full object-cover border-2 border-emerald-500/60 shadow-md"
                            />
                        </div>

                        <div className="text-center">
                            <h3 className="font-bold text-[var(--text-primary)] text-base">{callState.peerName}</h3>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                <FiVolume2 size={13} className={phase === 'connected' ? 'text-emerald-400' : 'text-amber-400'} />
                                <span className={`text-xs font-mono font-semibold ${phase === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {phaseLabel[phase] || 'Calling...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="px-6 pb-6 flex items-center justify-center gap-6">
                        {/* Mute Button */}
                        <button
                            onClick={handleToggleMute}
                            disabled={phase === 'ringing'}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-40 ${
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
 * Shown to the callee wherever they are in the application.
 */
const IncomingCallBanner = ({ callInfo, onAccept, onReject }) => {
    // Play incoming ringtone while banner is displayed
    useEffect(() => {
        const stopTone = playSoundTone('incoming');
        return () => stopTone();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed top-4 inset-x-4 max-w-[380px] mx-auto z-[9999]"
        >
            <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl p-5">
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping" />
                        <img
                            src={callInfo.callerAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${callInfo.callerName}`}
                            alt={callInfo.callerName}
                            className="relative w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50 shadow-md"
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
                        className="flex-1 py-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/25 transition active:scale-95"
                    >
                        <FiPhoneOff size={16} /> Decline
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/25 transition active:scale-95"
                    >
                        <FiPhone size={16} /> Accept
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export { VoiceCallOverlay, IncomingCallBanner };
