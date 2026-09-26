import React, { useState, useEffect } from 'react';
import {
    FiX,
    FiCheck,
    FiGlobe,
    FiBookOpen,
    FiCheckSquare,
    FiHelpCircle,
    FiFileText,
} from 'react-icons/fi';
import {
    summarizeMessage,
    explainMessage,
    translateMessage,
    extractMemory,
    saveMemory,
    extractTask,
    saveTask,
} from '../../services/aiApi';

const LANGUAGES = [
    'English',
    'Japanese',
    'Spanish',
    'French',
    'German',
    'Mandarin Chinese',
    'Hindi',
    'Arabic',
    'Korean',
    'Portuguese',
    'Italian',
];

const AIMessageActionModal = ({
    isOpen,
    onClose,
    actionType, // 'summarize' | 'explain' | 'translate' | 'remember' | 'task'
    message,
    conversationId,
    onSuccessNotification,
}) => {
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [targetLang, setTargetLang] = useState('English');
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    // Editable fields for memory / task
    const [editableMemory, setEditableMemory] = useState({ content: '', category: 'general' });
    const [editableTask, setEditableTask] = useState({
        title: '',
        assignee: '',
        deadline: '',
        priority: 'medium',
    });

    useEffect(() => {
        if (!isOpen || !message || !actionType) {
            setResultData(null);
            setSaved(false);
            setError('');
            return;
        }

        const runAction = async () => {
            setLoading(true);
            setError('');
            setSaved(false);

            try {
                if (actionType === 'summarize') {
                    const res = await summarizeMessage({
                        messageId: message._id,
                        content: message.content,
                    });
                    setResultData(res);
                } else if (actionType === 'explain') {
                    const res = await explainMessage({
                        messageId: message._id,
                        content: message.content,
                    });
                    setResultData(res);
                } else if (actionType === 'translate') {
                    const res = await translateMessage({
                        messageId: message._id,
                        content: message.content,
                        targetLang,
                    });
                    setResultData(res);
                } else if (actionType === 'remember') {
                    const res = await extractMemory({
                        messageId: message._id,
                        content: message.content,
                    });
                    setResultData(res);
                    setEditableMemory({
                        content: res.content || message.content,
                        category: res.category || 'general',
                    });
                } else if (actionType === 'task') {
                    const res = await extractTask({
                        messageId: message._id,
                        content: message.content,
                    });
                    setResultData(res);
                    setEditableTask({
                        title: res.title || message.content.slice(0, 60),
                        assignee: res.assignee || '',
                        deadline: res.deadline || '',
                        priority: res.priority || 'medium',
                    });
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to process AI action');
            } finally {
                setLoading(false);
            }
        };

        runAction();
    }, [isOpen, actionType, message, targetLang]);

    if (!isOpen) return null;

    const handleSaveMemory = async () => {
        setLoading(true);
        try {
            await saveMemory({
                messageId: message._id,
                conversationId,
                content: editableMemory.content,
                category: editableMemory.category,
            });
            setSaved(true);
            if (onSuccessNotification) onSuccessNotification('Memory saved successfully!');
            setTimeout(onClose, 1200);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save memory');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTask = async () => {
        setLoading(true);
        try {
            await saveTask({
                messageId: message._id,
                conversationId,
                title: editableTask.title,
                assignee: editableTask.assignee || null,
                deadline: editableTask.deadline || null,
                priority: editableTask.priority,
            });
            setSaved(true);
            if (onSuccessNotification) onSuccessNotification('Task created successfully!');
            setTimeout(onClose, 1200);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save task');
        } finally {
            setLoading(false);
        }
    };

    const getActionTitle = () => {
        switch (actionType) {
            case 'summarize':
                return { label: 'Summarize Message', icon: <FiFileText /> };
            case 'explain':
                return { label: 'Explain Message', icon: <FiHelpCircle /> };
            case 'translate':
                return { label: 'Translate Message', icon: <FiGlobe /> };
            case 'remember':
                return { label: 'Remember to Memory', icon: <FiBookOpen /> };
            case 'task':
                return { label: 'Extract Action Item', icon: <FiCheckSquare /> };
            default:
                return { label: 'AI Action', icon: <FiFileText /> };
        }
    };

    const actionInfo = getActionTitle();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-white font-bold">
                            {actionInfo.icon}
                        </div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{actionInfo.label}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {/* Source Message Preview */}
                    <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm">
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">
                            Original Message
                        </div>
                        <p className="text-xs text-[var(--text-primary)] italic line-clamp-3">
                            "{message?.content}"
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                            <div className="w-8 h-8 rounded-full border-2 border-[#FF6A00]/30 border-t-[#FFB000] animate-spin"></div>
                            <p className="text-xs text-[var(--text-muted)]">Hanasu AI is processing...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summarize view */}
                            {actionType === 'summarize' && resultData && (
                                <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2 shadow-sm">
                                    <h4 className="text-xs font-bold text-[var(--text-accent)] uppercase tracking-wider">
                                        Summary
                                    </h4>
                                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                                        {resultData.summary}
                                    </p>
                                </div>
                            )}

                            {/* Explain view */}
                            {actionType === 'explain' && resultData && (
                                <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2 shadow-sm">
                                    <h4 className="text-xs font-bold text-[var(--text-accent)] uppercase tracking-wider">
                                        Explanation & Context
                                    </h4>
                                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                                        {resultData.explanation}
                                    </p>
                                </div>
                            )}

                            {/* Translate view */}
                            {actionType === 'translate' && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-[var(--text-muted)] font-semibold">
                                            Translate to:
                                        </label>
                                        <select
                                            value={targetLang}
                                            onChange={(e) => setTargetLang(e.target.value)}
                                            className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-[var(--accent-primary)]"
                                        >
                                            {LANGUAGES.map((lang) => (
                                                <option key={lang} value={lang}>
                                                    {lang}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {resultData && (
                                        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2 shadow-sm">
                                            <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)]">
                                                <span>Language: {targetLang}</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium">
                                                {resultData.translatedText}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Remember view */}
                            {actionType === 'remember' && (
                                <div className="space-y-3">
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Review and confirm the fact or note you want Hanasu to remember for you.
                                    </p>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                                            Extracted Memory
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={editableMemory.content}
                                            onChange={(e) =>
                                                setEditableMemory((prev) => ({
                                                    ...prev,
                                                    content: e.target.value,
                                                }))
                                            }
                                            className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl p-3 focus:outline-none focus:border-[var(--accent-primary)] font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                                            Category
                                        </label>
                                        <select
                                            value={editableMemory.category}
                                            onChange={(e) =>
                                                setEditableMemory((prev) => ({
                                                    ...prev,
                                                    category: e.target.value,
                                                }))
                                            }
                                            className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--accent-primary)] font-medium"
                                        >
                                            <option value="general">General Note</option>
                                            <option value="project">Project / Work</option>
                                            <option value="fact">Fact / Knowledge</option>
                                            <option value="preference">Preference</option>
                                            <option value="decision">Decision</option>
                                            <option value="personal">Personal</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Task view */}
                            {actionType === 'task' && (
                                <div className="space-y-3">
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Review the task details extracted from this message before adding it to your tasks.
                                    </p>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                                            Task Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={editableTask.title}
                                            onChange={(e) =>
                                                setEditableTask((prev) => ({ ...prev, title: e.target.value }))
                                            }
                                            className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--accent-primary)] font-medium"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                                                Assignee
                                            </label>
                                            <input
                                                type="text"
                                                value={editableTask.assignee}
                                                onChange={(e) =>
                                                    setEditableTask((prev) => ({
                                                        ...prev,
                                                        assignee: e.target.value,
                                                    }))
                                                }
                                                placeholder="e.g. Akshay"
                                                className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--accent-primary)] font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                                                Deadline
                                            </label>
                                            <input
                                                type="text"
                                                value={editableTask.deadline}
                                                onChange={(e) =>
                                                    setEditableTask((prev) => ({
                                                        ...prev,
                                                        deadline: e.target.value,
                                                    }))
                                                }
                                                placeholder="e.g. Friday 5 PM"
                                                className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--accent-primary)] font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                                            Priority
                                        </label>
                                        <select
                                            value={editableTask.priority}
                                            onChange={(e) =>
                                                setEditableTask((prev) => ({
                                                    ...prev,
                                                    priority: e.target.value,
                                                }))
                                            }
                                            className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--accent-primary)] font-medium"
                                        >
                                            <option value="low">Low Priority</option>
                                            <option value="medium">Medium Priority</option>
                                            <option value="high">High Priority</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border-subtle)] flex justify-end gap-2 bg-[var(--bg-card)]">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                    >
                        {saved ? 'Close' : 'Cancel'}
                    </button>

                    {actionType === 'remember' && (
                        <button
                            onClick={handleSaveMemory}
                            disabled={loading || saved || !editableMemory.content.trim()}
                            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                                saved
                                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                    : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent-primary)]/20'
                            }`}
                        >
                            {saved ? (
                                <>
                                    <FiCheck size={14} /> Saved!
                                </>
                            ) : (
                                'Confirm & Save Memory'
                            )}
                        </button>
                    )}

                    {actionType === 'task' && (
                        <button
                            onClick={handleSaveTask}
                            disabled={loading || saved || !editableTask.title.trim()}
                            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                                saved
                                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                    : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent-primary)]/20'
                            }`}
                        >
                            {saved ? (
                                <>
                                    <FiCheck size={14} /> Task Created!
                                </>
                            ) : (
                                'Confirm & Save Task'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIMessageActionModal;
