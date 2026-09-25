import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookPlus,
  Eye,
  GraduationCap,
  Lock,
  Loader2,
  Plus,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import curriculumService from "../../services/curriculumService";

export default function MajorCurriculum() {
  const { majorId } = useParams();
  const navigate = useNavigate();

  const [major, setMajor] = useState(null);
  const [categories, setCategories] = useState([]);
  const [assignedCategories, setAssignedCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMajorCurriculum();
  }, [majorId]);

  const loadMajorCurriculum = async () => {
    try {
      setLoading(true);

      const [majorsRes, categoriesRes, assignedRes] = await Promise.all([
        curriculumService.getMajors(),
        curriculumService.getCategories({ major: majorId }),
        curriculumService.getMyCategories(),
      ]);

      const majorsList = Array.isArray(majorsRes?.data ?? majorsRes)
        ? majorsRes?.data ?? majorsRes
        : majorsRes?.results || [];

      const currentMajor = majorsList.find((m) => m.major_id === majorId);
      setMajor(currentMajor || null);

      const rawCategories = Array.isArray(categoriesRes?.data ?? categoriesRes)
        ? categoriesRes?.data ?? categoriesRes
        : categoriesRes?.results || [];
      setCategories(rawCategories);

      const rawAssigned = Array.isArray(assignedRes?.data ?? assignedRes)
        ? assignedRes?.data ?? assignedRes
        : assignedRes?.results || [];
      setAssignedCategories(rawAssigned);
    } catch (error) {
      console.error("Failed to load major curriculum details:", error);
    } finally {
      setLoading(false);
    }
  };

  const processedCategories = useMemo(() => {
    const assignedSet = new Set(assignedCategories.map((c) => c.category_id));
    return categories.map((cat) => ({
      ...cat,
      isAssigned: assignedSet.has(cat.category_id),
    }));
  }, [categories, assignedCategories]);

  if (loading) {
    return (
      <div className="flex py-20 justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 bg-slate-50/60 p-1 pb-12">
      {/* Header Banner */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <button
          onClick={() => navigate("/teacher/dashboard")}
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-300 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              <GraduationCap className="h-3.5 w-3.5" /> Major Curriculum Workspace
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {major?.name || "Major Curriculum"}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Manage uploaded materials and propose dynamic lesson topics for your assigned subjects, or browse departmental resources.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/teacher/upload")}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white ring-1 ring-inset ring-white/15 hover:bg-white/20"
            >
              <UploadCloud className="h-4 w-4" /> Upload Material
            </button>
            <button
              onClick={() => navigate("/teacher/create-lesson")}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-500"
            >
              <BookPlus className="h-4 w-4" /> Propose Dynamic Lesson
            </button>
          </div>
        </div>
      </section>

      {/* Categories Breakdown */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900">
            Subject Catalog & Permissions
          </h2>
          <p className="text-xs text-slate-500">
            Subjects marked with green badges are under your management. Grey badges indicate read-only access for cross-departmental peer review.
          </p>
        </div>

        {processedCategories.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No subjects registered under this major yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {processedCategories.map((cat) => (
              <div
                key={cat.category_id}
                className={`rounded-2xl border p-5 transition-all ${
                  cat.isAssigned
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900">{cat.name}</span>
                  {cat.isAssigned ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      Assigned (Full Access)
                    </span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      <Lock className="w-3 h-3" /> Read-Only
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                  {cat.description || "No subject description provided."}
                </p>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  {cat.isAssigned ? (
                    <button
                      onClick={() => navigate("/teacher/upload")}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                    >
                      <Plus className="w-3.5 h-3.5" /> Upload Material
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/student/dashboard?category=${cat.category_id}`)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Materials & Comments
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}