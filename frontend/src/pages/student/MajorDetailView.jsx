import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  ArrowLeft, 
  ChevronRight, 
  FileText, 
  Loader2, 
  Eye, 
  HelpCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import curriculumService from '../../services/curriculumService';
import { materialService } from '../../services/materialService';

export default function MajorDetailView({ major, onBack }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [lessons, setLessons] = useState([]);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch Categories (Subjects) belonging to this Major
  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        setError('');
        const majorId = major.major_id || major.id;
        
        const res = await curriculumService.getCategories({ major: majorId });
        const data = res?.data ?? res;
        const catList = Array.isArray(data) ? data : data?.results || [];
        
        const filtered = catList.filter(
          (c) => c.major === majorId || c.major_id === majorId || c.major?.major_id === majorId
        );
        
        setCategories(filtered.length > 0 ? filtered : catList);
      } catch (err) {
        setError('Failed to load subjects for this major.');
      } finally {
        setLoadingCategories(false);
      }
    }

    if (major) loadCategories();
  }, [major]);

  // 2. Fetch Lessons when a Subject (Category) is selected
  useEffect(() => {
    async function loadLessons() {
      if (!selectedCategory) return;
      try {
        setLoadingLessons(true);
        setError('');
        const catId = selectedCategory.category_id || selectedCategory.id;

        const res = await curriculumService.getLessons({ category: catId });
        const data = res?.data ?? res;
        const lessonList = Array.isArray(data) ? data : data?.results || [];
        
        const approvedLessons = lessonList.filter(
          (l) => (l.status === 'approved' || !l.status) &&
                 (l.category === catId || l.category_id === catId || l.category?.category_id === catId)
        );

        setLessons(approvedLessons);
      } catch (err) {
        setError('Failed to load lessons for this subject.');
      } finally {
        setLoadingLessons(false);
      }
    }

    loadLessons();
  }, [selectedCategory]);

  // Handle navigating to material details cleanly
  const handleViewMaterialDetail = async (lesson) => {
    const lessonId = lesson.lesson_id || lesson.id;

    // 1. If lesson already has a material/submission ID attached:
    const existingId = lesson.submission_id || lesson.material_id;
    if (existingId) {
      navigate(`/materials/${existingId}`);
      return;
    }

    try {
      // 2. Call getPublicMaterials with the lesson filter
      const res = await materialService.getPublicMaterials({ lesson: lessonId });
      const materials = res?.results || res?.data || res || [];

      if (materials.length > 0) {
        const targetSubmissionId = materials[0].submission_id || materials[0].material_id;
        navigate(`/materials/${targetSubmissionId}`);
      } else {
        alert('No material uploaded for this lesson yet.');
      }
    } catch (err) {
      console.error('Failed to resolve material for lesson:', err);
      alert('Unable to load material details for this lesson.');
    }
  };

  // --- TIER 2: LESSONS LIST VIEW (INSIDE A SELECTED SUBJECT) ---
  if (selectedCategory) {
    return (
      <div className="space-y-6 pb-12">
        <button
          onClick={() => { setSelectedCategory(null); setLessons([]); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Subjects in {major.name}
        </button>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <span className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full uppercase">
            {major.name}
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">{selectedCategory.name}</h1>
          <p className="text-xs text-slate-500 mt-1">{selectedCategory.description || 'Approved learning modules and resources.'}</p>
        </div>

        {loadingLessons ? (
          <div className="py-16 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-500">
            No approved lessons available for this subject yet.
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, idx) => (
              <div
                key={lesson.lesson_id || lesson.id || idx}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 font-bold text-xs shrink-0">
                    #{lesson.order || idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 truncate">{lesson.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{lesson.description || 'Includes course materials & assessment quiz.'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleViewMaterialDetail(lesson)}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>

                  <button
                    onClick={() => navigate(`/student/quiz/${lesson.lesson_id}`)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Take Quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- TIER 1: SUBJECT (CATEGORY) CARDS GRID ---
  return (
    <div className="space-y-6 pb-12">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Major Directory
      </button>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full uppercase">
          Academic Program
        </span>
        <h1 className="text-xl font-bold text-slate-900 mt-2">{major.name}</h1>
        <p className="text-xs text-slate-500 mt-1">Select a subject below to view its course materials and quizzes.</p>
      </div>

      {error && <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">{error}</div>}

      {loadingCategories ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-500">
          No active subjects found under this major.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => (
            <div
              key={cat.category_id || cat.id}
              onClick={() => setSelectedCategory(cat)}
              className="bg-white border border-slate-200 hover:border-indigo-500 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors w-fit">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {cat.description || 'Subject modules, lecture files, and assessments.'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                <span>View Lessons</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}