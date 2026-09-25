import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { materialService } from '../../services/materialService';
import { commentService } from '../../services/commentService';
import { useAuth } from '../../hooks/useAuth';
import { 
  Download, ArrowLeft, Pin, Trash2, Edit2, MessageSquare, 
  Flag, Send, Loader2, HelpCircle, FileText, User, Calendar, 
  Files, Presentation, FileCode2, Video, Paperclip
} from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? 'Just now' : date.toLocaleString();
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Normalizes attachment attributes:
 * - preview_url: Points to backend converted PDF (for PPTX/DOCX) or standard preview URL
 * - download_url: Points to original uploaded file (.pptx, .docx, etc.)
 */
function normalizeAttachments(data) {
  if (!data) return [];

  // Root backend fallback attributes for single-file API responses
  const rootPdfUrl = data.converted_pdf_url || data.pdf_preview_url || data.preview_url;
  const rootOriginalUrl = data.download_url || data.original_file_url || data.file_url;

  if (Array.isArray(data.attachments) && data.attachments.length > 0) {
    return data.attachments.map((att) => {
      const pdfPreviewUrl = att.converted_pdf_url || att.pdf_preview_url || att.preview_url || rootPdfUrl;
      const originalDownloadUrl = att.download_url || att.original_file_url || att.file_url || rootOriginalUrl;
      const filename = att.original_filename || att.filename || 'Resource File';

      return {
        id: att.id || att.attachment_id,
        original_filename: filename,
        material_type: att.material_type || att.file_type || data.material_type || 'document',
        preview_url: pdfPreviewUrl,       // Converted PDF URL for preview iframe
        download_url: originalDownloadUrl, // Original uploaded file (.pptx) URL
        file_size: att.file_size || 0,
      };
    });
  }

  // Single-file legacy fallback
  return [{
    id: data.material_id || 'primary',
    original_filename: data.original_filename || data.title || 'Resource File',
    material_type: data.material_type || 'document',
    preview_url: rootPdfUrl,
    download_url: rootOriginalUrl,
    file_size: data.file_size || 0,
  }];
}

/**
 * Resolves the PDF preview URL for the iframe embed
 */
function resolveEmbedUrl(file) {
  if (!file) return null;

  // 1. Direct converted PDF URL provided by backend LibreOffice service
  if (file.preview_url) {
    return file.preview_url;
  }

  // 2. Direct PDF original file
  if (file.download_url && file.download_url.toLowerCase().includes('.pdf')) {
    return file.download_url;
  }

  return null;
}

export default function MaterialDetail() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [material, setMaterial] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [selectedAttachment, setSelectedAttachment] = useState(null);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const [reportCommentId, setReportCommentId] = useState(null);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    loadData();
  }, [materialId]);

  const loadComments = async () => {
    if (!materialId || materialId === 'undefined') return;
    try {
      const commData = await commentService.getComments(materialId);
      setComments(commData.results || commData);
    } catch (err) {
      console.error('Failed to load comments', err);
    }
  };

  const loadData = async () => {
    if (!materialId || materialId === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const matData = await materialService.getMaterialDetail(materialId);
      setMaterial(matData);

      const parsedAttachments = normalizeAttachments(matData);
      setAttachments(parsedAttachments);
      if (parsedAttachments.length > 0) {
        setSelectedAttachment(parsedAttachments[0]);
      }

      await loadComments();
    } catch (err) {
      console.error('Failed to load material details', err);
    } finally {
      setLoading(false);
    }
  };

  // Triggers download for original file (.pptx, .docx, etc.)
  const handleDownloadSingle = (file) => {
    if (!file) return;

    if (file.download_url) {
      window.open(file.download_url, '_blank');
    } else if (materialId) {
      materialService.downloadMaterial(materialId, file.original_filename);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await commentService.createComment(materialId, {
        content: newComment,
        parent: null,
      });
      setNewComment('');
      loadComments();
    } catch (err) {
      alert('Failed to post comment.');
    }
  };

  const handleUpdateComment = async (commentId) => {
    try {
      await commentService.updateComment(commentId, editContent);
      setEditingId(null);
      loadComments();
    } catch (err) {
      alert('Failed to update comment.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    const result = await Swal.fire({
      title: 'Delete this comment?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e11d48',
    });

    if (!result.isConfirmed) return;

    try {
      await commentService.deleteComment(commentId);
      loadComments();
    } catch (err) {
      alert('Failed to delete comment.');
    }
  };

  const handleTogglePin = async (commentId) => {
    try {
      await commentService.togglePin(commentId);
      loadComments();
    } catch (err) {
      alert('Failed to toggle pin state.');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    try {
      await commentService.reportComment(reportCommentId, reportReason);
      setReportCommentId(null);
      setReportReason('');
      alert('Report submitted successfully.');
    } catch (err) {
      alert('Failed to submit comment report.');
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-rose-500" />;
      case 'slides':
        return <Presentation className="w-4 h-4 text-indigo-500" />;
      case 'exercise':
        return <FileCode2 className="w-4 h-4 text-emerald-500" />;
      case 'document':
      default:
        return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isStaff = user?.role === 'admin' || user?.role === 'teacher';
  const activeEmbedUrl = resolveEmbedUrl(selectedAttachment);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </button>

      {/* Multi-File Package Selector Tabs */}
      {attachments.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-2">
            <Files className="w-4 h-4 text-indigo-600" /> Package Files ({attachments.length}):
          </span>
          <div className="flex items-center gap-2">
            {attachments.map((file, idx) => {
              const isActive = selectedAttachment?.id === file.id;
              return (
                <button
                  key={file.id || idx}
                  onClick={() => setSelectedAttachment(file)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {getFileIcon(file.material_type)}
                  <span className="max-w-[150px] truncate">{file.original_filename}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Media Player / Converted PDF Document Preview Window */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-md min-h-[380px] flex items-center justify-center relative">
        {selectedAttachment?.material_type === 'video' ? (
          <video 
            controls 
            controlsList="nodownload" 
            src={selectedAttachment.preview_url || selectedAttachment.download_url} 
            className="w-full max-h-[550px] object-contain"
          >
            Your browser does not support HTML video streaming.
          </video>
        ) : activeEmbedUrl ? (
          <iframe 
            src={activeEmbedUrl} 
            title={selectedAttachment?.original_filename || material?.title} 
            className="w-full h-[550px] border-0"
          />
        ) : (
          <div className="text-center text-slate-400 p-8 space-y-2">
            <FileText className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">PDF Preview Processing</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              PDF preview for "{selectedAttachment?.original_filename}" is converting or processing. You can download the original file directly below.
            </p>
          </div>
        )}
      </div>

      {/* Material Information Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full uppercase">
              {material?.category_name || material?.lesson_title || 'Academic Resource'}
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2">{material?.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownloadSingle(selectedAttachment)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Original File</span>
            </button>

            <button
              onClick={() => {
                const targetLessonId = material?.lesson_id || (typeof material?.lesson === 'string' ? material.lesson : material?.lesson?.lesson_id);
                if (!targetLessonId) {
                  alert('This material is not attached to an active lesson.');
                  return;
                }
                navigate(`/student/quiz/${targetLessonId}`);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> Take Quiz
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">{material?.description || 'No description provided.'}</p>

        {/* List of Attached Original Files */}
        {attachments.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-indigo-600" /> Package Files ({attachments.length})
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
              {attachments.map((file, idx) => (
                <div key={file.id || idx} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      {getFileIcon(file.material_type)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{file.original_filename}</p>
                      <p className="text-[10px] text-slate-400">{formatFileSize(file.file_size)} • {file.material_type}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadSingle(file)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title={`Download ${file.original_filename}`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Author</p>
            <p className="font-semibold text-slate-800 mt-0.5">{material?.owner ? `${material.owner.first_name} ${material.owner.last_name}` : 'Instructor'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Uploaded Date</p>
            <p className="font-semibold text-slate-800 mt-0.5">{formatDate(material?.created_at)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Updated</p>
            <p className="font-semibold text-slate-800 mt-0.5">{formatDate(material?.updated_at)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Package Size</p>
            <p className="font-semibold text-slate-800 mt-0.5">
              {formatFileSize(material?.file_size || attachments.reduce((acc, f) => acc + (f.file_size || 0), 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Discussion Board */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span>Discussion Board ({comments.length})</span>
        </h2>

        {/* Root Comment Entry Form */}
        <form onSubmit={handlePostComment} className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask a question or contribute to discussion..."
            rows={2}
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 focus:outline-none transition-all"
          />
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition">
              <Send className="w-3.5 h-3.5" /> Post Comment
            </button>
          </div>
        </form>

        {/* Threaded Comments List */}
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.comment_id}
              comment={comment}
              user={user}
              isStaff={isStaff}
              materialId={materialId}
              onCommentPosted={loadComments}
              onEdit={(c) => { setEditingId(c.comment_id); setEditContent(c.content); }}
              onDelete={handleDeleteComment}
              onPin={handleTogglePin}
              onReport={(id) => setReportCommentId(id)}
              editingId={editingId}
              editContent={editContent}
              setEditContent={setEditContent}
              handleUpdateComment={handleUpdateComment}
              setEditingId={setEditingId}
            />
          ))}
        </div>
      </div>

      {/* Report Modal */}
      {reportCommentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 text-xs shadow-xl">
            <h3 className="font-bold text-slate-900 text-sm">Report Inappropriate Comment</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Specify issue (e.g., offensive content, spam link)..."
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setReportCommentId(null)} className="px-3 py-1.5 text-slate-600 font-semibold rounded-lg hover:bg-slate-100">Cancel</button>
              <button onClick={handleReportSubmit} className="px-4 py-1.5 bg-rose-600 text-white font-semibold rounded-xl shadow-sm">Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Recursive Comment Item Component
function CommentItem({ 
  comment, user, isStaff, materialId, onCommentPosted, onEdit, onDelete, onPin, onReport, 
  editingId, editContent, setEditContent, handleUpdateComment, setEditingId 
}) {
  const isOwner = comment.author?.user_id === user?.user_id;
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      await commentService.createComment(materialId, {
        content: replyContent,
        parent: comment.comment_id,
      });
      setReplyContent('');
      setIsReplying(false);
      onCommentPosted();
    } catch (err) {
      alert('Failed to post reply.');
    }
  };

  return (
    <div className={`p-4 rounded-2xl border text-xs space-y-3 ${
      comment.is_pinned ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{comment.author?.first_name} {comment.author?.last_name}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full capitalize">{comment.author?.role}</span>
          {comment.is_pinned && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              <Pin className="w-3 h-3 fill-amber-700" /> Pinned
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400">{formatDate(comment.created_at)}</span>
      </div>

      {editingId === comment.comment_id ? (
        <div className="space-y-2">
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" rows={2} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditingId(null)} className="px-2 py-1 text-slate-600 font-semibold">Cancel</button>
            <button onClick={() => handleUpdateComment(comment.comment_id)} className="px-3 py-1 bg-indigo-600 text-white font-semibold rounded-lg">Save</button>
          </div>
        </div>
      ) : (
        <p className="text-slate-700 leading-relaxed">{comment.content}</p>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
        <button onClick={() => setIsReplying(!isReplying)} className="hover:text-indigo-600 font-semibold transition-colors">
          {isReplying ? 'Cancel Reply' : 'Reply'}
        </button>
        <div className="flex items-center gap-2">
          {isStaff && <button onClick={() => onPin(comment.comment_id)} className="hover:text-amber-600 font-semibold">{comment.is_pinned ? 'Unpin' : 'Pin'}</button>}
          {isOwner && <button onClick={() => onEdit(comment)} className="hover:text-slate-900 font-semibold">Edit</button>}
          {(isOwner || isStaff) && <button onClick={() => onDelete(comment.comment_id)} className="hover:text-rose-600 font-semibold">Delete</button>}
          {!isOwner && <button onClick={() => onReport(comment.comment_id)} className="hover:text-rose-600 text-slate-400" title="Report Comment"><Flag className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {isReplying && (
        <form onSubmit={handleReplySubmit} className="pt-1 space-y-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`Replying to ${comment.author?.first_name || 'this comment'}...`}
            rows={2}
            autoFocus
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 focus:outline-none"
          />
          <div className="flex justify-end">
            <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm">
              <Send className="w-3.5 h-3.5" /> Post Reply
            </button>
          </div>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-4 border-l-2 border-slate-100 space-y-3 pt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.comment_id}
              comment={reply}
              user={user}
              isStaff={isStaff}
              materialId={materialId}
              onCommentPosted={onCommentPosted}
              onEdit={onEdit}
              onDelete={onDelete}
              onPin={onPin}
              onReport={onReport}
              editingId={editingId}
              editContent={editContent}
              setEditContent={setEditContent}
              handleUpdateComment={handleUpdateComment}
              setEditingId={setEditingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}