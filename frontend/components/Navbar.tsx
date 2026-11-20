'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, Shield, User, Moon, Sun, Bell, Star, CheckCheck, X } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { AttendanceTimerWidget } from './AttendanceTimerWidget';
import { WisBeesLogo } from './WisBeesLogo';
import { api } from '@/lib/api';

interface NavbarProps {
  title: string;
  subtitle?: string;
  user: any;
  onMenuClick: () => void;
}

export function Navbar({ title, subtitle, user, onMenuClick }: NavbarProps) {
  const isAdmin = user?.role === 'admin' || user?.is_superadmin;
  const { theme, toggleTheme } = useTheme();
  const profileHref = isAdmin ? '/admin/profile' : '/employee/profile';

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch (e) {
      // Silently catch error
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000); // 25s live polling
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const userPoints = user?.points ?? 100;

  return (
    <header className="sticky top-0 bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--card-border)] px-3 sm:px-6 py-2.5 sm:py-3.5 z-30 flex items-center justify-between transition-colors">
      
      {/* Left Area: Mobile Menu Drawer + Brand / Page Title */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Open Navigation Menu"
          className="lg:hidden p-1.5 sm:p-2 text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-xl transition cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Mini Logo */}
        <div className="lg:hidden flex items-center shrink-0">
          <WisBeesLogo imgClassName="h-6 w-auto object-contain" />
        </div>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base lg:text-lg font-black text-[var(--text-primary)] tracking-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-[11px] font-medium text-[var(--text-secondary)] hidden md:block truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Area: Shift Timer + Points + Notifications + Theme Toggle + Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Live Attendance Shift Timer Widget */}
        {!isAdmin && (
          <AttendanceTimerWidget compact={true} />
        )}

        {/* User Performance Points Pill */}
        <div
          title={`Performance Score: ${userPoints} Points. Earn points by completing tasks on time!`}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-amber-700 dark:text-amber-300 font-black text-xs shadow-2xs cursor-default transition select-none"
        >
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0 animate-pulse" />
          <span>{userPoints}</span>
          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 hidden xs:inline">Pts</span>
        </div>

        {/* In-App Notifications Dropdown Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            title="Notifications & Activity"
            className="relative p-1.5 sm:p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] shadow-xs transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Modal Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden z-50 animate-scaleUp">
              <div className="p-3.5 bg-[var(--sidebar-bg)] border-b border-[var(--card-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-black text-[var(--text-primary)]">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[var(--card-border)]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)] space-y-1">
                    <p className="font-bold text-[var(--text-primary)]">All caught up!</p>
                    <p>No new notifications at this time.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                      className={`p-3 text-xs transition cursor-pointer flex items-start gap-2.5 ${
                        !n.is_read
                          ? 'bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10'
                          : 'hover:bg-[var(--hover-bg)] opacity-85'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-emerald-500 ring-2 ring-emerald-500/30' : 'bg-slate-300 dark:bg-slate-700'}`} />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-black text-[var(--text-primary)] truncate">{n.title}</p>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">{n.created_at}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 sm:px-3 sm:py-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 animate-fadeIn" />
              <span className="text-xs font-bold hidden lg:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600 animate-fadeIn" />
              <span className="text-xs font-bold hidden lg:inline">Dark</span>
            </>
          )}
        </button>

        {/* Profile Link with Role Pill & Avatar */}
        <Link
          href={profileHref}
          title="Manage Profile & Security"
          className="flex items-center gap-2 hover:opacity-85 transition cursor-pointer p-1 rounded-2xl hover:bg-[var(--hover-bg)]"
        >
          {/* Role Pill (Visible on Desktop / Tablet) */}
          <div className={`hidden md:flex px-2.5 py-1 rounded-full text-xs font-bold items-center gap-1.5 border shadow-2xs ${
            isAdmin
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
          }`}>
            {isAdmin ? <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
            <span className="capitalize">{isAdmin ? 'Operations Admin' : (user?.is_manager ? 'Department Manager' : 'Assigned Employee')}</span>
          </div>

          {/* User Profile Avatar Bubble */}
          {(() => {
            const avatarSrc = user?.avatar_url || user?.avatar || user?.profile_photo || user?.photo;
            return (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-black shadow-xs shrink-0 border border-emerald-500/30">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={user?.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'OP'}</span>
                )}
              </div>
            );
          })()}
        </Link>
      </div>

    </header>
  );
}
