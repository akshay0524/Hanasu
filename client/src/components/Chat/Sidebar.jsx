import React, { useState, useEffect } from 'react';
import { FiSearch, FiUserPlus, FiMessageSquare, FiCpu, FiLogOut, FiBell } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { searchUser, getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } from '../../services/userApi';
import { motion } from 'framer-motion';

const Sidebar = ({ onSelectChat, activeChat }) => {
    const { user, logout } = useAuth();
    const [tab, setTab] = useState('friends'); // friends, requests, search
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [query, setQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchFriends();
        fetchRequests();
    }, [tab]);

    const fetchFriends = async () => {
        try {
            const data = await getFriends();
            setFriends(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchRequests = async () => {
        try {
            const data = await getFriendRequests();
            setRequests(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query) return;
        setLoading(true);
        setSearchResult(null);
        try {
            // Assume user enters tag like #A1B2 or Just A1B2
            // If they enter name, API search by tag only currently.
            // I might need to clarify instructions: "Users can search other users using this ID".
            const res = await searchUser(query);
            setSearchResult(res);
        } catch (error) {
            setSearchResult(null); // Not found
        }
        setLoading(false);
    };

    const handleSendRequest = async (id) => {
        try {
            await sendFriendRequest(id);
            setSearchResult(prev => ({ ...prev, requestSent: true })); // Optimistic UI
            alert("Request Sent!");
        } catch (error) {
            alert(error.response?.data?.message || "Error sending request");
        }
    };

    const handleAccept = async (id) => {
        await acceptFriendRequest(id);
        fetchRequests();
        fetchFriends();
    };

    const handleReject = async (id) => {
        await rejectFriendRequest(id);
        fetchRequests();
    };

    return (
        <div className="w-full h-full flex flex-col bg-dark-800 border-r border-dark-700">
            {/* Header */}
            <div className="p-4 border-b border-dark-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-dark-600" />
                    <div>
                        <h3 className="font-semibold text-white truncate max-w-[120px]">{user.name}</h3>
                        <p className="text-xs text-gray-400">{user.userTag}</p>
                    </div>
                </div>
                <button onClick={logout} className="text-gray-400 hover:text-red-500 transition">
                    <FiLogOut size={20} />
                </button>
            </div>

            {/* Tabs / Nav */}
            <div className="flex p-2 gap-1 bg-dark-800">
                <button
                    onClick={() => setTab('friends')}
                    className={`flex-1 p-2 rounded-lg flex justify-center items-center gap-2 transition ${tab === 'friends' ? 'bg-dark-700 text-white' : 'text-gray-400 hover:bg-dark-700/50'}`}
                >
                    <FiMessageSquare />
                </button>
                <button
                    onClick={() => setTab('requests')}
                    className={`flex-1 p-2 rounded-lg flex justify-center items-center gap-2 transition relative ${tab === 'requests' ? 'bg-dark-700 text-white' : 'text-gray-400 hover:bg-dark-700/50'}`}
                >
                    <FiBell />
                    {requests.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
                <button
                    onClick={() => setTab('search')}
                    className={`flex-1 p-2 rounded-lg flex justify-center items-center gap-2 transition ${tab === 'search' ? 'bg-dark-700 text-white' : 'text-gray-400 hover:bg-dark-700/50'}`}
                >
                    <FiUserPlus />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">

                {/* AI Chat Option */}
                <div
                    onClick={() => onSelectChat({ type: 'ai', id: 'ai', name: 'AI Assistant' })}
                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition border border-transparent ${activeChat?.type === 'ai' ? 'bg-primary/10 border-primary/50' : 'hover:bg-dark-700'}`}
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-primary flex items-center justify-center text-white">
                        <FiCpu size={20} />
                    </div>
                    <div>
                        <h4 className="font-medium text-white">AI Assistant</h4>
                        <p className="text-xs text-gray-400">Always here to help</p>
                    </div>
                </div>

                <div className="h-px bg-dark-700 my-2" />

                {tab === 'friends' && (
                    <>
                        {friends.length === 0 && <p className="text-center text-gray-500 text-sm mt-4">No friends yet. Add some!</p>}
                        {friends.map(friend => (
                            <div
                                key={friend._id}
                                onClick={() => onSelectChat({ type: 'friend', ...friend })}
                                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition border border-transparent ${activeChat?.id === friend._id ? 'bg-dark-700 border-dark-600' : 'hover:bg-dark-700/50'}`}
                            >
                                <img src={friend.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                                <div>
                                    <h4 className="text-sm font-medium text-white">{friend.name}</h4>
                                    <p className="text-xs text-gray-400">{friend.userTag}</p>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {tab === 'requests' && (
                    <>
                        {requests.length === 0 && <p className="text-center text-gray-500 text-sm mt-4">No pending requests.</p>}
                        {requests.map(req => (
                            <div key={req._id} className="p-3 bg-dark-700/30 rounded-xl border border-dark-700">
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={req.sender.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                                    <div>
                                        <h4 className="text-sm font-medium text-white">{req.sender.name}</h4>
                                        <p className="text-xs text-gray-400">{req.sender.userTag}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleAccept(req._id)} className="flex-1 bg-secondary/20 text-secondary hover:bg-secondary/30 py-1.5 rounded-lg text-xs font-medium transition">Accept</button>
                                    <button onClick={() => handleReject(req._id)} className="flex-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 py-1.5 rounded-lg text-xs font-medium transition">Reject</button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {tab === 'search' && (
                    <div>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Search ID (e.g. #A1B2)"
                                className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white placeholder-gray-600"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button type="submit" className="bg-primary p-2 rounded-lg text-white hover:bg-primary/90 transition">
                                <FiSearch />
                            </button>
                        </form>

                        {loading && <p className="text-center text-gray-500 text-xs">Searching...</p>}

                        {searchResult && (
                            <div className="p-3 bg-dark-700/30 rounded-xl border border-dark-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={searchResult.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                                    <div>
                                        <h4 className="text-sm font-medium text-white">{searchResult.name}</h4>
                                        <p className="text-xs text-gray-400">{searchResult.userTag}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleSendRequest(searchResult._id)} className="p-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition">
                                    <FiUserPlus />
                                </button>
                            </div>
                        )}
                        {query && !loading && !searchResult && <p className="text-center text-gray-500 text-xs text-red-400">User not found</p>}
                    </div>
                )}

            </div>
        </div>
    );
};

export default Sidebar;
