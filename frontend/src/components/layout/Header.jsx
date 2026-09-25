import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  BookOpen, LogOut, User, KeyRound, ChevronDown, 
  FileText, HelpCircle, UploadCloud, BookPlus, 
  ShieldCheck, Users, Flag, LayoutDashboard, Layers 
} from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  const renderRoleNav = () => {
    switch (user.role) {
      case 'teacher':
        return (
          <>
            <Link
              to="/teacher/dashboard"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/teacher/dashboard') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Dashboard
            </Link>

            <Link
              to="/teacher/upload"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/teacher/upload') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" /> Upload Material
            </Link>

            <Link
              to="/teacher/create-lesson"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/teacher/create-lesson') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookPlus className="w-3.5 h-3.5 text-indigo-600" /> Propose Lesson
            </Link>

            <Link
              to="/teacher/quiz-builder"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/teacher/quiz-builder') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" /> Quiz Builder
            </Link>
          </>
        );

      case 'admin':
        return (
          <>
            <Link
              to="/admin/dashboard"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/admin/dashboard') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <Link
              to="/admin/curriculum"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/admin/curriculum') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Curriculum & Roles
            </Link>
            <Link
              to="/admin/moderation"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/admin/moderation') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Moderation Queue
            </Link>
            <Link
              to="/admin/users"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/admin/users') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> User Accounts
            </Link>
            <Link
              to="/admin/reports"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/admin/reports') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Flag className="w-3.5 h-3.5 text-amber-600" /> Reports
            </Link>
          </>
        );

      case 'student':
      default:
        return (
          <>
            <Link
              to="/student/dashboard"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/student/dashboard') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Material Catalog
            </Link>
            <Link
              to="/student/quizzes"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/student/quizzes') ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" /> Quizzes & Results
            </Link>
          </>
        );
    }
  };

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 block leading-tight">EduShare</span>
              <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Academic Hub</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 border-l border-slate-200 pl-6">
            {renderRoleNav()}
          </nav>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-100 shadow-sm">
                {initials}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-900">{user.first_name} {user.last_name}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
                <div className="mt-2 inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">
                  {user.role} {user.student_id ? `· ${user.student_id}` : ''}
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Account Management
                </Link>

                <Link
                  to="/change-password"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-slate-400" />
                  Change Password
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}