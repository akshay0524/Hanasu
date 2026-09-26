import React, { useState, useEffect } from 'react';
import { FiX, FiTrash2, FiBookOpen } from 'react-icons/fi';
import { getMemories, deleteMemory } from '../../services/aiApi';

const MemoriesModal = ({ isOpen, onClose }) => {
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            setLoading(true);
            try {
                const data = await getMemories();
                setMemories(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isOpen]);

    const handleDelete = async (id) => {
        try {
            await deleteMemory(id);
            setMemories((prev) => prev.filter((m) => m._id !== id));
        } catch (err) {
            alert('Failed to delete memory');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-white font-bold">
                            <FiBookOpen size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Saved Memories</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    {loading ? (
                        <p className="text-center py-8 text-xs text-[var(--text-muted)]">Loading memories...</p>
                    ) : memories.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                            No memories saved yet. Use the ✨ AI Actions on any message to remember facts!
                        </div>
                    ) : (
                        memories.map((m) => (
                            <div
                                key={m._id}
                                className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-start justify-between gap-3 group shadow-sm"
                            >
                                <div className="space-y-1">
                                    <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-accent)] bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded border border-[var(--accent-primary)]/20">
                                        {m.category || 'General'}
                                    </span>
                                    <p className="text-xs text-[var(--text-primary)] leading-relaxed pt-1">{m.content}</p>
                                    <p className="text-[10px] text-[var(--text-muted)] font-mono">
                                        {new Date(m.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(m._id)}
                                    className="p-1.5 text-[var(--text-muted)] hover:text-red-400 opacity-60 group-hover:opacity-100 transition"
                                    title="Delete memory"
                                >
                                    <FiTrash2 size={13} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemoriesModal;
