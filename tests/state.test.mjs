import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, MODES, LEVELS, createSave, sanitizeSave, isLessonUnlocked, completeLesson,
  recordReview, getDueReviews, normalizeAnswer, evaluateRecall, ensureDailyPlan,
  getDailyProgress, getLearningSummary,
} from '../state.js';
import { LESSONS, ZONES } from '../lessons.js';

const lessonIds = LESSONS.map(lesson => lesson.id);
const at = date => Date.parse(date);
const start = at('2026-11-22T10:00:00+08:00');
const lessonAt = (zone, order) => LESSONS.find(lesson => lesson.zoneId === zone && lesson.order === order);

function freezeTree(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}

test('saving and reopening retains the chosen pace, best progress, and review plan', () => {
  const initial = createSave(start);
  initial.profile = { mode: 'interest', level: 'basic', sound: false };
  const completed = completeLesson(freezeTree(initial), lessonAt('daily', 0), { hints: 1 }, start);
  const reviewed = recordReview(completed, 'daily-1', true, at('2026-11-23T10:00:00+08:00'));
  const reopened = sanitizeSave(JSON.parse(JSON.stringify(reviewed)), lessonIds);

  assert.deepEqual(reopened, reviewed);
  assert.deepEqual(reopened.profile, { mode: 'interest', level: 'basic', sound: false });
  assert.equal(reopened.recentLessonId, 'daily-1');
  assert.equal(reopened.completed['daily-1'].stars, 2);
  assert.deepEqual(initial.completed, {}, 'the earlier screen state must not be mutated');
});

test('damaged saves recover usable defaults while keeping healthy completed lessons', () => {
  for (const invalid of [null, [], 'broken save', 42]) {
    assert.deepEqual(sanitizeSave(invalid, lessonIds), createSave());
  }
  const damaged = JSON.parse(JSON.stringify({
    version: 1,
    profile: { mode: 'missing-mode', level: 'missing-level', sound: 'false' },
    completed: {
      'hello-1': { stars: 99, completedAt: start, lastPlayedAt: -1 },
      'hello-2': { stars: 3, completedAt: 'yesterday' },
      'removed-lesson': { stars: 3, completedAt: start },
    },
    reviews: {
      'hello-1': { dueAt: 'tomorrow', intervalDays: -3, successfulReviews: -2 },
      'hello-2': { dueAt: start },
    },
    recentLessonId: 'removed-lesson',
  }));
  const recovered = sanitizeSave(damaged, lessonIds);

  assert.deepEqual(recovered.profile, { mode: 'explore', level: 'starter', sound: true });
  assert.deepEqual(Object.keys(recovered.completed), ['hello-1']);
  assert.ok(recovered.completed['hello-1'].stars >= 1 && recovered.completed['hello-1'].stars <= 3);
  assert.equal(recovered.completed['hello-1'].completedAt, start);
  assert.ok(recovered.completed['hello-1'].lastPlayedAt >= start);
  assert.equal(recovered.reviews['hello-1'].dueAt, at('2026-11-23T10:00:00+08:00'));
  assert.equal(recovered.reviews['hello-1'].successfulReviews, 0);
  assert.equal(recovered.recentLessonId, null);
  assert.equal(isLessonUnlocked(lessonAt('hello', 1), LESSONS, recovered), true);
  assert.equal(isLessonUnlocked(lessonAt('daily', 1), LESSONS, recovered), false);
});

test('each region has its own starting lesson and unlocks independently', () => {
  const initial = createSave(start);
  for (const zone of ZONES) {
    assert.equal(isLessonUnlocked(lessonAt(zone.id, 0), LESSONS, initial), true);
    assert.equal(isLessonUnlocked(lessonAt(zone.id, 1), LESSONS, initial), false);
    assert.equal(isLessonUnlocked(lessonAt(zone.id, 2), LESSONS, initial), false);
  }
  const firstHello = completeLesson(initial, lessonAt('hello', 0), {}, start);
  assert.equal(isLessonUnlocked(lessonAt('hello', 1), LESSONS, firstHello), true);
  assert.equal(isLessonUnlocked(lessonAt('hello', 2), LESSONS, firstHello), false);
  assert.equal(isLessonUnlocked(lessonAt('daily', 1), LESSONS, firstHello), false);

  const secondHello = completeLesson(firstHello, lessonAt('hello', 1), {}, start);
  assert.equal(isLessonUnlocked(lessonAt('hello', 2), LESSONS, secondHello), true);
  assert.equal(isLessonUnlocked(lessonAt('travel', 1), LESSONS, secondHello), false);
});

test('changing the starting level offers later entry points and keeps completed lessons available', () => {
  const basic = createSave(start);
  basic.profile.level = 'basic';
  const stretch = createSave(start);
  stretch.profile.level = 'stretch';
  for (const zone of ZONES) {
    assert.equal(isLessonUnlocked(lessonAt(zone.id, 0), LESSONS, basic), true);
    assert.equal(isLessonUnlocked(lessonAt(zone.id, 1), LESSONS, basic), true);
    assert.equal(isLessonUnlocked(lessonAt(zone.id, 2), LESSONS, basic), false);
    assert.equal(isLessonUnlocked(lessonAt(zone.id, 2), LESSONS, stretch), true);
  }
  const completed = completeLesson(stretch, lessonAt('work', 2), {}, start);
  completed.profile.level = 'starter';
  assert.equal(isLessonUnlocked(lessonAt('work', 2), LESSONS, completed), true);
  assert.equal(isLessonUnlocked(lessonAt('work', 1), LESSONS, completed), false);
});

test('using hints still earns progress; replays keep the best stars and original review plan', () => {
  const lesson = lessonAt('hello', 0);
  const first = completeLesson(createSave(start), lesson, { hints: 20, errors: 20 }, start);
  assert.equal(first.completed[lesson.id].stars, 1);
  const better = completeLesson(freezeTree(first), lesson, { hints: 0, errors: 0 }, at('2026-11-22T12:00:00+08:00'));
  assert.equal(better.completed[lesson.id].stars, 3);
  assert.equal(better.completed[lesson.id].completedAt, start);
  assert.deepEqual(better.reviews, first.reviews);
  assert.equal(first.completed[lesson.id].stars, 1);

  const reviewed = recordReview(better, lesson.id, true, at('2026-11-23T10:00:00+08:00'));
  const replay = completeLesson(freezeTree(reviewed), lesson, { hints: 8, errors: 8 }, at('2026-11-23T11:00:00+08:00'));
  assert.equal(replay.completed[lesson.id].stars, 3, 'a difficult replay must not erase earned stars');
  assert.equal(replay.completed[lesson.id].lastPlayedAt, at('2026-11-23T11:00:00+08:00'));
  assert.deepEqual(replay.reviews, reviewed.reviews, 'replaying must not reset an existing review');
});

test('the review queue appears at the scheduled time and orders earlier lessons first', () => {
  let save = completeLesson(createSave(start), lessonAt('hello', 0), {}, start);
  save = completeLesson(save, lessonAt('daily', 0), {}, at('2026-11-22T11:00:00+08:00'));
  assert.deepEqual(getDueReviews(save, at('2026-11-23T09:59:59+08:00')), []);
  assert.deepEqual(getDueReviews(save, at('2026-11-23T10:00:00+08:00')), ['hello-1']);
  assert.deepEqual(getDueReviews(save, at('2026-11-23T11:00:00+08:00')), ['hello-1', 'daily-1']);
});

test('successful reviews follow 1, 3, 7, and 14 day plans across Shanghai dates', () => {
  const lesson = lessonAt('travel', 0);
  let save = completeLesson(createSave(), lesson, {}, at('2026-11-22T23:50:00+08:00'));
  assert.equal(save.reviews[lesson.id].dueAt, at('2026-11-23T23:50:00+08:00'));
  const early = recordReview(save, lesson.id, true, at('2026-11-23T00:10:00+08:00'));
  assert.deepEqual(early.reviews, save.reviews, 'early practice must not advance the spaced review plan');

  const schedule = [
    ['2026-11-23T23:55:00+08:00', '2026-11-24T23:55:00+08:00', 1],
    ['2026-11-24T23:55:00+08:00', '2026-11-27T23:55:00+08:00', 3],
    ['2026-11-27T23:55:00+08:00', '2026-12-04T23:55:00+08:00', 7],
    ['2026-12-04T23:55:00+08:00', '2026-12-18T23:55:00+08:00', 14],
  ];
  for (const [reviewedAt, dueAt, interval] of schedule) {
    save = recordReview(save, lesson.id, true, at(reviewedAt));
    assert.equal(save.reviews[lesson.id].dueAt, at(dueAt));
    assert.equal(save.reviews[lesson.id].intervalDays, interval);
  }
  assert.equal(save.reviews[lesson.id].successfulReviews, 4);
  const failed = recordReview(save, lesson.id, false, at('2026-12-18T23:55:00+08:00'));
  assert.equal(failed.reviews[lesson.id].dueAt, at('2026-12-19T23:55:00+08:00'));
  assert.equal(failed.reviews[lesson.id].successfulReviews, 4, 'a retry does not erase earlier successful reviews');
});

test('same Shanghai day retries are idempotent even when UTC has crossed midnight', () => {
  const lesson = lessonAt('daily', 0);
  const completed = completeLesson(createSave(), lesson, {}, at('2026-11-22T00:15:00+08:00'));
  const reviewed = recordReview(completed, lesson.id, true, at('2026-11-23T00:15:00+08:00'));
  const later = recordReview(freezeTree(reviewed), lesson.id, false, at('2026-11-23T23:45:00+08:00'));
  assert.deepEqual(later.reviews, reviewed.reviews);
  assert.equal(later.reviews[lesson.id].successfulReviews, 1);

  const lateReview = recordReview(completed, lesson.id, true, at('2026-11-23T23:50:00+08:00'));
  const nextShanghaiDay = recordReview(lateReview, lesson.id, false, at('2026-11-24T00:10:00+08:00'));
  assert.equal(nextShanghaiDay.reviews[lesson.id].dueAt, at('2026-11-25T00:10:00+08:00'));
  assert.equal(nextShanghaiDay.reviews[lesson.id].successfulReviews, 1);
});

test('recall accepts listed natural expressions and offers self-checking for other wording', () => {
  const step = lessonAt('daily', 0).steps[2];
  assert.equal(evaluateRecall('Could I have some tea, please?', step).status, 'correct');
  assert.equal(evaluateRecall('  Ａ　ＴＥＡ，ＰＬＥＡＳＥ！  ', step).status, 'correct');
  const alternative = evaluateRecall("I'd be grateful for a cup of tea, please.", step);
  assert.equal(alternative.status, 'close');
  assert.equal(alternative.reference, step.reference);
  assert.match(alternative.message, /其他说法/);
  assert.match(alternative.message, /参考/);
  assert.doesNotMatch(alternative.message, /错误|失败|不正确/);
  assert.equal(evaluateRecall(' \n\t ', step).status, 'empty');
  assert.equal(evaluateRecall('A coffee, please.', step).status, 'close', 'a different drink must not be accepted by a partial match');
});

test('Unicode, punctuation, and apostrophes tolerate typing differences without merging words', () => {
  assert.equal(normalizeAnswer(" Ｉ＇Ｄ　ＬＩＫＥ　ＴＥＡ，ＰＬＥＡＳＥ！ "), 'id like tea please');
  assert.equal(normalizeAnswer("I’d like tea, please."), normalizeAnswer("I'd like tea please"));
  assert.notEqual(normalizeAnswer('can not'), normalizeAnswer('cannot'));
  assert.notEqual(normalizeAnswer('a-b'), normalizeAnswer('ab'));
  assert.notEqual(normalizeAnswer('to go please'), normalizeAnswer('togoplease'));
});

test('all 18 lessons have reachable activities, usable word blocks, and recognized reference phrases', () => {
  assert.equal(LESSONS.length, 18);
  assert.equal(new Set(lessonIds).size, 18, 'duplicate IDs would overwrite saved progress');
  assert.equal(ZONES.length, 6);
  const zoneIds = new Set(ZONES.map(zone => zone.id));
  const levelIds = new Set(LEVELS.map(level => level.id));
  for (const zone of ZONES) {
    const regional = LESSONS.filter(lesson => lesson.zoneId === zone.id);
    assert.deepEqual(regional.map(lesson => lesson.order).sort(), [0, 1, 2], zone.id);
  }
  for (const mode of MODES) {
    assert.ok(mode.scale >= 1 && mode.speechRate > 0);
    assert.equal(new Set(mode.recommendedZones).size, 6);
    assert.ok(mode.recommendedZones.every(id => zoneIds.has(id)));
  }
  for (const lesson of LESSONS) {
    assert.ok(zoneIds.has(lesson.zoneId), lesson.id);
    assert.ok(levelIds.has(lesson.level), lesson.id);
    assert.deepEqual(lesson.steps.map(step => step.type), ['choice', 'order', 'recall'], lesson.id);
    for (const step of lesson.steps) {
      for (const field of ['prompt', 'context', 'speaker', 'hint']) {
        assert.equal(typeof step[field], 'string', `${lesson.id}: ${field}`);
        assert.ok(step[field].trim(), `${lesson.id}: empty ${field}`);
      }
    }
    const [choice, order, recall] = lesson.steps;
    assert.equal(choice.options.filter(option => option.correct === true).length, 1, lesson.id);
    assert.ok(choice.options.every(option => option.text && option.feedback), lesson.id);
    assert.ok(order.tokens.length > 1 && order.tokens.every(token => typeof token === 'string' && token.trim()), lesson.id);
    assert.equal(normalizeAnswer(order.tokens.join(' ')), normalizeAnswer(order.answer), `${lesson.id}: word blocks cannot form the answer`);
    assert.ok(recall.accepted.length > 0 && recall.accepted.every(answer => typeof answer === 'string' && answer.trim()), lesson.id);
    assert.ok(recall.accepted.some(answer => normalizeAnswer(answer) === normalizeAnswer(recall.reference)), `${lesson.id}: missing reference phrase`);
    for (const answer of recall.accepted) {
      assert.equal(evaluateRecall(answer, recall).status, 'correct', `${lesson.id}: ${answer}`);
    }
  }
});

test('a live v1 save gains a daily plan without losing progress or inventing replay history', () => {
  const completedAt = at('2026-11-22T09:00:00+08:00');
  const reviewedAt = at('2026-11-23T09:00:00+08:00');
  const now = at('2026-11-23T10:00:00+08:00');
  const oldSave = {
    version: 1,
    profile: { mode: 'interest', level: 'basic', sound: false },
    completed: { 'daily-1': { stars: 2, bestStars: 2, completedAt, lastPlayedAt: reviewedAt } },
    reviews: { 'daily-1': { dueAt: at('2026-11-26T09:00:00+08:00'), intervalDays: 3, successfulReviews: 2, lastReviewedAt: reviewedAt } },
    recentLessonId: 'daily-1',
  };
  const planned = ensureDailyPlan(freezeTree(oldSave), LESSONS, now);

  assert.equal(STORAGE_KEY, 'lingoquest-save-v1');
  assert.equal(planned.version, 1);
  assert.deepEqual(planned.profile, oldSave.profile);
  assert.deepEqual(planned.reviews, oldSave.reviews);
  assert.equal(planned.completed['daily-1'].stars, 2);
  assert.equal(planned.completed['daily-1'].completedAt, completedAt);
  assert.equal(planned.completed['daily-1'].lastPlayedAt, reviewedAt);
  assert.equal(planned.completed['daily-1'].lastCompletedAt, completedAt);
  assert.equal(planned.dailyPlan.tasks[0].lessonId, 'daily-2');
  assert.equal(oldSave.dailyPlan, undefined);
  assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(planned)), lessonIds), planned);
  assert.deepEqual(getLearningSummary(planned, LESSONS, now), {
    completedLessons: 1, totalLessons: 18, collectedPhrases: 1, successfulReviews: 2,
    completedZones: 0, learnedToday: 0, reviewedToday: 1,
  });
});

test('same-day renders and new due times keep the original gentle targets stable', () => {
  const earlier = completeLesson(createSave(), lessonAt('daily', 0), {}, at('2026-11-22T08:00:00+08:00'));
  const morning = at('2026-11-23T07:00:00+08:00');
  const planned = ensureDailyPlan(earlier, LESSONS, morning);
  assert.equal(planned.dailyPlan.tasks.filter(task => task.type === 'review').length, 0);
  assert.equal(planned.dailyPlan.tasks[0].lessonId, 'daily-2');

  const later = at('2026-11-23T09:00:00+08:00');
  const reopened = sanitizeSave(JSON.parse(JSON.stringify(planned)), lessonIds);
  reopened.recentLessonId = 'story-1';
  assert.deepEqual(getDueReviews(reopened, later), ['daily-1']);
  assert.deepEqual(ensureDailyPlan(freezeTree(reopened), LESSONS, later).dailyPlan, planned.dailyPlan);
  const completed = completeLesson(planned, lessonAt('daily', 1), {}, later);
  const rendered = ensureDailyPlan(completed, LESSONS, later + 60000);
  assert.deepEqual(rendered.dailyPlan, planned.dailyPlan, 'finishing the target must not silently assign another lesson');
  assert.equal(getDailyProgress(rendered, LESSONS, later + 60000).isComplete, true);
});

test('Shanghai midnight changes the plan while two UTC dates inside one Shanghai day do not', () => {
  const morning = at('2026-11-23T00:10:00+08:00');
  const planned = ensureDailyPlan(createSave(), LESSONS, morning);
  assert.equal(planned.dailyPlan.date, '2026-11-23');
  const completed = completeLesson(planned, lessonAt('hello', 0), {}, at('2026-11-23T23:50:00+08:00'));
  const evening = ensureDailyPlan(completed, LESSONS, at('2026-11-23T23:55:00+08:00'));
  assert.deepEqual(evening.dailyPlan, planned.dailyPlan);
  assert.equal(getDailyProgress(evening, LESSONS, at('2026-11-23T23:55:00+08:00')).completedCount, 1);

  const midnight = at('2026-11-24T00:05:00+08:00');
  assert.equal(getDailyProgress(evening, LESSONS, midnight).needsPlan, true);
  const nextDay = ensureDailyPlan(freezeTree(evening), LESSONS, midnight);
  assert.equal(nextDay.dailyPlan.date, '2026-11-24');
  assert.equal(nextDay.dailyPlan.tasks[0].lessonId, 'hello-2');
  assert.equal(nextDay.dailyPlan.tasks[0].plannedAt, midnight);
  assert.equal(getDailyProgress(nextDay, LESSONS, midnight).completedCount, 0);
  assert.equal(nextDay.dailyPlan.tasks.filter(task => task.type === 'review').length, 0, 'the previous late-night lesson is not yet due');
});

test('one new lesson and at most two truly due reviews complete only after recorded practice', () => {
  let save = createSave();
  for (const [zone, hour] of [['hello', '10'], ['daily', '11'], ['travel', '12']]) {
    save = completeLesson(save, lessonAt(zone, 0), {}, at(`2026-11-21T${hour}:00:00+08:00`));
  }
  const now = at('2026-11-23T10:00:00+08:00');
  save = ensureDailyPlan(save, LESSONS, now);
  const plan = save.dailyPlan;
  const daily = getDailyProgress(save, LESSONS, now);
  assert.equal(daily.totalCount, 3);
  assert.equal(daily.completedCount, 0);
  assert.equal(daily.tasks.filter(task => task.type === 'lesson').length, 1);
  assert.equal(daily.tasks[0].lessonId, 'travel-2');
  assert.deepEqual(daily.tasks.filter(task => task.type === 'review').map(task => task.lessonId), ['hello-1', 'daily-1']);
  assert.ok(daily.tasks.filter(task => task.type === 'review').every(task => getDueReviews(save, now).includes(task.lessonId)));

  save = completeLesson(save, lessonAt('travel', 1), { hints: 1 }, now + 60000);
  assert.equal(getDailyProgress(save, LESSONS, now + 60000).completedCount, 1);
  save = recordReview(save, 'hello-1', false, now + 120000);
  assert.equal(getDailyProgress(save, LESSONS, now + 120000).completedCount, 2, 'review effort counts even when a hint is needed');
  assert.equal(save.reviews['hello-1'].successfulReviews, 0);
  save = recordReview(save, 'daily-1', true, now + 180000);
  const finished = getDailyProgress(save, LESSONS, now + 180000);
  assert.equal(finished.completedCount, 3);
  assert.equal(finished.isComplete, true);
  assert.deepEqual(getLearningSummary(save, LESSONS, now + 180000), {
    completedLessons: 4, totalLessons: 18, collectedPhrases: 4, successfulReviews: 1,
    completedZones: 0, learnedToday: 1, reviewedToday: 2,
  });

  save.profile.mode = 'interest';
  const refreshed = ensureDailyPlan(save, LESSONS, now + 240000, { refresh: true });
  assert.deepEqual(refreshed.dailyPlan, plan, 'completed goals remain visible and do not create more daily work');
  assert.equal(getDailyProgress(refreshed, LESSONS, now + 240000).isComplete, true);
});

test('new preference and level choices refresh unfinished goals without losing completed ones', () => {
  const now = at('2026-11-23T10:00:00+08:00');
  const initial = ensureDailyPlan(createSave(), LESSONS, now);
  assert.equal(initial.dailyPlan.tasks[0].lessonId, 'hello-1');
  const practical = { ...initial, profile: { ...initial.profile, mode: 'practical', level: 'basic' } };
  const revised = ensureDailyPlan(practical, LESSONS, now + 60000, { refresh: true });
  assert.equal(revised.dailyPlan.tasks[0].lessonId, 'daily-2');
  assert.equal(isLessonUnlocked(lessonAt('daily', 1), LESSONS, revised), true);
  const interest = { ...revised, profile: { ...revised.profile, mode: 'interest', level: 'stretch' } };
  const advanced = ensureDailyPlan(interest, LESSONS, now + 120000, { refresh: true });
  assert.equal(advanced.dailyPlan.tasks[0].lessonId, 'story-3');
  assert.deepEqual(ensureDailyPlan(advanced, LESSONS, now + 180000, { refresh: true }).dailyPlan, advanced.dailyPlan);

  const completed = completeLesson(initial, lessonAt('hello', 0), {}, now + 60000);
  completed.profile.mode = 'practical';
  completed.profile.level = 'stretch';
  const kept = ensureDailyPlan(completed, LESSONS, now + 120000, { refresh: true });
  assert.equal(kept.dailyPlan.tasks[0].lessonId, 'hello-1');
  assert.equal(getDailyProgress(kept, LESSONS, now + 120000).completedCount, 1);
});

test('a selected unfinished lesson and the next lesson in its region support continuity', () => {
  const now = at('2026-11-23T10:00:00+08:00');
  const initial = createSave();
  initial.recentLessonId = 'travel-1';
  const planned = ensureDailyPlan(initial, LESSONS, now);
  assert.equal(planned.dailyPlan.tasks[0].lessonId, 'travel-1');
  const completed = completeLesson(planned, lessonAt('travel', 0), {}, now + 60000);
  const tomorrow = ensureDailyPlan(completed, LESSONS, at('2026-11-24T11:00:00+08:00'));
  assert.equal(tomorrow.dailyPlan.tasks[0].lessonId, 'travel-2');
  const interested = createSave();
  interested.profile.mode = 'interest';
  assert.equal(ensureDailyPlan(interested, LESSONS, now).dailyPlan.tasks[0].lessonId, 'story-1');
});

test('all completed courses offer a familiar replay without treating a review as that replay', () => {
  const earlier = at('2026-11-22T08:00:00+08:00');
  const now = at('2026-11-23T09:00:00+08:00');
  let save = createSave();
  for (const lesson of LESSONS) save = completeLesson(save, lesson, {}, earlier);
  save = ensureDailyPlan(save, LESSONS, now);
  const replay = getDailyProgress(save, LESSONS, now).tasks.find(task => task.type === 'lesson');
  assert.equal(replay.isReplay, true);
  assert.equal(replay.done, false);
  assert.ok(save.completed[replay.lessonId]);
  save = recordReview(save, replay.lessonId, false, now + 60000);
  assert.equal(getDailyProgress(save, LESSONS, now + 60000).tasks.find(task => task.type === 'lesson').done, false);
  save = completeLesson(save, LESSONS.find(lesson => lesson.id === replay.lessonId), { hints: 1 }, now + 120000);
  assert.equal(getDailyProgress(save, LESSONS, now + 120000).tasks.find(task => task.type === 'lesson').done, true);
  const summary = getLearningSummary(save, LESSONS, now + 120000);
  assert.equal(summary.completedLessons, 18);
  assert.equal(summary.collectedPhrases, 18);
  assert.equal(summary.completedZones, 6);
  assert.equal(summary.learnedToday, 0, 'replaying a known phrase must not inflate new-learning statistics');
});

test('a one-lesson catalog offers one replay without a duplicate review target', () => {
  const catalog = [lessonAt('hello', 0)];
  const now = at('2026-11-23T10:00:00+08:00');
  let save = completeLesson(createSave(), catalog[0], {}, at('2026-11-22T09:00:00+08:00'));
  save = ensureDailyPlan(save, catalog, now);
  assert.equal(getDailyProgress(save, catalog, now).totalCount, 1);
  assert.equal(getDailyProgress(save, catalog, now).tasks[0].isReplay, true);
  save = recordReview(save, catalog[0].id, false, now + 60000);
  const afterReview = getDailyProgress(save, catalog, now + 60000);
  assert.equal(afterReview.tasks.some(task => task.type === 'review'), false);
  assert.equal(afterReview.tasks.find(task => task.type === 'lesson').done, false);
  save = completeLesson(save, catalog[0], {}, now + 120000);
  assert.equal(getDailyProgress(save, catalog, now + 120000).isComplete, true);
});

test('locked or missing-prerequisite lessons never become daily new-learning targets', () => {
  const catalog = [lessonAt('hello', 0), lessonAt('hello', 2)];
  const now = at('2026-11-23T10:00:00+08:00');
  const completed = completeLesson(createSave(), catalog[0], {}, at('2026-11-22T09:00:00+08:00'));
  const blocked = ensureDailyPlan(completed, catalog, now);
  assert.equal(getDailyProgress(blocked, catalog, now).tasks.filter(task => task.type === 'lesson').length, 0);
  blocked.profile.level = 'stretch';
  const unlocked = ensureDailyPlan(blocked, catalog, now + 60000, { refresh: true });
  assert.equal(unlocked.dailyPlan.tasks.find(task => task.type === 'lesson').lessonId, 'hello-3');

  const advanced = createSave();
  advanced.profile.level = 'stretch';
  const planned = ensureDailyPlan(advanced, LESSONS, now);
  assert.equal(planned.dailyPlan.tasks[0].lessonId, 'hello-3');
  planned.profile.level = 'starter';
  const repaired = ensureDailyPlan(planned, LESSONS, now + 60000);
  assert.equal(repaired.dailyPlan.tasks[0].lessonId, 'hello-1');
  assert.equal(getDailyProgress(ensureDailyPlan(createSave(), [], now), [], now).isComplete, false);
});

test('daily save recovery restricts dates, IDs, task types, due status, and claimed completion flags', () => {
  const now = at('2026-11-23T10:00:00+08:00');
  let save = createSave();
  for (const zone of ['hello', 'daily', 'travel']) {
    save = completeLesson(save, lessonAt(zone, 0), {}, at('2026-11-21T09:00:00+08:00'));
  }
  save = completeLesson(save, lessonAt('hello', 1), {}, now - 60000);
  const task = (type, lessonId, extra = {}) => ({ type, lessonId, plannedAt: now, done: true, completedAt: now, ...extra });
  save.dailyPlan = {
    date: '2026-11-23', createdAt: now,
    tasks: [
      task('lesson', 'missing-lesson'), task('click', 'hello-1'),
      task('review', 'hello-2'), task('review', 'study-1'),
      task('lesson', 'study-1', { isReplay: true }),
      task('review', 'travel-1', { plannedAt: at('2026-11-22T10:00:00+08:00') }),
      task('lesson', 'story-1'), task('lesson', 'study-1'),
      task('review', 'hello-1'), task('review', 'hello-1'),
      task('review', 'daily-1'), task('review', 'travel-1'),
    ],
  };
  const recovered = sanitizeSave(save, lessonIds);
  assert.deepEqual(recovered.dailyPlan.tasks.map(item => item.id), ['lesson:story-1', 'review:hello-1', 'review:daily-1']);
  assert.ok(recovered.dailyPlan.tasks.every(item => !Object.hasOwn(item, 'done') && !Object.hasOwn(item, 'completedAt')));
  assert.equal(getDailyProgress(recovered, LESSONS, now).completedCount, 0);
  assert.equal(getLearningSummary(recovered, LESSONS, now).completedLessons, 4);

  const invalidDate = sanitizeSave({ ...save, dailyPlan: { ...save.dailyPlan, date: '2026-11-31' } }, lessonIds);
  assert.equal(invalidDate.dailyPlan, undefined);
  assert.equal(Object.keys(invalidDate.completed).length, 4);
  const rebuilt = ensureDailyPlan(invalidDate, LESSONS, now);
  assert.equal(rebuilt.dailyPlan.date, '2026-11-23');
});

test('creating a replay at the previous completion millisecond does not complete the new goal', () => {
  const catalog = [lessonAt('hello', 0)];
  const now = at('2026-11-23T10:00:00+08:00');
  const completed = completeLesson(createSave(), catalog[0], {}, now);
  const planned = ensureDailyPlan(completed, catalog, now);
  const task = getDailyProgress(planned, catalog, now).tasks[0];
  assert.equal(task.baselineCompletedAt, now);
  assert.equal(task.done, false);
  assert.equal(getDailyProgress(planned, catalog, now + 60000).completedCount, 0, 'elapsed time is not another completed replay');
  const replayed = completeLesson(planned, catalog[0], {}, now + 60000);
  assert.equal(getDailyProgress(replayed, catalog, now + 60000).isComplete, true);

  const older = completeLesson(createSave(), catalog[0], {}, at('2026-11-22T09:00:00+08:00'));
  const sameMillisecondPlan = ensureDailyPlan(older, catalog, now);
  const genuineReplay = completeLesson(sameMillisecondPlan, catalog[0], {}, now);
  assert.equal(getDailyProgress(genuineReplay, catalog, now).isComplete, true, 'a real replay can finish at plannedAt when its baseline is older');
});

test('a preference refresh after new due times never adds a review for the kept familiar goal', () => {
  let save = createSave();
  for (const lesson of LESSONS) save = completeLesson(save, lesson, {}, at('2026-11-22T12:00:00+08:00'));
  save.recentLessonId = 'daily-1';
  save = ensureDailyPlan(save, LESSONS, at('2026-11-23T09:00:00+08:00'));
  assert.equal(save.dailyPlan.tasks[0].lessonId, 'daily-1');
  assert.equal(save.dailyPlan.tasks.length, 1);
  save = completeLesson(save, lessonAt('daily', 0), {}, at('2026-11-23T09:05:00+08:00'));
  const originalLessonTask = save.dailyPlan.tasks[0];
  save.profile.mode = 'interest';
  const now = at('2026-11-23T12:30:00+08:00');
  const refreshed = ensureDailyPlan(save, LESSONS, now, { refresh: true });
  assert.deepEqual(refreshed.dailyPlan.tasks[0], originalLessonTask);
  const daily = getDailyProgress(refreshed, LESSONS, now);
  assert.equal(daily.tasks[0].done, true);
  assert.equal(daily.tasks.filter(task => task.type === 'review').length, 2);
  assert.ok(daily.tasks.filter(task => task.type === 'review').every(task => task.lessonId !== 'daily-1'));
  assert.ok(daily.tasks.filter(task => task.type === 'review').every(task => getDueReviews(refreshed, now).includes(task.lessonId)));

  const legacyDuplicate = JSON.parse(JSON.stringify(refreshed));
  legacyDuplicate.dailyPlan.tasks[1] = {
    id: 'review:daily-1', lessonId: 'daily-1', type: 'review', isReplay: false, plannedAt: now,
  };
  const repaired = ensureDailyPlan(legacyDuplicate, LESSONS, now + 60000);
  assert.equal(repaired.dailyPlan.tasks.some(task => task.type === 'review' && task.lessonId === 'daily-1'), false);
  assert.deepEqual(repaired.dailyPlan.tasks[0], originalLessonTask);
});

test('older daily replay saves recover a baseline and retain genuine completed practice', () => {
  const catalog = [lessonAt('hello', 0)];
  const morning = at('2026-11-23T09:00:00+08:00');
  let save = completeLesson(createSave(), catalog[0], {}, at('2026-11-22T12:00:00+08:00'));
  save = ensureDailyPlan(save, catalog, morning);
  save = completeLesson(save, catalog[0], {}, morning + 60000);
  const oldDaily = JSON.parse(JSON.stringify(save));
  delete oldDaily.dailyPlan.tasks[0].baselineCompletedAt;
  const restored = sanitizeSave(oldDaily, catalog.map(lesson => lesson.id));
  assert.equal(restored.dailyPlan.tasks[0].baselineCompletedAt, morning);
  assert.equal(getDailyProgress(restored, catalog, morning + 120000).isComplete, true);
  assert.deepEqual(restored.completed, save.completed);
  assert.deepEqual(restored.reviews, save.reviews);

  const atPlanningTime = JSON.parse(JSON.stringify(restored));
  atPlanningTime.completed[catalog[0].id].lastCompletedAt = morning;
  delete atPlanningTime.dailyPlan.tasks[0].baselineCompletedAt;
  assert.equal(getDailyProgress(atPlanningTime, catalog, morning + 120000).completedCount, 0);
});

test('a future completion timestamp cannot automatically fulfill a newly planned replay', () => {
  const catalog = [lessonAt('hello', 0)];
  const now = at('2026-11-23T10:00:00+08:00');
  const future = at('2026-11-23T11:00:00+08:00');
  const save = completeLesson(createSave(), catalog[0], {}, at('2026-11-22T09:00:00+08:00'));
  save.completed[catalog[0].id].lastCompletedAt = future;
  save.completed[catalog[0].id].lastPlayedAt = future;
  const planned = ensureDailyPlan(save, catalog, now);
  assert.equal(planned.dailyPlan.tasks[0].baselineCompletedAt, future);
  assert.equal(getDailyProgress(planned, catalog, now).completedCount, 0);
  assert.equal(getDailyProgress(planned, catalog, future + 60000).completedCount, 0, 'waiting for a stored future time is not new practice');
  const practiced = completeLesson(planned, catalog[0], {}, future + 60000);
  assert.equal(getDailyProgress(practiced, catalog, future + 60000).isComplete, true);
});

test('planning before the fixed completion time credits the final lesson across Shanghai midnight', () => {
  const finalLesson = LESSONS.at(-1);
  let save = createSave();
  for (const lesson of LESSONS.slice(0, -1)) {
    save = completeLesson(save, lesson, {}, at('2026-11-22T10:00:00+08:00'));
  }
  save = ensureDailyPlan(save, LESSONS, at('2026-11-23T23:58:00+08:00'));
  assert.equal(save.dailyPlan.tasks[0].lessonId, finalLesson.id);
  const finishedAt = at('2026-11-24T00:01:00+08:00');
  save = ensureDailyPlan(save, LESSONS, finishedAt);
  save = completeLesson(save, finalLesson, {}, finishedAt);
  save = ensureDailyPlan(save, LESSONS, finishedAt + 10);
  const daily = getDailyProgress(save, LESSONS, finishedAt + 10);
  assert.equal(daily.date, '2026-11-24');
  const finished = daily.tasks.find(task => task.type === 'lesson');
  assert.equal(finished.lessonId, finalLesson.id);
  assert.equal(finished.isReplay, false);
  assert.equal(finished.done, true);
  assert.equal(daily.tasks.some(task => !task.done && task.lessonId === finalLesson.id), false);
  assert.equal(getLearningSummary(save, LESSONS, finishedAt + 10).learnedToday, 1);
});
