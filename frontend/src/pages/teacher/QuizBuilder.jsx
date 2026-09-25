import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileQuestion,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';

import curriculumService from '../../services/curriculumService';
import { quizService } from '../../services/quizService';

const MAX_QUESTIONS = 50;
const MIN_CHOICES = 2;
const MAX_CHOICES = 6;

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60';

const LABEL_CLASS =
  'mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600';

function createKey() {
  return crypto.randomUUID();
}

function createEmptyChoice(isCorrect = false) {
  return {
    editorKey: createKey(),
    text: '',
    is_correct: isCorrect,
  };
}

function createEmptyQuestion() {
  return {
    editorKey: createKey(),
    text: '',
    explanation: '',
    choices: [createEmptyChoice(true), createEmptyChoice(false)],
  };
}

function createEmptyForm() {
  return {
    title: '',
    passPercentage: 60,
    availableFrom: '',
    availableUntil: '',
    questions: [createEmptyQuestion()],
  };
}

function getErrorMessage(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data;
  if (!data) return fallback;

  function flatten(value, path = '') {
    if (typeof value === 'string') return [path ? `${path}: ${value}` : value];
    if (Array.isArray(value)) {
      return value.flatMap((item, index) =>
        flatten(item, item && typeof item === 'object' ? `${path}[${index + 1}]` : path)
      );
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([key, item]) => {
        const nextPath =
          key === 'detail' || key === 'non_field_errors' ? path : path ? `${path}.${key}` : key;
        return flatten(item, nextPath);
      });
    }
    return [];
  }

  return flatten(data).join(' ') || fallback;
}

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function toApiDateTime(value) {
  return value ? new Date(value).toISOString() : null;
}

function quizToForm(quiz) {
  return {
    title: quiz.title || '',
    passPercentage: quiz.pass_percentage ?? 60,
    availableFrom: toLocalDateTime(quiz.available_from),
    availableUntil: toLocalDateTime(quiz.available_until),
    questions: quiz.questions?.length
      ? quiz.questions.map((question) => ({
          editorKey: createKey(),
          text: question.text || '',
          explanation: question.explanation || '',
          choices: (question.choices || []).map((choice) => ({
            editorKey: createKey(),
            text: choice.text || '',
            is_correct: Boolean(choice.is_correct),
          })),
        }))
      : [createEmptyQuestion()],
  };
}

function validateForm(form) {
  if (!form.title.trim()) return 'Please enter a quiz title.';
  if (form.title.trim().length > 255) return 'The quiz title cannot exceed 255 characters.';

  const percentage = Number(form.passPercentage);
  if (
    String(form.passPercentage).trim() === '' ||
    !Number.isInteger(percentage) ||
    percentage < 0 ||
    percentage > 100
  ) {
    return 'Passing score must be a whole number between 0 and 100.';
  }

  const openingTime = form.availableFrom ? new Date(form.availableFrom).getTime() : null;
  const closingTime = form.availableUntil ? new Date(form.availableUntil).getTime() : null;

  if (openingTime !== null && !Number.isFinite(openingTime)) return 'Please enter a valid opening time.';
  if (closingTime !== null && !Number.isFinite(closingTime)) return 'Please enter a valid closing time.';
  if (openingTime !== null && closingTime !== null && openingTime >= closingTime) {
    return 'The closing time must be later than the opening time.';
  }

  if (form.questions.length < 1 || form.questions.length > MAX_QUESTIONS) {
    return `A quiz must contain between 1 and ${MAX_QUESTIONS} questions.`;
  }

  for (let index = 0; index < form.questions.length; index += 1) {
    const question = form.questions[index];
    const number = index + 1;

    if (!question.text.trim()) return `Question ${number} needs question text.`;
    if (question.text.trim().length > 5000) return `Question ${number} cannot exceed 5000 characters.`;
    if (question.explanation.trim().length > 10000) return `The explanation for question ${number} cannot exceed 10000 characters.`;

    if (question.choices.length < MIN_CHOICES || question.choices.length > MAX_CHOICES) {
      return `Question ${number} must have between ${MIN_CHOICES} and ${MAX_CHOICES} choices.`;
    }

    if (question.choices.some((choice) => !choice.text.trim())) {
      return `Every choice in question ${number} must contain text.`;
    }

    const correctCount = question.choices.filter((choice) => choice.is_correct).length;
    if (correctCount !== 1) return `Question ${number} must have exactly one correct answer.`;

    const texts = question.choices.map((choice) => choice.text.trim().toLowerCase());
    if (new Set(texts).size !== texts.length) {
      return `Choices in question ${number} must have different text.`;
    }
  }

  return '';
}

export default function QuizBuilder() {
  const navigate = useNavigate();
  const saveLock = useRef(false);

  // Cascading Selection State
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [loadedLessonId, setLoadedLessonId] = useState('');

  const [form, setForm] = useState(createEmptyForm);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [quizEnabled, setQuizEnabled] = useState(false);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [lessonsError, setLessonsError] = useState('');
  const [quizLoadError, setQuizLoadError] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [categoriesReloadKey, setCategoriesReloadKey] = useState(0);
  const [quizReloadKey, setQuizReloadKey] = useState(0);
  const [dirty, setDirty] = useState(false);

  const selectedLessonObject = lessons.find((l) => l.lesson_id === selectedLesson);
  const isLessonApproved = selectedLessonObject?.status === 'approved';

  const ready =
    Boolean(selectedLesson) &&
    isLessonApproved &&
    loadedLessonId === selectedLesson &&
    !loadingQuiz &&
    !loadingLessons;

  const editorDisabled = !ready || submitting;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local timezone';

  // 1. Load assigned categories/subjects
  useEffect(() => {
    let active = true;

    async function loadCategories() {
      setLoadingCategories(true);
      setLessonsError('');
      try {
        const res = await curriculumService.getMyCategories();
        if (active) {
          const payload = res?.data ?? res;
          setCategories(Array.isArray(payload) ? payload : payload?.results || []);
        }
      } catch (err) {
        if (active) setLessonsError(getErrorMessage(err, 'Failed to load assigned subjects.'));
      } finally {
        if (active) setLoadingCategories(false);
      }
    }

    loadCategories();
    return () => { active = false; };
  }, [categoriesReloadKey]);

  // Handle Category Change -> Fetch Lessons for Subject
  const handleCategoryChange = async (e) => {
    const categoryId = e.target.value;
    if (dirty && !window.confirm('Switch subject? Your unsaved quiz changes will be discarded.')) return;

    setSelectedCategory(categoryId);
    setSelectedLesson('');
    setLessons([]);
    resetQuizState();

    if (!categoryId) return;

    try {
      setLoadingLessons(true);
      const res = await curriculumService.getLessons({ category: categoryId });
      const rawLessons = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : (res?.results || []);
      setLessons(rawLessons);
    } catch (err) {
      setLessonsError(getErrorMessage(err, 'Failed to load lessons for this subject.'));
    } finally {
      setLoadingLessons(false);
    }
  };

  // Handle Lesson Change
  const handleLessonChange = (e) => {
    const lessonId = e.target.value;
    if (dirty && !window.confirm('Switch lesson? Your unsaved quiz changes will be discarded.')) return;
    setSelectedLesson(lessonId);
  };

  function resetQuizState() {
    setLoadedLessonId('');
    setForm(createEmptyForm());
    setCurrentVersion(null);
    setQuizEnabled(false);
    setQuizLoadError('');
    setError('');
    setSuccessMessage('');
    setDirty(false);
  }

  // 2. Load existing quiz for selected APPROVED lesson
  useEffect(() => {
    let active = true;

    async function loadQuiz() {
      resetQuizState();

      if (!selectedLesson || !isLessonApproved) {
        setLoadingQuiz(false);
        return;
      }

      setLoadingQuiz(true);

      try {
        const quiz = await quizService.getTeacherQuiz(selectedLesson);
        if (!active) return;

        setForm(quizToForm(quiz));
        setCurrentVersion(quiz.version);
        setQuizEnabled(Boolean(quiz.is_enabled));
        setLoadedLessonId(selectedLesson);
      } catch (err) {
        if (!active) return;
        if (err.response?.status === 404) {
          setLoadedLessonId(selectedLesson);
        } else {
          setQuizLoadError(getErrorMessage(err, 'Failed to load the existing quiz.'));
        }
      } finally {
        if (active) setLoadingQuiz(false);
      }
    }

    loadQuiz();
    return () => { active = false; };
  }, [selectedLesson, isLessonApproved, quizReloadKey]);

  useEffect(() => {
    if (!dirty && !submitting) return undefined;
    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty, submitting]);

  function markChanged() {
    setDirty(true);
    setError('');
    setSuccessMessage('');
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    markChanged();
  }

  function updateQuestion(questionKey, updates) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((q) => (q.editorKey === questionKey ? { ...q, ...updates } : q)),
    }));
    markChanged();
  }

  function updateChoice(questionKey, choiceKey, text) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((q) =>
        q.editorKey === questionKey
          ? {
              ...q,
              choices: q.choices.map((c) => (c.editorKey === choiceKey ? { ...c, text } : c)),
            }
          : q
      ),
    }));
    markChanged();
  }

  function selectCorrectChoice(questionKey, choiceKey) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((q) =>
        q.editorKey === questionKey
          ? {
              ...q,
              choices: q.choices.map((c) => ({ ...c, is_correct: c.editorKey === choiceKey })),
            }
          : q
      ),
    }));
    markChanged();
  }

  function addQuestion() {
    if (form.questions.length >= MAX_QUESTIONS) return;
    setForm((current) => ({ ...current, questions: [...current.questions, createEmptyQuestion()] }));
    markChanged();
  }

  function removeQuestion(questionKey) {
    if (form.questions.length <= 1) return;
    if (!window.confirm('Remove this question and its choices?')) return;
    setForm((current) => ({ ...current, questions: current.questions.filter((q) => q.editorKey !== questionKey) }));
    markChanged();
  }

  function addChoice(questionKey) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((q) => {
        if (q.editorKey !== questionKey || q.choices.length >= MAX_CHOICES) return q;
        return { ...q, choices: [...q.choices, createEmptyChoice()] };
      }),
    }));
    markChanged();
  }

  function removeChoice(questionKey, choiceKey) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((q) => {
        if (q.editorKey !== questionKey || q.choices.length <= MIN_CHOICES) return q;
        const removedChoice = q.choices.find((c) => c.editorKey === choiceKey);
        let nextChoices = q.choices.filter((c) => c.editorKey !== choiceKey);
        if (removedChoice?.is_correct) {
          nextChoices = nextChoices.map((c, index) => ({ ...c, is_correct: index === 0 }));
        }
        return { ...q, choices: nextChoices };
      }),
    }));
    markChanged();
  }

  function reloadQuiz() {
    if (dirty && !window.confirm('Reload the saved quiz? Your unsaved changes will be discarded.')) return;
    setQuizReloadKey((v) => v + 1);
  }

  function goBack() {
    if (submitting) return;
    if (dirty && !window.confirm('Leave this page and discard your unsaved changes?')) return;
    navigate('/teacher/dashboard');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saveLock.current || submitting) return;

    if (!ready) {
      setError('Select an approved lesson and wait for its quiz details to load.');
      return;
    }

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      setSuccessMessage('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentVersion !== null && !window.confirm('Save a new quiz version?')) return;

    saveLock.current = true;
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        title: form.title.trim(),
        pass_percentage: Number(form.passPercentage),
        available_from: toApiDateTime(form.availableFrom),
        available_until: toApiDateTime(form.availableUntil),
        questions: form.questions.map((q) => ({
          text: q.text.trim(),
          explanation: q.explanation.trim(),
          choices: q.choices.map((c) => ({
            text: c.text.trim(),
            is_correct: Boolean(c.is_correct),
          })),
        })),
      };

      const savedQuiz = await quizService.saveTeacherQuiz(selectedLesson, payload);

      setForm(quizToForm(savedQuiz));
      setCurrentVersion(savedQuiz.version);
      setQuizEnabled(Boolean(savedQuiz.is_enabled));
      setDirty(false);
      setSuccessMessage(`Quiz version ${savedQuiz.version} saved successfully.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save quiz.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      saveLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={submitting}
            aria-label="Back to teacher dashboard"
            className="mt-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              Teacher workspace
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Quiz Builder</h1>
            <p className="mt-1 text-sm text-slate-500">Create and schedule assessments for curriculum lessons.</p>
          </div>
        </div>

        {dirty && (
          <span className="self-start rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Unsaved changes
          </span>
        )}
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="break-words">{error}</p>
        </div>
      )}

      {successMessage && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Subject & Lesson Cascading Selection */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="subject" className={LABEL_CLASS}>Subject / Category</label>
              <div className="relative">
                <select
                  id="subject"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  disabled={loadingCategories || submitting}
                  className={`${INPUT_CLASS} appearance-none pr-10`}
                >
                  <option value="">
                    {loadingCategories ? 'Loading subjects…' : 'Select a subject'}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="lesson" className={LABEL_CLASS}>Target Lesson</label>
              <div className="relative">
                <select
                  id="lesson"
                  value={selectedLesson}
                  onChange={handleLessonChange}
                  disabled={!selectedCategory || loadingLessons || submitting}
                  className={`${INPUT_CLASS} appearance-none pr-10`}
                >
                  <option value="">
                    {loadingLessons
                      ? 'Loading lessons…'
                      : !selectedCategory
                      ? 'Select subject first'
                      : lessons.length === 0
                      ? 'No lessons found'
                      : 'Select a target lesson'}
                  </option>
                  {lessons.map((lesson) => (
                    <option key={lesson.lesson_id} value={lesson.lesson_id}>
                      {lesson.title} {lesson.status !== 'approved' ? `(${lesson.status.toUpperCase()})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {lessonsError && (
            <div role="alert" className="mt-2 text-xs text-rose-700 flex items-center gap-2">
              <p>{lessonsError}</p>
              <button
                type="button"
                disabled={loadingCategories || submitting}
                onClick={() => setCategoriesReloadKey((v) => v + 1)}
                className="inline-flex items-center gap-1 font-semibold underline disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          {selectedLessonObject && isLessonApproved && (
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <p>This quiz belongs to <strong className="text-slate-700">{selectedLessonObject.title}</strong>.</p>
            </div>
          )}
        </section>

        {/* Warnings for Missing or Unapproved Lessons */}
        {selectedCategory && !loadingLessons && lessons.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center space-y-2">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <h3 className="text-sm font-bold text-amber-900">No Lessons Created Yet</h3>
            <p className="text-xs text-amber-800 max-w-md mx-auto">
              This subject hasn't been added any lessons yet. Please create and get approval for a lesson before building a quiz.
            </p>
          </div>
        )}

        {selectedLesson && !isLessonApproved && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center space-y-2">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <h3 className="text-sm font-bold text-amber-900">Lesson Awaiting Approval</h3>
            <p className="text-xs text-amber-800 max-w-md mx-auto">
              This lesson hasn't been approved by an administrator yet. Please wait for the lesson to be approved before creating a quiz.
            </p>
          </div>
        )}

        {!selectedLesson && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <FileQuestion className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Select a subject and an approved lesson to create or edit its quiz.</p>
          </div>
        )}

        {loadingQuiz && (
          <div role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-12 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading quiz details…
          </div>
        )}

        {quizLoadError && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <p>{quizLoadError}</p>
            <button type="button" onClick={reloadQuiz} disabled={submitting} className="mt-3 font-bold underline disabled:opacity-50">
              Retry loading quiz
            </button>
          </div>
        )}

        {/* Quiz Builder Editor */}
        {ready && (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-blue-800">
                {currentVersion !== null ? (
                  <>
                    <p className="font-bold">Latest version: v{currentVersion} · {quizEnabled ? 'Enabled' : 'Disabled'}</p>
                    <p className="mt-1 text-xs">Saving creates a new enabled version. Previous attempts remain unchanged.</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold">Create the first quiz version</p>
                    <p className="mt-1 text-xs">Add your questions and schedule, then save the quiz.</p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={reloadQuiz}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reload saved quiz
              </button>
            </div>

            <fieldset disabled={editorDisabled} className="min-w-0 space-y-6">
              <legend className="sr-only">Quiz editor</legend>
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                  <h2 className="font-bold text-slate-900">Quiz information</h2>
                  <p className="mt-1 text-xs text-slate-500">Configure the title, passing score, and availability.</p>
                </div>

                <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label htmlFor="quiz-title" className={LABEL_CLASS}>Quiz title</label>
                    <input
                      id="quiz-title"
                      type="text"
                      maxLength={255}
                      value={form.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="e.g. Introduction to Data Structures Quiz"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="pass-percentage" className={LABEL_CLASS}>Passing score (%)</label>
                    <input
                      id="pass-percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={form.passPercentage}
                      onChange={(e) => updateField('passPercentage', e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-sm font-bold text-slate-800">Availability schedule</h3>
                      <p className="mt-1 text-xs text-slate-500">Times use your browser timezone: {timezone}.</p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="available-from" className={LABEL_CLASS}>Opens at</label>
                          <input
                            id="available-from"
                            type="datetime-local"
                            step="1"
                            value={form.availableFrom}
                            onChange={(e) => updateField('availableFrom', e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label htmlFor="available-until" className={LABEL_CLASS}>Closes at</label>
                          <input
                            id="available-until"
                            type="datetime-local"
                            step="1"
                            value={form.availableUntil}
                            onChange={(e) => updateField('availableUntil', e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Questions section */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">
                  Questions <span className="ml-2 rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-600">{form.questions.length}/{MAX_QUESTIONS}</span>
                </h2>
              </div>

              <div className="space-y-5">
                {form.questions.map((question, questionIndex) => (
                  <section key={question.editorKey} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
                          {questionIndex + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Question {questionIndex + 1}</h3>
                          <p className="text-xs text-slate-500">{question.choices.length} choices</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.editorKey)}
                        disabled={form.questions.length <= 1}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>

                    <div className="space-y-5 p-5 sm:p-6">
                      <div>
                        <label className={LABEL_CLASS}>Question text</label>
                        <textarea
                          rows={3}
                          maxLength={5000}
                          value={question.text}
                          onChange={(e) => updateQuestion(question.editorKey, { text: e.target.value })}
                          placeholder="Write question text..."
                          className={`${INPUT_CLASS} resize-y`}
                        />
                      </div>

                      <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <legend className="px-2 text-sm font-bold text-slate-800">Answer choices</legend>
                        <div className="space-y-3 mt-2">
                          {question.choices.map((choice, choiceIndex) => (
                            <div key={choice.editorKey} className={`flex items-start gap-3 rounded-xl border p-3 ${choice.is_correct ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                              <input
                                type="radio"
                                name={`correct-${question.editorKey}`}
                                checked={choice.is_correct}
                                onChange={() => selectCorrectChoice(question.editorKey, choice.editorKey)}
                                className="mt-3 h-4 w-4 shrink-0 accent-emerald-600"
                              />
                              <input
                                type="text"
                                maxLength={1000}
                                value={choice.text}
                                onChange={(e) => updateChoice(question.editorKey, choice.editorKey, e.target.value)}
                                placeholder={`Choice ${choiceIndex + 1}`}
                                className={`${INPUT_CLASS} bg-white px-3 py-2 flex-1`}
                              />
                              <button
                                type="button"
                                onClick={() => removeChoice(question.editorKey, choice.editorKey)}
                                disabled={question.choices.length <= MIN_CHOICES}
                                className="mt-1 p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addChoice(question.editorKey)}
                          disabled={question.choices.length >= MAX_CHOICES}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" /> Add choice
                        </button>
                      </fieldset>

                      <div>
                        <label className={LABEL_CLASS}>Explanation (Optional)</label>
                        <textarea
                          rows={3}
                          maxLength={10000}
                          value={question.explanation}
                          onChange={(e) => updateQuestion(question.editorKey, { explanation: e.target.value })}
                          placeholder="Explain why the correct answer is right..."
                          className={`${INPUT_CLASS} resize-y`}
                        />
                      </div>
                    </div>
                  </section>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={addQuestion}
                  disabled={form.questions.length >= MAX_QUESTIONS}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add question
                </button>

                <div className="flex gap-3">
                  <button type="button" onClick={goBack} className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{submitting ? 'Saving…' : currentVersion !== null ? 'Save new version' : 'Create quiz'}</span>
                  </button>
                </div>
              </div>
            </fieldset>
          </>
        )}
      </form>
    </div>
  );
}