import React, { useState, useEffect } from 'react';
import { FiX, FiTrash2, FiCheckSquare, FiCheck } from 'react-icons/fi';
import { getTasks, updateTask, deleteTask } from '../../services/aiApi';

const TasksModal = ({ isOpen, onClose }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            setLoading(true);
            try {
                const data = await getTasks();
                setTasks(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isOpen]);

    const handleToggleStatus = async (task) => {
        const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
        try {
            const updated = await updateTask(task._id, { status: nextStatus });
            setTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)));
        } catch (err) {
            alert('Failed to update task');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteTask(id);
            setTasks((prev) => prev.filter((t) => t._id !== id));
        } catch (err) {
            alert('Failed to delete task');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#15120E] border border-[#FFB000]/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80 flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[#191510]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF6A00] to-[#FFB000] flex items-center justify-center text-[#090705] font-bold">
                            <FiCheckSquare size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-[#FFF7EA]">Action Items & Tasks</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    {loading ? (
                        <p className="text-center py-8 text-xs text-[var(--text-muted)]">Loading tasks...</p>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                            No tasks extracted yet. Use the ✨ AI Actions on any message to create tasks!
                        </div>
                    ) : (
                        tasks.map((t) => {
                            const isCompleted = t.status === 'completed';
                            return (
                                <div
                                    key={t._id}
                                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 group transition ${
                                        isCompleted
                                            ? 'bg-[#15120E]/50 border-[var(--border-subtle)] opacity-60'
                                            : 'bg-[#191510] border-[#FF6A00]/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            onClick={() => handleToggleStatus(t)}
                                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition flex-shrink-0 ${
                                                isCompleted
                                                    ? 'bg-emerald-500 border-emerald-500 text-black'
                                                    : 'border-[#FFB000]/50 hover:border-[#FF6A00]'
                                            }`}
                                        >
                                            {isCompleted && <FiCheck size={12} className="stroke-[3]" />}
                                        </button>
                                        <div className="min-w-0">
                                            <p
                                                className={`text-xs font-semibold text-[#FFF7EA] truncate ${
                                                    isCompleted ? 'line-through text-[var(--text-muted)]' : ''
                                                }`}
                                            >
                                                {t.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-muted)] font-mono">
                                                {t.assignee && <span>👤 {t.assignee}</span>}
                                                {t.deadline && <span>⏰ {t.deadline}</span>}
                                                <span className="uppercase text-[9px] text-[#FFB000]">{t.priority}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(t._id)}
                                        className="p-1.5 text-[var(--text-muted)] hover:text-red-400 opacity-60 group-hover:opacity-100 transition"
                                        title="Delete task"
                                    >
                                        <FiTrash2 size={13} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default TasksModal;
