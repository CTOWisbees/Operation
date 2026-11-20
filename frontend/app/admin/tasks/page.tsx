'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  PlusCircle,
  Search,
  Kanban,
  List,
  Calendar,
  ExternalLink,
  Trash2,
  X,
  RefreshCw,
  CheckCircle2,
  Users,
  User,
  Building2,
  Globe,
  Tag,
  Clock,
  AlertCircle,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Star,
  Check
} from 'lucide-react';
import { api } from '@/lib/api';
import { StatusBadge, PriorityBadge } from '@/components/Badges';

const DEPARTMENTS = [
  'Digital Marketing',
  'IT',
  'IA - Research',
  'WBC',
  'Wealth',
  'Content Publishing'
];

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>([
    'Accounts', 'Compliance', 'Compliance Checker', 'Debt', 'Digital Marketing',
    'Distribution', 'Equity', 'HR', 'HR Authorities', 'IA - Research',
    'Investor Relations', 'IT', 'Mgmt View', 'Operations', 'Treasury',
    'WBC', 'Wealth', 'Content Publishing'
  ]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Extend Deadline Modal State
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendTaskId, setExtendTaskId] = useState<number | null>(null);
  const [extendTaskTitle, setExtendTaskTitle] = useState('');
  const [extendedDeadline, setExtendedDeadline] = useState('');
  const [extendNotes, setExtendNotes] = useState('');
  const [extending, setExtending] = useState(false);

  // Review Delay Modal State
  const [showRejectDelayModal, setShowRejectDelayModal] = useState(false);
  const [reviewTaskId, setReviewTaskId] = useState<number | null>(null);
  const [penaltyPoints, setPenaltyPoints] = useState(10);
  const [rejectNotes, setRejectNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Create Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [assignMode, setAssignMode] = useState<'single' | 'multiple' | 'department' | 'everyone'>('single');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [formSelectedAssigneeIds, setFormSelectedAssigneeIds] = useState<number[]>([]);
  const [formTargetDept, setFormTargetDept] = useState('IT');
  const [formPriority, setFormPriority] = useState('Medium');
  const [formStatus, setFormStatus] = useState('Todo');
  const [formDeadline, setFormDeadline] = useState('');
  const [formEstimatedHours, setFormEstimatedHours] = useState('4.0');
  const [formTags, setFormTags] = useState('Operations, Delivery');

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const fetchTasksAndEmployees = async () => {
    try {
      if (tasks.length === 0) {
        const cachedTasks = localStorage.getItem('ops_cached_tasks');
        const cachedEmps = localStorage.getItem('ops_cached_employees');
        const cachedDepts = localStorage.getItem('ops_cached_departments');
        if (cachedTasks) {
          try { setTasks(JSON.parse(cachedTasks)); setLoading(false); } catch(e){}
        }
        if (cachedEmps) {
          try { setEmployees(JSON.parse(cachedEmps)); } catch(e){}
        }
        if (cachedDepts) {
          try { setDepartmentsList(JSON.parse(cachedDepts).map((d: any) => d.name)); } catch(e){}
        }
      }

      const [tasksRes, empRes, deptRes] = await Promise.all([
        api.get('/admin/tasks').catch(() => ({ data: { tasks: [] } })),
        api.get('/admin/employees').catch(() => ({ data: { employees: [] } })),
        api.get('/admin/departments').catch(() => ({ data: { departments: [] } })),
      ]);
      if (tasksRes.data?.tasks) {
        setTasks(tasksRes.data.tasks);
        try { localStorage.setItem('ops_cached_tasks', JSON.stringify(tasksRes.data.tasks)); } catch(e){}
      }
      if (empRes.data?.employees && empRes.data.employees.length > 0) {
        setEmployees(empRes.data.employees);
        try { localStorage.setItem('ops_cached_employees', JSON.stringify(empRes.data.employees)); } catch(e){}
      }
      if (deptRes.data?.departments && deptRes.data.departments.length > 0) {
        setDepartmentsList(deptRes.data.departments.map((d: any) => d.name));
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndEmployees();
  }, []);

  const openCreateModal = async () => {
    let currentEmps = employees;
    if (currentEmps.length === 0) {
      try {
        const empRes = await api.get('/admin/employees');
        if (empRes.data?.employees && empRes.data.employees.length > 0) {
          currentEmps = empRes.data.employees;
          setEmployees(currentEmps);
        }
      } catch (e) {}
    }

    setFormTitle('');
    setFormDesc('');
    setAssignMode('single');
    setFormAssigneeId(currentEmps[0]?.id ? String(currentEmps[0].id) : '');
    setFormSelectedAssigneeIds(currentEmps[0]?.id ? [currentEmps[0].id] : []);
    setFormTargetDept(departmentsList[0] || 'IT');
    setFormPriority('Medium');
    setFormStatus('Todo');
    setFormDeadline('');
    setFormEstimatedHours('4.0');
    setFormTags('Operations, Delivery');
    setShowCreateModal(true);
  };

  const toggleMultipleAssignee = (id: number) => {
    if (formSelectedAssigneeIds.includes(id)) {
      setFormSelectedAssigneeIds(formSelectedAssigneeIds.filter((empId) => empId !== id));
    } else {
      setFormSelectedAssigneeIds([...formSelectedAssigneeIds, id]);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) {
      showAlert('Please enter task title.', 'error');
      return;
    }

    const payload: any = {
      title: formTitle,
      description: formDesc,
      priority: formPriority,
      status: formStatus,
      deadline: formDeadline || null,
      estimated_hours: Number(formEstimatedHours) || 0,
      tags: formTags,
      assign_mode: assignMode,
    };

    if (assignMode === 'single') {
      if (!formAssigneeId) {
        showAlert('Please select an assignee.', 'error');
        return;
      }
      payload.assigned_to_id = Number(formAssigneeId);
    } else if (assignMode === 'multiple') {
      if (formSelectedAssigneeIds.length === 0) {
        showAlert('Please select at least one assignee.', 'error');
        return;
      }
      payload.assigned_to_ids = formSelectedAssigneeIds;
    } else if (assignMode === 'department') {
      if (!formTargetDept) {
        showAlert('Please choose a department.', 'error');
        return;
      }
      payload.target_department = formTargetDept;
    }
    // 'everyone' mode needs no extra IDs

    setSaving(true);
    try {
      const res = await api.post('/admin/tasks', payload);
      if (res.data?.success) {
        showAlert(res.data.message || 'Task assigned successfully!');
        setShowCreateModal(false);
        fetchTasksAndEmployees();
      }
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to assign task.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      await api.put(`/admin/tasks/${taskId}`, { status: newStatus });
      showAlert(`Task marked as ${newStatus}!`);
      fetchTasksAndEmployees();
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showAlert('Failed to update task status.', 'error');
    }
  };

  const handleDeleteTask = async (id: number, title: string) => {
    if (!confirm(`Delete task '${title}'?`)) return;
    try {
      await api.delete(`/admin/tasks/${id}`);
      showAlert('Task deleted successfully.');
      setShowDetailModal(false);
      fetchTasksAndEmployees();
    } catch (err) {
      showAlert('Failed to delete task.', 'error');
    }
  };

  const openExtendDeadlineModal = (task: any) => {
    setExtendTaskId(task.id);
    setExtendTaskTitle(task.title);
    setExtendedDeadline(
      task.extended_deadline ||
      task.deadline ||
      task.due_date ||
      new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
    );
    setExtendNotes('');
    setShowExtendModal(true);
  };

  const handleExtendDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendTaskId || !extendedDeadline) return;

    try {
      setExtending(true);
      const res = await api.post(`/tasks/${extendTaskId}/extend-deadline`, {
        extended_deadline: extendedDeadline,
        notes: extendNotes,
      });

      if (res.data?.success) {
        showAlert(res.data.message || 'Deadline extended successfully (Final Deadline)!');
        setShowExtendModal(false);
        fetchTasksAndEmployees();
        if (selectedTask?.id === extendTaskId) {
          setSelectedTask((prev: any) => ({
            ...prev,
            extended_deadline: extendedDeadline,
            is_deadline_extended: true,
          }));
        }
      } else {
        showAlert(res.data?.error || 'Failed to extend deadline.', 'error');
      }
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to extend deadline.', 'error');
    } finally {
      setExtending(false);
    }
  };

  const handleAcceptDelay = async (taskId: number, taskTitle: string) => {
    try {
      const res = await api.post(`/tasks/${taskId}/review-delay`, {
        action: 'accept',
        notes: 'Delay explanation accepted by admin.',
      });
      if (res.data?.success) {
        showAlert(`Delay explanation for "${taskTitle}" ACCEPTED. No points deducted.`);
        fetchTasksAndEmployees();
        if (selectedTask?.id === taskId) {
          setSelectedTask((prev: any) => ({ ...prev, delay_status: 'Accepted' }));
        }
      } else {
        showAlert(res.data?.error || 'Failed to accept delay.', 'error');
      }
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to accept delay.', 'error');
    }
  };

  const openRejectDelayModal = (taskId: number) => {
    setReviewTaskId(taskId);
    setPenaltyPoints(10);
    setRejectNotes('');
    setShowRejectDelayModal(true);
  };

  const handleRejectDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTaskId) return;

    try {
      setReviewing(true);
      const res = await api.post(`/tasks/${reviewTaskId}/review-delay`, {
        action: 'reject',
        penalty_points: Number(penaltyPoints) || 10,
        notes: rejectNotes || 'Delay explanation rejected by admin due to unjustified delay.',
      });

      if (res.data?.success) {
        showAlert(res.data.message || 'Delay explanation rejected. Points deducted!');
        setShowRejectDelayModal(false);
        fetchTasksAndEmployees();
        if (selectedTask?.id === reviewTaskId) {
          setSelectedTask((prev: any) => ({
            ...prev,
            delay_status: 'Rejected',
            points_deducted: penaltyPoints,
          }));
        }
      } else {
        showAlert(res.data?.error || 'Failed to reject delay.', 'error');
      }
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to reject delay.', 'error');
    } finally {
      setReviewing(false);
    }
  };

  const normalizeStatus = (s: string) => {
    const lower = (s || '').toLowerCase().replace(/[-_]/g, ' ').trim();
    if (lower === 'todo' || lower === 'to do' || lower === 'pending') return 'Todo';
    if (lower === 'in progress' || lower === 'active') return 'In Progress';
    if (lower === 'under review' || lower === 'review' || lower === 'flagged') return 'Under Review';
    if (lower === 'completed' || lower === 'done' || lower === 'finished') return 'Completed';
    return 'Todo';
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      (t.assigned_to?.name && t.assigned_to.name.toLowerCase().includes(search.toLowerCase()));

    const matchesAssignee = filterAssignee ? String(t.assigned_to?.id) === filterAssignee : true;
    
    // Check all possible department placements
    const taskDept = t.assigned_to?.department || t.department || '';
    const assignedDepts = t.assigned_to?.assigned_departments || [];
    const matchesDept = filterDept
      ? (taskDept.toLowerCase() === filterDept.toLowerCase() ||
         assignedDepts.some((d: string) => d.toLowerCase() === filterDept.toLowerCase()))
      : true;

    const matchesPriority = filterPriority ? t.priority?.toLowerCase() === filterPriority.toLowerCase() : true;

    return matchesSearch && matchesAssignee && matchesDept && matchesPriority;
  });

  const columns = [
    { id: 'Todo', label: 'To Do', border: 'border-slate-300 dark:border-slate-700', badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    { id: 'In Progress', label: 'In Progress', border: 'border-emerald-400 dark:border-emerald-800', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
    { id: 'Under Review', label: 'Under Review', border: 'border-amber-400 dark:border-amber-800', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
    { id: 'Completed', label: 'Completed', border: 'border-teal-400 dark:border-teal-800', badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Operations Task Engine
            </span>
            <span className="text-xs text-[var(--text-muted)]">• Individual & Multi-Assign Broadcast</span>
          </div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
            Work & Task Assignment Manager
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Dispatch operational deliverables to individuals, cross-functional teams, entire departments, or broadcast to everyone.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create & Assign Task</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMsg && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between animate-fadeIn ${
          alertMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--card-bg)] border border-[var(--card-border)] p-3.5 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="">All Departments ({departmentsList.length})</option>
            {departmentsList.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="">All Team Members ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name || emp.full_name} ({emp.department || 'Operations'})</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent 🔥</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* ─── KANBAN VIEW ─── */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => normalizeStatus(t.status) === col.id);
            return (
              <div
                key={col.id}
                className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-4 space-y-3 min-h-[500px] flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--card-border)]">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-[var(--text-primary)]">{col.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${col.badgeColor}`}>
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Task Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-center text-xs text-[var(--text-muted)] italic">
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedTask(t);
                          setShowDetailModal(true);
                        }}
                        className="p-4 bg-[var(--hover-bg)]/50 hover:bg-[var(--hover-bg)] border border-[var(--card-border)] hover:border-sky-400 dark:hover:border-sky-600 rounded-2xl shadow-2xs hover:shadow-md transition cursor-pointer space-y-3 group"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <PriorityBadge priority={t.priority} />
                          {t.is_deadline_extended || t.extended_deadline ? (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Extended Deadline (Final Deadline): {t.extended_deadline}</span>
                            </span>
                          ) : t.deadline ? (
                            <span className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-sky-500" />
                              <span>{t.deadline}</span>
                            </span>
                          ) : null}
                          {t.is_overdue && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-extrabold text-xs text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                            {t.title}
                          </h4>
                          {t.description && (
                            <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                        </div>

                        {/* Delay Explanation Review Banner if pending */}
                        {t.delay_reason && (t.delay_status === 'Pending' || t.delay_status === 'pending_review') && (
                          <div
                            className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-[11px] space-y-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1 font-black text-amber-800 dark:text-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Late Reason ({t.assigned_to?.name || 'Assignee'}):</span>
                            </div>
                            <p className="italic text-amber-900 dark:text-amber-200 line-clamp-2">
                              "{t.delay_reason}"
                            </p>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleAcceptDelay(t.id, t.title)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <ThumbsUp className="w-3 h-3" /> Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => openRejectDelayModal(t.id)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <ThumbsDown className="w-3 h-3" /> Reject (-10 Pts)
                              </button>
                            </div>
                          </div>
                        )}

                        {t.delay_reason && (t.delay_status === 'Accepted' || t.delay_status === 'accepted') && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3 h-3" /> Late Delay Accepted (No Penalty)
                          </div>
                        )}

                        {t.delay_reason && (t.delay_status === 'Rejected' || t.delay_status === 'rejected') && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            <X className="w-3 h-3" /> Late Delay Rejected (-{t.points_deducted || 10} Pts)
                          </div>
                        )}

                        {/* Quick Lane Transition Selector & Extend Button */}
                        <div className="pt-2 border-t border-[var(--card-border)]/60 flex items-center justify-between gap-1.5">
                          <select
                            value={normalizeStatus(t.status)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(t.id, e.target.value);
                            }}
                            className="text-[10px] font-bold py-1 px-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
                          >
                            <option value="Todo">Move: To Do</option>
                            <option value="In Progress">Move: In Progress</option>
                            <option value="Under Review">Move: Review</option>
                            <option value="Completed">Move: Completed</option>
                          </select>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openExtendDeadlineModal(t);
                              }}
                              title="Extend Deadline (Final Deadline)"
                              className="px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Extend</span>
                            </button>

                            <span className="text-[10px] font-bold text-[var(--text-muted)] shrink-0">
                              {t.estimated_hours || 0}h
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                              {t.assigned_to?.name ? t.assigned_to.name[0].toUpperCase() : 'U'}
                            </div>
                            <span className="font-bold text-[var(--text-secondary)] truncate">
                              {t.assigned_to?.name || 'Unassigned'}
                            </span>
                          </div>

                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[var(--sidebar-bg)] text-[var(--text-muted)] border border-[var(--card-border)]">
                            {t.assigned_to?.department || t.department || 'Operations'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl overflow-hidden shadow-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--hover-bg)] border-b border-[var(--card-border)] text-[var(--text-muted)] uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-4 px-6">Task Title & Details</th>
                  <th className="py-4 px-6">Assignee</th>
                  <th className="py-4 px-6">Department</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Deadline</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => {
                        setSelectedTask(t);
                        setShowDetailModal(true);
                      }}
                      className="hover:bg-[var(--hover-bg)] transition cursor-pointer"
                    >
                      <td className="py-4 px-6 max-w-sm">
                        <div className="font-extrabold text-[var(--text-primary)] text-sm line-clamp-1">
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                            {t.description}
                          </div>
                        )}
                        {/* Late Reason Banner if pending */}
                        {t.delay_reason && (t.delay_status === 'Pending' || t.delay_status === 'pending_review') && (
                          <div
                            className="mt-2 p-2 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg flex items-center justify-between gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] text-amber-900 dark:text-amber-200 italic line-clamp-1">
                              Late Reason: "{t.delay_reason}"
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleAcceptDelay(t.id, t.title)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => openRejectDelayModal(t.id)}
                                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold cursor-pointer"
                              >
                                Reject (-10 Pts)
                              </button>
                            </div>
                          </div>
                        )}
                        {t.delay_reason && (t.delay_status === 'Accepted' || t.delay_status === 'accepted') && (
                          <div className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ Late Delay Accepted (No Penalty)
                          </div>
                        )}
                        {t.delay_reason && (t.delay_status === 'Rejected' || t.delay_status === 'rejected') && (
                          <div className="mt-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            ✕ Late Delay Rejected (-{t.points_deducted || 10} Pts)
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                            {t.assigned_to?.name ? t.assigned_to.name[0].toUpperCase() : 'U'}
                          </div>
                          <div className="font-bold text-[var(--text-primary)]">{t.assigned_to?.name}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          {t.assigned_to?.department || 'Operations'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-4 px-6 text-[var(--text-secondary)] font-medium">
                        {t.is_deadline_extended || t.extended_deadline ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> Extended Deadline (Final Deadline):
                            </span>
                            <span className="font-bold text-amber-700 dark:text-amber-300">
                              {t.extended_deadline}
                            </span>
                          </div>
                        ) : (
                          <span>{t.deadline || '—'}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openExtendDeadlineModal(t)}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                            title="Extend Deadline (Final Deadline)"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(t.id, t.title)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── CREATE & ASSIGN TASK MODAL (SINGLE, MULTIPLE, DEPT, EVERYONE) ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="relative w-full max-w-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto animate-fadeIn">
            {/* Modal Header (Fixed at top) */}
            <div className="px-6 py-4.5 border-b border-[var(--card-border)] flex items-center justify-between shrink-0 bg-[var(--card-bg)]">
              <div>
                <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                  Create & Assign Task
                </h3>
                <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">
                  Assign to an individual, multiple people, a department, or broadcast to everyone.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-xl cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form with Scrollable Content */}
            <form onSubmit={handleCreateTask} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1 text-xs">
                {/* Task Title */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Bulk Email Campaign Setup / Report Automation"
                    className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-semibold text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Task Description */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Task Description & Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Provide explicit instructions, guidelines, and expected deliverable outputs..."
                    className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-medium text-[var(--text-primary)] focus:outline-none focus:border-sky-500 leading-relaxed"
                  />
                </div>

                {/* ── ASSIGNMENT MODE SELECTOR ── */}
                <div className="p-3.5 bg-sky-50/40 dark:bg-sky-950/20 rounded-2xl border border-sky-200 dark:border-sky-900/60 space-y-3">
                  <label className="font-extrabold uppercase tracking-wider text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-sky-600" />
                    <span>Assign To / Target Scope</span>
                  </label>

                  {/* 4 Mode Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAssignMode('single')}
                      className={`py-2 px-2.5 rounded-xl font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        assignMode === 'single'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Single Person</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignMode('multiple')}
                      className={`py-2 px-2.5 rounded-xl font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        assignMode === 'multiple'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Multiple Team</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignMode('department')}
                      className={`py-2 px-2.5 rounded-xl font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        assignMode === 'department'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">By Department</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignMode('everyone')}
                      className={`py-2 px-2.5 rounded-xl font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        assignMode === 'everyone'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Everyone</span>
                    </button>
                  </div>

                  {/* Sub-selectors depending on mode */}
                  {assignMode === 'single' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                          Select Team Member:
                        </label>
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                          {employees.length} team members available
                        </span>
                      </div>
                      <select
                        value={formAssigneeId}
                        onChange={(e) => setFormAssigneeId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl font-semibold text-[var(--text-primary)] focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        {employees.length === 0 ? (
                          <option value="" disabled>Loading team members from database...</option>
                        ) : (
                          <>
                            <option value="">-- Choose Team Member --</option>
                            {employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.full_name || emp.name} — {emp.designation || emp.department || 'Operations Team'} ({emp.email})
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  {assignMode === 'multiple' && (
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1.5">
                        <span>Select Target Employees:</span>
                        <span className="text-sky-600 dark:text-sky-400 font-bold">{formSelectedAssigneeIds.length} selected</span>
                      </div>
                      {employees.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[var(--text-muted)] bg-[var(--sidebar-bg)] rounded-xl border border-[var(--card-border)]">
                          Loading team members from database...
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {employees.map((emp) => {
                            const isSel = formSelectedAssigneeIds.includes(emp.id);
                            return (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => toggleMultipleAssignee(emp.id)}
                                className={`p-2 rounded-xl border text-left text-xs transition flex items-center justify-between cursor-pointer ${
                                  isSel
                                    ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                                    : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--card-border)] hover:bg-[var(--hover-bg)]'
                                }`}
                              >
                                <div className="truncate pr-1">
                                  <div className="truncate font-bold">{emp.full_name || emp.name}</div>
                                  <div className={`text-[10px] truncate ${isSel ? 'text-sky-100' : 'text-[var(--text-muted)]'}`}>
                                    {emp.designation || emp.department || 'Operations'}
                                  </div>
                                </div>
                                {isSel ? <CheckCircle2 className="w-4 h-4 shrink-0 text-white" /> : <div className="w-4 h-4 rounded border border-[var(--card-border)] shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {assignMode === 'department' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">
                        Select Department to Assign to All Members:
                      </label>
                      <select
                        value={formTargetDept}
                        onChange={(e) => setFormTargetDept(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl font-semibold text-[var(--text-primary)] focus:outline-none focus:border-sky-500 cursor-pointer"
                      >
                        {departmentsList.map((dept) => {
                          const count = employees.filter((e) => e.assigned_departments?.includes(dept) || e.department === dept).length;
                          return (
                            <option key={dept} value={dept}>
                              {dept} ({count} active member{count === 1 ? '' : 's'})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {assignMode === 'everyone' && (
                    <div className="p-3.5 bg-purple-100 dark:bg-purple-950/50 rounded-xl text-purple-900 dark:text-purple-200 text-xs font-semibold flex items-center gap-2.5 border border-purple-200 dark:border-purple-800">
                      <Globe className="w-5 h-5 shrink-0 text-purple-600" />
                      <span>This task will be automatically dispatched to all {employees.length} active team members across all departments.</span>
                    </div>
                  )}
                </div>

                {/* Priority & Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                      Priority Level
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-semibold text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                    >
                      <option value="Urgent">Urgent (Immediate SLA)</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                      Target Deadline
                    </label>
                    <input
                      type="date"
                      value={formDeadline}
                      onChange={(e) => setFormDeadline(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-semibold text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Estimated Hours & Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formEstimatedHours}
                      onChange={(e) => setFormEstimatedHours(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-semibold text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                      Tags (Comma Separated)
                    </label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="e.g. Bulk Email, API, Research"
                      className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-semibold text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer (Sticky at bottom) */}
              <div className="px-6 py-4 border-t border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--card-border)] text-[var(--text-secondary)] font-bold hover:bg-[var(--hover-bg)] transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{assignMode === 'everyone' ? 'Broadcast to Everyone' : 'Dispatch Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TASK DETAIL MODAL ─── */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-fadeIn my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--card-border)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <PriorityBadge priority={selectedTask.priority} />
                  <StatusBadge status={selectedTask.status} />
                </div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Description
                </div>
                <div className="p-3.5 bg-[var(--hover-bg)] rounded-xl text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedTask.description || 'No additional instructions provided.'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[var(--hover-bg)]/60 rounded-2xl border border-[var(--card-border)]">
                <div>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Assignee</div>
                  <div className="font-extrabold text-[var(--text-primary)] mt-0.5">{selectedTask.assigned_to?.name || 'Unassigned'}</div>
                  <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">{selectedTask.assigned_to?.department || selectedTask.department || 'Operations'}</div>
                </div>

                <div>
                  {selectedTask.is_deadline_extended || selectedTask.extended_deadline ? (
                    <div>
                      <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Extended Deadline (Final Deadline)
                      </div>
                      <div className="font-black text-amber-700 dark:text-amber-300 mt-0.5 text-sm">
                        {selectedTask.extended_deadline}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Original: {selectedTask.deadline || 'Flexible'} • {selectedTask.estimated_hours}h planned
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Deadline</div>
                      <div className="font-extrabold text-[var(--text-primary)] mt-0.5">{selectedTask.deadline || 'Flexible'}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{selectedTask.estimated_hours} hours planned</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Extend Deadline Action Bar in Detail */}
              <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <div>
                  <div className="font-bold text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Deadline Management</span>
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {selectedTask.is_deadline_extended
                      ? `Extended to: ${selectedTask.extended_deadline} (Final Deadline)`
                      : 'Exceed or grant an extended deadline for this deliverable'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openExtendDeadlineModal(selectedTask)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{selectedTask.is_deadline_extended ? 'Update Final Deadline' : 'Extend Deadline'}</span>
                </button>
              </div>

              {/* Late Delay Explanation Review Box */}
              {selectedTask.delay_reason && (
                <div className="p-4 bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Late Delay Explanation from {selectedTask.assigned_to?.name || 'Assignee'}:</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      selectedTask.delay_status === 'Accepted' || selectedTask.delay_status === 'accepted'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : selectedTask.delay_status === 'Rejected' || selectedTask.delay_status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                    }`}>
                      {selectedTask.delay_status || 'Pending Review'}
                    </span>
                  </div>

                  <p className="text-xs text-amber-950 dark:text-amber-100 italic bg-[var(--card-bg)]/80 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 leading-relaxed whitespace-pre-wrap font-medium">
                    "{selectedTask.delay_reason}"
                  </p>

                  {(selectedTask.delay_status === 'Pending' || selectedTask.delay_status === 'pending_review' || !selectedTask.delay_status) && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAcceptDelay(selectedTask.id, selectedTask.title)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Accept Delay (OK)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openRejectDelayModal(selectedTask.id)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>Reject & Deduct Points</span>
                      </button>
                    </div>
                  )}

                  {(selectedTask.delay_status === 'Accepted' || selectedTask.delay_status === 'accepted') && (
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Delay explanation accepted by reviewer. No penalty applied.
                    </div>
                  )}

                  {(selectedTask.delay_status === 'Rejected' || selectedTask.delay_status === 'rejected') && (
                    <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Delay explanation rejected. Penalty points deducted: -{selectedTask.points_deducted || 10} Pts
                    </div>
                  )}
                </div>
              )}

              {/* Status Update Quick Buttons */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Update Task Status:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Todo', 'In Progress', 'Under Review', 'Completed'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleUpdateStatus(selectedTask.id, s)}
                      className={`py-2 rounded-xl font-bold transition text-xs cursor-pointer ${
                        selectedTask.status === s
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--card-border)]">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id, selectedTask.title)}
                  className="px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Task</span>
                </button>

                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-[var(--hover-bg)] hover:bg-[var(--card-border)] text-[var(--text-primary)] rounded-xl font-bold transition cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Extend Deadline Modal ── */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-[var(--text-primary)]">Extend Task Deadline</h3>
              </div>
              <button
                onClick={() => setShowExtendModal(false)}
                className="p-1 hover:bg-[var(--hover-bg)] rounded-xl cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExtendDeadline} className="space-y-4 text-xs">
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Setting an extended deadline will explicitly flag the task with:
                </p>
                <div className="mt-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl font-extrabold text-amber-700 dark:text-amber-300">
                  Extended Deadline (Final Deadline)
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Task
                </label>
                <div className="font-bold text-[var(--text-primary)] p-2.5 bg-[var(--hover-bg)] rounded-xl">
                  {extendTaskTitle}
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  New Extended Deadline (Final Deadline) *
                </label>
                <input
                  type="date"
                  required
                  value={extendedDeadline}
                  onChange={(e) => setExtendedDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-semibold text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Extension Reason / Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={extendNotes}
                  onChange={(e) => setExtendNotes(e.target.value)}
                  placeholder="e.g. Scope expanded, granting an extra 3 days to finalize deliverable..."
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-medium text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="px-4 py-2 border border-[var(--card-border)] rounded-xl font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={extending}
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {extending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Extended Deadline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject Delay Modal (Points Deduction) ── */}
      {showRejectDelayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <div className="flex items-center gap-2">
                <ThumbsDown className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-black text-[var(--text-primary)]">Reject Delay & Deduct Points</h3>
              </div>
              <button
                onClick={() => setShowRejectDelayModal(false)}
                className="p-1 hover:bg-[var(--hover-bg)] rounded-xl cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectDelay} className="space-y-4 text-xs">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Deduction Policy</span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Rejecting this delay explanation will immediately deduct points from the employee's performance score (or all team members if assigned to a team/group).
                </p>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Penalty Points to Deduct
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={penaltyPoints}
                  onChange={(e) => setPenaltyPoints(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-bold text-[var(--text-primary)] focus:outline-none focus:border-rose-500 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Manager/Admin Rejection Notes
                </label>
                <textarea
                  rows={3}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Explain why the delay is not accepted (e.g. Unjustified delay without prior communication)..."
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-medium text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectDelayModal(false)}
                  className="px-4 py-2 border border-[var(--card-border)] rounded-xl font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {reviewing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Rejection (-{penaltyPoints} Pts)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
