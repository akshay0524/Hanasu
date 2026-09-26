import React, { useState } from 'react';
import { FiX, FiUsers, FiSearch, FiCheck } from 'react-icons/fi';
import { createGroup } from '../../services/chatApi';

const CreateGroupModal = ({ isOpen, onClose, friends, onGroupCreated }) => {
    const [name, setName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMembers, setSelectedMembers] = useState(new Set());
    const [avatar, setAvatar] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const filteredFriends = friends.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.userTag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleMember = (id) => {
        setSelectedMembers((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter a group name');
            return;
        }
        if (selectedMembers.size === 0) {
            setError('Please select at least one friend to add');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const newGroup = await createGroup({
                name: name.trim(),
                members: Array.from(selectedMembers),
                avatar: avatar.trim() || undefined,
            });

            onGroupCreated(newGroup);
            onClose();
            setName('');
            setSelectedMembers(new Set());
            setAvatar('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-white font-bold">
                            <FiUsers size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Create New Group</h3>
                            <p className="text-[11px] text-[var(--text-accent)] font-mono">Select members to connect</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                            {error}
                        </div>
                    )}

                    {/* Group Name */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-[var(--text-primary)]">Group Name *</label>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{name.length}/100</span>
                        </div>
                        <input
                            type="text"
                            value={name}
                            maxLength={100}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Project Avengers, Study Group..."
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[var(--accent-primary)] placeholder-[var(--text-muted)] transition font-medium"
                            required
                        />
                    </div>

                    {/* Avatar URL (Optional) */}
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Group Icon URL <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                        </label>
                        <input
                            type="url"
                            value={avatar}
                            onChange={(e) => setAvatar(e.target.value)}
                            placeholder="https://example.com/avatar.png"
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-[var(--accent-primary)] placeholder-[var(--text-muted)] transition font-medium"
                        />
                    </div>

                    {/* Member Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-[var(--text-primary)]">
                                Add Friends ({selectedMembers.size} selected)
                            </label>
                            {selectedMembers.size > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedMembers(new Set())}
                                    className="text-[10px] text-[var(--text-accent)] font-semibold hover:underline"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-2">
                            <FiSearch className="absolute left-3 top-3 text-[var(--text-muted)]" size={14} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search friends by name or tag..."
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[var(--accent-primary)] placeholder-[var(--text-muted)] transition font-medium"
                            />
                        </div>

                        {/* Friends List */}
                        <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                            {filteredFriends.length === 0 ? (
                                <p className="text-center text-[var(--text-muted)] text-xs py-4">
                                    {friends.length === 0 ? 'No friends added yet. Add friends first!' : 'No matching friends found.'}
                                </p>
                            ) : (
                                filteredFriends.map((friend) => {
                                    const isSelected = selectedMembers.has(friend._id);
                                    return (
                                        <div
                                            key={friend._id}
                                            onClick={() => toggleMember(friend._id)}
                                            className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition border ${
                                                isSelected
                                                    ? 'bg-[var(--bg-active)] border-[var(--border-strong)]'
                                                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <img
                                                    src={friend.avatar || 'https://api.dicebear.com/7.x/identicon/svg'}
                                                    alt="Avatar"
                                                    className="w-8 h-8 rounded-full object-cover border border-[var(--border-subtle)]"
                                                />
                                                <div>
                                                    <p className="text-xs font-semibold text-[var(--text-primary)]">{friend.name}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] font-mono">{friend.userTag}</p>
                                                </div>
                                            </div>
                                            <div
                                                className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                                                    isSelected
                                                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                                                        : 'border-[var(--border-subtle)]'
                                                }`}
                                            >
                                                {isSelected && <FiCheck size={12} className="stroke-[3]" />}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex gap-3 border-t border-[var(--border-subtle)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || selectedMembers.size === 0 || !name.trim()}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-lg shadow-[var(--accent-primary)]/25 hover:opacity-95 transition disabled:opacity-40"
                        >
                            {loading ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
