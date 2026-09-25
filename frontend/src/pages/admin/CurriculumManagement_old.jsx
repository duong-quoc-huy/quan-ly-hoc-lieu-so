import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  GraduationCap, 
  BookOpen, 
  Layers, 
  UserPlus, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  UploadCloud, 
  Mail, 
  UserCheck, 
  X,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

const ENTITY_TYPES = [
  { id: 'faculty', label: 'Faculty', icon: Building2 },
  { id: 'major', label: 'Major', icon: GraduationCap },
  { id: 'subject', label: 'Subject / Category', icon: BookOpen },
  { id: 'lesson', label: 'Lesson', icon: Layers },
];

export default function CurriculumManagement() {
  const [activeTab, setActiveTab] = useState('structure'); // 'structure' | 'bulk' | 'assignments'
  
  // Feedback Messages
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // Data States
  const [faculties, setFaculties] = useState([]);
  const [majors, setMajors] = useState([]);
  const [categories, setCategories] = useState([]);

  // Single Form State
  const [singleForm, setSingleForm] = useState({
    type: 'faculty',
    name: '',
    code: '',
    facultyId: '',
    majorId: '',
    categoryId: '',
    description: ''
  });

  // Bulk Form State
  const [bulkForm, setBulkForm] = useState({
    type: 'lesson',
    facultyId: '',
    majorId: '',
    categoryId: '',
    rawInput: ''
  });

  // Teacher Search & Assignment State
  const [teacherSearch, setTeacherSearch] = useState('');
  const [searchingTeacher, setSearchingTeacher] = useState(false);
  const [teacherResults, setTeacherResults] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [assignmentScope, setAssignmentScope] = useState('subject'); // 'faculty' | 'major' | 'subject'
  const [targetScopeId, setTargetScopeId] = useState('');
  const [assignedScopes, setAssignedScopes] = useState([]);

  const showNotification = (type, text) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
  };

  // --------------------------------------------------------------------------
  // HANDLERS: Single Creation
  // --------------------------------------------------------------------------
  const handleSingleSubmit = (e) => {
    e.preventDefault();
    if (!singleForm.name.trim()) return;

    setLoading(true);
    setTimeout(() => {
      showNotification('success', `Created new ${singleForm.type}: "${singleForm.name}" successfully.`);
      setSingleForm((prev) => ({ ...prev, name: '', code: '', description: '' }));
      setLoading(false);
    }, 600);
  };

  // --------------------------------------------------------------------------
  // HANDLERS: Bulk Creation
  // --------------------------------------------------------------------------
  const handleBulkSubmit = (e) => {
    e.preventDefault();
    const items = bulkForm.rawInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (items.length === 0) {
      showNotification('error', 'Please enter at least one item line to create.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      showNotification('success', `Successfully bulk-created ${items.length} ${bulkForm.type}(s).`);
      setBulkForm((prev) => ({ ...prev, rawInput: '' }));
      setLoading(false);
    }, 800);
  };

  // --------------------------------------------------------------------------
  // HANDLERS: Teacher Email Search & Assignment
  // --------------------------------------------------------------------------
  const handleTeacherSearch = (e) => {
    const query = e.target.value;
    setTeacherSearch(query);

    if (query.trim().length > 2) {
      setSearchingTeacher(true);
      setTimeout(() => {
        setTeacherResults([
          { id: 't1', email: 'alex.smith@university.edu', name: 'Dr. Alex Smith', role: 'Teacher' },
          { id: 't2', email: 'sarah.johnson@university.edu', name: 'Prof. Sarah Johnson', role: 'Teacher' },
        ].filter(t => t.email.toLowerCase().includes(query.toLowerCase()) || t.name.toLowerCase().includes(query.toLowerCase())));
        setSearchingTeacher(false);
      }, 300);
    } else {
      setTeacherResults([]);
    }
  };

  const handleSelectTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setTeacherSearch('');
    setTeacherResults([]);
    // Mock existing assignments
    setAssignedScopes([
      { id: 'sub-101', name: 'Data Structures & Algorithms', type: 'subject' },
      { id: 'maj-02', name: 'Software Engineering', type: 'major' },
    ]);
  };

  const handleAssignTeacher = (e) => {
    e.preventDefault();
    if (!selectedTeacher || !targetScopeId) return;

    showNotification('success', `Assigned ${selectedTeacher.name} to selected ${assignmentScope}.`);
    setAssignedScopes((prev) => [
      ...prev,
      { id: targetScopeId, name: `Assigned ${assignmentScope} (#${targetScopeId.slice(0, 5)})`, type: assignmentScope }
    ]);
    setTargetScopeId('');
  };

  const handleUnassignScope = (scopeId) => {
    setAssignedScopes((prev) => prev.filter((s) => s.id !== scopeId));
    showNotification('success', 'Teacher scope assignment removed.');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Header Banner */}
      <header className="rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl sm:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-200 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10 mb-3 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" /> Administrative Control Panel
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Curriculum & Assignment Manager</h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Build academic structures, batch-create lessons, and assign teaching privileges by subject or faculty.
          </p>
        </div>
      </header>

      {/* Global Status Banner */}
      {statusMessage.text && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-semibold shadow-sm transition-all ${
            statusMessage.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}
        >
          {statusMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Tab Bar Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 max-w-xl">
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'structure' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" /> Single Builder
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UploadCloud className="w-4 h-4" /> Bulk Generator
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'assignments' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4" /> Teacher Assignments
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: SINGLE STRUCTURE BUILDER */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'structure' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSingleSubmit} className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Academic Entity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Define faculties, majors, subjects, or individual lessons.</p>
            </div>

            {/* Entity Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ENTITY_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = singleForm.type === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSingleForm({ ...singleForm, type: type.id })}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Parent Dependencies */}
            {singleForm.type !== 'faculty' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                {(singleForm.type === 'major' || singleForm.type === 'subject' || singleForm.type === 'lesson') && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Parent Faculty</label>
                    <select
                      value={singleForm.facultyId}
                      onChange={(e) => setSingleForm({ ...singleForm, facultyId: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:border-indigo-400 focus:outline-none"
                    >
                      <option value="">Select Faculty...</option>
                      <option value="f1">Faculty of Computer Science</option>
                      <option value="f2">Faculty of Business & Economics</option>
                    </select>
                  </div>
                )}

                {(singleForm.type === 'subject' || singleForm.type === 'lesson') && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Parent Major</label>
                    <select
                      value={singleForm.majorId}
                      onChange={(e) => setSingleForm({ ...singleForm, majorId: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:border-indigo-400 focus:outline-none"
                    >
                      <option value="">Select Major...</option>
                      <option value="m1">Software Engineering</option>
                      <option value="m2">Artificial Intelligence</option>
                    </select>
                  </div>
                )}

                {singleForm.type === 'lesson' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Parent Subject / Category</label>
                    <select
                      value={singleForm.categoryId}
                      onChange={(e) => setSingleForm({ ...singleForm, categoryId: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:border-indigo-400 focus:outline-none"
                    >
                      <option value="">Select Subject...</option>
                      <option value="c1">CS101: Data Structures</option>
                      <option value="c2">CS102: Web Architecture</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Title / Name</label>
                <input
                  type="text"
                  required
                  value={singleForm.name}
                  onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                  placeholder={`e.g. ${singleForm.type === 'faculty' ? 'Faculty of Science' : singleForm.type === 'lesson' ? 'Lesson 01: Introduction' : 'Object-Oriented Programming'}`}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={singleForm.description}
                  onChange={(e) => setSingleForm({ ...singleForm, description: e.target.value })}
                  placeholder="Summary or syllabus overview..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Create {singleForm.type.toUpperCase()}</span>
            </button>
          </form>

          {/* Tips Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-300 w-fit rounded-2xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Hierarchy Guidelines</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Maintain clean structural nesting: <strong className="text-indigo-300">Faculty</strong> → <strong className="text-indigo-300">Major</strong> → <strong className="text-indigo-300">Subject</strong> → <strong className="text-indigo-300">Lesson</strong>.
              </p>
              <div className="pt-2 text-[11px] text-slate-400 space-y-2">
                <p>• Approved lessons unlock public material uploads for teachers.</p>
                <p>• Deleting a parent faculty safely archives nested majors.</p>
              </div>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-slate-300">
              Need to add multiple modules at once? Switch to the <strong>Bulk Generator</strong> tab.
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: BULK CREATION GENERATOR */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'bulk' && (
        <form onSubmit={handleBulkSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 max-w-3xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">Bulk Batch Creation</h2>
            <p className="text-xs text-slate-500 mt-0.5">Paste multiple titles to create faculties, majors, subjects, or lessons in bulk.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Type</label>
              <select
                value={bulkForm.type}
                onChange={(e) => setBulkForm({ ...bulkForm, type: e.target.value })}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:border-indigo-400 focus:outline-none"
              >
                <option value="faculty">Faculties</option>
                <option value="major">Majors</option>
                <option value="subject">Subjects</option>
                <option value="lesson">Lessons</option>
              </select>
            </div>

            {bulkForm.type !== 'faculty' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Subject / Parent</label>
                <select
                  value={bulkForm.categoryId}
                  onChange={(e) => setBulkForm({ ...bulkForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:border-indigo-400 focus:outline-none"
                >
                  <option value="">Select Parent Subject...</option>
                  <option value="c1">CS101: Data Structures</option>
                  <option value="c2">CS102: Web Development</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Batch Titles (One per line)
            </label>
            <textarea
              rows={8}
              required
              value={bulkForm.rawInput}
              onChange={(e) => setBulkForm({ ...bulkForm, rawInput: e.target.value })}
              placeholder={`Lesson 01: Environment Setup\nLesson 02: Core Variables & Types\nLesson 03: Control Structures\nLesson 04: Functional Concepts`}
              className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-400 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Line Count: <strong>{bulkForm.rawInput.split('\n').filter((l) => l.trim()).length} items</strong>
            </span>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              <span>Execute Bulk Import</span>
            </button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: TEACHER ASSIGNMENT SYSTEM */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Search & Target Selector */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assign Teacher Permissions</h2>
              <p className="text-xs text-slate-500 mt-0.5">Search for an instructor by email to manage their management scope.</p>
            </div>

            {/* Teacher Search Input */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Find Teacher by Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={handleTeacherSearch}
                  placeholder="Type teacher email (e.g. alex.smith@university.edu)..."
                  className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-400 focus:outline-none"
                />
                {searchingTeacher && <Loader2 className="w-4 h-4 animate-spin text-indigo-600 absolute right-3.5 top-3.5" />}
              </div>

              {/* Search Dropdown Results */}
              {teacherResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden divide-y divide-slate-100">
                  {teacherResults.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTeacher(t)}
                      className="p-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{t.name}</p>
                        <p className="text-[10px] text-slate-500">{t.email}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{t.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Teacher Assignment Panel */}
            {selectedTeacher ? (
              <form onSubmit={handleAssignTeacher} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{selectedTeacher.name}</h3>
                      <p className="text-[10px] text-slate-500">{selectedTeacher.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTeacher(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Scope Level</label>
                    <select
                      value={assignmentScope}
                      onChange={(e) => setAssignmentScope(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
                    >
                      <option value="faculty">Faculty-wide Scope</option>
                      <option value="major">Major Scope</option>
                      <option value="subject">Subject / Category Scope</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Entity</label>
                    <select
                      required
                      value={targetScopeId}
                      onChange={(e) => setTargetScopeId(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
                    >
                      <option value="">Select target...</option>
                      <option value="scope-1">Computer Science Department</option>
                      <option value="scope-2">Software Engineering Major</option>
                      <option value="scope-3">CS101: Data Structures</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" /> Grant Management Scope
                </button>
              </form>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-500">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Select a teacher from the email search box above to view or edit their assignments.
              </div>
            )}
          </div>

          {/* Assigned Scope Summary Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Active Assignments</h3>

            {!selectedTeacher ? (
              <p className="text-xs text-slate-400">No teacher selected.</p>
            ) : assignedScopes.length === 0 ? (
              <p className="text-xs text-slate-400">This teacher currently has no assigned scopes.</p>
            ) : (
              <div className="space-y-2">
                {assignedScopes.map((scope) => (
                  <div key={scope.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{scope.name}</p>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {scope.type}
                      </span>
                    </div>

                    <button
                      onClick={() => handleUnassignScope(scope.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Revoke scope assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}