export function getApiError(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data;

  if (!data) return fallback;

  function flatten(value, path = '') {
    if (typeof value === 'string') {
      return [path ? `${path}: ${value}` : value];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item, index) =>
        flatten(
          item,
          typeof item === 'object' && item !== null
            ? `${path}[${index + 1}]`
            : path
        )
      );
    }

    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([key, item]) =>
        flatten(
          item,
          key === 'detail' || key === 'non_field_errors'
            ? path
            : path
              ? `${path}.${key}`
              : key
        )
      );
    }

    return [];
  }

  return flatten(data).join(' ') || fallback;
}

export function normalizePage(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      count: data.length,
      next: null,
      previous: null,
    };
  }

  return {
    items: Array.isArray(data?.results) ? data.results : [],
    count: data?.count ?? null,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  };
}

// Follow pagination query parameters without changing the API endpoint.
export function paginationParams(url) {
  if (!url) return {};

  return Object.fromEntries(
    new URL(url, window.location.origin).searchParams.entries()
  );
}

export function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString();
}

export function formatScore(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const score = Number(value);

  return Number.isFinite(score)
    ? `${score.toFixed(2)}%`
    : '—';
}

export function getQuizAvailability(quiz) {
  // Older student serializers do not provide scheduling fields.
  if (
    !Object.prototype.hasOwnProperty.call(quiz, 'available_from') ||
    !Object.prototype.hasOwnProperty.call(quiz, 'available_until')
  ) {
    return 'Check availability';
  }

  const now = Date.now();

  if (quiz.available_from && now < Date.parse(quiz.available_from)) {
    return 'Upcoming';
  }

  if (quiz.available_until && now >= Date.parse(quiz.available_until)) {
    return 'Closed';
  }

  return 'Open';
}

// Convert a server timestamp to the browser's local datetime-local format.
export function toLocalDateTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (number) => String(number).padStart(2, '0');

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join('T');
}

// datetime-local represents local browser time; send an explicit UTC timestamp.
export function toApiDateTime(value) {
  return value ? new Date(value).toISOString() : null;
}