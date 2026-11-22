import { ZONES, LESSONS, getRecallStep } from './lessons.js';
import { STORAGE_KEY, MODES, LEVELS, createSave, sanitizeSave, isLessonUnlocked, getLessonStars, completeLesson, recordReview, getDueReviews, normalizeAnswer, evaluateRecall, ensureDailyPlan, getDailyProgress, getLearningSummary } from './state.js';

const icons = {
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4V5zM16 9l6 6m-6 0 6-6"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
  hello: '<path d="M5 12V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v8l1-3a2 2 0 0 1 4 1l-2 6a7 7 0 0 1-13 2l-4-5a2 2 0 0 1 3-2l1 1"/>',
  cup: '<path d="M4 9h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3"/>',
  plane: '<path d="m22 2-7 20-4-9-9-4 20-7zM11 13 22 2"/>',
  play: '<rect x="3" y="4" width="18" height="16" rx="4"/><path d="m10 8 6 4-6 4z"/>',
  book: '<path d="M12 5v16M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2V4z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V3h8v4M3 12c6 4 12 4 18 0M10 14h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  leaf: '<path d="M20 3C9 2 3 7 4 14c1 5 7 7 11 3 3-3 5-9 5-14ZM4 20 15 9"/>',
  rotate: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  flag: '<path d="M5 21V3c5-3 9 3 14 0v10c-5 3-9-3-14 0"/>',
  sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM21 3v4m-2-2h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.compass}</svg>`;
const h = (value) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const $ = (id) => document.getElementById(id);
const lessonById = (id) => LESSONS.find(lesson => lesson.id === id);
const zoneById = (id) => ZONES.find(zone => zone.id === id);
const mode = () => MODES.find(item => item.id === save.profile.mode) || MODES[0];
const level = () => LEVELS.find(item => item.id === save.profile.level) || LEVELS[0];
let save;
let storageAvailable = true;
try { save = sanitizeSave(JSON.parse(localStorage.getItem(STORAGE_KEY)), LESSONS.map(lesson => lesson.id)); }
catch { save = createSave(); }
let page = 'map';
let selectedZone = lessonById(save.recentLessonId)?.zoneId || mode().recommendedZones?.[0] || 'hello';
let session = null;
let speech = null;
let lastFocused = null;
let notebookQuery = '';
let notebookZone = 'all';
let hasRendered = false;

function refreshDailyPlan(options = {}, now = Date.now()) {
  const previous = JSON.stringify(save.dailyPlan);
  save = ensureDailyPlan(save, LESSONS, now, options);
  if (JSON.stringify(save.dailyPlan) !== previous) persist();
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); }
  catch {
    if (storageAvailable) toast('这次进度暂时无法保存。保持页面打开，可以继续玩。');
    storageAvailable = false;
  }
}
function toast(message) {
  const element = document.createElement('div');
  element.className = 'toast';
  element.textContent = message;
  $('toast-region').replaceChildren(element);
  setTimeout(() => element.remove(), 4200);
}
function completedInZone(zoneId) { return LESSONS.filter(lesson => lesson.zoneId === zoneId && save.completed[lesson.id]).length; }
function starsMarkup(count = 0, label = true) {
  return `<span class="star-row" ${label ? `aria-label="${count} 颗星"` : 'aria-hidden="true"'}>${[1, 2, 3].map(n => `<span class="star ${n <= count ? 'is-earned' : ''}">${icon('star')}</span>`).join('')}</span>`;
}
function nextLesson(zoneId) {
  const lessons = LESSONS.filter(lesson => lesson.zoneId === zoneId).sort((a, b) => a.order - b.order);
  const startOrder = save.profile.level === 'stretch' ? 2 : save.profile.level === 'basic' ? 1 : 0;
  return lessons.find(lesson => lesson.order >= startOrder && !save.completed[lesson.id] && isLessonUnlocked(lesson, LESSONS, save)) || lessons.find(lesson => !save.completed[lesson.id] && isLessonUnlocked(lesson, LESSONS, save)) || lessons.find(lesson => lesson.order >= startOrder && isLessonUnlocked(lesson, LESSONS, save)) || lessons[0];
}
function totalStars() { return Object.values(save.completed).reduce((sum, item) => sum + (item.bestStars || item.stars || 0), 0); }
function renderHeader() {
  document.body.dataset.mode = save.profile.mode;
  $('header-stars').innerHTML = `${icon('star')}<span>${totalStars()}</span>`;
  $('sound-toggle').innerHTML = icon(save.profile.sound ? 'sound' : 'muted');
  $('sound-toggle').setAttribute('aria-label', save.profile.sound ? '关闭朗读' : '开启朗读');
  $('sound-toggle').setAttribute('aria-pressed', String(save.profile.sound));
  $('profile-toggle').innerHTML = `${icon('compass')}<span>${h(mode().title)}</span>${icon('settings')}`;
  document.querySelectorAll('.main-nav .nav-link').forEach(button => {
    if (button.dataset.page === page) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const due = getDueReviews(save).length;
  $('review-badge').hidden = !due;
  $('review-badge').textContent = due;
}
function renderPage() {
  refreshDailyPlan();
  if (!hasRendered) {
    const nextDaily = getDailyProgress(save, LESSONS).tasks.find(task => task.type === 'lesson' && !task.done);
    selectedZone = lessonById(nextDaily?.lessonId)?.zoneId || selectedZone;
    hasRendered = true;
  }
  renderHeader();
  $('main-view').innerHTML = page === 'review' ? renderReview() : page === 'notebook' ? renderNotebook() : renderMap();
}
function foxIllustration() {
  return `<svg class="companion-art" viewBox="0 0 240 145" role="img" aria-label="你的探险向导，一只背着小书包的狐狸"><ellipse cx="122" cy="132" rx="63" ry="7" fill="#c9d8b1"/><path d="M150 92c32-22 56-4 38 17-8 9-25 14-47 7" fill="#df8858"/><path d="M183 91c19 3 16 19-1 23l-8-11z" fill="#fff5df"/><rect x="80" y="82" width="46" height="40" rx="15" fill="#436e52"/><path d="M105 83c-18 8-20 38 3 44h27c19-6 18-31 3-45" fill="#dd8755"/><path d="m82 29 9 48 38-22m35-26-9 48-35-22" fill="#de8c5a"/><path d="m90 42 7 25 20-15m37-10-7 25-20-15" fill="#f0bb8e"/><path d="M82 69c-4-28 70-29 82 0 10 25-13 44-40 44S77 94 82 69" fill="#e59c64"/><path d="M84 78c13 0 18 16 39 17 21-1 29-17 41-17-2 22-22 32-41 32S88 98 84 78" fill="#fff4df"/><circle cx="106" cy="77" r="3.5" fill="#354c3e"/><circle cx="142" cy="77" r="3.5" fill="#354c3e"/><path d="M118 88q6-6 12 0l-6 5z" fill="#354c3e"/><path d="M122 98q4 3 8-1" fill="none" stroke="#354c3e" stroke-width="2" stroke-linecap="round"/><path d="M125 111v19m-16-13-2 14m28-14 3 14" stroke="#c57449" stroke-width="8" stroke-linecap="round"/><path d="m142 114 11-8 15 12-11 8z" fill="#fff8e6" stroke="#6f8761" stroke-width="2"/><path d="m147 114 8 6m-4-10 8 6" stroke="#a4b18b" stroke-width="1.5"/></svg>`;
}
function renderModeStrip() {
  const symbols = { explore: 'compass', interest: 'sparkles', practical: 'cup' };
  const details = { explore: '短句引导', interest: '从兴趣出发', practical: '用进生活' };
  return `<div class="style-strip" role="group" aria-label="学习体验，和英语水平分开选择">${MODES.map(item => `<button type="button" class="mode-chip" data-action="set-mode" data-mode="${item.id}" aria-pressed="${save.profile.mode === item.id}">${icon(symbols[item.id])}<span><span class="mode-chip-label">${h(item.title)}</span><span class="mode-chip-detail">${details[item.id]}</span></span></button>`).join('')}</div>`;
}
function pocketWords(lesson) {
  const words = lesson.vocabulary || [];
  return words.length ? `<div class="pocket-words" aria-label="这关的口袋词卡">${words.map(word => `<span class="pocket-word"><span lang="en">${h(word.word)}</span><span>${h(word.meaning)}</span></span>`).join('')}</div>` : '';
}
function learningTip(lesson) {
  return lesson.pitfall ? `<details class="learning-tip"><summary>${icon('leaf')} 记住这个小窍门</summary><p>${h(lesson.pitfall)}</p></details>` : '';
}
function renderDailyMission() {
  const daily = getDailyProgress(save, LESSONS);
  const firstPending = daily.tasks.find(task => !task.done)?.id;
  const hasReviews = daily.tasks.some(task => task.type === 'review');
  const description = daily.isComplete ? '愿意的话，可以继续故事；也可以下次再来。' : hasReviews ? '一个故事任务，几句旧表达。按自己的节奏完成就好。' : '三个小步骤，约三分钟练会一句。按自己的节奏完成就好。';
  const dateLabel = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' }).format(new Date());
  return `<section class="daily-mission" aria-labelledby="daily-title">
    <div class="daily-heading"><span class="eyebrow">${icon('leaf')} ${h(dateLabel)} · 今日小目标</span><h2 id="daily-title">${daily.isComplete ? '今天的小目标，完成了。' : Object.keys(save.completed).length ? '带着学过的话，再走一小步。' : '今天，先学会一句能用的话。'}</h2><p>${h(description)}</p><div class="daily-progress"><span>已完成 ${daily.completedCount} / ${daily.totalCount}</span><progress value="${daily.completedCount}" max="${Math.max(1, daily.totalCount)}" aria-label="今日小目标完成进度"></progress></div></div>
    <div class="daily-task-list">${daily.tasks.map(task => {
      const lesson = lessonById(task.lessonId);
      if (!lesson) return '';
      const isReview = task.type === 'review';
      const description = isReview ? '换个情境，先不看提示回忆一句。' : task.isReplay ? '重走熟悉的故事，试着更自然地表达。' : lesson.learningGoal || lesson.subtitle;
      return `<div class="daily-task" data-done="${task.done}" data-type="${task.type}" data-task="${h(task.id)}"><span class="task-icon">${icon(task.done ? 'check' : isReview ? 'rotate' : 'flag')}</span><div class="task-copy"><span>${isReview ? '回忆一句 · 约 1 分钟' : task.isReplay ? '再用一次 · 约 3 分钟' : '故事任务 · 约 3 分钟'}</span><h3>${h(lesson.title)}</h3><p>${h(description)}</p></div>${task.done ? `<span class="daily-task-done">${icon('check')} 完成了</span>` : `<button type="button" class="${task.id === firstPending ? 'primary-button' : 'secondary-button'} task-start" data-action="${isReview ? 'start-review' : 'start-lesson'}" data-lesson="${lesson.id}">${isReview ? '试着回忆' : task.isReplay ? '再练一次' : '开始任务'} ${icon('arrow')}</button>`}</div>`;
    }).join('')}</div>
  </section>`;
}
function renderZoneStory(zone) {
  const chapters = LESSONS.filter(lesson => lesson.zoneId === zone.id).sort((a, b) => a.order - b.order);
  const finished = chapters.every(lesson => save.completed[lesson.id]);
  const next = nextLesson(zone.id);
  return `<div class="zone-story" data-color="${zone.color}"><div><span class="story-kicker">${icon(zone.icon)} ${h(zone.title)} · 三站小故事</span><h2 class="story-title">${h(zone.story?.title || zone.title)}</h2><p class="story-copy">${h(finished ? zone.story?.conclusion || zone.description : zone.story?.introduction || zone.description)}</p></div>${finished && zone.story?.badge ? `<span class="chapter-badge">${icon('flag')} ${h(zone.story.badge)}</span>` : ''}<ol class="chapter-progress" aria-label="故事进度">${chapters.map(lesson => `<li class="chapter-step" data-state="${save.completed[lesson.id] ? 'done' : lesson.id === next.id ? 'active' : 'pending'}"><span class="chapter-dot">${save.completed[lesson.id] ? icon('check') : lesson.order + 1}</span><span>${h(lesson.title)}</span></li>`).join('')}</ol></div>`;
}
function renderMap() {
  const zone = zoneById(selectedZone) || ZONES[0];
  const next = nextLesson(zone.id);
  const dailyCoversNext = getDailyProgress(save, LESSONS).tasks.some(task => task.type === 'lesson' && !task.done && task.lessonId === next.id);
  const positions = [[14, 65], [32, 37], [48, 70], [62, 27], [77, 60], [89, 31]];
  const doneCount = Object.keys(save.completed).length;
  return `<section class="page-intro"><span class="eyebrow">${icon('leaf')} A LITTLE ENGLISH, A LITTLE ADVENTURE</span><h1>让英语，成为一场<span>小冒险。</span></h1><p class="intro-copy">从你感兴趣的地方出发。每次几分钟，把一句英语用进生活里。</p><div class="intro-tags"><span>${icon('flag')} 6 个情景世界</span><span>${icon('clock')} 18 个短关卡</span><button class="text-button" type="button" data-action="settings">${h(level().title)} · 调整起点 ${icon('settings')}</button></div>${renderModeStrip()}</section>${renderDailyMission()}
    <div class="adventure-layout">
      <section class="map-panel" aria-label="选择一个情景世界"><div class="map-topline"><span>${icon('compass')} 你的冒险地图</span><span>${doneCount} / ${LESSONS.length} 关已完成</span></div><div class="island-map"><img class="map-art" src="assets/island-map.svg" alt="六个学习岛屿由小路相连的探险地图" />${ZONES.map((item, index) => `<button type="button" class="map-node" style="--node-x:${positions[index][0]}%;--node-y:${positions[index][1]}%" data-action="select-zone" data-zone="${item.id}" data-state="${completedInZone(item.id) === 3 ? 'done' : item.id === zone.id ? 'active' : 'open'}" aria-label="${h(item.title)}，已完成 ${completedInZone(item.id)} / 3 关" aria-pressed="${item.id === zone.id}"><span class="node-orb">${completedInZone(item.id) === 3 ? icon('check') : icon(item.icon)}</span><span class="node-label">${h(item.title)}</span><span class="node-meta">${completedInZone(item.id)} / 3</span></button>`).join('')}</div><div class="map-caption"><span><i class="legend-dot active"></i>当前探索</span><span><i class="legend-dot done"></i>区域完成</span><span>点一个小岛，就能出发</span></div></section>
      <aside class="quest-sidebar" data-daily-overlap="${dailyCoversNext}"><div class="companion-card">${foxIllustration()}<span class="companion-note">“我们只走一小步，就很好。”</span></div><span class="quest-eyebrow">${h(zone.title)} · 下一站</span><h2>${h(next.title)}</h2><p class="quest-description">${h(next.learningGoal || next.subtitle)}</p><div class="quest-meta"><span>${icon('clock')} 约 ${next.minutes} 分钟</span><span>${icon('sparkles')} 3 个小任务</span></div><button class="primary-button" type="button" data-action="start-lesson" data-lesson="${next.id}">${save.completed[next.id] ? '再探索一次' : '开始这一关'} ${icon('arrow')}</button><div class="zone-progress"><div><span>这片小岛的足迹</span><span>${completedInZone(zone.id)} / 3</span></div><div class="progress-track" role="progressbar" aria-label="区域通关进度" aria-valuenow="${completedInZone(zone.id)}" aria-valuemin="0" aria-valuemax="3"><div class="progress-fill" style="width:${completedInZone(zone.id) / 3 * 100}%"></div></div></div></aside>
    </div>
    <section class="journey-section" aria-labelledby="journey-title"><div class="journey-heading"><div><span class="eyebrow">CHOOSE YOUR NEXT CHAPTER</span><h2 id="journey-title">想去哪里看看？</h2></div><span class="section-note">选择场景，再按自己的节奏前进</span></div><div class="zone-grid">${ZONES.map(item => `<button class="zone-card" type="button" data-action="select-zone" data-zone="${item.id}" data-color="${item.color}" data-active="${item.id === zone.id}"><span class="zone-icon">${icon(item.icon)}</span><span class="zone-title">${h(item.title)}</span><span class="zone-subtitle">${h(item.subtitle)}</span><span class="zone-completion">${completedInZone(item.id)} / 3 关 ${item.id === zone.id ? icon('arrow') : ''}</span></button>`).join('')}</div>${renderZoneStory(zone)}<div class="lesson-list">${LESSONS.filter(lesson => lesson.zoneId === zone.id).sort((a, b) => a.order - b.order).map(lesson => {
      const complete = save.completed[lesson.id];
      const unlocked = isLessonUnlocked(lesson, LESSONS, save);
      return `<button type="button" class="lesson-card" data-action="${unlocked ? 'start-lesson' : 'locked-lesson'}" data-lesson="${lesson.id}" data-state="${complete ? 'done' : unlocked ? 'open' : 'locked'}" aria-label="${h(lesson.title)}，${complete ? '已通关' : unlocked ? '可以开始' : '完成前一关后开放'}"><span class="lesson-number">${complete ? icon('check') : unlocked ? String(lesson.order + 1).padStart(2, '0') : icon('lock')}</span><span class="lesson-info"><h3>${h(lesson.title)}</h3><p>${h(lesson.subtitle)}</p></span><span class="lesson-level lesson-card-level">${h(LEVELS.find(item => item.id === lesson.level)?.title || '轻松启程')}</span><span class="lesson-stars">${starsMarkup(complete?.bestStars || complete?.stars || 0)}</span><span class="lesson-status">${complete ? '再练一次' : unlocked ? '去探索' : '待解锁'}${unlocked ? icon('arrow') : ''}</span></button>`;
    }).join('')}</div></section>`;
}
function formatDue(timestamp) {
  if (!Number.isFinite(timestamp)) return '稍后再练';
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
  const dayTime = time => {
    const parts = Object.fromEntries(formatter.formatToParts(time).map(part => [part.type, part.value]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  };
  const days = Math.round((dayTime(timestamp) - dayTime(Date.now())) / 86400000);
  return days <= 0 ? '今天可以复习' : days === 1 ? '明天再见' : new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' }).format(timestamp) + '再见';
}
function renderReview() {
  const dueIds = getDueReviews(save);
  const completed = LESSONS.filter(lesson => save.completed[lesson.id]);
  return `<section class="page-intro"><span class="eyebrow">${icon('rotate')} THE MEMORY CAMPSITE</span><h1>歇一会儿，<span>把表达留下。</span></h1><p class="intro-copy">先不看提示，试着回忆一句。记住了，下次隔久一点再见；忘了，明天再试。</p></section><div class="review-summary"><span>${icon('leaf')} ${dueIds.length ? `今天有 ${dueIds.length} 句，等你回来` : '今天没有到期任务，按你的节奏来'}</span><span>已收集 ${completed.length} 句表达</span>${dueIds.length ? `<button class="secondary-button" type="button" data-action="start-due-review">回忆今天的一句 ${icon('arrow')}</button>` : ''}</div>${completed.length ? `<div class="review-layout">${[...completed].sort((a, b) => (save.reviews[a.id]?.dueAt || 0) - (save.reviews[b.id]?.dueAt || 0)).map(lesson => `<article class="review-card"><div class="review-card-top"><span class="zone-icon" data-color="${zoneById(lesson.zoneId).color}">${icon(zoneById(lesson.zoneId).icon)}</span><span class="due-label ${dueIds.includes(lesson.id) ? 'is-due' : ''}">${h(formatDue(save.reviews[lesson.id]?.dueAt))}</span></div><h2>${h(lesson.title)}</h2><p>${h(lesson.translation)}</p><div class="review-card-bottom"><span>${h(zoneById(lesson.zoneId).title)}</span><button class="secondary-button" type="button" data-action="start-review" data-lesson="${lesson.id}">不看提示，试一句 ${icon('arrow')}</button></div></article>`).join('')}</div>` : `<div class="empty-state">${icon('leaf')}<h2>先带回你的第一句英语</h2><p>完成任意一关，这里就会帮你安排之后的回忆。</p><button class="primary-button" type="button" data-action="navigate" data-page="map">去地图探索 ${icon('arrow')}</button></div>`}`;
}
function renderLearningOverview() {
  const summary = getLearningSummary(save, LESSONS);
  return `<div class="learning-overview" aria-label="你的学习足迹"><div class="overview-stat"><strong>${summary.collectedPhrases}<span> / ${summary.totalLessons}</span></strong><span>已收集的表达</span></div><div class="overview-stat"><strong>${summary.completedZones}<span> / ${ZONES.length}</span></strong><span>已完成的小故事</span></div><div class="overview-stat"><strong>${summary.successfulReviews}</strong><span>累计回忆成功</span></div><p>学过的每一句，都可以再用一次。</p></div>`;
}
function notebookMatches() {
  const query = normalizeAnswer(notebookQuery);
  return LESSONS.filter(lesson => {
    if (!save.completed[lesson.id] || (notebookZone !== 'all' && lesson.zoneId !== notebookZone)) return false;
    const searchable = [lesson.phrase, lesson.translation, lesson.title, lesson.takeaway, lesson.learningGoal, zoneById(lesson.zoneId)?.title, ...(lesson.vocabulary || []).flatMap(word => [word.word, word.meaning])].join(' ');
    return !query || normalizeAnswer(searchable).includes(query);
  });
}
function renderNotebookCards() {
  const matches = notebookMatches();
  return matches.length ? `<div class="notebook-grid">${matches.map(lesson => `<article class="phrase-card"><span class="phrase-zone">${icon(zoneById(lesson.zoneId).icon)} ${h(zoneById(lesson.zoneId).title)}</span><h2 lang="en">${h(lesson.phrase)}</h2><p>${h(lesson.translation)}</p>${lesson.takeaway ? `<p class="takeaway-line">${h(lesson.takeaway)}</p>` : ''}${pocketWords(lesson)}${learningTip(lesson)}<div class="phrase-actions"><button class="ghost-button" type="button" data-action="listen-phrase" data-lesson="${lesson.id}">${icon('sound')} 听一句</button><button class="ghost-button" type="button" data-action="start-review" data-lesson="${lesson.id}">${icon('rotate')} 换个情境练</button></div></article>`).join('')}</div>` : `<div class="notebook-empty">${icon('search')}<h2>暂时没有找到这句表达</h2><p>可以试试英文单词、中文意思，或换一个场景。</p><button class="secondary-button" type="button" data-action="clear-notebook-filters">查看全部已学表达</button></div>`;
}
function updateNotebookResults() {
  if (!$('notebook-results')) return;
  $('notebook-results').innerHTML = renderNotebookCards();
  $('notebook-result-count').textContent = `找到 ${notebookMatches().length} 句已学表达`;
}
function renderNotebook() {
  const completed = LESSONS.filter(lesson => save.completed[lesson.id]);
  const zones = ZONES.filter(zone => completed.some(lesson => lesson.zoneId === zone.id));
  if (notebookZone !== 'all' && !zones.some(zone => zone.id === notebookZone)) notebookZone = 'all';
  return `<section class="page-intro"><span class="eyebrow">${icon('book')} YOUR POCKET PHRASEBOOK</span><h1>每一句，都是<span>你的新本领。</span></h1><p class="intro-copy">把用过的表达装进口袋。按场景找一句，再换个情境试着说出来。</p></section>${completed.length ? `${renderLearningOverview()}<div class="notebook-tools"><div class="notebook-search"><label for="phrase-search">找一句用得上的话</label><div>${icon('search')}<input id="phrase-search" class="text-input" type="search" maxlength="100" placeholder="搜索英文、中文或场景…" value="${h(notebookQuery)}" autocomplete="off" aria-controls="notebook-results" /></div></div><div class="notebook-filters" role="group" aria-label="按场景筛选已学表达"><button class="filter-chip" type="button" data-action="filter-notebook" data-zone="all" aria-pressed="${notebookZone === 'all'}">全部表达 <span>${completed.length}</span></button>${zones.map(zone => `<button class="filter-chip" type="button" data-action="filter-notebook" data-zone="${zone.id}" aria-pressed="${notebookZone === zone.id}">${h(zone.title)} <span>${completedInZone(zone.id)}</span></button>`).join('')}</div></div><p class="notebook-result-count" id="notebook-result-count" role="status" aria-live="polite">找到 ${notebookMatches().length} 句已学表达</p><div id="notebook-results">${renderNotebookCards()}</div>` : `<div class="empty-state">${icon('book')}<h2>手册的第一页，等你来写</h2><p>每完成一关，就会收集一条可用的英语表达。</p><button class="primary-button" type="button" data-action="navigate" data-page="map">收集第一句 ${icon('arrow')}</button></div>`}`;
}

renderPage();

function shuffleIndices(tokens, seed) {
  let hash = [...seed].reduce((number, character) => (number * 31 + character.charCodeAt(0)) >>> 0, 23);
  const indices = tokens.map((_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
    const j = hash % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  if (tokens.length > 1 && indices.every((index, i) => tokens[index] === tokens[i])) indices.push(indices.shift());
  return indices;
}
function currentLesson() { return session && lessonById(session.lessonId); }
function currentStep() {
  const step = currentLesson()?.steps[session.stepIndex];
  return step?.type === 'recall' && session.isReview ? session.practiceStep : step;
}
function openDialog(dialog) {
  lastFocused = document.activeElement;
  if (!dialog.open) dialog.showModal();
}
function closeDialog(dialog) {
  dialog.close();
  if (lastFocused?.isConnected) lastFocused.focus();
  else document.querySelector('.main-nav [aria-current="page"]')?.focus();
}
function beginLesson(lessonId, isReview = false) {
  const lesson = lessonById(lessonId);
  if (!lesson) return;
  if (!isReview && !isLessonUnlocked(lesson, LESSONS, save)) {
    toast('先完成这片小岛的前一关，就能继续出发。也可以在起点设置里选择已有的英语基础。');
    return;
  }
  if (isReview && !save.completed[lessonId]) return;
  refreshDailyPlan();
  stopSpeaking();
  session = { lessonId, isReview, stepIndex: isReview ? lesson.steps.length - 1 : 0, errors: 0, hints: 0, hintSteps: [], answered: false, picked: [], tried: [], feedback: '', tone: 'neutral', reveal: false, recallText: '', matched: false, sawReference: false, selfCheckIndependent: false, recallAttempts: 0 };
  if (isReview) session.practiceStep = getRecallStep(lesson, 1 + (save.reviews[lessonId]?.successfulReviews || 0));
  save = { ...save, recentLessonId: lessonId };
  persist();
  renderGame();
  openDialog($('lesson-dialog'));
  $('lesson-dialog').scrollTop = 0;
  $('game-title')?.focus({ preventScroll: true });
}
function sceneAvatar(zoneId) {
  const item = zoneById(zoneId);
  return `<span class="speaker-avatar" data-color="${h(item.color)}">${icon(item.icon)}</span>`;
}
function stepAudio(step) {
  if (step.type === 'choice') return step.english || '';
  if (step.type === 'order') return step.answer;
  return session.reveal || session.answered ? step.reference : '';
}
function gameFeedback() {
  return `<div class="feedback" data-tone="${session.tone}" role="status" aria-live="polite">${session.feedback ? `${icon(session.tone === 'success' ? 'check' : 'leaf')}<span>${h(session.feedback)}</span>` : ''}</div>`;
}
function npcReaction(step) {
  const response = step.response;
  if (!session.answered || step.type !== 'recall' || !response) return '';
  return `<div class="npc-reaction"><span class="npc-reaction-speaker">${h(response.speaker)} 回应你</span><p lang="en">${h(response.english)}</p><span>${h(response.translation)}</span><button class="ghost-button" type="button" data-action="listen-response">${icon('sound')} 听听回应</button></div>`;
}
function renderGame() {
  const wasOpen = $('lesson-dialog').open;
  const focused = document.activeElement;
  const focusAction = focused?.dataset?.action;
  const focusIndex = focused?.dataset?.index;
  const focusPosition = focused?.dataset?.position;
  const inputSelection = focused?.id === 'recall-answer' ? [focused.selectionStart, focused.selectionEnd] : null;
  const lesson = currentLesson();
  const step = currentStep();
  if (!lesson || !step) return;
  const zone = zoneById(lesson.zoneId);
  const useShortText = save.profile.mode === 'explore';
  const displayPrompt = useShortText ? step.shortPrompt || step.prompt : step.prompt;
  const displayContext = useShortText ? step.shortContext || step.context : step.context;
  const stepName = { choice: '先看懂意思', order: '把话拼出来', recall: '自己表达一次' }[step.type];
  const audio = stepAudio(step);
  const showTargetAudio = audio && step.type !== 'recall' && !(step.type === 'choice' && step.english);
  const audioLabel = step.type === 'order' && !session.answered && !session.reveal ? '听一句英语' : audio;
  const visibleReference = session.reveal || session.answered;
  const recallPrimaryAction = session.reveal && !session.recallText.trim() ? 'self-confirm' : 'check-recall';
  let interaction = '';
  if (step.type === 'choice') {
    interaction = `<div class="answer-options" aria-label="选择合适的表达">${step.options.map((option, index) => `<div class="answer-row"><button type="button" class="answer-option" data-action="choose-answer" data-index="${index}" data-result="${session.answered && option.correct ? 'correct' : session.tried.includes(index) && !option.correct ? 'wrong' : ''}" ${session.answered ? 'disabled' : ''}><span class="option-index">${String.fromCharCode(65 + index)}</span><span lang="en">${h(option.text)}</span>${session.answered && option.correct ? icon('check') : ''}</button><button type="button" class="option-listen icon-button" data-action="listen-option" data-index="${index}" aria-label="听选项 ${String.fromCharCode(65 + index)}">${icon('sound')}</button></div>`).join('')}</div>`;
  } else if (step.type === 'order') {
    const indices = shuffleIndices(step.tokens, lesson.id);
    interaction = `<div class="sentence-tray" aria-label="已拼出的句子">${session.picked.length ? session.picked.map((index, position) => `<button type="button" class="selected-token" data-action="unpick-word" data-position="${position}" ${session.answered ? 'disabled' : ''} aria-label="撤回 ${h(step.tokens[index])}"><span lang="en">${h(step.tokens[index])}</span>${!session.answered ? icon('close') : ''}</button>`).join('') : '<span class="sentence-placeholder">点下面的词块，把一句话拼起来</span>'}</div><div class="word-bank" aria-label="可用的词块">${indices.map(index => `<button type="button" class="word-token" data-action="pick-word" data-index="${index}" ${session.picked.includes(index) || session.answered ? 'disabled' : ''} lang="en">${h(step.tokens[index])}</button>`).join('')}</div>`;
  } else {
    interaction = `<form id="recall-form" class="recall-area"><label for="recall-answer">可以说出来，也可以写下来</label><input class="text-input" id="recall-answer" name="answer" type="text" placeholder="在这里写一句英语…" lang="en" autocomplete="off" autocapitalize="sentences" spellcheck="false" maxlength="400" value="${h(session.recallText)}" ${session.answered ? 'disabled' : ''} /><button type="submit" hidden ${session.answered ? 'disabled' : ''}>看看我的表达</button></form>${!session.answered && !session.reveal ? '<div class="oral-option"><button class="secondary-button" type="button" data-action="oral-check">自己说完，再对照</button><span>不想打字，可以先自己说一句</span></div>' : ''}${visibleReference ? `<div class="reference-box"><span class="reference-label">可以这样说</span><p lang="en">${h(step.reference)}</p><button class="ghost-button" type="button" data-action="listen-step">${icon('sound')} 听听参考句</button><span>${h(step.explanation || '')}</span></div>` : ''}`;
  }
  $('lesson-dialog').innerHTML = `<div class="game-topbar"><div><span class="game-region">${icon(zone.icon)} ${h(zone.title)}</span><span class="game-header-label">${h(lesson.title)}${session.isReview ? ' · 回忆练习' : ''}</span></div><div class="game-toolbar"><button class="icon-button" type="button" data-action="toggle-sound" aria-label="${save.profile.sound ? '关闭朗读' : '开启朗读'}">${icon(save.profile.sound ? 'sound' : 'muted')}</button><button class="close-button icon-button" type="button" data-action="close-lesson" aria-label="返回地图">${icon('close')}</button></div></div><div class="step-track" aria-label="${session.isReview ? '回忆任务' : '本关进度'}">${(session.isReview ? [2] : [0, 1, 2]).map(index => `<span class="step-dot" data-state="${index < session.stepIndex ? 'done' : index === session.stepIndex ? 'active' : 'pending'}">${session.isReview ? icon('rotate') : index < session.stepIndex ? icon('check') : index + 1}<span>${session.isReview ? '回忆' : ['理解', '拼句', '表达'][index]}</span></span>`).join('')}</div><div class="game-content">${!session.isReview && session.stepIndex === 0 && lesson.storyBeat ? `<div class="mission-brief">${icon('flag')}<p>${h(lesson.storyBeat)}</p></div>` : ''}<div class="game-scene">${sceneAvatar(lesson.zoneId)}<div><span class="speaker-name">${h(step.speaker)}</span><p class="context-line">${h(displayContext)}</p></div></div><div class="game-title-group"><span class="game-step-name">${session.isReview ? '先不看提示，回忆一下' : stepName}</span><div class="prompt-heading"><h2 class="game-prompt" id="game-title" tabindex="-1">${h(displayPrompt)}</h2><button type="button" class="prompt-listen ghost-button" data-action="listen-instruction" aria-label="用中文朗读题目">${icon('sound')}<span>听题目</span></button></div></div>${step.english && normalizeAnswer(step.english) !== normalizeAnswer(step.reference || step.answer || '') ? `<div class="dialogue-bubble"><p lang="en">${h(step.english)}</p><button class="ghost-button" type="button" data-action="listen-scene" aria-label="朗读对方的话">${icon('sound')}</button></div>` : ''}${showTargetAudio ? `<div class="lesson-audio"><button type="button" class="audio-button" data-action="listen-step" aria-label="朗读这句英语">${icon('sound')}</button><span class="audio-text" lang="en">${h(audioLabel)}</span></div>` : ''}${interaction}${gameFeedback()}${npcReaction(step)}${session.answered ? learningTip(lesson) : ''}</div><div class="game-footer"><div class="game-helper">${session.answered ? `<span>${icon('check')} ${session.isReview ? '回忆过，就留下了足迹' : '这一步完成了'}</span>` : `<button class="ghost-button" type="button" data-action="show-hint">${icon('leaf')} ${session.reveal ? '再看提示' : '给我一点提示'}</button>`}${step.type === 'recall' && !session.answered ? session.reveal ? '<button class="ghost-button" type="button" data-action="hide-reference">收起参考，再试一句</button>' : '<button class="ghost-button" type="button" data-action="show-reference">看看参考句</button>' : ''}</div><div class="game-actions">${session.answered ? `<button class="primary-button" type="button" data-action="next-step">${session.isReview ? '安排下次回忆' : session.stepIndex === 2 ? '完成这一关' : '继续下一步'} ${icon('arrow')}</button>` : step.type === 'order' ? '<button class="primary-button" type="button" data-action="check-order">试试这句话</button>' : step.type === 'recall' ? `<button class="primary-button" type="button" data-action="${recallPrimaryAction}">${recallPrimaryAction === 'self-confirm' ? '意思相同，我能说了' : '看看我的表达'} ${icon('arrow')}</button>${session.reveal && recallPrimaryAction !== 'self-confirm' ? '<button class="secondary-button" type="button" data-action="self-confirm">意思相同，我能说了</button>' : ''}` : '<span class="game-action-note">选一句，回应眼前的情境</span>'}</div></div>`;
  if (step.type === 'recall' && session.answered && !session.recallText.trim()) $('recall-form').hidden = true;
  if (wasOpen) {
    let target;
    if (session.answered) target = $('lesson-dialog').querySelector('[data-action="next-step"]');
    else if (inputSelection) target = $('recall-answer');
    else if (focusAction) {
      const selector = '[data-action="' + focusAction + '"]' + (focusIndex != null ? '[data-index="' + focusIndex + '"]' : focusPosition != null ? '[data-position="' + focusPosition + '"]' : '');
      target = $('lesson-dialog').querySelector(selector);
      if ((!target || target.disabled) && ['pick-word', 'unpick-word'].includes(focusAction)) target = $('lesson-dialog').querySelector('[data-action="pick-word"]:not(:disabled)');
      if (!target && ['oral-check', 'show-reference'].includes(focusAction)) target = $('lesson-dialog').querySelector('[data-action="self-confirm"]') || $('recall-answer');
      if (!target && focusAction === 'hide-reference') target = $('recall-answer');
      if (!target && focusAction === 'next-step') target = step.type === 'recall' ? $('recall-answer') : $('lesson-dialog').querySelector('[data-action="choose-answer"], [data-action="pick-word"]');
    }
    if (target && !target.disabled) {
      target.focus({ preventScroll: !(session.answered || focusAction === 'oral-check') });
      if (inputSelection && target.setSelectionRange) target.setSelectionRange(...inputSelection);
    }
  }
}
function setFeedback(message, tone = 'neutral') {
  session.feedback = message;
  session.tone = tone;
  renderGame();
}
function captureRecall() {
  const input = $('recall-answer');
  if (session && input) session.recallText = input.value.slice(0, 400);
}
function rememberHint() {
  if (!session.hintSteps.includes(session.stepIndex)) {
    session.hintSteps.push(session.stepIndex);
    session.hints += 1;
  }
}
function chooseAnswer(index) {
  const step = currentStep();
  if (!session || session.answered || step?.type !== 'choice' || !step.options[index]) return;
  const option = step.options[index];
  if (option.correct) {
    session.answered = true;
    session.matched = true;
    setFeedback(option.feedback || '回应对了！这句话现在能用上了。', 'success');
  } else {
    if (!session.tried.includes(index)) { session.tried.push(index); session.errors += 1; }
    setFeedback(option.feedback || '再看看这个情境，需要表达什么？', 'hint');
  }
}
function pickWord(index) {
  const step = currentStep();
  if (!session || session.answered || step?.type !== 'order' || !Number.isInteger(index) || index < 0 || index >= step.tokens.length || session.picked.includes(index)) return;
  session.picked.push(index);
  session.feedback = '';
  renderGame();
}
function checkOrder() {
  const step = currentStep();
  if (!session || session.answered || step?.type !== 'order') return;
  if (!session.picked.length) return setFeedback('先选一个词块，就开始了。', 'hint');
  const answer = session.picked.map(index => step.tokens[index]).join(' ');
  if (normalizeAnswer(answer) === normalizeAnswer(step.answer)) {
    session.answered = true;
    session.matched = true;
    setFeedback(step.explanation || '拼出来了！接下来，试着自己表达。', 'success');
  } else {
    session.errors += 1;
    setFeedback('再调整一下顺序。点已选的词块可以撤回，也可以看看提示。', 'hint');
  }
}
function checkRecall() {
  if (!session || session.answered || currentStep()?.type !== 'recall') return;
  captureRecall();
  const result = evaluateRecall(session.recallText, currentStep());
  if (result.status !== 'empty') {
    session.recallAttempts += 1;
    if (session.sawReference) rememberHint();
  }
  if (result.status === 'correct') {
    session.answered = true;
    session.matched = true;
    setFeedback('表达清楚了！你把这句话用到了新的情境里。', 'success');
  } else if (result.status === 'empty') {
    setFeedback('先试着写一句。想不起来，可以看看提示再来。', 'hint');
    $('recall-answer')?.focus();
  } else {
    session.selfCheckIndependent = !session.hintSteps.includes(session.stepIndex) && !session.sawReference;
    session.reveal = true;
    session.sawReference = true;
    setFeedback(result.message || '可能还有其他说法。对照参考句看看意思是否相同，或调整后再试。', 'neutral');
  }
}
function showHint(reference = false) {
  if (!session || session.answered) return;
  captureRecall();
  rememberHint();
  if (currentStep().type === 'recall' && reference) { session.reveal = true; session.sawReference = true; session.selfCheckIndependent = false; }
  setFeedback(reference ? '对照意思，再收起提示试着说一遍。' : currentStep().hint, 'hint');
}
function nextStep() {
  if (!session || !session.answered) return;
  if (session.isReview || session.stepIndex === currentLesson().steps.length - 1) return finishLesson();
  stopSpeaking();
  session.stepIndex += 1;
  session.answered = false;
  session.picked = [];
  session.tried = [];
  session.feedback = '';
  session.tone = 'neutral';
  session.reveal = false;
  session.recallText = '';
  session.matched = false;
  session.sawReference = false;
  session.selfCheckIndependent = false;
  session.recallAttempts = 0;
  renderGame();
  $('lesson-dialog').scrollTop = 0;
  $('game-title')?.focus({ preventScroll: true });
}
function finishLesson() {
  const lesson = currentLesson();
  const practicedStep = currentStep();
  if (!lesson || !session.answered) return;
  const finishedAt = Date.now();
  refreshDailyPlan({}, finishedAt);
  stopSpeaking();
  const isReview = session.isReview;
  const stars = getLessonStars(session);
  const firstTime = !save.completed[lesson.id];
  if (isReview) save = recordReview(save, lesson.id, session.hints === 0 && session.matched, finishedAt);
  else save = completeLesson(save, lesson, session, finishedAt);
  persist();
  const zone = zoneById(lesson.zoneId);
  const next = LESSONS.find(item => item.zoneId === lesson.zoneId && item.order === lesson.order + 1);
  selectedZone = zone.id;
  $('lesson-dialog').close();
  renderPage();
  $('reward-dialog').innerHTML = renderReward(lesson, practicedStep, { isReview, stars, firstTime, next, usedSupport: session.hints || session.errors });
  session = null;
  openDialog($('reward-dialog'));
}
function renderReward(lesson, practicedStep, result) {
  const { isReview, stars, firstTime, next, usedSupport } = result;
  const zone = zoneById(lesson.zoneId);
  const daily = getDailyProgress(save, LESSONS);
  const nextDaily = daily.tasks.find(task => !task.done);
  const nextTask = nextDaily || (!isReview && next && isLessonUnlocked(next, LESSONS, save) ? { lessonId: next.id, type: 'lesson' } : null);
  const nextMission = nextTask && lessonById(nextTask.lessonId);
  const chapterDone = !isReview && completedInZone(zone.id) === LESSONS.filter(item => item.zoneId === zone.id).length;
  const practicedPhrase = practicedStep.reference || lesson.phrase;
  const practicedTranslation = practicedStep.translation || lesson.translation;
  const title = isReview ? '换个情境，你也试过了。' : chapterDone && firstTime ? '小故事完成，新的本领留下。' : firstTime ? '新的足迹，留下了！' : '这片小岛，又熟悉了一点。';
  return `<button class="close-button icon-button" type="button" data-action="close-reward" aria-label="关闭完成页">${icon('close')}</button>
    <div class="reward-symbol">${icon(isReview ? 'leaf' : chapterDone ? 'sparkles' : 'flag')}</div>
    <span class="eyebrow">${isReview ? 'A LITTLE MEMORY, A LITTLE GROWTH' : 'ONE MORE STEP ON YOUR JOURNEY'}</span>
    <h2 id="reward-title">${title}</h2>
    <p class="reward-description">${isReview ? h(formatDue(save.reviews[lesson.id]?.dueAt)) : h(lesson.rewardText || lesson.title + ' · 已通关')}</p>
    ${!isReview ? `<div class="reward-stars">${starsMarkup(stars)}</div><span class="reward-note">${usedSupport ? '试错和提示都能帮助前进；旅程会保留你的最好成绩。' : '看懂、拼出、表达，你都完成了。'}</span>` : ''}
    ${chapterDone && zone.story ? `<div class="story-reward"><span class="chapter-badge">${icon('flag')} ${h(zone.story.badge)}</span><p>${h(zone.story.conclusion)}</p></div>` : ''}
    <div class="reward-phrase"><span class="reference-label">这次练习，可以这样说</span><p lang="en">${h(practicedPhrase)}</p><span>${h(practicedTranslation)}</span><button class="ghost-button" type="button" data-action="listen-reward-phrase" data-phrase="${h(practicedPhrase)}">${icon('sound')} 听一句</button><details class="reward-notes"><summary>带走句型和口袋词卡</summary>${lesson.takeaway ? `<span class="takeaway-line">${h(lesson.takeaway)}</span>` : ''}${pocketWords(lesson)}</details></div>
    ${daily.isComplete ? `<p class="daily-complete">${icon('check')}<span>今天的小目标已经完成，按自己的节奏决定下一步。</span></p>` : ''}
    ${nextMission ? `<div class="next-mission"><span>${nextTask.type === 'review' ? '下一句回忆' : nextDaily ? '接着完成今日任务' : '故事的下一站'}</span><strong>${h(nextMission.title)}</strong></div>` : ''}
    <div class="reward-actions">${nextMission ? `<button class="primary-button" type="button" data-action="reward-task" data-lesson="${nextMission.id}" data-kind="${nextTask.type}">${nextTask.type === 'review' ? '继续回忆一句' : nextDaily ? '继续今日任务' : '继续下一关'} ${icon('arrow')}</button>` : `<button class="primary-button" type="button" data-action="reward-map">去地图看看 ${icon('compass')}</button>`}<button class="secondary-button" type="button" data-action="close-reward">今天先到这里</button></div>`;
}
function renderSettings() {
  $('settings-dialog').innerHTML = `<div class="settings-topbar"><div><span class="eyebrow">YOUR OWN WAY TO EXPLORE</span><h2 id="settings-title">找到舒服的学习方式</h2></div><button type="button" class="icon-button" data-action="close-settings" aria-label="保存并返回">${icon('close')}</button></div><section class="settings-section"><h3>先选一种体验</h3><p>年龄不决定英语水平。按偏好选择，随时可以切换。</p><div class="choice-grid">${MODES.map(item => `<button class="setting-choice" type="button" data-action="set-mode" data-mode="${item.id}" aria-pressed="${save.profile.mode === item.id}"><span class="setting-choice-title">${h(item.title)} ${save.profile.mode === item.id ? icon('check') : ''}</span><span class="setting-audience">${h(item.audience)}</span><span class="setting-description">${h(item.description)}</span></button>`).join('')}</div></section><section class="settings-section"><h3>再选英语起点</h3><p>决定从哪一关开始，和年龄分开选择。</p><div class="level-choices">${LEVELS.map(item => `<button class="setting-choice" type="button" data-action="set-level" data-level="${item.id}" aria-pressed="${save.profile.level === item.id}"><span class="setting-choice-title">${h(item.title)} ${save.profile.level === item.id ? icon('check') : ''}</span><span class="setting-description">${h(item.description)}</span></button>`).join('')}</div></section><div class="mode-preview">${icon('sound')}<span>${h(mode().title)} · 可以随时点朗读，按自己的节奏来</span><button class="ghost-button" type="button" data-action="test-voice">听听语速</button></div><div class="settings-footer"><span>选择和通关进度保存在当前浏览器</span><button class="primary-button" type="button" data-action="close-settings">按这个方式出发 ${icon('arrow')}</button></div>`;
}
function openSettings() { renderSettings(); openDialog($('settings-dialog')); }
function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  speech = null;
}
function speak(text, language = 'en-US') {
  if (!save.profile.sound) return toast('点击右上角的声音按钮，开启后就能朗读。');
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return toast('这个浏览器暂不支持朗读，你可以对照文字练习。');
  stopSpeaking();
  speech = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const pattern = language.startsWith('zh') ? /^(zh|cmn)/i : /^en/i;
  const voice = voices.find(item => item.lang.toLowerCase() === language.toLowerCase()) || voices.find(item => pattern.test(item.lang));
  if (voice) speech.voice = voice;
  speech.lang = voice?.lang || language;
  speech.rate = mode().speechRate || .85;
  speech.onend = () => { speech = null; };
  speech.onerror = event => { if (!['interrupted', 'canceled'].includes(event.error)) toast('朗读暂时没有成功。先用文字练习也可以。'); };
  window.speechSynthesis.speak(speech);
  return true;
}

const actions = {
  navigate: button => {
    if (!['map', 'review', 'notebook'].includes(button.dataset.page)) return;
    page = button.dataset.page;
    renderPage();
    window.scrollTo({ top: 0, behavior: 'auto' });
    $('main-view').focus({ preventScroll: true });
  },
  'select-zone': button => {
    if (!zoneById(button.dataset.zone)) return;
    const source = button.classList.contains('map-node') ? 'map-node' : 'zone-card';
    selectedZone = button.dataset.zone;
    renderPage();
    document.querySelector(`.${source}[data-zone="${selectedZone}"]`)?.focus({ preventScroll: true });
    if (source === 'zone-card') document.querySelector('.zone-story')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  },
  'start-lesson': button => beginLesson(button.dataset.lesson),
  'start-review': button => beginLesson(button.dataset.lesson, true),
  'start-due-review': () => { const next = getDueReviews(save)[0]; if (next) beginLesson(next, true); },
  'filter-notebook': button => {
    if (button.dataset.zone !== 'all' && !zoneById(button.dataset.zone)) return;
    notebookZone = button.dataset.zone;
    document.querySelectorAll('.filter-chip').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.zone === notebookZone)));
    updateNotebookResults();
  },
  'clear-notebook-filters': () => {
    notebookQuery = '';
    notebookZone = 'all';
    if ($('phrase-search')) $('phrase-search').value = '';
    document.querySelectorAll('.filter-chip').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.zone === 'all')));
    updateNotebookResults();
    $('phrase-search')?.focus();
  },
  'locked-lesson': () => toast('先完成这片小岛的前一关，就能继续出发。已有基础可以在右上角调整起点。'),
  'toggle-sound': () => { captureRecall(); save = { ...save, profile: { ...save.profile, sound: !save.profile.sound } }; if (!save.profile.sound) stopSpeaking(); persist(); renderHeader(); if (session && $('lesson-dialog').open) renderGame(); },
  settings: openSettings,
  'close-settings': () => { stopSpeaking(); closeDialog($('settings-dialog')); },
  'set-mode': button => {
    if (!MODES.some(item => item.id === button.dataset.mode)) return;
    if (save.profile.mode === button.dataset.mode) return;
    save = { ...save, profile: { ...save.profile, mode: button.dataset.mode } };
    selectedZone = mode().recommendedZones?.find(zoneId => completedInZone(zoneId) < 3) || selectedZone;
    refreshDailyPlan({ refresh: true });
    persist(); renderPage(); renderSettings();
    if ($('settings-dialog').open) $('settings-dialog').querySelector('[data-mode="' + save.profile.mode + '"]')?.focus({ preventScroll: true });
    else document.querySelector('.mode-chip[data-mode="' + save.profile.mode + '"]')?.focus({ preventScroll: true });
  },
  'set-level': button => { if (!LEVELS.some(item => item.id === button.dataset.level) || save.profile.level === button.dataset.level) return; save = { ...save, profile: { ...save.profile, level: button.dataset.level } }; refreshDailyPlan({ refresh: true }); persist(); renderPage(); renderSettings(); $('settings-dialog').querySelector('[data-level="' + save.profile.level + '"]')?.focus({ preventScroll: true }); },
  'test-voice': () => speak('Hello! Let’s explore together.'),
  'close-lesson': () => { stopSpeaking(); session = null; closeDialog($('lesson-dialog')); },
  'choose-answer': button => chooseAnswer(Number(button.dataset.index)),
  'listen-option': button => { const step = currentStep(); const option = step?.type === 'choice' && step.options[Number(button.dataset.index)]; if (option) speak(option.text); },
  'listen-response': () => { if (currentStep()?.response) speak(currentStep().response.english); },
  'pick-word': button => pickWord(Number(button.dataset.index)),
  'unpick-word': button => { if (!session?.answered && currentStep()?.type === 'order') { session.picked.splice(Number(button.dataset.position), 1); session.feedback = ''; renderGame(); } },
  'check-order': checkOrder,
  'check-recall': checkRecall,
  'show-hint': () => showHint(false),
  'show-reference': () => showHint(true),
  'oral-check': () => {
    if (!session || session.answered || currentStep()?.type !== 'recall') return;
    captureRecall();
    if (session.sawReference) rememberHint();
    session.selfCheckIndependent = !session.hintSteps.includes(session.stepIndex) && !session.sawReference;
    session.reveal = true;
    session.sawReference = true;
    setFeedback('对照你刚刚说的话。意思相同，就记录一次自己的表达；还没想起来，可以收起参考再试。', 'neutral');
  },
  'hide-reference': () => { if (!session || session.answered) return; captureRecall(); session.reveal = false; setFeedback('现在收起参考句，再用自己的话试一次。', 'neutral'); },
  'self-confirm': () => { if (!session || !session.reveal || currentStep()?.type !== 'recall') return; captureRecall(); session.answered = true; session.matched = session.selfCheckIndependent; setFeedback(session.selfCheckIndependent ? '你用自己的说法完成了表达。下次也可以先不看提示试一句。' : '你已对照意思完成表达。明天可以不看提示再试一句。', 'success'); },
  'next-step': nextStep,
  'listen-step': () => { const step = currentStep(); const text = step && stepAudio(step); if (text && speak(text) && step?.type === 'order' && !session.answered) rememberHint(); },
  'listen-scene': () => { if (currentStep()?.english) speak(currentStep().english); },
  'listen-instruction': () => { if (currentStep()) speak(currentStep().context + '。' + currentStep().prompt, 'zh-CN'); },
  'listen-phrase': button => { const lesson = lessonById(button.dataset.lesson); if (lesson) speak(lesson.phrase); },
  'listen-reward-phrase': button => { if (button.dataset.phrase) speak(button.dataset.phrase); },
  'close-reward': () => { stopSpeaking(); closeDialog($('reward-dialog')); },
  'reward-task': button => { $('reward-dialog').close(); beginLesson(button.dataset.lesson, button.dataset.kind === 'review'); },
  'reward-map': () => { stopSpeaking(); closeDialog($('reward-dialog')); page = 'map'; renderPage(); window.scrollTo({ top: 0, behavior: 'auto' }); $('main-view').focus({ preventScroll: true }); },
  'reward-next': button => { $('reward-dialog').close(); beginLesson(button.dataset.lesson); },
};
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  actions[button.dataset.action]?.(button);
});
document.addEventListener('submit', event => {
  if (event.target.id === 'recall-form') { event.preventDefault(); checkRecall(); }
});
document.addEventListener('input', event => {
  if (event.target.id === 'recall-answer' && session) session.recallText = event.target.value.slice(0, 400);
  if (event.target.id === 'phrase-search') { notebookQuery = event.target.value.slice(0, 100); updateNotebookResults(); }
});
$('lesson-dialog').addEventListener('cancel', () => { stopSpeaking(); session = null; });
$('reward-dialog').addEventListener('cancel', stopSpeaking);
$('settings-dialog').addEventListener('cancel', stopSpeaking);
window.addEventListener('pagehide', stopSpeaking);
document.addEventListener('visibilitychange', () => {
  if (document.hidden || session || document.querySelector('dialog[open]') || page === 'notebook') return;
  renderPage();
});
