import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { 
  Users, Clock, ShieldAlert, HardDrive, Loader2, RefreshCw, AlertCircle 
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminService.getSystemStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load system stats', err);
      setError(err?.response?.data?.detail || 'Failed to load system metrics. Please verify admin permissions.');
    } finally {
      setLoading(false);
    }
  };

  const formatStorage = (bytes) => {
    const numBytes = Number(bytes) || 0;
    if (numBytes === 0) return '0 MB';
    const mb = numBytes / (1024 * 1024);
    return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
  };

  // Safe Math Helpers
  const submittedQuizzes = Number(stats?.quizzes?.submitted) || 0;
  const passedQuizzes = Number(stats?.quizzes?.passed) || 0;
  const passRate = submittedQuizzes > 0 ? ((passedQuizzes / submittedQuizzes) * 100).toFixed(1) : '0.0';

  const avgScore = stats?.quizzes?.average_score != null 
    ? Number(stats.quizzes.average_score).toFixed(1) 
    : null;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-semibold">Loading system analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Analytics Overview</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time metrics for platform usage, storage, and moderation activity.</p>
        </div>
        <button
          onClick={loadStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadStats} className="font-bold underline hover:text-rose-900">Retry</button>
        </div>
      )}

      {/* Primary Interactive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div 
          onClick={() => navigate('/admin/users')}
          className="bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-5 shadow-sm space-y-2 cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-slate-500 group-hover:text-indigo-600 transition-colors">
            <span className="text-xs font-semibold">Total Accounts</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.users?.total_users || 0}</p>
          <p className="text-[10px] text-slate-400">
            {stats?.users?.students || 0} Students | {stats?.users?.teachers || 0} Teachers
          </p>
        </div>

        {/* Pending Censorship */}
        <div 
          onClick={() => navigate('/admin/moderation?status=pending')}
          className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-5 shadow-sm space-y-2 cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-slate-500 group-hover:text-amber-600 transition-colors">
            <span className="text-xs font-semibold">Pending Censorship</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats?.materials?.pending || 0}</p>
          <p className="text-[10px] text-slate-400">Approved: {stats?.materials?.approved || 0}</p>
        </div>

        {/* Reported Comments */}
        <div 
          onClick={() => navigate('/admin/reports')}
          className="bg-white border border-slate-200 hover:border-rose-400 rounded-2xl p-5 shadow-sm space-y-2 cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-slate-500 group-hover:text-rose-600 transition-colors">
            <span className="text-xs font-semibold">Reported Comments</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600">{stats?.moderation?.pending_comment_reports || 0}</p>
          <p className="text-[10px] text-slate-400">Total Active Comments: {stats?.moderation?.total_comments || 0}</p>
        </div>

        {/* Storage Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">S3 Storage Usage</span>
            <HardDrive className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatStorage(stats?.materials?.total_storage_bytes)}</p>
          <p className="text-[10px] text-slate-400">{stats?.materials?.total_materials || 0} stored files</p>
        </div>
      </div>

      {/* Secondary Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
          <h2 className="font-bold text-slate-900 text-sm">Resource Type Distribution</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Documents (PDF/Word)</span>
              <span className="font-bold text-slate-900">{stats?.materials?.documents || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Presentation Slides</span>
              <span className="font-bold text-slate-900">{stats?.materials?.slides || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Exercises & Assignments</span>
              <span className="font-bold text-slate-900">{stats?.materials?.exercises || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Lecture Videos</span>
              <span className="font-bold text-slate-900">{stats?.materials?.videos || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
          <h2 className="font-bold text-slate-900 text-sm">Quiz Engagement Metrics</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Total Attempts Started</span>
              <span className="font-bold text-slate-900">{stats?.quizzes?.total_attempts || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Completed & Submitted</span>
              <span className="font-bold text-slate-900">{submittedQuizzes}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Passed Assessment Rate</span>
              <span className="font-bold text-emerald-600">{passRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Average Platform Score</span>
              <span className="font-bold text-slate-900">{avgScore !== null ? `${avgScore}%` : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}