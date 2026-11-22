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
const dayOf = time => {
  const parts = Object.fromEntries(reviewDayFormatter.formatToParts(new Date(time)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const starsOf = record => Math.max(1, Math.min(3, Math.max(count(record?.stars), count(record?.bestStars))));
const zoneOf = lesson => lesson?.zoneId ?? lesson?.zone;
const orderOf = lesson => Number.isInteger(lesson?.order) && lesson.order >= 0 ? lesson.order : 0;

function validDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function sanitizeDailyPlan(value, knownId, save) {
  if (!isRecord(value) || !validDateKey(value.date) || !isTimestamp(value.createdAt)
    || dayOf(value.createdAt) !== value.date || !Array.isArray(value.tasks)) return null;
  const tasks = [];
  const used = new Set();
  let lessonCount = 0;
  let reviewCount = 0;
  for (const task of value.tasks) {
    if (!isRecord(task) || !knownId(task.lessonId) || !['lesson', 'review'].includes(task.type)
      || !isTimestamp(task.plannedAt) || task.plannedAt < value.createdAt || dayOf(task.plannedAt) !== value.date) continue;
    const completed = save.completed[task.lessonId];
    if (task.type === 'review') {
      const review = save.reviews[task.lessonId];
      const reviewedAfterPlanning = isTimestamp(review?.lastReviewedAt)
        && review.lastReviewedAt >= task.plannedAt && dayOf(review.lastReviewedAt) === value.date;
      if (!completed || !review || (review.dueAt > task.plannedAt && !reviewedAfterPlanning)) continue;
    } else if (task.isReplay === true ? !completed || completed.completedAt > task.plannedAt
      : completed && completed.completedAt < task.plannedAt) continue;
    const id = `${task.type}:${task.lessonId}`;
    if (used.has(id) || (task.type === 'lesson' ? lessonCount >= 1 : reviewCount >= 2)) continue;
    const isReplay = task.type === 'lesson' && task.isReplay === true;
    // Older daily saves did not have a baseline. Preserve later genuine replays,
    // while a completion at the exact planning millisecond is not another replay.
    const baselineCompletedAt = isReplay
      ? isTimestamp(task.baselineCompletedAt) && task.baselineCompletedAt <= completed.lastCompletedAt
        ? task.baselineCompletedAt : Math.min(completed.lastCompletedAt, task.plannedAt)
      : null;
    tasks.push({
      id,
      lessonId: task.lessonId,
      type: task.type,
      isReplay,
      plannedAt: task.plannedAt,
      ...(isReplay ? { baselineCompletedAt } : {}),
    });
    used.add(id);
    if (task.type === 'lesson') lessonCount += 1;
    else reviewCount += 1;
  }
  return { date: value.date, createdAt: value.createdAt, tasks };
}

function uniqueLessons(lessons) {
  const used = new Set();
  return (Array.isArray(lessons) ? lessons : []).filter(lesson => {
    if (!isRecord(lesson) || !safeId(lesson.id) || used.has(lesson.id)) return false;
    used.add(lesson.id);
    return true;
  });
}

function completionTime(task, save, date, now) {
  const completed = save.completed[task.lessonId];
  const time = task.type === 'review' ? save.reviews[task.lessonId]?.lastReviewedAt
    : task.isReplay ? completed?.lastCompletedAt : completed?.completedAt;
  if (task.isReplay && (!isTimestamp(task.baselineCompletedAt) || time <= task.baselineCompletedAt)) return null;
  return isTimestamp(time) && time >= task.plannedAt && time <= now && dayOf(time) === date ? time : null;
}

function recommendedLessons(lessons, save) {
  const selectedMode = MODES.find(mode => mode.id === save.profile.mode) || MODES[0];
  const zones = [...new Set([...selectedMode.recommendedZones, ...lessons.map(zoneOf)])];
  const rank = new Map(zones.map((id, index) => [id, index]));
  return [...lessons].sort((left, right) => rank.get(zoneOf(left)) - rank.get(zoneOf(right))
    || orderOf(left) - orderOf(right) || left.id.localeCompare(right.id));
}

function chooseLesson(lessons, save, preferRecent, reviewIds) {
  const sorted = recommendedLessons(lessons, save);
  const startOrder = save.profile.level === 'stretch' ? 2 : save.profile.level === 'basic' ? 1 : 0;
  const available = sorted.filter(lesson => !own(save.completed, lesson.id)
    && isLessonUnlocked(lesson, lessons, save));
  const preferred = available.filter(lesson => orderOf(lesson) >= startOrder);
  const recent = lessons.find(lesson => lesson.id === save.recentLessonId);
  if (preferRecent && recent) {
    if (available.some(lesson => lesson.id === recent.id)) return { lesson: recent, isReplay: false };
    const nextInZone = preferred.find(lesson => zoneOf(lesson) === zoneOf(recent)
      && orderOf(lesson) > orderOf(recent));
    const sameZone = preferred.find(lesson => zoneOf(lesson) === zoneOf(recent));
    if (nextInZone || sameZone) return { lesson: nextInZone || sameZone, isReplay: false };
  }
  if (available.length) return { lesson: preferred[0] || available[0], isReplay: false };

  // Offer a familiar full lesson only when every known lesson has been completed.
  if (!lessons.length || !lessons.every(lesson => own(save.completed, lesson.id))) return null;
  const withoutReviews = sorted.filter(lesson => !reviewIds.has(lesson.id));
  const pool = withoutReviews.length ? withoutReviews : sorted;
  const replay = (preferRecent && pool.find(lesson => lesson.id === recent?.id))
    || pool.find(lesson => orderOf(lesson) >= startOrder) || pool[0];
  return { lesson: replay, isReplay: true };
}

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
      const lastCompletedAt = isTimestamp(completed.lastCompletedAt)
        ? Math.max(completed.completedAt, completed.lastCompletedAt) : completed.completedAt;
      clean.completed[id] = {
        stars,
        bestStars: stars,
        completedAt: completed.completedAt,
        lastCompletedAt,
        lastPlayedAt: isTimestamp(completed.lastPlayedAt)
          ? Math.max(lastCompletedAt, completed.lastPlayedAt) : lastCompletedAt,
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
  const dailyPlan = sanitizeDailyPlan(value.dailyPlan, knownId, clean);
  if (dailyPlan) clean.dailyPlan = dailyPlan;
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
    lastCompletedAt: Math.max(time, previous?.lastCompletedAt ?? time),
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

/** Keep a gentle daily plan fixed until Shanghai midnight or an explicit preference refresh. */
export function ensureDailyPlan(save, lessons, now = Date.now(), options = {}) {
  const time = clockTime(now);
  const date = dayOf(time);
  const catalog = uniqueLessons(lessons);
  const knownIds = new Set(catalog.map(lesson => lesson.id));
  const next = sanitizeSave(save, [...knownIds]);
  const previous = next.dailyPlan?.date === date ? next.dailyPlan : null;
  const refresh = options?.refresh === true;
  const invalidTarget = previous?.tasks.some(task => !knownIds.has(task.lessonId)
    || (task.type === 'lesson' && completionTime(task, next, date, time) === null
      && !isLessonUnlocked(catalog.find(lesson => lesson.id === task.lessonId), catalog, next)));
  if (previous && !refresh && !invalidTarget) {
    const replay = previous.tasks.find(task => task.type === 'lesson' && task.isReplay);
    if (replay) {
      // Repair older plans with duplicate pending work without replacing their other targets.
      next.dailyPlan = {
        ...previous,
        tasks: previous.tasks.filter(task => task.type !== 'review' || task.lessonId !== replay.lessonId
          || completionTime(task, next, date, time) !== null),
      };
    }
    return next;
  }

  const completedTasks = previous?.tasks.filter(task => knownIds.has(task.lessonId)
    && completionTime(task, next, date, time) !== null) || [];
  const originalTasks = new Map((previous?.tasks || []).map(task => [task.id, task]));
  const makeTask = (type, lessonId, isReplay = false) => {
    const id = `${type}:${lessonId}`;
    const original = originalTasks.get(id);
    return original && original.isReplay === isReplay ? original
      : {
        id, lessonId, type, isReplay, plannedAt: time,
        ...(isReplay ? { baselineCompletedAt: next.completed[lessonId].lastCompletedAt } : {}),
      };
  };
  const reviews = completedTasks.filter(task => task.type === 'review');
  const reviewIds = new Set(reviews.map(task => task.lessonId));
  const dueIds = getDueReviews(next, time).filter(id => knownIds.has(id));
  const preferredReviewIds = new Set([...reviewIds,
    ...dueIds.filter(id => !reviewIds.has(id)).slice(0, 2 - reviews.length)]);
  let lessonTask = completedTasks.find(task => task.type === 'lesson');
  if (!lessonTask) {
    const selected = chooseLesson(catalog, next, !refresh, preferredReviewIds);
    if (selected && !(selected.isReplay && reviewIds.has(selected.lesson.id))) {
      lessonTask = makeTask('lesson', selected.lesson.id, selected.isReplay);
    }
  }
  for (const id of dueIds) {
    if (reviews.length >= 2) break;
    if (reviewIds.has(id) || (lessonTask?.isReplay && id === lessonTask.lessonId)) continue;
    reviews.push(makeTask('review', id));
    reviewIds.add(id);
  }
  next.dailyPlan = {
    date,
    createdAt: previous?.createdAt ?? time,
    tasks: [...(lessonTask ? [lessonTask] : []), ...reviews],
  };
  return next;
}

/** Read only; callers ensure and persist the plan before rendering it. */
export function getDailyProgress(save, lessons, now = Date.now()) {
  const time = clockTime(now);
  const date = dayOf(time);
  const catalog = uniqueLessons(lessons);
  const knownIds = new Set(catalog.map(lesson => lesson.id));
  const clean = sanitizeSave(save, [...knownIds]);
  const current = clean.dailyPlan?.date === date ? clean.dailyPlan : null;
  const tasks = (current?.tasks || []).filter(task => knownIds.has(task.lessonId)).map(task => {
    const completedAt = completionTime(task, clean, date, time);
    return { ...task, done: completedAt !== null, completedAt };
  });
  const completedCount = tasks.filter(task => task.done).length;
  return {
    date,
    tasks,
    completedCount,
    totalCount: tasks.length,
    isComplete: tasks.length > 0 && completedCount === tasks.length,
    needsPlan: current === null,
  };
}

/** Summaries describe recorded activity, not a proficiency or pronunciation score. */
export function getLearningSummary(save, lessons, now = Date.now()) {
  const time = clockTime(now);
  const date = dayOf(time);
  const catalog = uniqueLessons(lessons);
  const clean = sanitizeSave(save, catalog.map(lesson => lesson.id));
  const completed = catalog.filter(lesson => own(clean.completed, lesson.id));
  const zones = [...new Set(catalog.map(zoneOf).filter(id => typeof id === 'string' && id))];
  const onDate = value => isTimestamp(value) && value <= time && dayOf(value) === date;
  return {
    completedLessons: completed.length,
    totalLessons: catalog.length,
    collectedPhrases: new Set(completed.map(lesson => normalizeAnswer(lesson.phrase)).filter(Boolean)).size,
    successfulReviews: completed.reduce((sum, lesson) => sum + clean.reviews[lesson.id].successfulReviews, 0),
    completedZones: zones.filter(id => catalog.filter(lesson => zoneOf(lesson) === id)
      .every(lesson => own(clean.completed, lesson.id))).length,
    learnedToday: completed.filter(lesson => onDate(clean.completed[lesson.id].completedAt)).length,
    reviewedToday: completed.filter(lesson => onDate(clean.reviews[lesson.id].lastReviewedAt)).length,
  };
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
