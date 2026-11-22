export const STORAGE_KEY = 'lingoquest-save-v1';

export const MODES = [
  {
    id: 'explore',
    title: '轻松探索',
    description: '从打招呼开始，用短任务认识英语。',
    audience: '想从第一句开始，或希望有人带着练习',
    scale: 1,
    speechRate: 0.85,
    recommendedZones: ['hello', 'daily', 'story', 'travel', 'study', 'work'],
  },
  {
    id: 'interest',
    title: '兴趣冒险',
    description: '从故事和喜欢的事物出发，边玩边表达。',
    audience: '喜欢故事、游戏和探索新内容',
    scale: 1,
    speechRate: 0.9,
    recommendedZones: ['story', 'daily', 'hello', 'travel', 'study', 'work'],
  },
  {
    id: 'practical',
    title: '生活实用',
    description: '练习点餐、出行、学习和工作中用得到的话。',
    audience: '希望尽快在真实生活中用上英语',
    scale: 1,
    speechRate: 0.9,
    recommendedZones: ['daily', 'travel', 'work', 'study', 'hello', 'story'],
  },
];

export const LEVELS = [
  { id: 'starter', title: '从第一句开始', description: '先学简短常用句，提示会陪你完成任务。' },
  { id: 'basic', title: '已经会一点', description: '每个区域可从第二关开始，也能回头练习。' },
  { id: 'stretch', title: '想多说一点', description: '每个区域可从第三关开始，练习更完整的表达。' },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_INTERVALS = [1, 3, 7, 14];
const MAX_TIMESTAMP = 8.64e15 - 14 * DAY_MS;
const reviewDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
});

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isTimestamp = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_TIMESTAMP;
const safeId = value => typeof value === 'string' && value.length > 0 && value.length <= 160
  && !['__proto__', 'prototype', 'constructor'].includes(value);
const count = value => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(10000, Math.floor(value))) : 0;
const clockTime = value => isTimestamp(value) ? value : Date.now();
const dayOf = time => reviewDayFormatter.format(new Date(time));
const starsOf = record => Math.max(1, Math.min(3, Math.max(count(record?.stars), count(record?.bestStars))));
const zoneOf = lesson => lesson?.zoneId ?? lesson?.zone;

export function createSave(now = Date.now()) {
  return {
    version: 1,
    profile: { mode: 'explore', level: 'starter', sound: true },
    completed: {},
    reviews: {},
    recentLessonId: null,
  };
}

/** Copy only known fields so malformed or obsolete local saves remain usable. */
export function sanitizeSave(value, lessonIds = []) {
  const clean = createSave();
  if (!isRecord(value)) return clean;

  const allowed = Array.isArray(lessonIds) && lessonIds.length > 0
    ? new Set(lessonIds.filter(safeId)) : null;
  const knownId = id => safeId(id) && (!allowed || allowed.has(id));
  const profile = isRecord(value.profile) ? value.profile : {};
  clean.profile.mode = MODES.some(mode => mode.id === profile.mode) ? profile.mode : 'explore';
  clean.profile.level = LEVELS.some(level => level.id === profile.level) ? profile.level : 'starter';
  clean.profile.sound = typeof profile.sound === 'boolean' ? profile.sound : true;

  if (isRecord(value.completed)) {
    for (const [id, completed] of Object.entries(value.completed)) {
      if (!knownId(id) || !isRecord(completed) || !isTimestamp(completed.completedAt)) continue;
      const stars = starsOf(completed);
      clean.completed[id] = {
        stars,
        bestStars: stars,
        completedAt: completed.completedAt,
        lastPlayedAt: isTimestamp(completed.lastPlayedAt)
          ? Math.max(completed.completedAt, completed.lastPlayedAt) : completed.completedAt,
      };
    }
  }

  const reviews = isRecord(value.reviews) ? value.reviews : {};
  for (const [id, completed] of Object.entries(clean.completed)) {
    const review = own(reviews, id) && isRecord(reviews[id]) ? reviews[id] : {};
    clean.reviews[id] = {
      dueAt: isTimestamp(review.dueAt) ? review.dueAt : completed.completedAt + DAY_MS,
      intervalDays: REVIEW_INTERVALS.includes(review.intervalDays) ? review.intervalDays : 1,
      successfulReviews: count(review.successfulReviews),
      lastReviewedAt: isTimestamp(review.lastReviewedAt) ? review.lastReviewedAt : null,
    };
  }

  clean.recentLessonId = knownId(value.recentLessonId) ? value.recentLessonId : null;
  return clean;
}

export function isLessonUnlocked(lesson, allLessons, save) {
  if (!lesson || !safeId(lesson.id)) return false;
  if (isRecord(save?.completed) && own(save.completed, lesson.id)) return true;
  const order = Number.isInteger(lesson.order) && lesson.order >= 0 ? lesson.order : 0;
  const startOrder = save?.profile?.level === 'stretch' ? 2 : save?.profile?.level === 'basic' ? 1 : 0;
  if (order <= startOrder) return true;

  const previous = Array.isArray(allLessons) ? allLessons.find(candidate => (
    zoneOf(candidate) === zoneOf(lesson) && candidate.order === order - 1
  )) : null;
  return Boolean(previous && isRecord(save?.completed) && own(save.completed, previous.id));
}

/** Hints reduce this round's stars, but every completed round earns at least one. */
export function getLessonStars(session = {}) {
  return Math.max(1, 3 - Math.min(2, count(session?.errors) + count(session?.hints)));
}

/** Replays can improve best stars; the original completion and review dates stay intact. */
export function completeLesson(save, lesson, session = {}, now = Date.now()) {
  const next = sanitizeSave(save);
  if (!lesson || !safeId(lesson.id)) return next;
  const time = clockTime(now);
  const previous = own(next.completed, lesson.id) ? next.completed[lesson.id] : null;
  const stars = Math.max(getLessonStars(session), previous?.stars ?? 0);
  next.completed[lesson.id] = {
    stars,
    bestStars: stars,
    completedAt: previous?.completedAt ?? time,
    lastPlayedAt: Math.max(time, previous?.lastPlayedAt ?? time),
  };
  if (!own(next.reviews, lesson.id)) {
    next.reviews[lesson.id] = {
      dueAt: time + DAY_MS,
      intervalDays: 1,
      successfulReviews: 0,
      lastReviewedAt: null,
    };
  }
  next.recentLessonId = lesson.id;
  return next;
}

/** One scheduled review per calendar day; same-day retries do not inflate progress. */
export function recordReview(save, lessonId, recalled, now = Date.now()) {
  const next = sanitizeSave(save);
  if (!safeId(lessonId) || !own(next.completed, lessonId)) return next;
  const time = clockTime(now);
  const previous = next.reviews[lessonId];
  next.recentLessonId = lessonId;
  if (isTimestamp(previous.lastReviewedAt) && (
    time <= previous.lastReviewedAt || dayOf(time) === dayOf(previous.lastReviewedAt)
  )) return next;

  // Early practice is welcome, but a successful practice is not another spaced review.
  if (recalled === true && time < previous.dueAt) return next;

  const successfulReviews = previous.successfulReviews + (recalled === true ? 1 : 0);
  const intervalDays = recalled === true
    ? REVIEW_INTERVALS[Math.min(successfulReviews - 1, REVIEW_INTERVALS.length - 1)] : 1;
  next.reviews[lessonId] = {
    dueAt: time + intervalDays * DAY_MS,
    intervalDays,
    successfulReviews,
    lastReviewedAt: time,
  };
  next.completed[lessonId].lastPlayedAt = Math.max(next.completed[lessonId].lastPlayedAt, time);
  return next;
}

export function getDueReviews(save, now = Date.now()) {
  const time = clockTime(now);
  const reviews = isRecord(save?.reviews) ? save.reviews : {};
  const completed = isRecord(save?.completed) ? save.completed : {};
  return Object.entries(reviews)
    .filter(([id, review]) => safeId(id) && own(completed, id)
      && isRecord(review) && isTimestamp(review.dueAt) && review.dueAt <= time)
    .sort(([leftId, left], [rightId, right]) => left.dueAt - right.dueAt || leftId.localeCompare(rightId))
    .map(([id]) => id);
}

/** Keep word boundaries: "can not" must not collapse into "cannot". */
export function normalizeAnswer(answer) {
  if (typeof answer !== 'string') return '';
  return answer.normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘ʼ＇`´]/gu, "'")
    .replace(/([\p{L}\p{M}\p{N}])'(?=[\p{L}\p{M}\p{N}])/gu, '$1')
    .replace(/\p{P}+/gu, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** This local matcher recognizes listed phrases; it does not judge every natural wording. */
export function evaluateRecall(answer, step = {}) {
  const accepted = Array.isArray(step?.accepted) ? step.accepted.filter(item => typeof item === 'string')
    : typeof step?.accepted === 'string' ? [step.accepted] : [];
  const reference = [step?.reference, step?.answer, step?.modelAnswer, accepted[0]]
    .find(item => typeof item === 'string' && item.trim()) ?? '';
  const normalized = normalizeAnswer(answer);
  if (!normalized) {
    return { status: 'empty', message: '先试着说或写一句英语，也可以查看提示。', reference };
  }
  const recognized = [...accepted, reference].map(normalizeAnswer).filter(Boolean);
  if (recognized.includes(normalized)) {
    return { status: 'correct', message: '这句话可以这样说，任务完成！', reference };
  }
  return {
    status: 'close',
    message: '可能有其他说法，先对照参考句，再试一次。',
    reference,
  };
}
