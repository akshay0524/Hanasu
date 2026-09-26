import React, { useState, useEffect, useRef } from 'react';
import {
    getChatHistory,
    getConversationMessages,
    markConversationAsRead,
    markMessagesAsRead,
} from '../../services/chatApi';
import { getCatchMeUp, getSmartReplies } from '../../services/aiApi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { removeFriend, getFriends } from '../../services/userApi';
import {
    FiSend,
    FiChevronLeft,
    FiMoreVertical,
    FiTrash2,
    FiUsers,
    FiInfo,
    FiCopy,
    FiCornerUpLeft,
    FiZap,
    FiFileText,
    FiHelpCircle,
    FiGlobe,
    FiBookOpen,
    FiCheckSquare,
    FiMessageSquare,
    FiX,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import GroupInfoModal from './GroupInfoModal';
import CatchMeUpModal from './CatchMeUpModal';
import AIMessageActionModal from './AIMessageActionModal';

const ChatWindow = ({ chat, onBack }) => {
    const { user } = useAuth();
    const { socket, onlineUsers } = useSocket();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [activeGroup, setActiveGroup] = useState(chat);
    const [friends, setFriends] = useState([]);

    // Modals
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
    const [isCatchMeUpOpen, setIsCatchMeUpOpen] = useState(false);
    const [catchMeUpLoading, setCatchMeUpLoading] = useState(false);
    const [catchMeUpData, setCatchMeUpData] = useState(null);

    // AI Action Modal state
    const [aiActionModal, setAiActionModal] = useState({
        isOpen: false,
        actionType: null,
        message: null,
    });

    // Smart Reply Suggestions (contextual bar above composer)
    const [smartReplies, setSmartReplies] = useState([]);
    const [loadingReplies, setLoadingReplies] = useState(false);

    // Context menu / action sheet for a message
    const [selectedActionMessage, setSelectedActionMessage] = useState(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [notificationToast, setNotificationToast] = useState('');

    const messagesEndRef = useRef(null);
    const messageElementsRef = useRef({});

    const isGroup = activeGroup?.type === 'group';
    const conversationId = isGroup
        ? String(activeGroup._id)
        : activeGroup?.conversationId || null;

    useEffect(() => {
        setActiveGroup(chat);
        setSmartReplies([]);
        setSelectedActionMessage(null);
    }, [chat]);

    useEffect(() => {
        getFriends().then(setFriends).catch(() => {});
    }, []);

    // Load Chat History
    useEffect(() => {
        if (!chat) return;

        const loadMessages = async () => {
            try {
                if (isGroup) {
                    const data = await getConversationMessages(chat._id);
                    setMessages(data || []);
                    markConversationAsRead(chat._id).catch(() => {});
                    if (socket) {
                        socket.emit('mark_read', { readerId: user._id, conversationId: chat._id });
                    }
                } else {
                    const data = await getChatHistory(chat._id);
                    setMessages(data || []);
                    markMessagesAsRead(chat._id).catch(() => {});
                    if (socket) {
                        socket.emit('mark_read', { readerId: user._id, friendId: chat._id });
                    }
                }
            } catch (err) {
                console.error('Error loading chat messages:', err);
            }
        };

        loadMessages();

        // Socket room join
        if (socket && isGroup) {
            socket.emit('join_conversation', chat._id);
        }

        return () => {
            if (socket && isGroup) {
                socket.emit('leave_conversation', chat._id);
            }
        };
    }, [chat, isGroup, socket, user._id]);

    // Socket message receiver & real-time read receipts
    useEffect(() => {
        if (!socket || !chat) return;

        const handleReceiveMessage = (newMessage) => {
            const isMe = String(newMessage.sender?._id || newMessage.sender) === String(user._id);

            if (isGroup) {
                const msgConvId = String(newMessage.conversation?._id || newMessage.conversation);
                if (msgConvId === String(chat._id)) {
                    setMessages((prev) => {
                        const exists = prev.some((m) => String(m._id) === String(newMessage._id));
                        if (exists) return prev;
                        return [...prev, newMessage];
                    });
                    if (!isMe) {
                        markConversationAsRead(chat._id).catch(() => {});
                        socket.emit('mark_read', { readerId: user._id, conversationId: chat._id });
                    }
                }
            } else {
                const partnerId = String(chat._id);
                const senderId = String(newMessage.sender?._id || newMessage.sender);
                const receiverId = String(newMessage.receiver?._id || newMessage.receiver);

                if (
                    (senderId === partnerId && receiverId === String(user._id)) ||
                    (senderId === String(user._id) && receiverId === partnerId)
                ) {
                    setMessages((prev) => {
                        const exists = prev.some((m) => String(m._id) === String(newMessage._id));
                        if (exists) return prev;
                        return [...prev, newMessage];
                    });
                    if (senderId === partnerId) {
                        markMessagesAsRead(partnerId).catch(() => {});
                        socket.emit('mark_read', { readerId: user._id, friendId: partnerId });
                    }
                }
            }
        };

        const handleMessagesRead = ({ readerId, readAt }) => {
            if (String(readerId) === String(chat._id)) {
                setMessages((prev) =>
                    prev.map((m) => {
                        const isSentByMe = String(m.sender?._id || m.sender) === String(user._id);
                        if (isSentByMe && !m.read) {
                            return { ...m, read: true, readAt: readAt || new Date().toISOString() };
                        }
                        return m;
                    })
                );
            }
        };

        const handleConversationRead = ({ conversationId, readerId, lastReadAt }) => {
            if (String(conversationId) === String(chat._id) && String(readerId) !== String(user._id)) {
                setMessages((prev) =>
                    prev.map((m) => {
                        const isSentByMe = String(m.sender?._id || m.sender) === String(user._id);
                        if (isSentByMe && !m.read) {
                            return { ...m, read: true, readAt: lastReadAt || new Date().toISOString() };
                        }
                        return m;
                    })
                );
            }
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('messages_read', handleMessagesRead);
        socket.on('conversation_read', handleConversationRead);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('messages_read', handleMessagesRead);
            socket.off('conversation_read', handleConversationRead);
        };
    }, [socket, chat, isGroup, user._id]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Typing Indicators
    const [typingUsers, setTypingUsers] = useState(new Set());

    useEffect(() => {
        if (!socket || !chat) return;

        if (isGroup) {
            const handleGroupTyping = ({ conversationId: cId, senderId, senderName }) => {
                if (String(cId) === String(chat._id) && String(senderId) !== String(user._id)) {
                    setTypingUsers((prev) => new Set(prev).add(senderName || 'Someone'));
                }
            };

            const handleGroupStopTyping = ({ conversationId: cId, senderId }) => {
                if (String(cId) === String(chat._id)) {
                    setTypingUsers(new Set());
                }
            };

            socket.on('group_typing', handleGroupTyping);
            socket.on('group_stop_typing', handleGroupStopTyping);

            return () => {
                socket.off('group_typing', handleGroupTyping);
                socket.off('group_stop_typing', handleGroupStopTyping);
            };
        } else {
            const handleTyping = ({ senderId }) => {
                if (String(senderId) === String(chat._id)) {
                    setTypingUsers(new Set([chat.name || 'Friend']));
                }
            };

            const handleStopTyping = ({ senderId }) => {
                if (String(senderId) === String(chat._id)) {
                    setTypingUsers(new Set());
                }
            };

            socket.on('typing', handleTyping);
            socket.on('stop_typing', handleStopTyping);

            return () => {
                socket.off('typing', handleTyping);
                socket.off('stop_typing', handleStopTyping);
            };
        }
    }, [socket, chat, isGroup, user._id]);

    let typingTimeout = useRef(null);

    const handleInput = (e) => {
        setInput(e.target.value);
        if (!socket || !chat) return;

        if (isGroup) {
            socket.emit('group_typing', {
                conversationId: chat._id,
                senderId: user._id,
                senderName: user.name,
            });

            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                socket.emit('group_stop_typing', {
                    conversationId: chat._id,
                    senderId: user._id,
                });
            }, 2000);
        } else {
            socket.emit('typing', { senderId: user._id, receiverId: chat._id });

            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                socket.emit('stop_typing', { senderId: user._id, receiverId: chat._id });
            }, 2000);
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || !socket) return;

        if (isGroup) {
            socket.emit('send_message', {
                senderId: user._id,
                conversationId: chat._id,
                content: input.trim(),
            });
            socket.emit('group_stop_typing', {
                conversationId: chat._id,
                senderId: user._id,
            });
        } else {
            socket.emit('send_message', {
                senderId: user._id,
                receiverId: chat._id,
                content: input.trim(),
            });
            socket.emit('stop_typing', { senderId: user._id, receiverId: chat._id });
        }

        setInput('');
        setSmartReplies([]);
    };

    // Catch Me Up trigger
    const handleTriggerCatchMeUp = async () => {
        setIsCatchMeUpOpen(true);
        setCatchMeUpLoading(true);
        try {
            const targetConvId = isGroup ? chat._id : conversationId || chat._id;
            const res = await getCatchMeUp(targetConvId);
            setCatchMeUpData(res);
        } catch (err) {
            setCatchMeUpData({
                unreadCount: 0,
                summary: 'Could not load summary. Please check your network or try again.',
                keyPoints: [],
                decisions: [],
                actionItems: [],
                unresolvedQuestions: [],
                importantMessages: [],
            });
        } finally {
            setCatchMeUpLoading(false);
        }
    };

    // Jump to specific message from Catch Me Up
    const handleJumpToMessage = (targetMsgId) => {
        setHighlightedMessageId(targetMsgId);
        const element = messageElementsRef.current[targetMsgId];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setTimeout(() => {
            setHighlightedMessageId(null);
        }, 3500);
    };

    // Smart Reply generation for a message
    const handleTriggerSmartReplies = async (msg) => {
        setLoadingReplies(true);
        try {
            const contextText = messages
                .slice(-6)
                .map((m) => `${m.sender?.name || 'User'}: ${m.content}`)
                .join('\n');
            const res = await getSmartReplies({
                messageId: msg._id,
                content: msg.content,
                context: contextText,
            });
            setSmartReplies(res.suggestions || []);
        } catch (err) {
            setSmartReplies(['Got it!', 'Sounds good.', 'Let me check on that.']);
        } finally {
            setLoadingReplies(false);
            setSelectedActionMessage(null);
        }
    };

    const handleCopyMessage = (text) => {
        navigator.clipboard.writeText(text);
        showToast('Copied to clipboard');
        setSelectedActionMessage(null);
    };

    const handleQuoteReply = (msg) => {
        const senderName = msg.sender?.name || 'User';
        setInput(`> ${senderName}: "${msg.content}"\n`);
        setSelectedActionMessage(null);
    };

    const showToast = (text) => {
        setNotificationToast(text);
        setTimeout(() => setNotificationToast(''), 3000);
    };

    const [showDirectMenu, setShowDirectMenu] = useState(false);

    const handleUnfriend = async () => {
        if (window.confirm(`Are you sure you want to remove ${chat.name}?`)) {
            try {
                await removeFriend(chat._id);
                onBack();
                window.location.reload();
            } catch (error) {
                alert('Failed to remove friend');
            }
        }
    };

    const isDirectOnline = !isGroup && onlineUsers?.has(String(chat._id));

    return (
        <div className="flex flex-col h-full w-full bg-[var(--bg-primary)] relative select-none">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-3.5 bg-gradient-to-b from-[#12100D] via-[#12100D]/95 to-transparent border-b border-[var(--border-subtle)]/60 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="md:hidden p-2 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition shadow-sm"
                    >
                        <FiChevronLeft size={18} />
                    </button>

                    <div
                        onClick={() => isGroup && setIsGroupInfoOpen(true)}
                        className={`flex items-center gap-3 bg-[var(--bg-panel)] p-1.5 pr-4 rounded-full border border-[var(--border-subtle)] shadow-sm backdrop-blur-md ${
                            isGroup ? 'cursor-pointer hover:border-[#FFB000]/40 transition' : ''
                        }`}
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-[#090705] font-bold text-xs flex-shrink-0">
                            {activeGroup.avatar ? (
                                <img
                                    src={activeGroup.avatar}
                                    alt="Avatar"
                                    className="w-full h-full object-cover rounded-full"
                                />
                            ) : isGroup ? (
                                <FiUsers size={14} />
                            ) : (
                                <span>{activeGroup.name?.charAt(0) || 'U'}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-[var(--text-primary)] text-xs truncate max-w-[140px] md:max-w-[200px]">
                                    {activeGroup.name}
                                </h3>
                                {isGroup && <FiInfo size={11} className="text-[#FFB000] opacity-70" />}
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                                {isGroup
                                    ? `${activeGroup.participants?.length || 0} members`
                                    : isDirectOnline
                                    ? '● Online'
                                    : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* ✨ Catch Me Up Button */}
                    <button
                        onClick={handleTriggerCatchMeUp}
                        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF6A00]/20 to-[#FFB000]/20 border border-[#FFB000]/50 text-[#FFB000] hover:bg-[#FF6A00]/30 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,106,0,0.15)] transition"
                        title="Get instant summary of missed messages"
                    >
                        <span className="text-sm">✨</span>
                        <span className="hidden sm:inline">Catch Me Up</span>
                    </button>

                    {/* Direct chat menu */}
                    {!isGroup && (
                        <div className="relative">
                            <button
                                onClick={() => setShowDirectMenu(!showDirectMenu)}
                                className="p-2 rounded-full bg-[var(--bg-panel)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition border border-[var(--border-subtle)] shadow-sm"
                            >
                                <FiMoreVertical size={16} />
                            </button>
                            {showDirectMenu && (
                                <div className="absolute right-0 top-12 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-xl w-36 overflow-hidden z-50 animate-fade-in">
                                    <button
                                        onClick={handleUnfriend}
                                        className="w-full text-left px-3 py-2.5 text-red-400 font-semibold hover:bg-red-500/10 text-xs flex items-center gap-2"
                                    >
                                        <FiTrash2 size={14} /> Unfriend
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Notification Toast */}
            {notificationToast && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-[#FF6A00] text-[#090705] text-xs font-bold shadow-xl animate-fade-in">
                    {notificationToast}
                </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 pt-20 pb-4 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => {
                        const senderId = String(msg.sender?._id || msg.sender);
                        const isMe = senderId === String(user._id);
                        const isSystem = msg.messageType === 'system';
                        const isHighlighted = highlightedMessageId === String(msg._id);

                        if (isSystem) {
                            return (
                                <div key={msg._id || index} className="flex justify-center my-2">
                                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-[#1C1813] text-[#FFB000]/80 border border-[#FFB000]/20 font-mono shadow-sm">
                                        ✦ {msg.content}
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <motion.div
                                key={msg._id || index}
                                ref={(el) => (messageElementsRef.current[String(msg._id)] = el)}
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}
                            >
                                <div
                                    className={`flex gap-2 max-w-[80%] md:max-w-[70%] ${
                                        isMe ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                >
                                    {/* Member Avatar in group */}
                                    {isGroup && !isMe && (
                                        <img
                                            src={msg.sender?.avatar || 'https://api.dicebear.com/7.x/identicon/svg'}
                                            alt="Sender"
                                            className="w-7 h-7 rounded-full object-cover border border-[var(--border-subtle)] flex-shrink-0 mt-1"
                                        />
                                    )}

                                    {/* Bubble */}
                                    <div
                                        className={`relative px-4 py-2.5 rounded-2xl text-xs leading-relaxed backdrop-blur-sm transition-all ${
                                            isHighlighted ? 'ring-2 ring-[#FF6A00] shadow-[0_0_20px_#FF6A00]' : ''
                                        } ${
                                            isMe
                                                ? 'bg-[#FF6A00] text-[#090705] font-semibold rounded-tr-none shadow-md shadow-[#FF6A00]/20'
                                                : 'bg-[#181410] text-[#FFF7EA] rounded-tl-none border border-[var(--border-subtle)] shadow-sm'
                                        }`}
                                    >
                                        {/* Sender Name in Group Chat */}
                                        {isGroup && !isMe && (
                                            <p className="text-[10px] font-bold text-[#FFB000] mb-0.5 truncate">
                                                {msg.sender?.name || 'Member'}
                                            </p>
                                        )}

                                        <p className="whitespace-pre-wrap select-text">{msg.content}</p>

                                        <div className="flex items-center justify-between gap-3 mt-1 opacity-85">
                                            <span className="text-[9px] font-mono">
                                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                            {isMe && (
                                                <span
                                                    className="flex items-center gap-1 text-[9px] font-semibold select-none"
                                                    title={
                                                        msg.read
                                                            ? `Seen ${msg.readAt ? new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                                                            : 'Sent'
                                                    }
                                                >
                                                    {msg.read ? (
                                                        <span className="text-[#090705] font-black flex items-center gap-0.5">
                                                            <span className="tracking-tighter font-mono text-[10px]">✓✓</span>
                                                            <span className="text-[8.5px] uppercase tracking-wider">Seen</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-[#090705]/65 flex items-center gap-0.5 font-medium">
                                                            <span className="font-mono text-[10px]">✓</span>
                                                            <span className="text-[8.5px]">Sent</span>
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {/* Context Menu Trigger Icon */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedActionMessage(msg);
                                            }}
                                            className={`absolute top-1.5 ${
                                                isMe ? '-left-7' : '-right-7'
                                            } p-1 text-[var(--text-muted)] hover:text-[#FFB000] opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition rounded-lg hover:bg-white/10`}
                                            title="Message Actions"
                                        >
                                            <FiMoreVertical size={13} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start px-2">
                        <div className="bg-[#181410] px-3.5 py-1.5 rounded-2xl rounded-tl-none border border-[var(--border-subtle)] flex items-center gap-2">
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                {Array.from(typingUsers).join(', ')} is typing...
                            </span>
                            <div className="flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-[#FF6A00] rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-[#FFB000] rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-[#FFD166] rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Smart Reply Suggestions Bar (Phase 11) */}
            {smartReplies.length > 0 && (
                <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto custom-scrollbar animate-fade-in">
                    <span className="text-[10px] font-bold text-[#FFB000] flex items-center gap-1 flex-shrink-0">
                        <FiZap size={11} /> Suggestions:
                    </span>
                    {smartReplies.map((reply, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                setInput(reply);
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#1C1813] border border-[#FFB000]/40 text-xs text-[#FFF7EA] hover:bg-[#FF6A00]/20 hover:border-[#FF6A00] transition flex-shrink-0 font-medium"
                        >
                            {reply}
                        </button>
                    ))}
                    <button
                        onClick={() => setSmartReplies([])}
                        className="text-[10px] text-[var(--text-muted)] hover:text-white ml-auto"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Message Input Composer */}
            <div className="p-4 pt-1 bg-transparent">
                <form
                    onSubmit={handleSend}
                    className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-full px-3 py-2 flex items-center gap-2 shadow-xl backdrop-blur-xl"
                >
                    <input
                        type="text"
                        className="flex-1 bg-transparent text-[var(--text-primary)] font-semibold px-4 py-2 focus:outline-none text-xs md:text-sm placeholder-[var(--text-secondary)]/70"
                        placeholder={
                            isGroup
                                ? `Message ${activeGroup.name}...`
                                : `Message ${activeGroup.name}...`
                        }
                        value={input}
                        onChange={handleInput}
                    />
                    <button
                        type="submit"
                        className="w-10 h-10 bg-[#FF6A00] rounded-full text-[#090705] flex items-center justify-center hover:bg-[#E05D00] transition shadow-lg shadow-[rgba(255,106,0,0.3)] font-bold flex-shrink-0"
                    >
                        <FiSend className="ml-0.5" />
                    </button>
                </form>
            </div>

            {/* Modals */}
            {isGroup && (
                <GroupInfoModal
                    isOpen={isGroupInfoOpen}
                    onClose={() => setIsGroupInfoOpen(false)}
                    group={activeGroup}
                    currentUser={user}
                    friends={friends}
                    onlineUsers={onlineUsers}
                    onGroupUpdated={(updated) => setActiveGroup(updated)}
                    onLeaveGroup={() => onBack()}
                />
            )}

            <CatchMeUpModal
                isOpen={isCatchMeUpOpen}
                onClose={() => setIsCatchMeUpOpen(false)}
                loading={catchMeUpLoading}
                data={catchMeUpData}
                conversationName={activeGroup.name}
                onJumpToMessage={handleJumpToMessage}
            />

            <AIMessageActionModal
                isOpen={aiActionModal.isOpen}
                onClose={() =>
                    setAiActionModal({ isOpen: false, actionType: null, message: null })
                }
                actionType={aiActionModal.actionType}
                message={aiActionModal.message}
                conversationId={conversationId}
                onSuccessNotification={showToast}
            />

            {/* Message Action Sheet / Context Menu Modal */}
            <AnimatePresence>
                {selectedActionMessage && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedActionMessage(null)}
                            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
                        />

                        {/* Bottom sheet on mobile / modal on desktop */}
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="relative z-10 w-full sm:max-w-md bg-[#191510] border-t sm:border border-[#FFB000]/30 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Mobile Drag Indicator */}
                            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

                            {/* Header: Quoted Message Preview */}
                            <div className="mb-4 pb-3 border-b border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
                                    <span className="font-semibold text-[#FFB000]">
                                        {String(selectedActionMessage.sender?._id || selectedActionMessage.sender) === String(user._id)
                                            ? 'You'
                                            : selectedActionMessage.sender?.name || 'Member'}
                                    </span>
                                    <span className="font-mono text-[10px]">
                                        {new Date(selectedActionMessage.createdAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                                <p className="text-xs text-[#FFF7EA] line-clamp-3 italic bg-black/30 p-2.5 rounded-xl border border-white/5">
                                    "{selectedActionMessage.content}"
                                </p>
                            </div>

                            {/* Actions List */}
                            <div className="space-y-1.5 overflow-y-auto pr-1">
                                {/* Standard Actions */}
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <button
                                        onClick={() => handleCopyMessage(selectedActionMessage.content)}
                                        className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#FFF7EA] border border-white/5 transition"
                                    >
                                        <FiCopy size={14} className="text-[#FF6A00]" /> Copy Text
                                    </button>
                                    <button
                                        onClick={() => handleQuoteReply(selectedActionMessage)}
                                        className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#FFF7EA] border border-white/5 transition"
                                    >
                                        <FiCornerUpLeft size={14} className="text-[#FFB000]" /> Quote & Reply
                                    </button>
                                </div>

                                <div className="text-[10px] font-bold uppercase tracking-wider text-[#FFB000] px-1 pt-1 pb-0.5 flex items-center gap-1">
                                    <FiZap size={11} /> AI Intelligence Actions
                                </div>

                                {/* AI Action Buttons */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setAiActionModal({
                                                isOpen: true,
                                                actionType: 'summarize',
                                                message: selectedActionMessage,
                                            });
                                            setSelectedActionMessage(null);
                                        }}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00]/10 to-transparent hover:from-[#FF6A00]/20 text-xs font-medium text-[#FFF7EA] border border-[#FF6A00]/25 transition"
                                    >
                                        <FiFileText size={14} className="text-[#FF6A00] flex-shrink-0" />
                                        <div className="text-left">
                                            <div className="font-semibold text-xs text-[#FFF7EA]">Summarize</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">Key points</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setAiActionModal({
                                                isOpen: true,
                                                actionType: 'explain',
                                                message: selectedActionMessage,
                                            });
                                            setSelectedActionMessage(null);
                                        }}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-[#FFB000]/10 to-transparent hover:from-[#FFB000]/20 text-xs font-medium text-[#FFF7EA] border border-[#FFB000]/25 transition"
                                    >
                                        <FiHelpCircle size={14} className="text-[#FFB000] flex-shrink-0" />
                                        <div className="text-left">
                                            <div className="font-semibold text-xs text-[#FFF7EA]">Explain</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">Clarify meaning</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setAiActionModal({
                                                isOpen: true,
                                                actionType: 'translate',
                                                message: selectedActionMessage,
                                            });
                                            setSelectedActionMessage(null);
                                        }}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/20 text-xs font-medium text-[#FFF7EA] border border-amber-500/25 transition"
                                    >
                                        <FiGlobe size={14} className="text-amber-400 flex-shrink-0" />
                                        <div className="text-left">
                                            <div className="font-semibold text-xs text-[#FFF7EA]">Translate</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">Into any language</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            handleTriggerSmartReplies(selectedActionMessage);
                                            setSelectedActionMessage(null);
                                        }}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent hover:from-emerald-500/20 text-xs font-medium text-[#FFF7EA] border border-emerald-500/25 transition"
                                    >
                                        <FiMessageSquare size={14} className="text-emerald-400 flex-shrink-0" />
                                        <div className="text-left">
                                            <div className="font-semibold text-xs text-[#FFF7EA]">Smart Reply</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">Suggest replies</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setAiActionModal({
                                                isOpen: true,
                                                actionType: 'remember',
                                                message: selectedActionMessage,
                                            });
                                            setSelectedActionMessage(null);
                                        }}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-sky-500/10 to-transparent hover:from-sky-500/20 text-xs font-medium text-[#FFF7EA] border border-sky-500/25 transition"
                                    >
                                        <FiBookOpen size={14} className="text-sky-400 flex-shrink-0" />
                                        <div className="text-left">
                                            <div className="font-semibold text-xs text-[#FFF7EA]">Remember Fact</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">Save memory</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setAiActionModal({
                                                isOpen: true,
                                                actionType: 'task',
                                                message: selectedActionMessage,
                                            });
                                            setSelectedActionMessage(null);
                                        }}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-transparent hover:from-purple-500/20 text-xs font-medium text-[#FFF7EA] border border-purple-500/25 transition"
                                    >
                                        <FiCheckSquare size={14} className="text-purple-400 flex-shrink-0" />
                                        <div className="text-left">
                                            <div className="font-semibold text-xs text-[#FFF7EA]">Extract Task</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">Add action item</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedActionMessage(null)}
                                className="mt-4 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[var(--text-muted)] hover:text-white transition flex items-center justify-center gap-1.5"
                            >
                                <FiX size={14} /> Close
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatWindow;
