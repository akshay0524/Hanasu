import React, { useState } from 'react';
import {
    FiX,
    FiZap,
    FiCheckSquare,
    FiHelpCircle,
    FiBookmark,
    FiExternalLink,
    FiCheck,
    FiList,
} from 'react-icons/fi';
import { saveTask } from '../../services/aiApi';

const CatchMeUpModal = ({
    isOpen,
    onClose,
    loading,
    data,
    conversationName,
    onJumpToMessage,
}) => {
    const [savedTaskIndices, setSavedTaskIndices] = useState(new Set());
    const [activeTab, setActiveTab] = useState('all');

    if (!isOpen) return null;

    const handleSaveTaskItem = async (actionItem, idx) => {
        try {
            await saveTask({
                title: actionItem.task,
                assignee: actionItem.assignee || null,
                deadline: actionItem.deadline || null,
                priority: 'medium',
            });
            setSavedTaskIndices((prev) => new Set(prev).add(idx));
        } catch (err) {
            alert('Failed to save task');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(255,106,0,0.3)]">
                            <span className="text-base font-japanese">話</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-wide">
                                    ✨ Catch Me Up
                                </h3>
                                {data?.unreadCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/40">
                                        {data.unreadCount} unread
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] font-mono truncate max-w-xs">
                                {conversationName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-4">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full border-2 border-[#FF6A00]/30 border-t-[#FFB000] animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-[#FFB000] font-japanese font-bold text-xs">
                                    話
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Analyzing discussion...</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Synthesizing key topics, decisions, and action items</p>
                            </div>
                        </div>
                    ) : !data ? (
                        <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                            No summary available.
                        </div>
                    ) : (
                        <>
                            {/* Summary Card */}
                            <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm relative overflow-hidden">
                                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#FF6A00]/10 blur-2xl pointer-events-none"></div>
                                <h4 className="text-xs font-bold text-[var(--text-accent)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <FiList /> Executive Summary
                                </h4>
                                <p className="text-xs text-[var(--text-primary)] leading-relaxed font-normal">
                                    {data.summary}
                                </p>
                            </div>

                            {/* Key Points */}
                            {data.keyPoints?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                        <span>📌</span> Key Points
                                    </h4>
                                    <div className="grid gap-2">
                                        {data.keyPoints.map((point, i) => (
                                            <div
                                                key={i}
                                                className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] flex items-start gap-2.5 shadow-sm"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] mt-1.5 flex-shrink-0"></span>
                                                <span className="leading-relaxed">{point}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Items */}
                            {data.actionItems?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-[var(--text-accent)] flex items-center gap-1.5">
                                        <FiZap /> Action Items ({data.actionItems.length})
                                    </h4>
                                    <div className="grid gap-2">
                                        {data.actionItems.map((item, idx) => {
                                            const isSaved = savedTaskIndices.has(idx);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 shadow-sm"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                                            {item.task}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)] font-mono">
                                                            {item.assignee && <span>👤 {item.assignee}</span>}
                                                            {item.deadline && <span>⏰ {item.deadline}</span>}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleSaveTaskItem(item, idx)}
                                                        disabled={isSaved}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                                                            isSaved
                                                                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                                                : 'bg-[var(--accent-primary)]/15 text-[var(--text-accent)] border border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/25'
                                                        }`}
                                                    >
                                                        {isSaved ? (
                                                            <>
                                                                <FiCheck size={11} /> Saved
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FiCheckSquare size={11} /> Add to Tasks
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Decisions Made */}
                            {data.decisions?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                        <span>🎯</span> Decisions Made
                                    </h4>
                                    <div className="grid gap-2">
                                        {data.decisions.map((decision, i) => (
                                            <div
                                                key={i}
                                                className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5"
                                            >
                                                <FiCheck className="text-emerald-500 mt-0.5 flex-shrink-0" size={13} />
                                                <span>{decision}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Unresolved Questions */}
                            {data.unresolvedQuestions?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-amber-700 dark:text-[#FFD166] flex items-center gap-1.5">
                                        <FiHelpCircle /> Open Questions
                                    </h4>
                                    <div className="grid gap-2">
                                        {data.unresolvedQuestions.map((q, i) => (
                                            <div
                                                key={i}
                                                className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] flex items-start gap-2.5 shadow-sm"
                                            >
                                                <span className="text-amber-600 dark:text-[#FFD166] font-bold">?</span>
                                                <span>{q}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Important Highlighted Messages with Jump-to-message */}
                            {data.importantMessages?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                        <FiBookmark className="text-[var(--text-accent)]" /> Notable Messages
                                    </h4>
                                    <div className="grid gap-2">
                                        {data.importantMessages.map((msg, i) => (
                                            <div
                                                key={i}
                                                className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 shadow-sm"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                                                            {msg.sender}
                                                        </span>
                                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                                            {msg.reason}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[var(--text-muted)] italic truncate">
                                                        "{msg.snippet}"
                                                    </p>
                                                </div>
                                                {msg.messageId && onJumpToMessage && (
                                                    <button
                                                        onClick={() => {
                                                            onJumpToMessage(msg.messageId);
                                                            onClose();
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] text-[10px] font-semibold flex items-center gap-1 flex-shrink-0 transition"
                                                    >
                                                        <FiExternalLink size={11} /> Jump
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end bg-[var(--bg-card)]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] transition shadow-md shadow-[var(--accent-primary)]/20"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CatchMeUpModal;
