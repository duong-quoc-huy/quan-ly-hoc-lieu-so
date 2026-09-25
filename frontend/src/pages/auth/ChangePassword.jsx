import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function ChangePassword() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      
      await authService.changePassword({ 
        old_password: oldPassword, 
        new_password: newPassword,
        new_password_2: confirmPassword 
      });
      
      const updatedUser = await fetchProfile();

      switch (updatedUser?.role) {
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'teacher':
          navigate('/teacher/dashboard', { replace: true });
          break;
        case 'student':
        default:
          navigate('/student/dashboard', { replace: true });
          break;
      }
    } catch (err) {
  // Log full error object to DevTools console for debugging
  console.error('Password Change Error:', err.response?.data || err);

  const data = err.response?.data;
  if (data) {
    if (typeof data === 'string') {
      setError(data);
    } else if (data.detail) {
      setError(data.detail);
    } else if (typeof data === 'object') {
      // Extracts first validation error message array from Django Serializer
      const firstError = Object.values(data).flat()[0];
      setError(typeof firstError === 'string' ? firstError : 'Validation error occurred.');
    }
  } else {
    setError('Network error. Unable to reach the server.');
  }
} finally {
  setIsSubmitting(false);
}
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div>
        {user?.must_change_password && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>You must change your initial temporary password before accessing the system.</span>
          </div>
        )}
        <h1 className="text-xl font-bold text-slate-900">Change Password</h1>
        <p className="text-xs text-slate-500 mt-1">Set a new secure password for your account.</p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Current Password Input */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">Current Password</label>
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowOld((prev) => !prev)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
            >
              {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password Input */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNew((prev) => !prev)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm New Password Input */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg shadow-sm transition-colors"
        >
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}