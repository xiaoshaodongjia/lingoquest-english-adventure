import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODES, LEVELS, createSave, sanitizeSave, isLessonUnlocked, completeLesson,
  recordReview, getDueReviews, normalizeAnswer, evaluateRecall,
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
