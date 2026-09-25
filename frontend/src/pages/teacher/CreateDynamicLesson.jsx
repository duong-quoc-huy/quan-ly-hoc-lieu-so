import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookPlus,
  CheckCircle2,
  FileCode2,
  Files,
  FileText,
  Loader2,
  Presentation,
  Upload,
  Video,
  X,
} from "lucide-react";

import curriculumService from "../../services/curriculumService";
import { materialService } from "../../services/materialService";

const MATERIAL_TYPES = [
  {
    value: "document",
    label: "Document",
    description: "PDF, Word, or text document",
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    value: "slides",
    label: "Slides",
    description: "PowerPoint or presentation",
    icon: Presentation,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    value: "exercise",
    label: "Exercise",
    description: "Assignment or practice material",
    icon: FileCode2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    value: "video",
    label: "Video",
    description: "Lecture video",
    icon: Video,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  const firstMessage = Object.values(data)
    .flat(Infinity)
    .find((msg) => typeof msg === "string");

  return firstMessage || "Something went wrong. Please try again.";
}

function formatFileSize(size) {
  if (!size) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CreateDynamicLesson() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State
  const [selectedCategory, setSelectedCategory] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonOrder, setLessonOrder] = useState(1);

  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [materialType, setMaterialType] = useState("document");
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadMyCategories();
  }, []);

  const loadMyCategories = async () => {
    try {
      setLoadingCategories(true);
      setFormError("");

      // Attempt to load assigned categories, fallback to public list if needed
      let response;
      if (curriculumService.getMyCategories) {
        response = await curriculumService.getMyCategories();
      } else {
        response = await curriculumService.getCategories();
      }

      const payload = response?.data ?? response;
      const categoryList = Array.isArray(payload)
        ? payload
        : payload?.results || payload?.data || [];

      setCategories(categoryList);
    } catch (error) {
      console.error("Failed to load categories:", error);
      setFormError("Unable to load assigned subjects. Please try again.");
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setFiles((currentFiles) => {
      const existingKeys = new Set(
        currentFiles.map((file) => `${file.name}-${file.size}`)
      );
      const newFiles = selectedFiles.filter(
        (file) => !existingKeys.has(`${file.name}-${file.size}`)
      );
      return [...currentFiles, ...newFiles];
    });

    event.target.value = "";
  };

  const removeFile = (indexToRemove) => {
    setFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCategory) {
      setFormError("Please select a subject.");
      return;
    }

    if (!lessonTitle.trim()) {
      setFormError("Please enter a lesson title.");
      return;
    }

    if (!materialTitle.trim()) {
      setFormError("Please enter a material title.");
      return;
    }

    if (!files.length) {
      setFormError("Please attach at least one file for this lesson.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      const formData = new FormData();
      formData.append("category", selectedCategory);
      formData.append("lesson_title", lessonTitle.trim());
      formData.append("lesson_description", lessonDescription.trim());
      formData.append("lesson_order", lessonOrder);

      formData.append("title", materialTitle.trim());
      formData.append("description", materialDescription.trim());
      formData.append("material_type", materialType);

      files.forEach((file) => {
        formData.append("files", file);
      });

      await materialService.uploadDynamicLessonMaterial(formData);

      // Successfully submitted dynamic bundle -> return to teacher dashboard
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error("Dynamic lesson creation failed:", error);
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full space-y-6 bg-slate-50/60 p-1 pb-12">
      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl shadow-slate-200 sm:p-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-300 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              <BookPlus className="h-3.5 w-3.5" />
              Dynamic Curriculum Proposal
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Propose New Lesson & Materials
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Create a new lesson topic within your assigned subject and attach initial learning resources for administrator approval.
            </p>
          </div>
        </div>
      </section>

      {/* Main Form Container */}
      <div className="mx-auto max-w-4xl">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {formError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {formError}
            </div>
          )}

          {/* Section 1: Lesson Details */}
          <div className="space-y-4 border-b border-slate-100 pb-6">
            <h2 className="text-base font-bold text-slate-900">
              1. Lesson Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Subject (Category) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={loadingCategories || submitting}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
                >
                  <option value="">
                    {loadingCategories
                      ? "Loading assigned subjects..."
                      : "Select assigned subject"}
                  </option>
                  {categories.map((category) => (
                    <option
                      key={category.category_id}
                      value={category.category_id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Display Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={lessonOrder}
                  onChange={(e) => setLessonOrder(parseInt(e.target.value, 10) || 1)}
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Lesson Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                disabled={submitting}
                placeholder="Example: Advanced Graph Algorithms & Dijkstra's Algorithm"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Lesson Description
              </label>
              <textarea
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
                disabled={submitting}
                rows={2}
                placeholder="Briefly describe what students will learn in this lesson..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Section 2: Material Details */}
          <div className="space-y-4 border-b border-slate-100 pb-6">
            <h2 className="text-base font-bold text-slate-900">
              2. Attached Resource Details
            </h2>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Resource Package Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                disabled={submitting}
                placeholder="Example: Lecture Slides & Practice Problem Sets"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-slate-700">
                Resource Category Type
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MATERIAL_TYPES.map((type) => {
                  const Icon = type.icon;
                  const selected = materialType === type.value;

                  return (
                    <button
                      type="button"
                      key={type.value}
                      onClick={() => setMaterialType(type.value)}
                      disabled={submitting}
                      className={`rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${type.color}`} />
                      <p className="mt-2 text-xs font-bold text-slate-800">
                        {type.label}
                      </p>
                      <p className="mt-1 hidden text-[10px] leading-4 text-slate-500 sm:block">
                        {type.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Resource Description
              </label>
              <textarea
                value={materialDescription}
                onChange={(e) => setMaterialDescription(e.target.value)}
                disabled={submitting}
                rows={2}
                placeholder="Add a short summary about the attached files..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Section 3: File Upload */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              3. File Attachments <span className="text-rose-500">*</span>
            </h2>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
              <Upload className="h-7 w-7 text-indigo-500" />
              <span className="mt-2 text-sm font-bold text-slate-700">
                Choose files for this lesson
              </span>
              <span className="mt-1 text-xs text-slate-500">
                Select one or multiple files (PDF, MP4, PPTX, Code files, etc.)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                disabled={submitting}
                className="hidden"
              />
            </label>

            {files.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Files className="h-4 w-4 text-indigo-500" />
                    Selected files ({files.length})
                  </p>
                </div>

                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {file.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={submitting}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Controls */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={submitting}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Proposal...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit Lesson Package for Approval
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}