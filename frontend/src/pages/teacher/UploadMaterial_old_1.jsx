import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileCode2,
  FileText,
  Loader2,
  Lock,
  Presentation,
  RotateCcw,
  Upload,
  UploadCloud,
  Video,
  X,
  AlertCircle,
  AlertTriangle,
  Info
} from "lucide-react";

import curriculumService from "../../services/curriculumService";
import { materialService } from "../../services/materialService";

const MATERIAL_TYPES = [
  { value: "document", label: "Document", description: "PDF, Word, or text document", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  { value: "slides", label: "Slides", description: "PowerPoint or presentation", icon: Presentation, color: "text-indigo-600", bg: "bg-indigo-50" },
  { value: "exercise", label: "Exercise", description: "Assignment or practice material", icon: FileCode2, color: "text-emerald-600", bg: "bg-emerald-50" },
  { value: "video", label: "Video", description: "Lecture video", icon: Video, color: "text-rose-600", bg: "bg-rose-50" },
];

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return Object.values(data).flat(Infinity).find((msg) => typeof msg === "string") || "Something went wrong.";
}

export default function UploadMaterial() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [existingSubmission, setExistingSubmission] = useState(null);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [formError, setFormError] = useState("");
  const [processingStatus, setProcessingStatus] = useState(""); // Live status message for Celery

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLesson, setSelectedLesson] = useState("");
  const [materialType, setMaterialType] = useState("document");
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadMyAssignedCategories();
  }, []);

  const loadMyAssignedCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await curriculumService.getMyCategories();
      const payload = response?.data ?? response;
      setCategories(Array.isArray(payload) ? payload : payload?.results || []);
    } catch (error) {
      setFormError("Failed to load your assigned subjects.");
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCategoryChange = async (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    setSelectedLesson("");
    setLessons([]);
    resetFormFields();

    if (!categoryId) return;

    try {
      setLoadingLessons(true);
      const response = await curriculumService.getLessons({ category: categoryId });
      const rawLessons = Array.isArray(response?.data ?? response) ? (response?.data ?? response) : (response?.results || []);
      setLessons(rawLessons.filter((l) => l.status === "approved"));
    } catch (error) {
      setFormError("Failed to load approved lessons for this subject.");
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleLessonChange = async (e) => {
    const lessonId = e.target.value;
    setSelectedLesson(lessonId);
    resetFormFields();

    if (!lessonId) return;

    try {
      setLoadingSubmission(true);
      const response = await materialService.getMySubmissions({ lesson: lessonId });
      const submissions = Array.isArray(response?.results) ? response.results : (Array.isArray(response) ? response : []);
      
      const latest = submissions[0];
      if (latest) {
        setExistingSubmission(latest);
        setTitle(latest.title || "");
        setDescription(latest.description || "");
        if (latest.attachments?.length) {
          setMaterialType(latest.attachments[0].material_type || "document");
        }
      }
    } catch (error) {
      console.error("Failed to check existing submissions for lesson:", error);
    } finally {
      setLoadingSubmission(false);
    }
  };

  const resetFormFields = () => {
    setExistingSubmission(null);
    setTitle("");
    setDescription("");
    setMaterialType("document");
    setFiles([]);
    setFormError("");
    setProcessingStatus("");
  };

  // State guards derived from active submission
  const status = existingSubmission?.status;
  const isPending = status === "pending";
  const isLockedByAdmin = Boolean(existingSubmission?.review_locked_by);
  const isRejected = status === "rejected";
  const isWithdrawn = status === "withdraw";
  const isApproved = status === "approved";

  // Form fields are read-only while submission is PENDING
  const isReadOnly = isPending;

  const handleFileSelect = (e) => {
    if (isReadOnly) return;
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    // Automatically toggle to "slides" type if user picks a PPTX file
    const hasPptx = selectedFiles.some(f => f.name.toLowerCase().endsWith('.pptx'));
    if (hasPptx) {
      setMaterialType("slides");
    }

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const newFiles = selectedFiles.filter((f) => !existing.has(`${f.name}-${f.size}`));
      return [...prev, ...newFiles];
    });
    e.target.value = "";
  };

  const handleWithdraw = async () => {
    if (!existingSubmission || isLockedByAdmin) return;
    if (!window.confirm("Are you sure you want to withdraw this submission from the moderation queue?")) return;

    try {
      setWithdrawing(true);
      setFormError("");
      const updated = await materialService.withdrawSubmission(existingSubmission.submission_id);
      setExistingSubmission(updated);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setWithdrawing(false);
    }
  };

  // Helper: Poll status endpoint for PPTX processing task
  const pollPptxProcessing = (docId) => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await materialService.getPPTXDocumentStatus(docId);
          if (res.status === "completed") {
            clearInterval(interval);
            resolve(res);
          } else if (res.status === "failed") {
            clearInterval(interval);
            reject(new Error(res.error_message || "PPTX processing failed on worker."));
          } else {
            setProcessingStatus(`Background Worker: ${res.status.toUpperCase()} presentation...`);
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 2000);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!title.trim() || !selectedCategory || !selectedLesson) {
      setFormError("Please fill out all required fields.");
      return;
    }

    if (!existingSubmission && !files.length) {
      setFormError("Please attach at least one resource file.");
      return;
    }

    try {
      setUploading(true);
      setFormError("");

      // 1. Process any PPTX file asynchronously first to avoid 504 timeouts
      const pptxFile = files.find(f => f.name.toLowerCase().endsWith('.pptx'));
      if (pptxFile) {
        setProcessingStatus("Uploading presentation to Celery background processing...");
        const pptxDoc = await materialService.uploadPPTXDocument(pptxFile);
        setProcessingStatus("Processing slides in background (parsing content)...");
        await pollPptxProcessing(pptxDoc.id);
        setProcessingStatus("Presentation processed cleanly!");
      }

      // 2. Build form data for main submission
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("lesson", selectedLesson);
      formData.append("material_type", materialType);
      files.forEach((file) => formData.append("files", file));

      // 3. Submit material package
      if (existingSubmission) {
        await materialService.updateMaterial(existingSubmission.submission_id, formData);
      } else {
        await materialService.uploadMaterial(formData);
      }

      navigate("/teacher/dashboard");
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setUploading(false);
      setProcessingStatus("");
    }
  };

  return (
    <div className="min-h-full space-y-6 bg-slate-50/60 p-1 pb-12">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-200 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10 mb-3">
          <UploadCloud className="h-3.5 w-3.5" /> Static Lesson Resource Upload
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upload Course Material</h1>
        <p className="mt-2 text-sm text-slate-300">Submit new files for established, admin-approved lessons in your assigned subjects.</p>
      </section>

      <div className="mx-auto max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {formError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 font-medium">{formError}</div>}
          
          {processingStatus && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-900 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
              <div>
                <p className="font-bold text-sm">Celery Task Running</p>
                <p className="mt-0.5 text-indigo-800">{processingStatus}</p>
              </div>
            </div>
          )}

          {/* Status Banners */}
          {isPending && isLockedByAdmin && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Under Active Admin Review</p>
                <p className="mt-0.5 text-amber-800">An admin is currently inspecting this submission. Form fields and withdrawals are locked until review completes.</p>
              </div>
            </div>
          )}

          {isPending && !isLockedByAdmin && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Submission Pending Approval</p>
                  <p className="mt-0.5 text-amber-800">This lesson package is awaiting admin review. Fields are read-only. Withdraw the request if you need to fix your files.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shrink-0 flex items-center gap-1.5 transition"
              >
                {withdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Withdraw Request
              </button>
            </div>
          )}

          {isRejected && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Submission Rejected</p>
                <p className="mt-1 font-medium text-rose-800">Reason: "{existingSubmission.rejection_reason || 'No reason specified.'}"</p>
                <p className="mt-1 text-rose-700">Please update the fields or attached files below and re-submit for review.</p>
              </div>
            </div>
          )}

          {isWithdrawn && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Submission Withdrawn</p>
                <p className="mt-0.5 text-blue-800">You withdrew this submission. Make any necessary updates below and re-submit when ready.</p>
              </div>
            </div>
          )}

          {/* Subject & Lesson Selection */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Subject <span className="text-rose-500">*</span></label>
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                disabled={loadingCategories || uploading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
              >
                <option value="">{loadingCategories ? "Loading subjects..." : "Select subject"}</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Approved Lesson <span className="text-rose-500">*</span></label>
              <select
                value={selectedLesson}
                onChange={handleLessonChange}
                disabled={!selectedCategory || loadingLessons || uploading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none"
              >
                <option value="">
                  {loadingLessons ? "Loading lessons..." : !selectedCategory ? "Select subject first" : "Select lesson"}
                </option>
                {lessons.map((les) => (
                  <option key={les.lesson_id} value={les.lesson_id}>{les.title}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingSubmission ? (
            <div className="py-8 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Checking existing submissions...
            </div>
          ) : (
            <>
              {/* Resource Title */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Resource Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={uploading || isReadOnly}
                  placeholder="e.g. Chapter 2 Reference Notes"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={uploading || isReadOnly}
                  placeholder="Provide context or instructions for students..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  rows={3}
                />
              </div>

              {/* Material Type */}
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">Material Type</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MATERIAL_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = materialType === type.value;
                    return (
                      <button
                        type="button"
                        key={type.value}
                        disabled={isReadOnly}
                        onClick={() => setMaterialType(type.value)}
                        className={`rounded-xl border p-3 text-left transition ${
                          isSelected ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-white hover:bg-slate-50"
                        } ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <Icon className={`h-5 w-5 ${type.color}`} />
                        <p className="mt-2 text-xs font-bold text-slate-800">{type.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Upload Dropzone */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Attached Files {!existingSubmission && <span className="text-rose-500">*</span>}
                </label>
                
                {/* Existing Attachments Display */}
                {existingSubmission?.attachments?.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Currently Uploaded Package Files:</p>
                    {existingSubmission.attachments.map((att) => (
                      <div key={att.material_id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                        <span className="font-semibold text-slate-700 truncate">{att.original_filename}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">{att.material_type}</span>
                      </div>
                    ))}
                  </div>
                )}

                <label className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center ${
                  isReadOnly ? "opacity-50 cursor-not-allowed" : "hover:border-indigo-300 hover:bg-indigo-50/40"
                }`}>
                  <Upload className="h-7 w-7 text-indigo-500" />
                  <span className="mt-2 text-sm font-bold text-slate-700">
                    {existingSubmission ? "Select new/additional files" : "Select resource files"}
                  </span>
                  <input ref={fileInputRef} type="file" multiple disabled={isReadOnly} onChange={handleFileSelect} className="hidden" />
                </label>
              </div>

              {/* Newly Selected Files List */}
              {files.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">New Files to Upload:</p>
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-200 text-xs">
                      <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                      {!isReadOnly && (
                        <button type="button" onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => navigate(-1)} className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || isReadOnly}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isRejected || isWithdrawn ? "Re-submit Material for Review" : isApproved ? "Update Published Package" : "Submit Material"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
