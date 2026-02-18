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

    useEffect(() => {
        fetchFriends();
        fetchRequests();
        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, [tab]);

    // Listen for incoming messages
    // Listen for incoming messages
    useEffect(() => {
        if (!socket) return;

        let userInteracted = false;
        const enableAudio = () => { userInteracted = true; };
        window.addEventListener('click', enableAudio);
        window.addEventListener('keydown', enableAudio);

        const handleMessage = (msg) => {
            // 1. Reorder Logic: Move conversation to top
            const partnerId = msg.sender === user.id ? msg.receiver : msg.sender;

            setFriends(prev => {
                const index = prev.findIndex(f => f.id === partnerId);
                if (index > -1) {
                    const newFriends = [...prev];
                    const [friend] = newFriends.splice(index, 1);
                    newFriends.unshift(friend);
                    return newFriends;
                }
                return prev;
            });

            // 2. Notification Logic (Only if I am receiver and chat is not open)
            if (msg.sender !== user.id && activeChat?.id !== msg.sender) { // If I sent it, don't notify myself

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
                    // Start: Look up existing friend data to get name
                    // Warning: 'friends' in this closure might be stale if not in dependency array.
                    // But we used Functional Update for setFriends so 'friends' dependency isn't strictly needed for Reorder logic.
                    // However, we need 'friends' list here to get the name.
                    // To be safe, we can just use "New Message" or fetch fresh 'friends' via a ref if simple closure capture fails. 
                    // Since 'friends' is in dependency array [socket, activeChat, friends], this closure IS fresh.
                    const friend = friends.find(f => f.id === msg.sender);
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
    }, [socket, activeChat, friends, user.id]); // Add user._id just in case

    // Clear unread when chat opens
    useEffect(() => {
        if (activeChat && activeChat.type === 'friend') {
            setUnread(prev => {
                const newUnread = { ...prev };
                delete newUnread[activeChat.id];
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
        if (!query) return;
        setLoading(true);
        setSearchResult(null);
        try {
            const res = await searchUser(query);
            setSearchResult(res);
        } catch (error) {
            setSearchResult(null);
        }
        setLoading(false);
    };

    const handleSendRequest = async (id) => {
        try {
            await sendFriendRequest(id);
            setSearchResult(prev => ({ ...prev, requestSent: true }));
        } catch (error) {
            alert("Error sending request");
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] backdrop-blur-md transition-colors duration-500">
            {/* Profile Header */}
            <div className="p-6 pb-4 border-b border-white/5 flex justify-between items-center bg-[var(--bg-panel)]">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img src={user.avatar} alt="Avatar" className="w-12 h-12 rounded-full border border-white/10 p-0.5 object-cover" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-bamboo rounded-full border border-[var(--bg-primary)]"></div>
                    </div>
                    <div>
                        <h3 className="font-medium text-[var(--text-primary)] tracking-wide">{user.name}</h3>
                        <p className="text-xs text-[var(--text-accent)] font-mono">{user.userTag}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleTheme}
                        className={`p-2 rounded-full transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5`}
                        title="Toggle Theme"
                    >
                        <FiZap size={18} />
                    </button>
                    <button onClick={logout} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-2">
                        <FiLogOut size={18} />
                    </button>
                </div>
            </div>

            {/* Modern Tabs */}
            <div className="flex p-4 pb-2 gap-4">
                {['friends', 'requests', 'search'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`relative pb-2 text-sm font-medium tracking-wide transition-colors ${tab === t ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        {t === 'friends' && 'Chats'}
                        {t === 'requests' && 'Alerts'}
                        {t === 'search' && 'Add'}
                        {t === 'requests' && requests.length > 0 && (
                            <span className="absolute -top-1 -right-2 w-2 h-2 bg-sakura rounded-full animate-pulse"></span>
                        )}
                        {t === 'friends' && Object.values(unread).reduce((a, b) => a + b, 0) > 0 && (
                            <span className="absolute -top-1 -right-2 w-2 h-2 bg-sakura rounded-full animate-pulse"></span>
                        )}
                        {tab === t && (
                            <span className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sakura to-transparent"></span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">

                {/* AI Chat Card */}
                <div
                    onClick={() => onSelectChat({ type: 'ai', id: 'ai', name: 'AI Helper' })}
                    className={`p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all duration-300 border ${activeChat?.type === 'ai'
                        ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)]'
                        : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                        }`}
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-purple-500 flex items-center justify-center text-white shadow-lg">
                        <FiCpu size={18} />
                    </div>
                    <div>
                        <h4 className="font-medium text-[var(--text-primary)] text-sm">AI Assistant</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] font-light">Always available</p>
                    </div>
                </div>

                <div className="h-[1px] bg-white/5 w-full my-2"></div>

                {tab === 'friends' && (
                    <div className="space-y-2">
                        {friends.length === 0 && <p className="text-center text-[var(--text-secondary)] text-xs italic mt-8">Silence is golden,<br />but friends are better.</p>}
                        {friends.map(friend => (
                            <div
                                key={friend.id}
                                onClick={() => onSelectChat({ type: 'friend', ...friend })}
                                className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all border relative ${activeChat?.id === friend.id
                                    ? 'bg-white/10 border-white/10'
                                    : 'hover:bg-white/5 border-transparent'
                                    }`}
                            >
                                <img src={friend.avatar} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-transparent group-hover:border-[var(--accent-primary)]/50" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm text-[var(--text-primary)] font-medium truncate">{friend.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-[var(--text-secondary)] truncate">{friend.userTag}</p>
                                        <span className={`text-[10px] font-medium ${onlineUsers.has(friend.id) ? 'text-green-400' : 'text-gray-500'}`}>
                                            {onlineUsers.has(friend.id) ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                                {unread[friend.id] > 0 && (
                                    <div className="w-5 h-5 bg-[var(--accent-primary)] rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-lg shadow-[var(--accent-glow)] animate-bounce cursor-default">
                                        {unread[friend.id]}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'requests' && (
                    <div className="space-y-3">
                        {requests.map(req => (
                            <div key={req.id} className="p-4 bg-[var(--bg-panel)] rounded-xl border border-white/5 backdrop-blur-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={req.sender.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                                    <div>
                                        <h4 className="text-sm font-medium text-[var(--text-primary)]">{req.sender.name}</h4>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => acceptFriendRequest(req.id).then(() => { fetchRequests(); fetchFriends(); })} className="flex-1 bg-bamboo/20 text-bamboo hover:bg-bamboo/30 py-1.5 rounded text-xs transition">Accept</button>
                                    <button onClick={() => rejectFriendRequest(req.id).then(fetchRequests)} className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 py-1.5 rounded text-xs transition">Dismiss</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'search' && (
                    <div className="animate-fade-in">
                        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="Search ID (#XXXX)"
                                className="flex-1 bg-[var(--bg-panel)] border-b border-white/10 text-[var(--text-primary)] px-2 py-2 text-sm focus:outline-none focus:border-[var(--accent-primary)] placeholder-[var(--text-secondary)] transition-all font-mono"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button type="submit" className="text-[var(--accent-primary)] hover:text-[var(--text-primary)] transition">
                                <FiSearch />
                            </button>
                        </form>

                        {searchResult && (
                            <div className="flex flex-col items-center p-6 bg-white/5 rounded-xl border border-white/5">
                                <img src={searchResult.avatar} alt="Avatar" className="w-16 h-16 rounded-full mb-3 ring-2 ring-[var(--accent-primary)]/30" />
                                <h4 className="text-[var(--text-primary)] font-medium">{searchResult.name}</h4>
                                <p className="text-xs text-[var(--text-secondary)] font-mono mb-4">{searchResult.userTag}</p>
                                <button
                                    onClick={() => handleSendRequest(searchResult.id)}
                                    disabled={searchResult.requestSent || searchResult.isFriend || searchResult.hasPendingRequest}
                                    className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all ${searchResult.isFriend
                                        ? 'bg-white/10 text-white cursor-default'
                                        : searchResult.hasPendingRequest
                                            ? 'bg-indigo-500/20 text-indigo-300 cursor-default'
                                            : searchResult.requestSent
                                                ? 'bg-green-500/20 text-green-400 cursor-default'
                                                : 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-glow)] hover:bg-[var(--accent-hover)]'
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
