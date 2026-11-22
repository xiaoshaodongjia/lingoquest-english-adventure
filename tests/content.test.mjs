import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONES, LESSONS, getRecallStep } from '../lessons.js';
import { evaluateRecall, normalizeAnswer } from '../state.js';

const lessonById = id => LESSONS.find(lesson => lesson.id === id);
const clone = value => JSON.parse(JSON.stringify(value));

function freezeTree(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}

function requireText(record, fields, label) {
  for (const field of fields) {
    assert.equal(typeof record[field], 'string', `${label}: ${field} must be text`);
    assert.ok(record[field].trim(), `${label}: ${field} must not be empty`);
  }
}

test('six chapters keep their saved lesson IDs and provide a complete three-stop story', () => {
  const zoneIds = ['hello', 'daily', 'travel', 'story', 'study', 'work'];
  assert.deepEqual(ZONES.map(zone => zone.id), zoneIds);
  assert.deepEqual(LESSONS.map(lesson => lesson.id), zoneIds.flatMap(id => [1, 2, 3].map(number => `${id}-${number}`)));
  const badges = new Set();
  for (const zone of ZONES) {
    requireText(zone.story, ['title', 'introduction', 'conclusion', 'badge'], zone.id);
    assert.ok([...zone.story.badge].length <= 12, `${zone.id}: chapter badge should stay compact`);
    badges.add(zone.story.badge);
    const chapter = LESSONS.filter(lesson => lesson.zoneId === zone.id);
    assert.deepEqual(chapter.map(lesson => lesson.order), [0, 1, 2]);
    assert.equal(new Set(chapter.map(lesson => lesson.storyBeat)).size, 3, `${zone.id}: story must advance`);
    for (const lesson of chapter) {
      requireText(lesson, ['learningGoal', 'takeaway', 'storyBeat', 'pitfall', 'rewardText'], lesson.id);
      assert.ok(/[a-z]/i.test(lesson.pitfall), `${lesson.id}: pitfall needs a concrete English usage`);
      assert.ok(lesson.vocabulary.length >= 2 && lesson.vocabulary.length <= 3, `${lesson.id}: core vocabulary budget`);
      assert.deepEqual(lesson.steps.map(step => step.type), ['choice', 'order', 'recall']);
      assert.equal(normalizeAnswer(lesson.steps[1].tokens.join(' ')), normalizeAnswer(lesson.steps[1].answer));
    }
  }
  assert.equal(badges.size, 6, 'each completed story should have its own badge');
});

test('every base and review scenario has translated references, useful feedback, and matching characters', () => {
  let scenarioCount = 0;
  for (const lesson of LESSONS) {
    const base = lesson.steps[2];
    assert.ok(Array.isArray(base.variations) && base.variations.length >= 1, `${lesson.id}: needs another real-world task`);
    for (const [index, step] of [base, ...base.variations].entries()) {
      const label = `${lesson.id} scenario ${index}`;
      requireText(step, ['prompt', 'shortPrompt', 'context', 'shortContext', 'speaker', 'reference', 'translation', 'hint', 'explanation'], label);
      assert.equal(step.type, 'recall', `${label}: must remain a recall task`);
      requireText(step.response, ['english', 'translation', 'speaker'], `${label} response`);
      assert.equal(step.response.speaker, step.speaker, `${label}: the same character must answer`);
      assert.notEqual(normalizeAnswer(step.response.english), 'good job', `${label}: response should finish the task`);
      assert.ok(Array.isArray(step.accepted) && step.accepted.length > 0, `${label}: accepted expressions`);
      assert.ok(step.accepted.some(answer => normalizeAnswer(answer) === normalizeAnswer(step.reference)), `${label}: reference must be accepted`);
      for (const answer of step.accepted) {
        assert.equal(evaluateRecall(answer, step).status, 'correct', `${label}: ${answer}`);
      }
      assert.equal(evaluateRecall(`  ${step.reference.toUpperCase()}  `, step).status, 'correct', `${label}: case and spaces`);
      assert.equal(evaluateRecall('  \n ', step).status, 'empty', `${label}: blank is not an answer`);
      if (step.english) {
        assert.equal(typeof step.english, 'string', `${label}: optional NPC line`);
        assert.ok(!step.accepted.some(answer => normalizeAnswer(answer) === normalizeAnswer(step.english)), `${label}: copying the NPC must not complete recall`);
      }
      if (index > 0) {
        assert.notEqual(step.context, base.context, `${label}: review must change the situation`);
        assert.notEqual(step.response.english, base.response.english, `${label}: NPC should respond to this situation`);
      }
      scenarioCount += 1;
    }
  }
  assert.ok(scenarioCount >= 36);
});

test('scenario-specific objects and translations are not replaced by the original lesson headline', () => {
  const name = getRecallStep(lessonById('hello-1'), 0);
  assert.match(name.reference, /Sam/);
  assert.match(name.translation, /Sam/);
  assert.doesNotMatch(name.translation, /Alex/);

  const tea = getRecallStep(lessonById('daily-1'), 0);
  const juice = getRecallStep(lessonById('daily-1'), 1);
  assert.match(tea.reference, /tea/i);
  assert.match(tea.translation, /茶/);
  assert.match(tea.response.english, /tea/i);
  assert.match(juice.reference, /juice/i);
  assert.match(juice.translation, /果汁/);
  assert.match(juice.context, /juice.*果汁/);
  assert.match(juice.shortContext, /juice.*果汁/);
  assert.match(juice.response.english, /juice/i);
  assert.equal(evaluateRecall('A coffee, please.', juice).status, 'close');
  assert.equal(evaluateRecall('A tea, please.', juice).status, 'close');

  const museum = getRecallStep(lessonById('travel-1'), 1);
  assert.match(museum.reference, /museum/i);
  assert.match(museum.translation, /博物馆/);
  assert.match(museum.context, /museum.*博物馆/);
  assert.match(museum.response.english, /museum/i);
  assert.equal(evaluateRecall('Where is the library?', museum).status, 'close');

  const dineIn = getRecallStep(lessonById('travel-2'), 1);
  assert.equal(normalizeAnswer(dineIn.reference), 'for here please');
  assert.match(dineIn.translation, /在这里吃/);
  assert.match(dineIn.response.translation, /请坐/);
  assert.equal(evaluateRecall('To go, please.', dineIn).status, 'close');

  const hotel = getRecallStep(lessonById('travel-3'), 1);
  assert.match(hotel.response.english, /room/);
  assert.match(hotel.response.translation, /房间/);
  assert.doesNotMatch(hotel.response.english, /table/);

  const appointment = getRecallStep(lessonById('work-2'), 1);
  assert.match(appointment.translation, /下午两点/);
  assert.match(appointment.context, /two p\.m\..*下午两点/);
  assert.match(appointment.shortContext, /two p\.m\..*下午两点/);
  assert.match(appointment.response.translation, /下午两点/);
  assert.equal(evaluateRecall('Does Monday work for you?', appointment).status, 'close');
});

test('getRecallStep selects base and variations and safely cycles in both directions', () => {
  for (const lesson of LESSONS) {
    const base = lesson.steps[2];
    const count = base.variations.length + 1;
    const firstVariation = { ...base, ...base.variations[0], type: 'recall' };
    const lastVariation = { ...base, ...base.variations.at(-1), type: 'recall' };
    assert.deepEqual(getRecallStep(lesson), base, lesson.id);
    assert.deepEqual(getRecallStep(lesson, 0), base, lesson.id);
    assert.deepEqual(getRecallStep(lesson, 1), firstVariation, lesson.id);
    assert.deepEqual(getRecallStep(lesson, count), base, lesson.id);
    assert.deepEqual(getRecallStep(lesson, count + 1), firstVariation, lesson.id);
    assert.deepEqual(getRecallStep(lesson, -1), lastVariation, lesson.id);
    assert.deepEqual(getRecallStep(lesson, -count), base, lesson.id);
    assert.deepEqual(getRecallStep(lesson, 1.9), firstVariation, lesson.id);
    for (const invalid of [NaN, Infinity, -Infinity, '1', null, {}]) {
      assert.deepEqual(getRecallStep(lesson, invalid), base, `${lesson.id}: invalid index`);
    }
  }
});

test('getRecallStep returns independent copies even when the original course is frozen', () => {
  for (const lesson of LESSONS) {
    const input = freezeTree(clone(lesson));
    const original = JSON.stringify(input);
    for (const index of [0, 1, -1, 10001]) {
      const result = getRecallStep(input, index);
      assert.notEqual(result, input.steps[2], lesson.id);
      assert.notEqual(result.accepted, input.steps[2].accepted, lesson.id);
      assert.notEqual(result.response, input.steps[2].response, lesson.id);
      result.accepted.push('This temporary wording belongs only to the returned copy.');
      result.response.english = 'Temporary test response';
      result.variations[0].accepted[0] = 'Temporary test expression';
      assert.equal(JSON.stringify(input), original, `${lesson.id}: original content was mutated`);
    }
    assert.deepEqual(getRecallStep(input, 0), input.steps[2]);
  }
});

test('missing scenarios fail safely and a malformed override cannot change the activity type', () => {
  for (const lesson of [null, undefined, {}, { steps: [] }, { steps: 'invalid' }, { steps: [null, { type: 'choice' }] }]) {
    assert.equal(getRecallStep(lesson, 1), null);
  }
  const bare = freezeTree({ steps: [{ type: 'recall', reference: 'Hello.', accepted: ['Hello.'] }] });
  assert.deepEqual(getRecallStep(bare, 999), bare.steps[0]);
  const malformed = freezeTree({ steps: [{ type: 'recall', reference: 'Hello.', variations: [null, { type: 'choice', reference: 'Hi.' }] }] });
  assert.equal(getRecallStep(malformed, 1).reference, 'Hello.');
  assert.equal(getRecallStep(malformed, 2).reference, 'Hi.');
  assert.equal(getRecallStep(malformed, 2).type, 'recall');
});
