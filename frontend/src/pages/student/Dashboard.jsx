import React, { useState, useEffect, useMemo } from 'react';
import curriculumService from '../../services/curriculumService';
import MajorDetailView from './MajorDetailView';
import { 
  GraduationCap, 
  Search, 
  Loader2, 
  ChevronRight, 
  Sparkles, 
  ChevronLeft 
} from 'lucide-react';

const MAJORS_PER_PAGE = 6;

export default function StudentDashboard() {
  const [majors, setMajors] = useState([]);
  const [selectedMajor, setSelectedMajor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [majorPage, setMajorPage] = useState(1);

  useEffect(() => {
    loadMajors();
  }, []);

  const loadMajors = async () => {
    try {
      setLoading(true);
      if (curriculumService.getMajors) {
        const res = await curriculumService.getMajors();
        const data = res?.data ?? res;
        setMajors(Array.isArray(data) ? data : data?.results || []);
      } else {
        // Fallback: load categories to extract majors if no dedicated endpoint
        const res = await curriculumService.getCategories();
        const data = res?.data ?? res;
        setMajors(Array.isArray(data) ? data : data?.results || []);
      }
    } catch (err) {
      console.error('Failed to load majors:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter majors by search keyword
  const filteredMajors = useMemo(() => {
    return majors.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [majors, search]);

  // Paginate major cards
  const totalPages = Math.ceil(filteredMajors.length / MAJORS_PER_PAGE) || 1;
  const paginatedMajors = useMemo(() => {
    const start = (majorPage - 1) * MAJORS_PER_PAGE;
    return filteredMajors.slice(start, start + MAJORS_PER_PAGE);
  }, [filteredMajors, majorPage]);

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setMajorPage(1); // Reset to first page on search
  };

  // If a major is selected, render the MajorDetailView sub-component
  if (selectedMajor) {
    return (
      <MajorDetailView
        major={selectedMajor}
        onBack={() => setSelectedMajor(null)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl sm:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-200 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10 mb-3 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" /> Academic Programs Directory
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Select Your Major</h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Choose your faculty or field of study below to explore subjects, approved lesson modules, and course resources.
          </p>
        </div>
      </section>

      {/* Search Bar for Major Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search faculty or major (e.g. Computer Science, Business)..."
            className="w-full pl-11 pr-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Major Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold">Loading academic programs...</p>
        </div>
      ) : filteredMajors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-500 space-y-2">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-sm text-slate-800">No Majors Found</p>
          <p>Try searching for a different keyword.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedMajors.map((major) => (
              <div
                key={major.major_id || major.id}
                onClick={() => setSelectedMajor(major)}
                className="bg-white border border-slate-200 hover:border-indigo-500 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                      Active Program
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {major.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {major.description || 'Explore verified lessons, slides, assignments, and lecture videos.'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                  <span>Browse Subjects & Lessons</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          {/* Major Directory Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                Page <strong className="text-slate-900">{majorPage}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({filteredMajors.length} total programs)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={majorPage <= 1}
                  onClick={() => setMajorPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1 transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={majorPage >= totalPages}
                  onClick={() => setMajorPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1 transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}