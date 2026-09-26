import React, { useState } from 'react';
import {
    FiX,
    FiShield,
    FiUserPlus,
    FiUserMinus,
    FiEdit2,
    FiLogOut,
    FiCheck,
    FiSearch,
    FiChevronRight,
} from 'react-icons/fi';
import {
    updateGroup,
    addGroupMembers,
    removeGroupMember,
    updateGroupAdmin,
} from '../../services/chatApi';

const GroupInfoModal = ({
    isOpen,
    onClose,
    group,
    currentUser,
    friends,
    onlineUsers,
    onGroupUpdated,
    onLeaveGroup,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [searchAddQuery, setSearchAddQuery] = useState('');
    const [selectedToAdd, setSelectedToAdd] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !group) return null;

    const currentUserId = String(currentUser?._id);
    const isAdmin = (group.admins || []).some((a) => String(a._id || a) === currentUserId);
    const isCreator = String(group.creator?._id || group.creator) === currentUserId;

    // Friends not currently in this group
    const existingMemberIds = new Set(
        (group.participants || []).map((p) => String(p._id || p))
    );
    const availableFriends = (friends || []).filter(
        (f) => !existingMemberIds.has(String(f._id))
    );
    const filteredAvailableFriends = availableFriends.filter((f) =>
        f.name.toLowerCase().includes(searchAddQuery.toLowerCase()) ||
        f.userTag.toLowerCase().includes(searchAddQuery.toLowerCase())
    );

    const handleStartEdit = () => {
        setEditName(group.name || '');
        setEditAvatar(group.avatar || '');
        setIsEditing(true);
        setError('');
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editName.trim()) return;
        setLoading(true);
        setError('');
        try {
            const updated = await updateGroup(group._id, {
                name: editName.trim(),
                avatar: editAvatar.trim(),
            });
            onGroupUpdated(updated);
            setIsEditing(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update group');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMembersSubmit = async () => {
        if (selectedToAdd.size === 0) return;
        setLoading(true);
        setError('');
        try {
            const updated = await addGroupMembers(group._id, Array.from(selectedToAdd));
            onGroupUpdated(updated);
            setSelectedToAdd(new Set());
            setIsAddingMember(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add members');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (targetUserId, memberName) => {
        if (!window.confirm(`Are you sure you want to remove ${memberName} from this group?`)) return;
        setLoading(true);
        try {
            const res = await removeGroupMember(group._id, targetUserId);
            onGroupUpdated(res.group);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove member');
        } finally {
            setLoading(false);
        }
    };

    const handleAdminToggle = async (targetUserId, currentRole) => {
        const action = currentRole === 'admin' ? 'demote' : 'promote';
        setLoading(true);
        try {
            const updated = await updateGroupAdmin(group._id, { targetUserId, action });
            onGroupUpdated(updated);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to change admin role');
        } finally {
            setLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!window.confirm('Are you sure you want to leave this group?')) return;
        setLoading(true);
        try {
            await removeGroupMember(group._id, currentUserId);
            onLeaveGroup(group._id);
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to leave group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#15120E] border border-[#FFB000]/25 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[#191510]">
                    <h3 className="text-sm font-bold text-[#FFF7EA]">Group Information</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                            {error}
                        </div>
                    )}

                    {/* Group Profile Summary */}
                    {isEditing ? (
                        <form onSubmit={handleSaveEdit} className="p-4 rounded-xl bg-[#1C1813] border border-[#FFB000]/30 space-y-3">
                            <h4 className="text-xs font-bold text-[#FFB000]">Edit Group Details</h4>
                            <div>
                                <label className="text-[11px] font-semibold text-[var(--text-muted)]">Group Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    maxLength={100}
                                    className="w-full bg-[#15120E] border border-[var(--border-subtle)] text-[#FFF7EA] text-xs rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-[#FFB000]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-[var(--text-muted)]">Group Icon URL</label>
                                <input
                                    type="url"
                                    value={editAvatar}
                                    onChange={(e) => setEditAvatar(e.target.value)}
                                    className="w-full bg-[#15120E] border border-[var(--border-subtle)] text-[#FFF7EA] text-xs rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-[#FFB000]"
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-1.5 bg-[#FF6A00] text-[#090705] text-xs font-bold rounded-lg shadow hover:bg-[#E05D00]"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-[#191510] border border-[var(--border-subtle)]">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-[#090705] text-xl font-bold font-display shadow-lg shadow-[#FF6A00]/20 flex-shrink-0">
                                {group.avatar ? (
                                    <img src={group.avatar} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <span>{group.name?.charAt(0)?.toUpperCase() || 'G'}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-bold text-[#FFF7EA] truncate">{group.name}</h2>
                                    {isAdmin && (
                                        <button
                                            onClick={handleStartEdit}
                                            className="p-1.5 text-[var(--text-muted)] hover:text-[#FFB000] rounded-lg transition"
                                            title="Edit Name/Avatar"
                                        >
                                            <FiEdit2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    {group.participants?.length || 0} members · Created {new Date(group.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Add Member Drawer */}
                    {isAddingMember ? (
                        <div className="p-4 rounded-xl bg-[#1C1813] border border-[#FFB000]/30 space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-[#FFB000]">Add Friends to Group</h4>
                                <button
                                    onClick={() => setIsAddingMember(false)}
                                    className="text-xs text-[var(--text-muted)] hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="relative">
                                <FiSearch className="absolute left-3 top-2.5 text-[var(--text-muted)]" size={13} />
                                <input
                                    type="text"
                                    value={searchAddQuery}
                                    onChange={(e) => setSearchAddQuery(e.target.value)}
                                    placeholder="Search available friends..."
                                    className="w-full bg-[#15120E] border border-[var(--border-subtle)] text-[#FFF7EA] text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#FFB000]"
                                />
                            </div>

                            <div className="max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                                {filteredAvailableFriends.length === 0 ? (
                                    <p className="text-xs text-center text-[var(--text-muted)] py-3">
                                        No available friends to add.
                                    </p>
                                ) : (
                                    filteredAvailableFriends.map((friend) => {
                                        const isChecked = selectedToAdd.has(friend._id);
                                        return (
                                            <div
                                                key={friend._id}
                                                onClick={() => {
                                                    setSelectedToAdd((prev) => {
                                                        const next = new Set(prev);
                                                        if (next.has(friend._id)) next.delete(friend._id);
                                                        else next.add(friend._id);
                                                        return next;
                                                    });
                                                }}
                                                className={`p-2 rounded-lg flex items-center justify-between cursor-pointer border text-xs ${
                                                    isChecked ? 'bg-[#FF6A00]/20 border-[#FFB000]' : 'border-[var(--border-subtle)] bg-[#15120E]'
                                                }`}
                                            >
                                                <span className="font-semibold text-[#FFF7EA]">{friend.name}</span>
                                                <div
                                                    className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                                                        isChecked ? 'bg-[#FF6A00] border-[#FF6A00] text-black' : 'border-neutral-600'
                                                    }`}
                                                >
                                                    {isChecked && <FiCheck size={10} />}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <button
                                onClick={handleAddMembersSubmit}
                                disabled={loading || selectedToAdd.size === 0}
                                className="w-full py-2 bg-[#FF6A00] text-[#090705] font-bold text-xs rounded-lg hover:bg-[#E05D00] transition disabled:opacity-40"
                            >
                                {loading ? 'Adding...' : `Add Selected (${selectedToAdd.size})`}
                            </button>
                        </div>
                    ) : (
                        isAdmin && availableFriends.length > 0 && (
                            <button
                                onClick={() => setIsAddingMember(true)}
                                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#FFB000]/40 text-[#FFB000] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#FFB000]/10 transition"
                            >
                                <FiUserPlus size={15} /> Add Members
                            </button>
                        )
                    )}

                    {/* Members List */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                Members ({group.participants?.length || 0})
                            </h4>
                        </div>

                        <div className="space-y-2">
                            {(group.participants || []).map((member) => {
                                const memberId = String(member._id);
                                const isMemberAdmin = (group.admins || []).some(
                                    (a) => String(a._id || a) === memberId
                                );
                                const isMemberCreator = String(group.creator?._id || group.creator) === memberId;
                                const isUserOnline = onlineUsers?.has(memberId);

                                return (
                                    <div
                                        key={memberId}
                                        className="p-3 rounded-xl bg-[#191510]/60 border border-[var(--border-subtle)] flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative flex-shrink-0">
                                                <img
                                                    src={member.avatar || 'https://api.dicebear.com/7.x/identicon/svg'}
                                                    alt="Avatar"
                                                    className="w-9 h-9 rounded-full object-cover border border-[var(--border-subtle)]"
                                                />
                                                <div
                                                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#191510] ${
                                                        isUserOnline ? 'bg-[#FF6A00]' : 'bg-[#7E6F5E]'
                                                    }`}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-[#FFF7EA] truncate">
                                                        {member.name} {memberId === currentUserId && '(You)'}
                                                    </span>
                                                    {isMemberCreator && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFB000]/20 text-[#FFB000] border border-[#FFB000]/30">
                                                            Owner
                                                        </span>
                                                    )}
                                                    {isMemberAdmin && !isMemberCreator && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30">
                                                            Admin
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-[var(--text-muted)] font-mono">{member.userTag}</p>
                                            </div>
                                        </div>

                                        {/* Action buttons for admins */}
                                        {isAdmin && memberId !== currentUserId && !isMemberCreator && (
                                            <div className="flex items-center gap-1">
                                                {/* Promote / Demote */}
                                                <button
                                                    onClick={() => handleAdminToggle(memberId, isMemberAdmin ? 'admin' : 'member')}
                                                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#FFB000] hover:bg-white/5 transition"
                                                    title={isMemberAdmin ? 'Demote to Member' : 'Promote to Admin'}
                                                >
                                                    <FiShield size={14} className={isMemberAdmin ? 'text-[#FF6A00]' : ''} />
                                                </button>
                                                {/* Remove */}
                                                <button
                                                    onClick={() => handleRemoveMember(memberId, member.name)}
                                                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition"
                                                    title="Remove Member"
                                                >
                                                    <FiUserMinus size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Leave Group Action */}
                    <div className="pt-3 border-t border-[var(--border-subtle)]">
                        <button
                            onClick={handleLeave}
                            disabled={loading}
                            className="w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-red-500/20 transition"
                        >
                            <FiLogOut size={14} /> Leave Group
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupInfoModal;
