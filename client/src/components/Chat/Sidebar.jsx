import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
    FiSearch,
    FiUserPlus,
    FiUsers,
    FiCpu,
    FiLogOut,
    FiZap,
    FiBookOpen,
    FiCheckSquare,
    FiPlus,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
    searchUser,
    getFriends,
    getFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
} from '../../services/userApi';
import {
    getConversations,
    getUnreadCounts,
    markConversationAsRead,
    markMessagesAsRead,
} from '../../services/chatApi';
import CreateGroupModal from './CreateGroupModal';
import MemoriesModal from './MemoriesModal';
import TasksModal from './TasksModal';

const Sidebar = ({ onSelectChat, activeChat }) => {
    const { user, logout } = useAuth();
    const { toggleTheme } = useTheme();
    const { socket, onlineUsers } = useSocket();

    const [tab, setTab] = useState('chats'); // 'chats' | 'alerts' | 'add'
    const [chatSubFilter, setChatSubFilter] = useState('all'); // 'all' | 'direct' | 'groups'
    const [friends, setFriends] = useState([]);
    const [groups, setGroups] = useState([]);
    const [requests, setRequests] = useState([]);
    const [query, setQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [unread, setUnread] = useState({});
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Modals
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
    const [isTasksOpen, setIsTasksOpen] = useState(false);

    // Initial load
    useEffect(() => {
        loadData();
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }, [tab]);

    const loadData = async () => {
        try {
            const [friendsData, requestsData, conversationsData, unreadCountsData] = await Promise.all([
                getFriends().catch(() => []),
                getFriendRequests().catch(() => []),
                getConversations().catch(() => []),
                getUnreadCounts().catch(() => ({})),
            ]);

            setFriends(friendsData || []);
            setRequests(requestsData || []);

            // Split conversations into groups and direct
            const groupList = (conversationsData || []).filter((c) => c.type === 'group');
            setGroups(groupList);

            // Clean unread counts: if activeChat is open, it should show 0 unread
            const cleanedUnread = { ...(unreadCountsData || {}) };
            if (activeChat) {
                delete cleanedUnread[String(activeChat._id)];
                if (activeChat.conversationId) {
                    delete cleanedUnread[String(activeChat.conversationId)];
                }
            }
            setUnread(cleanedUnread);
        } catch (err) {
            console.error('Sidebar loadData error:', err);
        }
    };

    // Socket.IO event listeners
    useEffect(() => {
        if (!socket) return;

        let userInteracted = false;
        const enableAudio = () => {
            userInteracted = true;
        };
        window.addEventListener('click', enableAudio);
        window.addEventListener('keydown', enableAudio);

        const handleMessage = (msg) => {
            const isMe = String(msg.sender?._id || msg.sender) === String(user._id);

            // Determine if message belongs to active chat
            let isCurrentChat = false;
            let targetKey = null;

            if (msg.conversation) {
                const convIdStr = String(msg.conversation._id || msg.conversation);
                targetKey = convIdStr;
                isCurrentChat =
                    activeChat &&
                    (String(activeChat._id) === convIdStr ||
                        String(activeChat.conversationId) === convIdStr);
            } else {
                const partnerId = isMe
                    ? String(msg.receiver?._id || msg.receiver)
                    : String(msg.sender?._id || msg.sender);
                targetKey = partnerId;
                isCurrentChat =
                    activeChat &&
                    activeChat.type === 'friend' &&
                    String(activeChat._id) === partnerId;
            }

            // Update unread count if not active chat and not sent by me
            if (!isMe && !isCurrentChat && targetKey) {
                setUnread((prev) => ({
                    ...prev,
                    [targetKey]: (prev[targetKey] || 0) + 1,
                }));

                // Sound
                if (userInteracted) {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => {});
                }

                // Browser Notification
                if (Notification.permission === 'granted' && document.hidden) {
                    const senderName = msg.sender?.name || 'New Message';
                    const notification = new Notification(senderName, {
                        body: msg.content,
                        icon: '/vite.svg',
                        tag: targetKey,
                    });
                    setTimeout(() => notification.close(), 4000);
                }
            } else if (!isMe && isCurrentChat && targetKey) {
                // If actively viewing this chat, mark read immediately on server
                if (activeChat.type === 'group') {
                    markConversationAsRead(targetKey).catch(() => {});
                } else {
                    markMessagesAsRead(targetKey).catch(() => {});
                    if (activeChat.conversationId) {
                        markConversationAsRead(activeChat.conversationId).catch(() => {});
                    }
                }
            }

            // Refresh conversations list to update ordering & last message
            loadData();
        };

        const handleGroupCreated = (newGroup) => {
            setGroups((prev) => {
                const exists = prev.some((g) => String(g._id) === String(newGroup._id));
                if (exists) return prev;
                return [newGroup, ...prev];
            });
        };

        const handleGroupUpdated = (updatedGroup) => {
            setGroups((prev) =>
                prev.map((g) => (String(g._id) === String(updatedGroup._id) ? updatedGroup : g))
            );
        };

        const handleMemberRemoved = ({ groupId, removedBy }) => {
            setGroups((prev) => prev.filter((g) => String(g._id) !== String(groupId)));
            if (activeChat && String(activeChat._id) === String(groupId)) {
                alert(`You were removed from this group by ${removedBy}`);
                onSelectChat(null);
            }
        };

        const handleMessagesRead = ({ readerId, friendId }) => {
            setUnread((prev) => {
                const next = { ...prev };
                if (readerId) delete next[String(readerId)];
                if (friendId) delete next[String(friendId)];
                return next;
            });
        };

        const handleConversationRead = ({ conversationId }) => {
            setUnread((prev) => {
                const next = { ...prev };
                if (conversationId) delete next[String(conversationId)];
                return next;
            });
        };

        socket.on('receive_message', handleMessage);
        socket.on('group_created', handleGroupCreated);
        socket.on('group_updated', handleGroupUpdated);
        socket.on('member_removed', handleMemberRemoved);
        socket.on('messages_read', handleMessagesRead);
        socket.on('conversation_read', handleConversationRead);

        return () => {
            socket.off('receive_message', handleMessage);
            socket.off('group_created', handleGroupCreated);
            socket.off('group_updated', handleGroupUpdated);
            socket.off('member_removed', handleMemberRemoved);
            socket.off('messages_read', handleMessagesRead);
            socket.off('conversation_read', handleConversationRead);
            window.removeEventListener('click', enableAudio);
            window.removeEventListener('keydown', enableAudio);
        };
    }, [socket, activeChat, user._id]);

    // Clear unread badge when chat is opened
    useEffect(() => {
        if (!activeChat) return;

        const chatKey = String(activeChat._id);
        setUnread((prev) => {
            const next = { ...prev };
            delete next[chatKey];
            if (activeChat.conversationId) {
                delete next[String(activeChat.conversationId)];
            }
            return next;
        });

        // Mark conversation or messages as read on server
        if (activeChat.type === 'group') {
            markConversationAsRead(activeChat._id).catch(() => {});
        } else {
            markMessagesAsRead(activeChat._id).catch(() => {});
            if (activeChat.conversationId) {
                markConversationAsRead(activeChat.conversationId).catch(() => {});
            }
        }
    }, [activeChat]);

    const handleSearch = async (e) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed) return;
        setLoading(true);
        setSearchResult(null);
        setSearchError('');
        try {
            const res = await searchUser(trimmed);
            setSearchResult(res);
        } catch (error) {
            setSearchResult(null);
            setSearchError(error.response?.data?.message || 'User not found');
        }
        setLoading(false);
    };

    const handleSendRequest = async (id) => {
        try {
            await sendFriendRequest(id);
            setSearchResult((prev) => ({ ...prev, requestSent: true }));
        } catch (error) {
            alert(error.response?.data?.message || 'Error sending request');
        }
    };

    const totalUnreadCount = Object.values(unread).reduce((a, b) => a + b, 0);

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] backdrop-blur-md transition-colors duration-300 select-none">
            {/* Brand & Profile Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-panel)]">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                        <img
                            src={user.avatar || 'https://api.dicebear.com/7.x/identicon/svg'}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full border border-[var(--border-subtle)] p-0.5 object-cover"
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#FF6A00] rounded-full border-2 border-[var(--bg-primary)] shadow-[0_0_8px_#FF6A00]"></div>
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-display font-bold tracking-[0.14em] text-xs text-[var(--text-primary)]">HANASU</span>
                            <span className="text-[10px] text-[var(--text-accent)] font-japanese font-semibold">話す</span>
                        </div>
                        <h3 className="font-semibold text-xs text-[var(--text-primary)] tracking-wide truncate max-w-[130px]">
                            {user.name}
                        </h3>
                        <p className="text-[10px] text-[#FFB000]/80 font-mono font-medium">{user.userTag}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Memories Modal Trigger */}
                    <button
                        onClick={() => setIsMemoriesOpen(true)}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[#FFB000] hover:bg-[var(--bg-hover)] transition"
                        title="Saved Memories"
                    >
                        <FiBookOpen size={16} />
                    </button>

                    {/* Tasks Modal Trigger */}
                    <button
                        onClick={() => setIsTasksOpen(true)}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[#FFB000] hover:bg-[var(--bg-hover)] transition"
                        title="Action Items & Tasks"
                    >
                        <FiCheckSquare size={16} />
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[#FFB000] hover:bg-[var(--bg-hover)] transition"
                        title="Toggle Theme"
                    >
                        <FiZap size={16} />
                    </button>

                    {/* Logout */}
                    <button
                        onClick={logout}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-[var(--bg-hover)] transition"
                        title="Log Out"
                    >
                        <FiLogOut size={16} />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex px-4 pt-3 gap-6 border-b border-[var(--border-subtle)]">
                {['chats', 'alerts', 'add'].map((t) => (
                    <button
                        key={t}
                        onClick={() => {
                            setTab(t);
                            if (socket) socket.emit('get_online_users');
                        }}
                        className={`relative pb-2.5 text-xs font-semibold tracking-wider uppercase transition-colors ${
                            tab === t ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        {t === 'chats' && 'Chats'}
                        {t === 'alerts' && 'Alerts'}
                        {t === 'add' && 'Add'}

                        {t === 'alerts' && requests.length > 0 && (
                            <span className="absolute -top-0.5 -right-2 w-2 h-2 bg-[#FF6A00] rounded-full shadow-[0_0_6px_#FF6A00] animate-pulse"></span>
                        )}
                        {t === 'chats' && totalUnreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-2 w-2 h-2 bg-[#FF6A00] rounded-full shadow-[0_0_6px_#FF6A00] animate-pulse"></span>
                        )}
                        {tab === t && (
                            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FF6A00] shadow-[0_0_8px_rgba(255,106,0,0.6)]"></span>
                        )}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {/* Always-Visible AI Assistant Card */}
                <div
                    onClick={() => onSelectChat({ type: 'ai', id: 'ai', name: 'Hanasu Assistant' })}
                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border ${
                        activeChat?.type === 'ai'
                            ? 'bg-[var(--bg-active)] border-[var(--border-strong)] shadow-[0_0_16px_rgba(255,106,0,0.12)]'
                            : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]'
                    }`}
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-[#090705] font-bold shadow-[0_0_12px_rgba(255,106,0,0.3)]">
                        <FiCpu size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-[var(--text-primary)] text-xs">Hanasu Assistant</h4>
                            <span className="text-[10px] text-[#FFB000] font-mono">✦ Ready</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] font-light">1-on-1 intelligence</p>
                    </div>
                </div>

                <div className="h-[1px] bg-[var(--border-subtle)] w-full my-1"></div>

                {/* TAB: CHATS */}
                {tab === 'chats' && (
                    <div className="space-y-3">
                        {/* Sub-header with New Group Action & Filter */}
                        <div className="flex items-center justify-between pt-1 pb-1">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setChatSubFilter('all')}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition ${
                                        chatSubFilter === 'all'
                                            ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setChatSubFilter('direct')}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition ${
                                        chatSubFilter === 'direct'
                                            ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                                >
                                    Direct
                                </button>
                                <button
                                    onClick={() => setChatSubFilter('groups')}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition ${
                                        chatSubFilter === 'groups'
                                            ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                                >
                                    Groups ({groups.length})
                                </button>
                            </div>

                            {/* Create Group Button */}
                            <button
                                onClick={() => setIsCreateGroupOpen(true)}
                                className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/40 text-[var(--text-accent)] hover:bg-[var(--accent-primary)]/25 text-[10px] font-bold flex items-center gap-1 transition"
                            >
                                <FiPlus size={11} /> New Group
                            </button>
                        </div>

                        {/* Groups Section (if matching filter) */}
                        {(chatSubFilter === 'all' || chatSubFilter === 'groups') && groups.length > 0 && (
                            <div className="space-y-1.5">
                                {chatSubFilter === 'all' && (
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                                        Groups
                                    </div>
                                )}
                                {groups.map((group) => {
                                    const isSelected =
                                        activeChat?.type === 'group' && String(activeChat._id) === String(group._id);
                                    const groupUnread = unread[String(group._id)] || 0;

                                    return (
                                        <div
                                            key={group._id}
                                            onClick={() => {
                                                setUnread((prev) => {
                                                    const next = { ...prev };
                                                    delete next[String(group._id)];
                                                    return next;
                                                });
                                                onSelectChat({ type: 'group', ...group });
                                            }}
                                            className={`p-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-all border relative ${
                                                isSelected
                                                    ? 'bg-[var(--bg-active)] border-[var(--border-strong)] shadow-[0_0_16px_rgba(255,106,0,0.1)]'
                                                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]'
                                            }`}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6A00]/40 to-[#FFB000]/40 border border-[#FFB000]/30 flex items-center justify-center text-[#FFB000] font-bold text-xs">
                                                    {group.avatar ? (
                                                        <img
                                                            src={group.avatar}
                                                            alt="Group"
                                                            className="w-full h-full object-cover rounded-xl"
                                                        />
                                                    ) : (
                                                        <FiUsers size={16} />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <h4 className="text-xs text-[var(--text-primary)] font-semibold truncate">
                                                        {group.name}
                                                    </h4>
                                                    <span className="text-[9px] text-[var(--text-muted)] font-mono">
                                                        {group.participants?.length || 0}m
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[var(--text-muted)] truncate">
                                                    {group.lastMessage?.content || 'Group conversation'}
                                                </p>
                                            </div>
                                            {groupUnread > 0 && (
                                                <div className="w-5 h-5 bg-[#FF6A00] text-[#090705] rounded-full flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(255,106,0,0.4)] flex-shrink-0">
                                                    {groupUnread}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Direct Chats Section */}
                        {(chatSubFilter === 'all' || chatSubFilter === 'direct') && (
                            <div className="space-y-1.5">
                                {chatSubFilter === 'all' && (
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1 pt-1">
                                        Direct Messages
                                    </div>
                                )}
                                {friends.length === 0 ? (
                                    <p className="text-center text-[var(--text-secondary)] text-xs italic py-6 font-medium">
                                        Silence is golden,<br />but friends are better.
                                    </p>
                                ) : (
                                    friends.map((friend) => {
                                        const isOnline = onlineUsers?.has(String(friend._id));
                                        const isSelected =
                                            activeChat?.type === 'friend' && String(activeChat._id) === String(friend._id);
                                        const friendUnread = unread[String(friend._id)] || 0;

                                        return (
                                            <div
                                                key={friend._id}
                                                onClick={() => {
                                                    setUnread((prev) => {
                                                        const next = { ...prev };
                                                        delete next[String(friend._id)];
                                                        return next;
                                                    });
                                                    onSelectChat({ type: 'friend', ...friend });
                                                }}
                                                className={`p-2.5 rounded-xl flex items-center gap-3 cursor-pointer transition-all border relative ${
                                                    isSelected
                                                        ? 'bg-[var(--bg-active)] border-[var(--border-strong)] shadow-[0_0_16px_rgba(255,106,0,0.1)]'
                                                        : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]'
                                                }`}
                                            >
                                                <div className="relative flex-shrink-0">
                                                    <img
                                                        src={friend.avatar || 'https://api.dicebear.com/7.x/identicon/svg'}
                                                        alt="Avatar"
                                                        className="w-10 h-10 rounded-full object-cover border border-[var(--border-subtle)]"
                                                    />
                                                    <div
                                                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-primary)] ${
                                                            isOnline
                                                                ? 'bg-[#FF6A00] shadow-[0_0_6px_#FF6A00]'
                                                                : 'bg-[#7E6F5E]'
                                                        }`}
                                                    ></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <h4 className="text-xs text-[var(--text-primary)] font-semibold truncate">
                                                            {friend.name}
                                                        </h4>
                                                        <span
                                                            className={`text-[9px] font-semibold ${
                                                                isOnline ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'
                                                            }`}
                                                        >
                                                            {isOnline ? '● Online' : 'Offline'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                                                        {friend.userTag}
                                                    </p>
                                                </div>
                                                {friendUnread > 0 && (
                                                    <div className="w-5 h-5 bg-[var(--accent-primary)] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(255,106,0,0.4)] flex-shrink-0">
                                                        {friendUnread}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: ALERTS */}
                {tab === 'alerts' && (
                    <div className="space-y-3">
                        {requests.length === 0 && (
                            <p className="text-center text-[var(--text-secondary)] text-xs py-8 font-medium">
                                No pending requests
                            </p>
                        )}
                        {requests.map((req) => (
                            <div
                                key={req._id}
                                className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] backdrop-blur-sm shadow-sm"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <img
                                        src={req.sender.avatar || 'https://api.dicebear.com/7.x/identicon/svg'}
                                        alt="Avatar"
                                        className="w-9 h-9 rounded-full object-cover border border-[var(--border-subtle)]"
                                    />
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                            {req.sender.name}
                                        </h4>
                                        <p className="text-xs text-[var(--text-secondary)] font-mono font-medium">
                                            {req.sender.userTag}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            acceptFriendRequest(req._id).then(() => {
                                                loadData();
                                            })
                                        }
                                        className="flex-1 bg-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-500/30 py-1.5 rounded-lg text-xs transition border border-emerald-500/30"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => rejectFriendRequest(req._id).then(loadData)}
                                        className="flex-1 bg-red-500/15 text-red-400 font-bold hover:bg-red-500/25 py-1.5 rounded-lg text-xs transition border border-red-500/20"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB: ADD FRIEND */}
                {tab === 'add' && (
                    <div className="animate-fade-in">
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Search ID (#XXXX)"
                                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent-primary)] placeholder-[var(--text-secondary)] transition-all font-mono"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    if (searchError) setSearchError('');
                                }}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-3 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition disabled:opacity-50"
                            >
                                <FiSearch size={14} />
                            </button>
                        </form>

                        {loading && (
                            <p className="text-xs text-[var(--text-secondary)] text-center py-4 font-semibold">
                                Searching...
                            </p>
                        )}

                        {searchError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold">
                                {searchError}
                            </div>
                        )}

                        {searchResult && (
                            <div className="flex flex-col items-center p-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] shadow-sm">
                                <img
                                    src={searchResult.avatar || 'https://api.dicebear.com/7.x/identicon/svg'}
                                    alt="Avatar"
                                    className="w-16 h-16 rounded-full mb-3 ring-2 ring-[var(--accent-primary)]/30 object-cover"
                                />
                                <h4 className="text-[var(--text-primary)] font-bold text-sm">{searchResult.name}</h4>
                                <p className="text-xs text-[var(--text-secondary)] font-mono font-semibold mb-4">
                                    {searchResult.userTag}
                                </p>
                                <button
                                    onClick={() => handleSendRequest(searchResult._id)}
                                    disabled={
                                        searchResult.requestSent ||
                                        searchResult.isFriend ||
                                        searchResult.hasPendingRequest
                                    }
                                    className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${
                                        searchResult.isFriend
                                            ? 'bg-white/10 text-white/60 cursor-default'
                                            : searchResult.hasPendingRequest
                                            ? 'bg-[#FFB000]/20 text-[#FFB000] cursor-default'
                                            : searchResult.requestSent
                                            ? 'bg-[#FF6A00]/20 text-[#FF6A00] cursor-default'
                                            : 'bg-[#FF6A00] text-[#090705] hover:bg-[#E05D00] shadow-lg shadow-[#FF6A00]/30'
                                    }`}
                                >
                                    {searchResult.isFriend
                                        ? 'Already Friends'
                                        : searchResult.hasPendingRequest
                                        ? 'Check Alerts'
                                        : searchResult.requestSent
                                        ? 'Sent'
                                        : 'Send Request'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateGroupModal
                isOpen={isCreateGroupOpen}
                onClose={() => setIsCreateGroupOpen(false)}
                friends={friends}
                onGroupCreated={(newGroup) => {
                    setGroups((prev) => [newGroup, ...prev]);
                    onSelectChat({ type: 'group', ...newGroup });
                }}
            />

            <MemoriesModal isOpen={isMemoriesOpen} onClose={() => setIsMemoriesOpen(false)} />

            <TasksModal isOpen={isTasksOpen} onClose={() => setIsTasksOpen(false)} />
        </div>
    );
};

export default Sidebar;
