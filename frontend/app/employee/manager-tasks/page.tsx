'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare, Plus, Search, Filter, Calendar, Clock,
  AlertCircle, CheckCircle2, User, Building2, Flag,
  Trash2, X, Send, RefreshCw, Zap, Shield, Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ManagerTasksPage() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [managedDepts, setManagedDepts] = useState<string[]>([]);

  // Create Task Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    department: '',
    assigned_to_id: '',
    task_type: 'Major',
    priority: 'High',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, tasksRes, empRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/tracker/assigned-tasks'),
        api.get('/admin/employees').catch(() => ({ data: { employees: [] } }))
      ]);

      if (userRes.data?.user) {
        const u = userRes.data.user;
        setUser(u);
        const depts = u.managed_departments && u.managed_departments.length > 0
          ? u.managed_departments
          : (u.managed_department ? [u.managed_department] : [u.department || 'IT']);
        setManagedDepts(depts);
        if (depts.length > 0 && !newTask.department) {
          setNewTask(prev => ({ ...prev, department: depts[0] }));
        }
      }

      if (tasksRes.data?.tasks) {
        setTasks(tasksRes.data.tasks);
      }

      if (empRes.data?.employees) {
        setTeamMembers(empRes.data.employees);
      }
    } catch (err: any) {
      console.error('Failed to load manager tasks:', err);
      showFeedback('Failed to load assigned tasks. Please verify connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.department) {
      showFeedback('Please provide task title and department.', 'error');
      return;
    }

    try {
      setCreating(true);
      const payload: any = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        department: newTask.department,
        task_type: newTask.task_type,
        priority: newTask.priority,
        due_date: newTask.due_date,
      };
      if (newTask.assigned_to_id) {
        payload.assigned_to_id = Number(newTask.assigned_to_id);
      }

      const res = await api.post('/tracker/assigned-tasks/create', payload);
      if (res.data?.success) {
        showFeedback(res.data.message || 'Task assigned successfully!');
        setShowCreateModal(false);
        setNewTask({
          title: '',
          description: '',
          department: managedDepts[0] || '',
          assigned_to_id: '',
          task_type: 'Major',
          priority: 'High',
          due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        });
        fetchData();
      } else {
        showFeedback(res.data?.error || 'Failed to create task.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showFeedback(err.response?.data?.error || 'Failed to assign task.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await api.post(`/tracker/assigned-tasks/${taskId}/status`, {
        status: newStatus
      });
      if (res.data?.success) {
        showFeedback(`Task marked as ${newStatus}!`);
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      showFeedback('Failed to update task status.', 'error');
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = search === '' ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      (t.assigned_to?.name && t.assigned_to.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesDept = deptFilter === 'ALL' || t.department === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'Todo' || t.status === 'Pending').length,
    in_progress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-xl">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                Department Task Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Manager Hub
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              Assign deliverables, set task priorities, and track department execution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-[var(--card-border)] hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Assign New Task</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Tasks</p>
          <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{stats.total}</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Pending / Todo</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.todo}</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-sky-500 uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">{stats.in_progress}</p>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.completed}</p>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, assignees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Todo">Todo / Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          {managedDepts.length > 1 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Managed Depts</option>
              {managedDepts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Loading Department Tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl space-y-3">
            <CheckSquare className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
            <p className="text-sm font-bold text-[var(--text-primary)]">No tasks found</p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              You haven't assigned any tasks for this filter yet. Click "Assign New Task" to create one.
            </p>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              className="p-5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-xs hover:border-purple-500/30 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    {t.department}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                    t.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-600' :
                    t.priority === 'High' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                  }`}>
                    {t.priority} Priority
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {t.task_type}
                  </span>
                  {t.is_flagged && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/10 text-rose-600 flex items-center gap-1">
                      <Flag className="w-3 h-3 fill-rose-600" /> Flagged
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-black text-[var(--text-primary)]">
                  {t.title}
                </h3>
                {t.description && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {t.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] pt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-medium">
                    <User className="w-3.5 h-3.5 text-purple-500" />
                    {t.assigned_to ? (
                      <span className="font-bold text-[var(--text-primary)]">{t.assigned_to.name} ({t.assigned_to.designation || 'Team Member'})</span>
                    ) : (
                      <span className="italic text-amber-500">Unassigned (Broadcast to {t.department})</span>
                    )}
                  </span>
                  {t.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due: {t.due_date}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">Created: {t.created_at}</span>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={t.status}
                  onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer ${
                    t.status === 'Completed'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : t.status === 'In Progress'
                      ? 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }`}
                >
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[var(--text-primary)]">Assign Department Task</h3>
                  <p className="text-xs text-[var(--text-muted)]">Assign specific deliverables to department team members</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-[var(--text-muted)] hover:bg-[var(--hover-bg)] rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement API rate limiter for auth routes"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Detailed Description / Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Specific instructions, endpoints, acceptance criteria..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Department *
                  </label>
                  <select
                    value={newTask.department}
                    onChange={(e) => setNewTask({ ...newTask, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    {managedDepts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Assign To Team Member
                  </label>
                  <select
                    value={newTask.assigned_to_id}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="">Broadcast to whole department</option>
                    {teamMembers
                      .filter(m => !newTask.department || m.department === newTask.department || (m.assigned_departments && m.assigned_departments.includes(newTask.department)))
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.designation || m.emp_type || 'Member'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Task Type
                  </label>
                  <select
                    value={newTask.task_type}
                    onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                    <option value="Research">Research</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Support">Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--card-border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Assign Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
