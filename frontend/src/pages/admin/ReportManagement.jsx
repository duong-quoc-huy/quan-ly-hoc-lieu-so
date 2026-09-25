import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { ShieldAlert, Trash2, CheckCircle2, Eye, Loader2 } from 'lucide-react';

export default function ReportManagement() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await adminService.getCommentReports();
      setReports(data.results || data);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (reportId) => {
    try {
      await adminService.dismissReport(reportId);
      loadReports();
    } catch (err) {
      alert('Failed to dismiss report.');
    }
  };

  const handleSoftDelete = async (commentId) => {
    const reason = prompt('Reason for comment removal (logged in audit):', 'Violates community guidelines.');
    if (!reason) return;

    try {
      await adminService.softDeleteComment(commentId, reason);
      loadReports();
    } catch (err) {
      alert('Failed to remove comment.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reported Comments Management</h1>
        <p className="text-xs text-slate-500 mt-1">Review flagged comments for policy violations and community moderation.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No active comment reports pending review.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Reported Content</th>
                <th className="px-4 py-3">Report Reason</th>
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {reports.map((r) => (
                <tr key={r.report_id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-bold text-slate-900 line-clamp-2">{r.comment?.content || 'Comment Content Removed'}</p>
                    <p className="text-[10px] text-slate-400">By: {r.comment?.author?.first_name} {r.comment?.author?.last_name}</p>
                  </td>
                  <td className="px-4 py-3 text-rose-700 font-semibold">{r.reason}</td>
                  <td className="px-4 py-3">{r.reporter?.first_name} {r.reporter?.last_name}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Navigate to Material Detail Page containing the comment */}
                      <button
                        onClick={() => {
                          const targetMaterialId = typeof r.comment === 'object' ? r.comment?.material : null;
                          if (targetMaterialId) {
                            navigate(`/materials/${targetMaterialId}`);
                          } else {
                            alert('Associated material could not be found or has been removed.');
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                        title="View Full Discussion Page"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Dismiss False Positive */}
                      <button
                        onClick={() => handleDismiss(r.report_id)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="Dismiss Report (No Violation)"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      {/* Soft Delete Abusive Comment */}
                      <button
                        onClick={() => handleSoftDelete(r.comment?.comment_id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Soft-Delete Abusive Comment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}