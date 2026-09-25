import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Award, CheckCircle2, Loader2, Send, XCircle } from 'lucide-react';

import { quizService } from '../../services/quizService';
import { formatDate, formatScore, getApiError } from '../../utils/quizUtils';

const draftKey = (attemptId) => `quiz-draft:${attemptId}`;

function validAnswers(quiz, candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {};

  return Object.fromEntries(
    (quiz.questions || [])
      .filter((q) => q.choices.some((c) => c.choice_id === candidate[q.question_id]))
      .map((q) => [q.question_id, candidate[q.question_id]])
  );
}

function restoreAnswers(attempt) {
  let draft = {};
  if (attempt.status === 'in_progress') {
    try {
      const stored = JSON.parse(sessionStorage.getItem(draftKey(attempt.attempt_id)) || '{}');
      draft = validAnswers(attempt.quiz, stored);
    } catch {}
  }
  return validAnswers(attempt.quiz, { ...(attempt.answers || {}), ...draft });
}

function removeDraft(attemptId) {
  try {
    sessionStorage.removeItem(draftKey(attemptId));
  } catch {}
}

export default function QuizTaking() {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const attemptId = searchParams.get('attempt');

  const submissionLock = useRef(false);

  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draftWarning, setDraftWarning] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAttempt() {
      setLoading(true);
      setError('');
      setAttempt(null);
      setAnswers({});
      setDraftWarning('');

      try {
        // 1. If we have an attempt ID, fetch the attempt detail first
        const data = attemptId
          ? await quizService.getAttemptDetail(attemptId)
          : await quizService.startAttempt(lessonId);

        if (!active) return;

        // 2. If the attempt belongs to a different lesson than the URL path, 
        // redirect the browser to the correct lesson URL automatically!
        if (attemptId && String(data.lesson_id).toLowerCase() !== String(lessonId).toLowerCase()) {
          navigate(`/student/quiz/${data.lesson_id}?attempt=${attemptId}`, { replace: true });
          return;
        }

        if (!data.quiz?.questions?.length) {
          setError('This attempt does not contain any questions.');
          return;
        }

        if (!attemptId) {
          setSearchParams({ attempt: data.attempt_id }, { replace: true });
        }

        setAttempt(data);
        setAnswers(restoreAnswers(data));

        if (data.status === 'submitted') {
          removeDraft(data.attempt_id);
        }
      } catch (err) {
        if (active) setError(getApiError(err, 'Unable to load this quiz attempt.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAttempt();
    return () => { active = false; };
  }, [lessonId, attemptId, retryKey, setSearchParams, navigate]);
  
  const quiz = attempt?.quiz;
  const submitted = attempt?.status === 'submitted';
  const questions = quiz?.questions || [];

  const answeredCount = questions.filter((q) =>
    q.choices.some((c) => c.choice_id === answers[q.question_id])
  ).length;

  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  function selectAnswer(questionId, choiceId) {
    if (!attempt || submitted || submitting || submissionLock.current) return;

    const nextAnswers = { ...answers, [questionId]: choiceId };
    setAnswers(nextAnswers);

    try {
      sessionStorage.setItem(draftKey(attempt.attempt_id), JSON.stringify(nextAnswers));
      setDraftWarning('');
    } catch {
      setDraftWarning('Your browser could not save this draft. Keep this page open until you submit.');
    }
  }

  function applySubmittedAttempt(data) {
    setAttempt(data);
    setAnswers(validAnswers(data.quiz, data.answers));
    removeDraft(data.attempt_id);
    setDraftWarning('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!attempt || submitted || submissionLock.current) return;

    const unanswered = questions.filter((q) => !q.choices.some((c) => c.choice_id === answers[q.question_id]));

    if (unanswered.length) {
      setError(`Please answer all questions. ${unanswered.length} remaining.`);
      document.getElementById(`question-${unanswered[0].question_id}`)?.focus();
      return;
    }

    if (!window.confirm('Submit your answers? You cannot change them afterward.')) return;

    submissionLock.current = true;
    setSubmitting(true);
    setError('');

    try {
      const payload = questions.map((q) => ({
        question_id: q.question_id,
        choice_id: answers[q.question_id],
      }));

      const data = await quizService.submitAttempt(attempt.attempt_id, payload);
      applySubmittedAttempt(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(getApiError(err, 'Submission could not be confirmed.'));
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading quiz attempt…
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6">
        <p role="alert" className="text-sm text-rose-700">{error || 'Preparing your attempt…'}</p>
        <div className="mt-4 flex gap-4">
          <button type="button" onClick={() => setRetryKey((v) => v + 1)} className="text-sm font-bold text-primary">Retry</button>
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-slate-600">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-primary">Version {quiz.version}</span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{quiz.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{questions.length} questions · Pass: {quiz.pass_percentage}%</p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {submitted ? 'Submitted attempt' : 'In progress'}
          </span>
        </div>

        {!submitted && (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-slate-500">
              <span>{answeredCount} of {questions.length} answered</span>
              <span>{progress}%</span>
            </div>
            <progress value={answeredCount} max={questions.length} className="h-2 w-full accent-primary" />
          </div>
        )}
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {submitted && (
        <section className={`rounded-2xl border p-6 ${attempt.passed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            <h2 className="text-lg font-bold">{attempt.passed ? 'Passed' : 'Not passed'} · {formatScore(attempt.score_percentage)}</h2>
          </div>
          <p className="mt-2 text-sm">{attempt.correct_answers} of {attempt.total_questions} answers correct.</p>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {questions.map((question, questionIndex) => (
          <fieldset key={question.question_id} disabled={submitted || submitting} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <legend className="max-w-full px-2 text-sm font-semibold text-slate-900">
              <span className="mr-2 text-primary">{questionIndex + 1}.</span> {question.text}
            </legend>
            <div className="mt-2 space-y-3">
              {question.choices.map((choice) => {
                const selected = answers[question.question_id] === choice.choice_id;
                const correct = submitted && choice.is_correct;
                const wrong = submitted && selected && !choice.is_correct;
                return (
                  <label key={choice.choice_id} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${correct ? 'border-emerald-300 bg-emerald-50' : wrong ? 'border-rose-300 bg-rose-50' : selected ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
                    <input type="radio" name={`q-${question.question_id}`} checked={selected} onChange={() => selectAnswer(question.question_id, choice.choice_id)} className="mt-1 shrink-0 accent-primary" />
                    <span className="min-w-0 flex-1">{choice.text}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="flex justify-between">
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Back</button>
          {!submitted && (
            <button type="submit" disabled={submitting} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit assessment'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}