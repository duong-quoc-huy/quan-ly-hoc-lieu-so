import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

import { quizService } from '../../services/quizService';
import { formatDate, formatScore, getApiError, getQuizAvailability, normalizePage, paginationParams } from '../../utils/quizUtils';

function AttemptStatus({ attempt }) {
  if (attempt.status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
        <Clock className="h-3.5 w-3.5" /> In progress
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${attempt.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
      {attempt.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {attempt.passed ? 'Passed' : 'Failed'}
    </span>
  );
}

export default function QuizzesAndResults() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('available');
  const [pageLink, setPageLink] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const [state, setState] = useState({ loading: true, error: '', page: normalizePage([]) });

  useEffect(() => {
    let active = true;

    async function load() {
      setState({ loading: true, error: '', page: normalizePage([]) });
      try {
        const params = paginationParams(pageLink);
        const data = tab === 'available'
          ? await quizService.getAvailableQuizzes(params)
          : await quizService.getMyAttempts(params);

        if (active) setState({ loading: false, error: '', page: normalizePage(data) });
      } catch (error) {
        if (active) setState({ loading: false, error: getApiError(error, 'Unable to load quizzes.'), page: normalizePage([]) });
      }
    }

    load();
    return () => { active = false; };
  }, [tab, pageLink, retryKey]);

  function openAttempt(attempt) {
    navigate(`/student/quiz/${attempt.lesson_id}?attempt=${encodeURIComponent(attempt.attempt_id)}`);
  }

  const { loading, error, page } = state;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quizzes & Results</h1>
          <p className="mt-1 text-sm text-slate-500">Test your knowledge, resume an attempt, or review your results.</p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          {[['available', 'Available quizzes'], ['history', 'Attempt history']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setTab(val); setPageLink(null); }}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${tab === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      ) : page.items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 font-semibold text-slate-800">No quizzes to display</h2>
        </div>
      ) : tab === 'available' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {page.items.map((quiz) => {
            const availability = getQuizAvailability(quiz);
            const canStart = !['Upcoming', 'Closed'].includes(availability) && quiz.question_count > 0;

            return (
              <article key={quiz.quiz_id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary self-start">Version {quiz.version}</span>
                <h2 className="mt-4 text-base font-bold text-slate-900">{quiz.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{quiz.lesson_title || 'Lesson Assessment'}</p>

                <button
                  disabled={!canStart}
                  onClick={() => navigate(`/student/quiz/${quiz.lesson_id}`)}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  <span>{canStart ? 'Start / resume quiz' : 'Not available'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Quiz</th>
                <th className="px-5 py-4">Score</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {page.items.map((attempt) => (
                <tr key={attempt.attempt_id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-semibold text-slate-900">{attempt.quiz_title}</td>
                  <td className="px-5 py-4 font-semibold">{formatScore(attempt.score_percentage)}</td>
                  <td className="px-5 py-4"><AttemptStatus attempt={attempt} /></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => openAttempt(attempt)} className="rounded-lg px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10">
                      {attempt.status === 'in_progress' ? 'Resume' : 'Review'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}