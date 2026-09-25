import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, LogOut, Shield, FileText, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Shield className="w-3 h-3" /> Admin</span>;
      case 'teacher':
        return <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><FileText className="w-3 h-3" /> Faculty</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><User className="w-3 h-3" /> Student</span>;
    }
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 block leading-tight">EduShare</span>
            <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Academic Repository</span>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">{user?.first_name} {user?.last_name}</span>
              {getRoleBadge(user?.role)}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">{user?.student_id || user?.email}</span>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}