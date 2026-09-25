import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { moderationService } from '../../services/moderationService';
import { 
  CheckCircle2, XCircle, Lock, Eye, Clock, 
  FileText, Video, Loader2, Shield, Download,
  Files, FileCode2, Presentation, ExternalLink
} from 'lucide-react';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MaterialModeration() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMaterials();
  }, [statusFilter]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError('');
      const data = statusFilter === 'pending'
        ? await moderationService.getPendingMaterials()
        : await moderationService.getAllMaterials({ status: statusFilter });
      setMaterials(data.results || data);
    } catch (err) {
      setError('Failed to load material moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectAndLock = async (item) => {
    const targetId = item.submission_id || item.material_id;
    try {
      setError('');
      // Lock material submission for review
      await moderationService.lockMaterial(targetId);
      setSelectedMaterial(item);
      setActiveFileIndex(0); // Reset focus to first attached file
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to lock material for review.');
    }
  };

  const handleApprove = async () => {
    if (!selectedMaterial) return;
    const targetId = selectedMaterial.submission_id || selectedMaterial.material_id;

    try {
      setSubmitting(true);
      await moderationService.approveMaterial(targetId, selectedMaterial.updated_at);
      setSelectedMaterial(null);
      loadMaterials();
    } catch (err) {
      setError(err.response?.data?.detail || 'Approval failed due to a review conflict.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedMaterial) return;
    if (!rejectionReason.trim()) {
      alert('Please specify a rejection reason.');
      return;
    }
    const targetId = selectedMaterial.submission_id || selectedMaterial.material_id;

    try {
      setSubmitting(true);
      await moderationService.rejectMaterial(targetId, selectedMaterial.updated_at, rejectionReason);
      setSelectedMaterial(null);
      setRejectionReason('');
      loadMaterials();
    } catch (err) {
      setError(err.response?.data?.detail || 'Rejection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseReview = async () => {
    if (selectedMaterial) {
      const targetId = selectedMaterial.submission_id || selectedMaterial.material_id;
      try {
        await moderationService.unlockMaterial(targetId);
      } catch (err) {
        console.error('Unlock failed', err);
      }
      setSelectedMaterial(null);
      setActiveFileIndex(0);
    }
  };

  // Extract attachments array safely
  const attachments = selectedMaterial?.attachments || (selectedMaterial?.file ? [selectedMaterial] : []);
  const activeAttachment = attachments[activeFileIndex] || attachments[0] || {};
  const activePreviewUrl = activeAttachment?.preview_url || activeAttachment?.file || activeAttachment?.file_url;
  const activeMaterialType = activeAttachment?.material_type || selectedMaterial?.material_type || 'document';
  const targetSubmissionId = selectedMaterial?.submission_id || selectedMaterial?.material_id;

  const getFileIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-3.5 h-3.5 text-rose-500" />;
      case 'slides': return <Presentation className="w-3.5 h-3.5 text-indigo-500" />;
      case 'exercise': return <FileCode2 className="w-3.5 h-3.5 text-emerald-500" />;
      default: return <FileText className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Content Censorship & Moderation</h1>
          <p className="text-xs text-slate-500 mt-1">Inspect, lock, and publish uploaded materials and multi-file packages.</p>
        </div>

        <div className="flex gap-2 text-xs">
          {['pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold capitalize border transition-colors ${
                statusFilter === st ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">{error}</div>}

      {/* Moderation Queue Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-xs">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : materials.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No materials currently matching the "{statusFilter}" filter.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Resource Submission</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Subject / Lesson</th>
                <th className="px-4 py-3">Status / Lock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {materials.map((item) => {
                const itemId = item.submission_id || item.material_id;
                const isLocked = Boolean(item.review_locked_by);
                const fileCount = item.file_count || item.attachments?.length || 1;

                return (
                  <tr key={itemId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                        <Files className="w-3 h-3 text-slate-400" />
                        <span>{fileCount} attached file{fileCount > 1 ? 's' : ''}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{item.owner?.first_name} {item.owner?.last_name}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{item.category_name || "—"}</p>
                      <p className="text-[10px] text-slate-400">{item.lesson_title || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          <Lock className="w-3 h-3" /> Reviewing by Admin
                        </span>
                      ) : (
                        <span className={`capitalize font-bold ${
                          item.status === 'approved' ? 'text-emerald-600' :
                          item.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleInspectAndLock(item)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors"
                      >
                        Inspect & Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detailed Multi-File Review Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                    {selectedMaterial.category_name || "Subject"} &bull; {selectedMaterial.lesson_title}
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {attachments.length} File{attachments.length > 1 ? 's' : ''} Attached
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedMaterial.title}</h2>
              </div>
              <button onClick={handleCloseReview} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors">
                ✕ Close
              </button>
            </div>

            {/* Multi-File Tab Switcher Bar */}
            {attachments.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Select File Attachment to Inspect:</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {attachments.map((file, idx) => {
                    const isActive = activeFileIndex === idx;
                    const fType = file.material_type || 'document';
                    return (
                      <button
                        key={file.material_id || file.id || idx}
                        onClick={() => setActiveFileIndex(idx)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-semibold text-xs whitespace-nowrap transition-all ${
                          isActive 
                            ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-200' 
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {getFileIcon(fType)}
                        <span className="max-w-[160px] truncate">{file.title || file.original_filename || `File ${idx + 1}`}</span>
                        {file.file_size && <span className="text-[10px] text-slate-400">({formatFileSize(file.file_size)})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document / Video Previewer Player */}
            <div className="space-y-2">
              <div className="bg-slate-900 rounded-2xl overflow-hidden min-h-[340px] flex items-center justify-center relative shadow-inner">
                {activeMaterialType === 'video' ? (
                  <video controls src={activePreviewUrl} className="w-full max-h-[420px]" />
                ) : activePreviewUrl ? (
                  <iframe src={activePreviewUrl} title="Attachment Preview" className="w-full h-[450px] border-0" />
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2">
                    <FileText className="w-10 h-10 mx-auto opacity-50" />
                    <p>Preview pending conversion or format unsupported for inline iframe.</p>
                  </div>
                )}
              </div>

              {/* Active File Download & Inspector Bar */}
              {activeAttachment && (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-700 truncate">
                    {getFileIcon(activeMaterialType)}
                    <span className="font-bold truncate">{activeAttachment.original_filename || activeAttachment.title || "Attached Resource"}</span>
                    {activeAttachment.file_size && <span className="text-slate-400">&bull; {formatFileSize(activeAttachment.file_size)}</span>}
                  </div>

                  {activePreviewUrl && (
                    <a
                      href={activePreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Download / Open Raw
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Submission Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Teacher Description:</label>
              <p className="text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">{selectedMaterial.description || 'No description provided.'}</p>
            </div>

            {/* Rejection Reason Input */}
            <div className="space-y-1.5 border-t border-slate-100 pt-4">
              <label className="block font-bold text-slate-800">Rejection Reason <span className="text-slate-400 font-normal">(Required if rejecting)</span>:</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State specific guideline violations or required changes..."
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400"
                rows={2}
              />
            </div>

            {/* Action Footer */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  handleCloseReview();
                  navigate(`/materials/${targetSubmissionId}`);
                }}
                className="inline-flex items-center gap-1.5 text-slate-600 font-semibold hover:text-indigo-600 hover:underline"
              >
                Go to Public Detail Page <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject Submission'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve & Publish Package'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}