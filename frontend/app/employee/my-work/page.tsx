'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  X,
  RefreshCw,
  Search,
  CheckSquare,
  Send,
  Star,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Check
} from 'lucide-react';
import { api } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/Badges';

export default function EmployeeMyWorkPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status Update / Submission Form
  const [updateStatus, setUpdateStatus] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [hoursSpent, setHoursSpent] = useState('1.5');
  const [submitting, setSubmitting] = useState(false);

  // Delay Explanation Modal state
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayTask, setDelayTask] = useState<any>(null);
  const [delayExplanation, setDelayExplanation] = useState('');
  const [sendingDelay, setSendingDelay] = useState(false);

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employee/tasks');
      if (res.data?.tasks) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      console.error('Failed to load employee tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const openTaskModal = (task: any) => {
    setSelectedTask(task);
    setUpdateStatus(task.status);
    setSubmissionNotes(task.submission_notes || '');
    setSubmissionLink(task.submission_link || '');
    setHoursSpent('1.0');
    setShowModal(true);
  };

  const openDelayModal = (task: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDelayTask(task);
    setDelayExplanation(task.delay_reason || '');
    setShowDelayModal(true);
  };

  const handleSendDelayExplanation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delayTask || !delayExplanation.trim()) return;

    try {
      setSendingDelay(true);
      const res = await api.post(`/tasks/${delayTask.id}/explain-delay`, {
        delay_reason: delayExplanation.trim(),
      });

      if (res.data?.success) {
        showAlert('Delay explanation submitted! Notification and email have been sent to your manager.');
        setShowDelayModal(false);
        fetchTasks();
        if (selectedTask?.id === delayTask.id) {
          setSelectedTask((prev: any) => ({ ...prev, delay_reason: delayExplanation, delay_status: 'Pending' }));
        }
      } else {
        showAlert(res.data?.error || 'Failed to submit delay explanation.', 'error');
      }
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to submit delay explanation.', 'error');
    } finally {
      setSendingDelay(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/employee/tasks/${selectedTask.id}/status`, {
        status: updateStatus,
        submission_notes: submissionNotes,
        submission_link: submissionLink,
        hours_spent: Number(hoursSpent) || 0,
      });

      if (res.data?.success) {
        let msg = `Task moved to ${updateStatus}!`;
        if (updateStatus === 'Completed') {
          msg = `Task marked as Completed! Your manager has been notified via website and email, and your points have been updated!`;
        } else if (updateStatus === 'Under Review') {
          msg = `Deliverables submitted! Manager has been notified via dashboard notification and email for review.`;
        }
        showAlert(msg);
        setShowModal(false);
        fetchTasks();
      }
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to update task status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
            My Assigned Deliverables & Work
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Review tasks assigned to you or your department, track deadlines, submit explanations for delays, and earn performance points.
          </p>
        </div>

        <button
          onClick={fetchTasks}
          className="p-2 text-[var(--text-secondary)] hover:text-sky-500 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xs transition cursor-pointer"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alert Banner */}
      {alertMsg && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between animate-fadeIn ${
          alertMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
        }`}>
          <span>{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--card-bg)] p-3 rounded-2xl border border-[var(--card-border)] shadow-2xs transition-colors">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Work' },
            { id: 'Todo', label: 'To Do' },
            { id: 'In Progress', label: 'In Progress' },
            { id: 'Under Review', label: 'Under Review' },
            { id: 'Completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[var(--accent-light)] text-[var(--accent)] font-extrabold shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deliverables..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-16 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl text-center space-y-2">
            <CheckSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <div className="text-sm font-bold text-[var(--text-primary)]">No tasks in this category</div>
            <p className="text-xs text-[var(--text-muted)]">You are all caught up on your assignments.</p>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => openTaskModal(t)}
              className="p-5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-md cursor-pointer transition flex flex-col justify-between space-y-4 group relative"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <PriorityBadge priority={t.priority} />
                    {t.department && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        {t.department}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                {/* Extended Deadline (Final Deadline) Badge */}
                {t.is_deadline_extended && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5 animate-pulse">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Extended Deadline (Final Deadline): {t.extended_deadline}</span>
                  </div>
                )}

                {/* Overdue Warning Badge */}
                {t.is_overdue && !t.is_deadline_extended && (
                  <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Deadline Breached (Late) - Explanation Required</span>
                  </div>
                )}

                {/* Delay Status Pill */}
                {t.delay_status === 'Pending' && (
                  <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>Delay explanation under review by Manager</span>
                  </div>
                )}
                {t.delay_status === 'Accepted' && (
                  <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Delay explanation Accepted (No Penalty)</span>
                  </div>
                )}
                {t.delay_status === 'Rejected' && (
                  <div className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    <span>Delay explanation Rejected (-{t.points_deducted || 10} Pts)</span>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-black text-[var(--text-primary)] group-hover:text-sky-500 transition leading-snug">
                    {t.title}
                  </h3>
                  {t.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-3 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Tags */}
                {t.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {t.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-[var(--hover-bg)] text-[10px] font-mono text-[var(--text-secondary)] border border-[var(--card-border)]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-[var(--card-border)] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[var(--text-muted)] font-semibold text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    {t.is_deadline_extended ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        Final: {t.extended_deadline}
                      </span>
                    ) : (
                      <span>Due: {t.deadline || 'Flexible'}</span>
                    )}
                  </div>

                  {t.points_awarded > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-emerald-500" /> +{t.points_awarded} Pts
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {/* Explain Delay Button if overdue or pending */}
                  {(t.is_overdue || t.delay_reason) && (
                    <button
                      type="button"
                      onClick={(e) => openDelayModal(t, e)}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-amber-500/30 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{t.delay_reason ? 'View Delay Note' : 'Explain Delay'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="ml-auto px-3 py-1.5 bg-[var(--hover-bg)] group-hover:bg-sky-600 group-hover:text-white rounded-xl text-[var(--text-secondary)] text-xs font-bold transition border border-[var(--card-border)]"
                  >
                    Submit Deliverable →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── TASK UPDATE & SUBMISSION MODAL ─── */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-fadeIn my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--card-border)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={selectedTask.priority} />
                  <StatusBadge status={selectedTask.status} />
                  {selectedTask.is_deadline_extended && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40">
                      Final Deadline
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">{selectedTask.title}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Extended Deadline Banner */}
            {selectedTask.is_deadline_extended && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Extended Deadline (Final Deadline): {selectedTask.extended_deadline}
                </span>
              </div>
            )}

            {/* Scope / Instructions */}
            {selectedTask.description && (
              <div className="p-4 bg-[var(--hover-bg)] rounded-2xl border border-[var(--card-border)] text-xs space-y-1">
                <div className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[10px]">
                  Assignment Instructions
                </div>
                <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>
            )}

            {/* Delay Explanation Status in Modal */}
            {selectedTask.delay_reason && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs space-y-1">
                <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>Your Delay Explanation:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    selectedTask.delay_status === 'Accepted' ? 'bg-emerald-500 text-white' :
                    selectedTask.delay_status === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {selectedTask.delay_status === 'Accepted' ? 'Accepted by Manager' :
                     selectedTask.delay_status === 'Rejected' ? 'Rejected by Manager' : 'Pending Review'}
                  </span>
                </div>
                <p className="text-amber-900/90 dark:text-amber-200/90 italic">"{selectedTask.delay_reason}"</p>
              </div>
            )}

            <form onSubmit={handleUpdateTask} className="space-y-4 text-xs">
              {/* Status Selector */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Update Task Stage
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-bold text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                >
                  <option value="Todo">To Do (Not Started)</option>
                  <option value="In Progress">In Progress (Currently Working)</option>
                  <option value="Under Review">Under Review (Ready for Manager Review & Email Notification)</option>
                  <option value="Completed">Completed (Final Delivery - Notifies Manager & Awards Points)</option>
                </select>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  💡 Marking as Under Review or Completed will automatically alert your manager on the website and send an email notification.
                </p>
              </div>

              {/* Work Notes */}
              <div>
                <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Work Notes & Deliverable Summary
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Summarize what was accomplished, changes implemented, or items pending review..."
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-medium text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Deliverable Link */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Deliverable / PR / Preview Link
                  </label>
                  <input
                    type="url"
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    placeholder="https://github.com/... or https://..."
                    className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-medium text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Hours Spent */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Hours Logged for this Update
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(e.target.value)}
                    placeholder="e.g. 2.5"
                    className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-medium text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--card-border)]">
                {/* Explain Delay Button in Modal */}
                <button
                  type="button"
                  onClick={() => openDelayModal(selectedTask)}
                  className="px-3.5 py-2 text-amber-600 hover:bg-amber-500/10 border border-amber-500/30 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Explain Delay</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-[var(--card-border)] text-[var(--text-secondary)] font-bold hover:bg-[var(--hover-bg)] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Submit & Notify Manager</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELAY EXPLANATION MODAL ─── */}
      {showDelayModal && delayTask && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-[var(--text-primary)]">Submit Delay Explanation</h3>
              </div>
              <button onClick={() => setShowDelayModal(false)} className="p-1 hover:bg-[var(--hover-bg)] rounded-xl cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              If your deliverable for <strong className="text-[var(--text-primary)]">{delayTask.title}</strong> is late past deadline, please write a detailed explanation. Your manager will review this message to Accept or Reject (deduct points).
            </p>

            <form onSubmit={handleSendDelayExplanation} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-[var(--text-secondary)] mb-1">
                  Explanation & Reason for Delay *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide honest and clear explanation (e.g. blockers encountered, technical dependency, scope expansion)..."
                  value={delayExplanation}
                  onChange={(e) => setDelayExplanation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-medium text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--card-border)]">
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="px-4 py-2 font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingDelay || !delayExplanation.trim()}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {sendingDelay ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Send Explanation to Manager</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
