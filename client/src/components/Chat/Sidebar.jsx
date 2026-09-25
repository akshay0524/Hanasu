import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FiSearch, FiUserPlus, FiMessageSquare, FiCpu, FiLogOut, FiBell, FiZap } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { searchUser, getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } from '../../services/userApi';

const Sidebar = ({ onSelectChat, activeChat }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { socket, onlineUsers } = useSocket();
    const [tab, setTab] = useState('friends');
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [query, setQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [unread, setUnread] = useState({});
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState('');

    useEffect(() => {
        fetchFriends();
        fetchRequests();
        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, [tab]);

    // Listen for incoming messages
    useEffect(() => {
        if (!socket) return;

        let userInteracted = false;
        const enableAudio = () => { userInteracted = true; };
        window.addEventListener('click', enableAudio);
        window.addEventListener('keydown', enableAudio);

        const handleMessage = (msg) => {
            // 1. Reorder Logic: Move conversation to top
            const partnerId = msg.sender === user._id ? msg.receiver : msg.sender;

            setFriends(prev => {
                const index = prev.findIndex(f => f._id === partnerId);
                if (index > -1) {
                    const newFriends = [...prev];
                    const [friend] = newFriends.splice(index, 1);
                    newFriends.unshift(friend);
                    return newFriends;
                }
                return prev;
            });

            // 2. Notification Logic (Only if I am receiver and chat is not open)
            if (msg.sender !== user._id && activeChat?._id !== msg.sender) {

                // Update unread count
                setUnread(prev => ({
                    ...prev,
                    [msg.sender]: (prev[msg.sender] || 0) + 1
                }));

                // Play sound
                if (userInteracted) {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.log("Audio play prevented by browser policy", e));
                }

                // Browser Notification
                if (Notification.permission === "granted" && document.hidden) {
                    const friend = friends.find(f => f._id === msg.sender);
                    const name = friend ? friend.name : "New Message";

                    const notification = new Notification(name, {
                        body: msg.content,
                        icon: '/vite.svg',
                        tag: msg.sender
                    });

                    setTimeout(() => notification.close(), 4000);

                    notification.onclick = function () {
                        window.focus();
                        if (friend) onSelectChat({ type: 'friend', ...friend });
                        this.close();
                    };
                }
            }
        };

        socket.on('receive_message', handleMessage);

        return () => {
            socket.off('receive_message', handleMessage);
            window.removeEventListener('click', enableAudio);
            window.removeEventListener('keydown', enableAudio);
        };
    }, [socket, activeChat, friends, user._id]);

    // Clear unread when chat opens
    useEffect(() => {
        if (activeChat && activeChat.type === 'friend') {
            setUnread(prev => {
                const newUnread = { ...prev };
                delete newUnread[activeChat._id];
                return newUnread;
            });
        }
    }, [activeChat]);

    const fetchFriends = async () => {
        try {
            const data = await getFriends();
            setFriends(data);
        } catch (error) { console.error(error); }
    };

    const fetchRequests = async () => {
        try {
            const data = await getFriendRequests();
            setRequests(data);
        } catch (error) { console.error(error); }
    };

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
            setSearchResult(prev => ({ ...prev, requestSent: true }));
        } catch (error) {
            const msg = error.response?.data?.message || "Error sending request";
            alert(msg);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] backdrop-blur-md transition-colors duration-300">
            {/* Brand & Profile Header */}
            <div className="p-5 pb-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-panel)]">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img src={user.avatar} alt="Avatar" className="w-11 h-11 rounded-full border border-[var(--border-subtle)] p-0.5 object-cover" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#FF6A00] rounded-full border-2 border-[var(--bg-primary)] shadow-[0_0_8px_#FF6A00]"></div>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-display font-bold tracking-[0.14em] text-xs text-[#FFF7EA]">HANASU</span>
                            <span className="text-[10px] text-[#FFB000] font-japanese font-semibold">話す</span>
                        </div>
                        <h3 className="font-semibold text-sm text-[var(--text-primary)] tracking-wide truncate max-w-[150px]">{user.name}</h3>
                        <p className="text-[11px] text-[#FFB000]/80 font-mono font-medium">{user.userTag}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg transition-all text-[var(--text-secondary)] hover:text-[#FFB000] hover:bg-[var(--bg-hover)]"
                        title="Toggle Theme"
                    >
                        <FiZap size={17} />
                    </button>
                    <button onClick={logout} className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-[var(--bg-hover)] transition-colors" title="Log Out">
                        <FiLogOut size={17} />
                    </button>
                </div>
            </div>

            {/* Modern Tabs */}
            <div className="flex px-4 pt-3 gap-6 border-b border-[var(--border-subtle)]">
                {['friends', 'requests', 'search'].map((t) => (
                    <button
                        key={t}
                        onClick={() => {
                            setTab(t);
                            if (socket) socket.emit('get_online_users');
                        }}
                        className={`relative pb-2.5 text-xs font-semibold tracking-wider uppercase transition-colors ${tab === t ? 'text-[#FFF7EA]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {t === 'friends' && 'Chats'}
                        {t === 'requests' && 'Alerts'}
                        {t === 'search' && 'Add'}
                        {t === 'requests' && requests.length > 0 && (
                            <span className="absolute -top-0.5 -right-2 w-2 h-2 bg-[#FF6A00] rounded-full shadow-[0_0_6px_#FF6A00] animate-pulse"></span>
                        )}
                        {t === 'friends' && Object.values(unread).reduce((a, b) => a + b, 0) > 0 && (
                            <span className="absolute -top-0.5 -right-2 w-2 h-2 bg-[#FF6A00] rounded-full shadow-[0_0_6px_#FF6A00] animate-pulse"></span>
                        )}
                        {tab === t && (
                            <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FF6A00] shadow-[0_0_8px_rgba(255,106,0,0.6)]"></span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">

                {/* AI Chat Card */}
                <div
                    onClick={() => onSelectChat({ type: 'ai', id: 'ai', name: 'AI Helper' })}
                    className={`p-3.5 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 border ${activeChat?.type === 'ai'
                        ? 'bg-[#191510] border-[#FFB000]/50 shadow-[0_0_16px_rgba(255,106,0,0.12)]'
                        : 'bg-[#12100D]/60 border-[var(--border-subtle)] hover:bg-[#191510]/80 hover:border-[#FFB000]/25'
                        }`}
                >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-[#090705] font-bold shadow-[0_0_12px_rgba(255,106,0,0.3)]">
                        <FiCpu size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-[var(--text-primary)] text-sm">AI Assistant</h4>
                            <span className="text-[10px] text-[#FFB000] font-mono">✦ Live</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] font-light">Always available</p>
                    </div>
                </div>

                <div className="h-[1px] bg-[var(--border-subtle)] w-full my-2"></div>

                {tab === 'friends' && (
                    <div className="space-y-2">
                        {friends.length === 0 && <p className="text-center text-[var(--text-secondary)] text-xs italic mt-8 font-medium">Silence is golden,<br />but friends are better.</p>}
                        {friends.map(friend => {
                            const isOnline = onlineUsers.has(String(friend._id));
                            return (
                                <div
                                    key={friend._id}
                                    onClick={() => onSelectChat({ type: 'friend', ...friend })}
                                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all border relative ${activeChat?._id === friend._id
                                        ? 'bg-[#191510] border-[#FFB000]/50 shadow-[0_0_16px_rgba(255,106,0,0.1)]'
                                        : 'bg-[#12100D]/40 border-[var(--border-subtle)] hover:bg-[#191510]/70 hover:border-[#FFB000]/20'
                                        }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img src={friend.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-[var(--border-subtle)]" />
                                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-primary)] ${isOnline ? 'bg-[#FF6A00] shadow-[0_0_6px_#FF6A00]' : 'bg-[#7E6F5E]'}`}></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className="text-sm text-[var(--text-primary)] font-semibold truncate">{friend.name}</h4>
                                            <span className={`text-[10px] font-medium ${isOnline ? 'text-[#FFB000]' : 'text-[var(--text-muted)]'}`}>
                                                {isOnline ? '● Online' : 'Offline'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] font-mono truncate">{friend.userTag}</p>
                                    </div>
                                    {unread[friend._id] > 0 && (
                                        <div className="w-5 h-5 bg-[#FF6A00] text-[#090705] rounded-full flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(255,106,0,0.4)] cursor-default">
                                            {unread[friend._id]}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === 'requests' && (
                    <div className="space-y-3">
                        {requests.length === 0 && (
                            <p className="text-center text-[var(--text-secondary)] text-xs py-8 font-medium">No pending requests</p>
                        )}
                        {requests.map(req => (
                            <div key={req._id} className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] backdrop-blur-sm shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={req.sender.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-[var(--border-subtle)]" />
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{req.sender.name}</h4>
                                        <p className="text-xs text-[var(--text-secondary)] font-mono font-medium">{req.sender.userTag}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => acceptFriendRequest(req._id).then(() => { fetchRequests(); fetchFriends(); })} className="flex-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-500/30 py-1.5 rounded text-xs transition border border-emerald-500/30">Accept</button>
                                    <button onClick={() => rejectFriendRequest(req._id).then(fetchRequests)} className="flex-1 bg-red-500/15 text-red-600 dark:text-red-400 font-bold hover:bg-red-500/25 py-1.5 rounded text-xs transition border border-red-500/20">Dismiss</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'search' && (
                    <div className="animate-fade-in">
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Search ID (#XXXX)"
                                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent-primary)] placeholder-[var(--text-secondary)] transition-all font-mono"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    if (searchError) setSearchError('');
                                }}
                            />
                            <button type="submit" disabled={loading} className="px-3 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition disabled:opacity-50">
                                <FiSearch />
                            </button>
                        </form>

                        {loading && (
                            <p className="text-xs text-[var(--text-secondary)] text-center py-4 font-semibold">Searching...</p>
                        )}

                        {searchError && (
                            <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center font-bold">
                                {searchError}
                            </div>
                        )}

                        {searchResult && (
                            <div className="flex flex-col items-center p-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] shadow-sm">
                                <img src={searchResult.avatar} alt="Avatar" className="w-16 h-16 rounded-full mb-3 ring-2 ring-[var(--accent-primary)]/30 object-cover" />
                                <h4 className="text-[var(--text-primary)] font-bold text-base">{searchResult.name}</h4>
                                <p className="text-xs text-[var(--text-secondary)] font-mono font-semibold mb-4">{searchResult.userTag}</p>
                                <button
                                    onClick={() => handleSendRequest(searchResult._id)}
                                    disabled={searchResult.requestSent || searchResult.isFriend || searchResult.hasPendingRequest}
                                    className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${searchResult.isFriend
                                        ? 'bg-white/10 text-white/60 cursor-default'
                                        : searchResult.hasPendingRequest
                                            ? 'bg-[#FFB000]/20 text-[#FFB000] cursor-default font-bold'
                                            : searchResult.requestSent
                                                ? 'bg-[#FF6A00]/20 text-[#FF6A00] cursor-default font-bold'
                                                : 'bg-[#FF6A00] text-[#090705] hover:bg-[#E05D00] shadow-lg shadow-[rgba(255,106,0,0.3)] font-bold'
                                        }`}
                                >
                                    {searchResult.isFriend ? 'Already Friends' :
                                        searchResult.hasPendingRequest ? 'Check Alerts' :
                                            searchResult.requestSent ? 'Sent' : 'Send Request'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;

