import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  GraduationCap, 
  ShieldCheck, 
  Camera, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles,
  UserCheck,
  Building2
} from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Avatar Preview State
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const fileInputRef = useRef(null);

  // Form Field State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'other',
    date_of_birth: '',
    phone_number_1: '',
    phone_number_2: '',
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const data = await authService.getProfile();
      populateForm(data);
    } catch (err) {
      if (user) {
        populateForm(user);
      }
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (profileData) => {
    setFormData({
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || '',
      gender: profileData.gender || 'other',
      date_of_birth: profileData.date_of_birth || '',
      phone_number_1: profileData.phone_number_1 || '',
      phone_number_2: profileData.phone_number_2 || '',
    });
    if (profileData.profile_image) {
      setAvatarPreview(profileData.profile_image);
    }
  };

  const showNotification = (type, text) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
  };

  // Image File Handling
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'Image size must be smaller than 5 MB.');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const payload = new FormData();
      payload.append('first_name', formData.first_name.trim());
      payload.append('last_name', formData.last_name.trim());
      payload.append('gender', formData.gender);
      if (formData.date_of_birth) payload.append('date_of_birth', formData.date_of_birth);
      payload.append('phone_number_1', formData.phone_number_1.trim());
      payload.append('phone_number_2', formData.phone_number_2.trim());

      if (avatarFile) {
        payload.append('profile_image', avatarFile); // <-- Updated key from 'avatar' to 'profile_image'
      }

      const updatedUser = await authService.updateProfile(payload);
      
      if (setUser) {
        setUser((prev) => ({ ...prev, ...updatedUser }));
      }

      showNotification('success', 'Account profile updated successfully!');
      setAvatarFile(null);
    } catch (err) {
      const errorDetail = err?.response?.data?.detail || 'Failed to save profile changes. Please try again.';
      showNotification('error', typeof errorDetail === 'string' ? errorDetail : 'Validation error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const initials = `${formData.first_name?.[0] || user?.first_name?.[0] || ''}${formData.last_name?.[0] || user?.last_name?.[0] || ''}`.toUpperCase() || 'U';
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-semibold">Loading account details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Page Header */}
      <header className="rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl sm:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-200 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10 mb-3 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" /> Profile & Identity Settings
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Account Management</h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            View your institutional identity details, update contact records, and manage your public profile avatar.
          </p>
        </div>
      </header>

      {/* Alert Banner */}
      {statusMessage.text && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-semibold shadow-sm transition-all ${
            statusMessage.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & System Identity Summary */}
        <div className="space-y-6">
          {/* Avatar Upload Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Picture</h2>
            
            <div className="relative inline-block mx-auto">
              <div className="w-28 h-28 rounded-full bg-slate-900 text-white font-bold text-2xl flex items-center justify-center ring-4 ring-indigo-50 shadow-inner overflow-hidden mx-auto">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Upload Trigger Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition-transform hover:scale-105"
                title="Upload image"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            <div className="text-center">
              <p className="text-xs font-semibold text-slate-700">
                {avatarFile ? avatarFile.name : 'JPEG, PNG, or WEBP up to 5MB'}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
              >
                Choose new picture
              </button>
            </div>
          </div>

          {/* System Identity Card (Read-Only) */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
            <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Institutional Identity</h2>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-300" /> Primary Email
                </span>
                <span className="font-semibold text-white truncate max-w-[160px]" title={user?.email}>
                  {user?.email || 'N/A'}
                </span>
              </div>

              {user?.student_id && (
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-300" /> Student ID
                  </span>
                  <span className="font-mono font-bold text-indigo-200">{user.student_id}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" /> System Role
                </span>
                <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {user?.role || 'Student'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-white/10">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-300" /> Account Status
                </span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Active
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-300" /> Registered
                </span>
                <span className="font-semibold text-slate-300">{formatDate(user?.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Personal & Contact Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">Update your personal details below. Locked fields are managed by school administrators.</p>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:border-indigo-400 focus:outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Unspecified</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {/* Primary Phone */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Primary Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone_number_1}
                  onChange={(e) => setFormData({ ...formData, phone_number_1: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {/* Secondary Phone */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Secondary Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone_number_2}
                  onChange={(e) => setFormData({ ...formData, phone_number_2: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Read-Only Notice Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">Need to change your official email or Student ID?</p>
              <p>
                Institutional emails and student identity numbers are locked for security compliance. Please contact your campus registrar or administrator to request updates.
              </p>
            </div>

            {/* Submit Action Toolbar */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}