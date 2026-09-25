import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  BookPlus,
  Building2,
  ChevronRight,
  Clock,
  Eye,
  GraduationCap,
  Loader2,
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  XCircle,
  ChevronLeft,
} from "lucide-react";

import curriculumService from "../../services/curriculumService";
import { materialService } from "../../services/materialService";

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const [assignedCategories, setAssignedCategories] = useState([]);
  const [allMajors, setAllMajors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Calculate total pages & slice active items
  const totalPages = Math.ceil(materials.length / itemsPerPage) || 1;
  const paginatedMaterials = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return materials.slice(start, start + itemsPerPage);
  }, [materials, currentPage]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [assignedRes, majorsRes, facultiesRes, materialsRes] = await Promise.all([
        curriculumService.getMyCategories(),
        curriculumService.getMajors(),
        curriculumService.getFaculties(),
        materialService.getMyMaterials(),
      ]);

      const assigned = Array.isArray(assignedRes?.data ?? assignedRes)
        ? assignedRes?.data ?? assignedRes
        : assignedRes?.results || [];

      const majorsList = Array.isArray(majorsRes?.data ?? majorsRes)
        ? majorsRes?.data ?? majorsRes
        : majorsRes?.results || [];

      const facultiesList = Array.isArray(facultiesRes?.data ?? facultiesRes)
        ? facultiesRes?.data ?? facultiesRes
        : facultiesRes?.results || [];

      const myMaterials = Array.isArray(materialsRes?.data ?? materialsRes)
        ? materialsRes?.data ?? materialsRes
        : materialsRes?.results || [];

      setAssignedCategories(assigned);
      setAllMajors(majorsList);
      setFaculties(facultiesList);
      setMaterials(myMaterials);
    } catch (err) {
      console.error("Failed loading dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  // Extract distinct assigned Majors
  const assignedMajors = useMemo(() => {
    const map = new Map();
    assignedCategories.forEach((cat) => {
      if (cat.major?.major_id) {
        map.set(cat.major.major_id, cat.major);
      }
    });
    return Array.from(map.values());
  }, [assignedCategories]);

  // Extract unassigned/other Majors for institution-wide exploration
  const otherMajors = useMemo(() => {
    const assignedIds = new Set(assignedMajors.map((m) => m.major_id));
    return allMajors.filter((m) => !assignedIds.has(m.major_id));
  }, [allMajors, assignedMajors]);

  if (loading) {
    return (
      <div className="flex py-20 justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 bg-slate-50/60 p-1 pb-12">
      {/* Header Banner */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              <GraduationCap className="h-3.5 w-3.5" /> Academic Faculty Hub
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Teacher Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Select an assigned major to manage subjects and proposals, or explore academic materials across other university faculties.
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

      {/* Section 1: Assigned Majors (Clickable Cards) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Your Assigned Majors</h2>
          <span className="text-xs font-semibold text-indigo-600">
            {assignedMajors.length} active major assignment(s)
          </span>
        </div>

        {assignedMajors.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            No active major assignments found. Contact your academic administrator.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignedMajors.map((major) => (
              <div
                key={major.major_id}
                onClick={() => navigate(`/teacher/majors/${major.major_id}`)}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700">
                    {major.code || "MAJOR"}
                  </span>
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  {major.name}
                </h3>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-indigo-600">
                  <span>Manage Curriculum & Subjects</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Explore Other University Faculties & Majors (Read-Only) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900">
            Institutional Catalog (Read-Only Access)
          </h2>
          <p className="text-xs text-slate-500">
            Browse published course materials, lecture slides, and student discussions across other departments.
          </p>
        </div>

        {otherMajors.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            No other institutional majors found.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherMajors.map((major) => (
              <div
                key={major.major_id}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-slate-200/70 px-2.5 py-1 text-xs font-bold uppercase text-slate-600">
                    {major.code || "MAJOR"}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <Building2 className="w-3 h-3" /> Read-Only
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-800">{major.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Faculty of {major.faculty?.name || "General Studies"}
                </p>

                <div className="mt-4 border-t border-slate-200/60 pt-3 flex justify-end">
                  <button
                    onClick={() => navigate(`/student/dashboard?major=${major.major_id}`)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" /> Explore Materials & Comments
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Submissions Status Tracker */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Submission Status</h3>
            <p className="text-xs text-slate-500">Track approval status for uploaded materials and inspect comments/previews.</p>
          </div>
          {materials.length > 0 && (
            <span className="text-xs font-semibold text-slate-500">
              Total: {materials.length} item(s)
            </span>
          )}
        </div>

        {materials.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No submissions uploaded yet.</p>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {paginatedMaterials.map((item) => {
                const targetId = item.submission_id || item.material_id;
                return (
                  <div 
                    key={item.submission_id} 
                    className="flex items-center justify-between py-3 text-xs hover:bg-slate-50/80 px-2 rounded-xl transition"
                  >
                    <div className="cursor-pointer flex-1" onClick={() => navigate(`/materials/${targetId}`)}>
                      <p className="font-bold text-slate-800 hover:text-indigo-600 transition">{item.title}</p>
                      <p className="text-[10px] text-slate-400">{item.category_name} &bull; {item.lesson_title}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        {item.status === "approved" && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
                        )}
                        {item.status === "rejected" && (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600" title={item.rejection_reason}><XCircle className="w-3.5 h-3.5" /> Rejected</span>
                        )}
                        {item.status === "pending" && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600"><Clock className="w-3.5 h-3.5" /> Pending Review</span>
                        )}
                      </div>

                      <button
                        onClick={() => navigate(`/materials/${targetId}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                        title="View PDF Preview & Comments"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> Inspect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-500">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}