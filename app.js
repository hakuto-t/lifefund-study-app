// ===== LIFEFUND 建築知識トレーニング - アプリケーション =====

// ===== Firebase初期化 =====
const firebaseConfig = {
  apiKey: "AIzaSyDhYxaUZEa4CtvIgSM3dnVZJ4_2lCNM3Is",
  authDomain: "lifefund-study-app.firebaseapp.com",
  databaseURL: "https://lifefund-study-app-default-rtdb.firebaseio.com",
  projectId: "lifefund-study-app",
  storageBucket: "lifefund-study-app.firebasestorage.app",
  messagingSenderId: "165298090115",
  appId: "1:165298090115:web:683717ac39b1b55ac76bb6"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// データ統合
const ALL_LEVELS = [...QUIZ_DATA.levels, ...(typeof QUIZ_DATA_2 !== 'undefined' ? QUIZ_DATA_2.levels : [])];

// ===== ストレージキー =====
const KEYS = {
  user: 'lf_user',
  progress: 'lf_progress',
  ranking: 'lf_ranking',
  stats: 'lf_stats'
};

// ===== ランクシステム =====
const RANKS = [
  { xp: 0, name: '見習い', icon: '🔰' },
  { xp: 100, name: 'ルーキー', icon: '🌱' },
  { xp: 300, name: 'アシスタント', icon: '📗' },
  { xp: 600, name: 'アドバイザー', icon: '📘' },
  { xp: 1000, name: 'シニアアドバイザー', icon: '📕' },
  { xp: 1500, name: 'エキスパート', icon: '⭐' },
  { xp: 2500, name: 'マスター', icon: '🌟' },
  { xp: 4000, name: 'グランドマスター', icon: '👑' },
  { xp: 6000, name: 'レジェンド', icon: '🏆' }
];

// ===== バッジシステム =====
const BADGES = [
  { id: 'first_clear', name: '初クリア', icon: '🎯', desc: '初めてレベルをクリア' },
  { id: 'all_clear', name: '全制覇', icon: '🏅', desc: '全レベルをクリア' },
  { id: 'perfect', name: '満点', icon: '💎', desc: 'レベルを満点でクリア' },
  { id: 'streak5', name: '5連続正解', icon: '🔥', desc: '5問連続正解' },
  { id: 'streak10', name: '10連続正解', icon: '🔥🔥', desc: '10問連続正解' },
  { id: 'test_80', name: 'テスト80点', icon: '🎖️', desc: 'テストで80%以上' },
  { id: 'test_100', name: 'テスト満点', icon: '💯', desc: 'テストで満点' },
  { id: 'xp500', name: '500XP', icon: '⚡', desc: '累計500XP獲得' },
  { id: 'xp1000', name: '1000XP', icon: '⚡⚡', desc: '累計1000XP獲得' },
  { id: 'freeform_master', name: '記述マスター', icon: '✍️', desc: '自由記述5問正解' },
  { id: 'speed_demon', name: 'スピードマスター', icon: '⚡', desc: '全問10秒以内に回答' },
  { id: 'daily_3', name: '3日連続', icon: '📆', desc: '3日連続で学習' }
];

// ===== 状態 =====
let state = {
  currentLevel: null,
  questionIndex: 0,
  correct: 0,
  wrong: [],
  questions: [],
  answered: false,
  streak: 0,
  maxStreak: 0,
  isTest: false,
  testSize: 0,
  aiCorrect: false
};

// ===== ユーティリティ =====
function load(key) { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } }
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function getUser() { return load(KEYS.user); }
function getProgress() { return load(KEYS.progress) || {}; }
function getStats() { return load(KEYS.stats) || { xp: 0, totalCorrect: 0, maxStreak: 0, freeformCorrect: 0, badges: [], testBest: 0, days: [] }; }
function getRanking() { return load(KEYS.ranking) || []; }

function getRank(xp) {
  let r = RANKS[0];
  for (const rank of RANKS) { if (xp >= rank.xp) r = rank; }
  return r;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (user) {
    showMainApp();
  } else {
    document.getElementById('registerScreen').style.display = 'flex';
  }

  // Enterキーで登録
  document.getElementById('userName').addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('companyCode').focus();
  });
  document.getElementById('companyCode').addEventListener('keypress', e => {
    if (e.key === 'Enter') registerUser();
  });
});

function registerUser() {
  const name = document.getElementById('userName').value.trim();
  if (!name) { alert('名前を入力してください'); return; }
  const companyCode = document.getElementById('companyCode').value.trim().toUpperCase() || '';
  if (!companyCode) { alert('会社コードを入力してください。\n所属先から共有されたコードを入力してください。'); return; }
  save(KEYS.user, { name, companyCode, created: Date.now() });
  save(KEYS.stats, { xp: 0, totalCorrect: 0, maxStreak: 0, freeformCorrect: 0, badges: [], testBest: 0, days: [] });
  showMainApp();
}

function showMainApp() {
  document.getElementById('registerScreen').style.display = 'none';
  document.getElementById('mainApp').classList.remove('hidden');
  updateHeader();
  renderLevelList();
  renderRanking();
  renderProfile();
  renderTestHistory();
}

// ===== ヘッダー更新 =====
function updateHeader() {
  const user = getUser();
  const stats = getStats();
  const rank = getRank(stats.xp);
  document.getElementById('headerName').textContent = user.name;
  document.getElementById('headerRank').textContent = rank.icon;
  document.getElementById('headerXP').textContent = stats.xp + ' XP';
  const headerCompany = document.getElementById('headerCompany');
  if (headerCompany) {
    headerCompany.textContent = user.companyCode ? `🏢 ${user.companyCode}` : '';
  }
}

// ===== タブ切替 =====
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(tab + 'Tab').classList.add('active');
  if (tab === 'ranking') renderRanking();
  if (tab === 'profile') renderProfile();
}

// ===== レベルリスト =====
function renderLevelList() {
  const progress = getProgress();
  const container = document.getElementById('levelList');
  let cleared = 0;

  container.innerHTML = ALL_LEVELS.map(level => {
    const p = progress[level.id];
    let badge = '', score = '', cls = '';
    if (p) {
      const pct = Math.round((p.score / p.total) * 100);
      if (pct >= 80) { badge = `<span class="level-badge done">✓ クリア</span>`; cls = 'completed'; cleared++; }
      else { badge = `<span class="level-badge progress">${pct}%</span>`; }
      score = `<div class="level-score">ベスト: ${p.score}/${p.total}問 (${pct}%)</div>`;
    } else {
      badge = `<span class="level-badge new">未挑戦</span>`;
    }
    return `<div class="level-card ${cls}" onclick="startLevel(${level.id})">
      <div class="level-icon">${level.icon}</div>
      <div class="level-info"><h3>Lv.${level.id} ${level.name}</h3><p>${level.description}</p>${score}</div>
      ${badge}
    </div>`;
  }).join('');

  const pct = ALL_LEVELS.length > 0 ? Math.round((cleared / ALL_LEVELS.length) * 100) : 0;
  document.getElementById('overallPercent').textContent = pct + '%';
  document.getElementById('overallFill').style.width = pct + '%';
  document.getElementById('overallSub').textContent = `${cleared} / ${ALL_LEVELS.length} レベルクリア（80%正解でクリア）`;
}

// ===== クイズ開始 =====
function startLevel(levelId) {
  const level = ALL_LEVELS.find(l => l.id === levelId);
  if (!level) return;
  const questions = shuffle(level.questions).slice(0, 12); // 12問ランダム出題
  state = { currentLevel: level, questionIndex: 0, correct: 0, wrong: [], questions, answered: false, streak: 0, maxStreak: 0, isTest: false, testSize: 0, aiCorrect: false };
  document.getElementById('quizLevelName').textContent = `Lv.${level.id} ${level.name}`;
  document.getElementById('quizOverlay').classList.remove('hidden');
  renderQuizQuestion();
}

function startTest(size) {
  const allQ = [];
  ALL_LEVELS.forEach(l => l.questions.forEach(q => allQ.push({ ...q, levelName: l.name })));
  const questions = shuffle(allQ).slice(0, size);
  state = { currentLevel: null, questionIndex: 0, correct: 0, wrong: [], questions, answered: false, streak: 0, maxStreak: 0, isTest: true, testSize: size, aiCorrect: false };
  document.getElementById('quizLevelName').textContent = '総合テスト';
  document.getElementById('quizOverlay').classList.remove('hidden');
  renderQuizQuestion();
}

function exitQuiz() {
  if (!state.answered && state.questionIndex > 0) {
    if (!confirm('途中で終了しますか？進捗は保存されません。')) return;
  }
  document.getElementById('quizOverlay').classList.add('hidden');
}

function retryQuiz() {
  document.getElementById('resultOverlay').classList.add('hidden');
  if (state.isTest) startTest(state.testSize);
  else if (state.currentLevel) startLevel(state.currentLevel.id);
}

function closeResult() {
  document.getElementById('resultOverlay').classList.add('hidden');
  renderLevelList();
  renderProfile();
  updateHeader();
}

// ===== 問題レンダリング =====
function renderQuizQuestion() {
  const q = state.questions[state.questionIndex];
  const total = state.questions.length;
  const cur = state.questionIndex + 1;

  document.getElementById('quizCounter').textContent = `${cur} / ${total}`;
  document.getElementById('quizProgressFill').style.width = ((cur - 1) / total * 100) + '%';
  document.getElementById('quizStreakDisplay').textContent = state.streak > 0 ? `🔥 ${state.streak}` : '';

  const body = document.getElementById('quizBody');
  const typeBadge = q.type === 'freeform'
    ? '<span class="question-type-badge free">✍️ 自由記述</span>'
    : '<span class="question-type-badge choice">4択</span>';

  const diagramHTML = q.diagram ? `<div class="question-diagram">${q.diagram}</div>` : '';

  if (q.type === 'freeform') {
    body.innerHTML = `
      <div class="question-card">
        ${typeBadge}
        <div class="question-text">${q.q}</div>
        ${diagramHTML}
        <textarea class="freeform-area" id="freeformInput" placeholder="あなたの回答を入力してください..."></textarea>
        <button class="freeform-submit" id="freeformSubmit" onclick="submitFreeform()">回答を送信する</button>
        <div class="explanation-box" id="explanationBox">
          <div class="result-label" id="resultLabel"></div>
          <p id="explanationText"></p>
        </div>
      </div>
      <button class="next-btn" id="nextBtn" onclick="nextQuestion()">次の問題へ</button>`;
  } else {
    const indices = shuffle(q.choices.map((_, i) => i));
    body.innerHTML = `
      <div class="question-card">
        ${typeBadge}
        <div class="question-text">${q.q}</div>
        ${diagramHTML}
        <div class="choices">${indices.map(i =>
          `<button class="choice-btn" data-index="${i}" onclick="selectAnswer(${i})">${q.choices[i]}</button>`
        ).join('')}</div>
        <div class="explanation-box" id="explanationBox">
          <div class="result-label" id="resultLabel"></div>
          <p id="explanationText"></p>
          <div class="explanation-diagram" id="explanationDiagram"></div>
        </div>
      </div>
      <button class="next-btn" id="nextBtn" onclick="nextQuestion()">次の問題へ</button>`;
  }
  state.answered = false;
}

// ===== 4択回答 =====
function selectAnswer(idx) {
  if (state.answered) return;
  state.answered = true;
  const q = state.questions[state.questionIndex];
  const isCorrect = idx === q.answer;

  document.querySelectorAll('.choice-btn').forEach(btn => {
    const i = parseInt(btn.dataset.index);
    btn.classList.add('disabled');
    if (i === q.answer) btn.classList.add('correct');
    else if (i === idx && !isCorrect) btn.classList.add('wrong');
  });

  processAnswer(isCorrect, q);
}

// ===== 自由記述回答 =====
function submitFreeform() {
  const input = document.getElementById('freeformInput').value.trim();
  if (!input) { alert('回答を入力してください'); return; }
  if (state.answered) return;
  state.answered = true;

  document.getElementById('freeformSubmit').disabled = true;
  document.getElementById('freeformInput').disabled = true;

  // AI判定モーダル表示
  const modal = document.getElementById('aiModal');
  modal.classList.remove('hidden');
  document.getElementById('aiThinking').classList.remove('hidden');
  document.getElementById('aiResult').classList.add('hidden');

  const q = state.questions[state.questionIndex];

  // キーワードマッチングによるAI風判定
  setTimeout(() => {
    const inputLower = input.toLowerCase();
    const matched = q.keywords.filter(kw => inputLower.includes(kw.toLowerCase()));
    const matchRatio = matched.length / q.keywords.length;

    let isCorrect, feedback;
    if (matchRatio >= 0.4) {
      isCorrect = true;
      if (matchRatio >= 0.7) {
        feedback = `素晴らしい回答です！主要なポイントをしっかり押さえています。\n\n【模範回答】\n${q.explanation}\n\n【あなたの回答で含まれていたポイント】\n${matched.map(k => '✅ ' + k).join('\n')}`;
      } else {
        feedback = `概ね正しい回答です。いくつかのポイントが含まれていました。\n\n【模範回答】\n${q.explanation}\n\n【含まれていたポイント】\n${matched.map(k => '✅ ' + k).join('\n')}\n\n【不足していたポイント】\n${q.keywords.filter(k => !matched.includes(k)).map(k => '⬜ ' + k).join('\n')}`;
      }
    } else {
      isCorrect = false;
      feedback = `もう少し詳しい回答が必要です。\n\n【模範回答】\n${q.explanation}\n\n【重要なキーワード】\n${q.keywords.map(k => matched.includes(k) ? '✅ ' + k : '❌ ' + k).join('\n')}`;
    }

    state.aiCorrect = isCorrect;

    document.getElementById('aiThinking').classList.add('hidden');
    document.getElementById('aiResult').classList.remove('hidden');
    document.getElementById('aiResultIcon').textContent = isCorrect ? '✅' : '❌';
    document.getElementById('aiResultLabel').textContent = isCorrect ? '正解！' : '不正解';
    document.getElementById('aiResultLabel').style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
    document.getElementById('aiResultDetail').innerHTML = feedback.replace(/\n/g, '<br>');

    processAnswer(isCorrect, q, true);
  }, 1500);
}

function continueAfterAI() {
  document.getElementById('aiModal').classList.add('hidden');
  const isLast = state.questionIndex >= state.questions.length - 1;
  document.getElementById('nextBtn').textContent = isLast ? '結果を見る' : '次の問題へ';
  document.getElementById('nextBtn').classList.add('show');
}

// ===== 回答処理 =====
function processAnswer(isCorrect, q, isFreeform = false) {
  if (isCorrect) {
    state.correct++;
    state.streak++;
    if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    showXPPopup('+10 XP');
    if (state.streak === 5) showStreakEffect('🔥 5連続正解！');
    if (state.streak === 10) showStreakEffect('🔥🔥 10連続正解！！');
  } else {
    state.streak = 0;
    state.wrong.push({
      question: q.q,
      correctAnswer: q.type === 'freeform' ? '（自由記述）' : q.choices[q.answer],
      explanation: q.explanation,
      diagram: q.diagram || null
    });
  }

  // 解説表示（4択の場合のみ、自由記述はAIモーダルで表示）
  if (!isFreeform) {
    const label = document.getElementById('resultLabel');
    label.textContent = isCorrect ? '✅ 正解！' : '❌ 不正解';
    label.className = 'result-label ' + (isCorrect ? 'correct' : 'wrong');
    document.getElementById('explanationText').textContent = q.explanation;

    // 図解がある場合は解説にも表示
    const diagEl = document.getElementById('explanationDiagram');
    if (diagEl) diagEl.innerHTML = q.explanationDiagram || q.diagram || '';

    document.getElementById('explanationBox').classList.add('show');

    const isLast = state.questionIndex >= state.questions.length - 1;
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.textContent = isLast ? '結果を見る' : '次の問題へ';
    nextBtn.classList.add('show');
  }
}

function nextQuestion() {
  state.questionIndex++;
  if (state.questionIndex >= state.questions.length) {
    showResult();
  } else {
    renderQuizQuestion();
  }
}

// ===== XPポップアップ =====
function showXPPopup(text) {
  const el = document.createElement('div');
  el.className = 'xp-popup';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function showStreakEffect(text) {
  const el = document.createElement('div');
  el.className = 'streak-effect';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ===== 結果表示 =====
function showResult() {
  document.getElementById('quizOverlay').classList.add('hidden');

  const score = state.correct;
  const total = state.questions.length;
  const pct = Math.round((score / total) * 100);
  const xpEarned = score * 10 + (state.maxStreak >= 5 ? 20 : 0) + (pct === 100 ? 50 : 0);

  // 保存
  const stats = getStats();
  stats.xp += xpEarned;
  stats.totalCorrect += score;
  if (state.maxStreak > stats.maxStreak) stats.maxStreak = state.maxStreak;
  stats.freeformCorrect += state.questions.filter((q, i) => q.type === 'freeform' && !state.wrong.find(w => w.question === q.q)).length;

  // 今日の学習記録
  const today = new Date().toISOString().slice(0, 10);
  if (!stats.days) stats.days = [];
  if (!stats.days.includes(today)) stats.days.push(today);

  // バッジ判定
  if (!stats.badges) stats.badges = [];
  if (pct >= 80 && !stats.badges.includes('first_clear')) stats.badges.push('first_clear');
  if (pct === 100 && !stats.badges.includes('perfect')) stats.badges.push('perfect');
  if (state.maxStreak >= 5 && !stats.badges.includes('streak5')) stats.badges.push('streak5');
  if (state.maxStreak >= 10 && !stats.badges.includes('streak10')) stats.badges.push('streak10');
  if (stats.xp >= 500 && !stats.badges.includes('xp500')) stats.badges.push('xp500');
  if (stats.xp >= 1000 && !stats.badges.includes('xp1000')) stats.badges.push('xp1000');
  if (stats.freeformCorrect >= 5 && !stats.badges.includes('freeform_master')) stats.badges.push('freeform_master');

  // レベルクリア判定
  if (!state.isTest && state.currentLevel) {
    const progress = getProgress();
    const existing = progress[state.currentLevel.id];
    if (!existing || score > existing.score) {
      progress[state.currentLevel.id] = { score, total, date: Date.now() };
    }
    save(KEYS.progress, progress);

    // 全クリア判定
    const allCleared = ALL_LEVELS.every(l => {
      const p = progress[l.id];
      return p && (p.score / p.total) >= 0.8;
    });
    if (allCleared && !stats.badges.includes('all_clear')) stats.badges.push('all_clear');
  }

  // テスト結果
  if (state.isTest) {
    const testScore = Math.round((score / total) * 100);
    if (testScore > stats.testBest) stats.testBest = testScore;
    if (testScore >= 80 && !stats.badges.includes('test_80')) stats.badges.push('test_80');
    if (testScore === 100 && !stats.badges.includes('test_100')) stats.badges.push('test_100');

    // ランキング更新（Firebase + localStorage）
    const user = getUser();
    const companyCode = user.companyCode || '';
    const rankingKey = companyCode + '_' + user.name;
    // Firebaseのキーに使えない文字を置換
    const safeKey = rankingKey.replace(/[.#$\/\[\]]/g, '_');
    const entry = { name: user.name, companyCode, score: testScore, date: Date.now() };

    // Firebaseに保存（ベストスコアのみ更新）
    const ref = db.ref('ranking/' + safeKey);
    ref.once('value').then(snap => {
      const existing = snap.val();
      if (!existing || testScore > existing.score) {
        ref.set(entry);
      } else {
        ref.update({ date: Date.now() });
      }
    }).catch(err => console.warn('Firebase ranking write failed:', err));

    // localStorageにもフォールバック保存
    let ranking = getRanking();
    const existingLocal = ranking.find(r => r.name === user.name && r.companyCode === companyCode);
    if (existingLocal) {
      if (testScore > existingLocal.score) existingLocal.score = testScore;
      existingLocal.date = Date.now();
    } else {
      ranking.push(entry);
    }
    ranking.sort((a, b) => b.score - a.score);
    save(KEYS.ranking, ranking);
  }

  // 連続学習日数
  if (stats.days && stats.days.length >= 3) {
    const sorted = [...stats.days].sort().reverse();
    let consecutive = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i-1]) - new Date(sorted[i])) / (1000*60*60*24);
      if (diff <= 1) consecutive++; else break;
    }
    if (consecutive >= 3 && !stats.badges.includes('daily_3')) stats.badges.push('daily_3');
  }

  save(KEYS.stats, stats);

  // 結果UI
  const overlay = document.getElementById('resultOverlay');
  overlay.classList.remove('hidden');

  let emoji, msg;
  if (pct >= 90) { emoji = '🎉'; msg = '素晴らしい！この分野はほぼマスターしています！'; }
  else if (pct >= 80) { emoji = '🎊'; msg = 'クリア！しっかり知識が身についています。'; }
  else if (pct >= 60) { emoji = '💪'; msg = 'あと少し！間違えた問題を復習して再チャレンジしましょう。'; }
  else { emoji = '📚'; msg = '解説をしっかり読んで知識を定着させてから再チャレンジ！'; }

  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('resultTitle').textContent = state.isTest ? '総合テスト結果' : `Lv.${state.currentLevel.id} ${state.currentLevel.name}`;
  document.getElementById('resultScoreNum').textContent = score;
  document.getElementById('resultScoreDen').textContent = `/ ${total}問正解`;
  document.getElementById('resultXP').textContent = `+${xpEarned} XP`;
  document.getElementById('resultMessage').textContent = msg;

  // スコアリング
  const circumference = 339.292;
  const offset = circumference - (pct / 100) * circumference;
  const circle = document.getElementById('resultCircle');
  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
  circle.style.stroke = color;
  setTimeout(() => { circle.style.strokeDashoffset = offset; }, 100);

  // 復習セクション
  const reviewSection = document.getElementById('reviewSection');
  const reviewList = document.getElementById('reviewList');
  if (state.wrong.length > 0) {
    reviewSection.style.display = 'block';
    reviewList.innerHTML = state.wrong.map(w => `
      <div class="review-item">
        <div class="review-q">Q: ${w.question}</div>
        <div class="review-a">正解: ${w.correctAnswer}</div>
        <div class="review-exp">${w.explanation}</div>
        ${w.diagram ? `<div style="margin-top:8px">${w.diagram}</div>` : ''}
      </div>`).join('');
  } else {
    reviewSection.style.display = 'none';
  }

  // 結果画面からリセット
  circle.style.strokeDashoffset = circumference;
  setTimeout(() => { circle.style.strokeDashoffset = offset; }, 200);
}

// ===== ランキング =====
function renderRanking() {
  const user = getUser();
  const container = document.getElementById('rankingList');
  const companyLabel = document.getElementById('rankingCompanyLabel');
  const userCode = user ? (user.companyCode || '') : '';

  // 会社コードラベル表示
  if (companyLabel) {
    companyLabel.textContent = userCode ? `📋 ${userCode} のランキング` : '';
    companyLabel.style.display = userCode ? 'block' : 'none';
  }

  // ローディング表示
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)">ランキングを読み込み中...</div>';

  // Firebaseからランキングを取得
  db.ref('ranking').once('value').then(snap => {
    const data = snap.val();
    let allEntries = [];
    if (data) {
      allEntries = Object.values(data);
    }

    // 会社コードでフィルタリング
    const ranking = allEntries
      .filter(r => (r.companyCode || '') === userCode)
      .sort((a, b) => b.score - a.score);

    displayRanking(ranking, user, container);
  }).catch(err => {
    console.warn('Firebase ranking read failed, using localStorage:', err);
    // フォールバック: localStorageから取得
    const allRanking = getRanking();
    const ranking = allRanking.filter(r => (r.companyCode || '') === userCode);
    displayRanking(ranking, user, container);
  });
}

function displayRanking(ranking, user, container) {
  if (ranking.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)">まだランキングデータがありません。<br>総合テストを受けてみましょう！</div>';
    return;
  }

  container.innerHTML = ranking.map((r, i) => {
    const posClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'normal';
    const topClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const meClass = r.name === user.name ? 'me' : '';
    return `<div class="ranking-item ${topClass} ${meClass}">
      <div class="ranking-pos ${posClass}">${i + 1}</div>
      <div class="ranking-name">${r.name}${r.name === user.name ? ' (あなた)' : ''}</div>
      <div class="ranking-score">${r.score}<small>点</small></div>
    </div>`;
  }).join('');
}

// ===== テスト履歴 =====
function renderTestHistory() {
  const stats = getStats();
  const container = document.getElementById('testHistory');
  if (stats.testBest > 0) {
    container.innerHTML = `<h3>あなたのベストスコア</h3>
      <div style="background:var(--white);border-radius:var(--radius-sm);padding:16px;box-shadow:var(--shadow);text-align:center">
        <div style="font-size:2rem;font-weight:700;color:var(--accent)">${stats.testBest}<small style="font-size:1rem">点</small></div>
      </div>`;
  }
}

// ===== プロフィール =====
function renderProfile() {
  const user = getUser();
  const stats = getStats();
  if (!user) return;
  const rank = getRank(stats.xp);

  document.getElementById('profileName').textContent = user.name;
  document.getElementById('profileRankBadge').textContent = rank.icon;
  document.getElementById('profileRankName').textContent = rank.name;
  const profileCompany = document.getElementById('profileCompany');
  if (profileCompany) {
    profileCompany.textContent = user.companyCode ? `🏢 ${user.companyCode}` : '';
  }
  document.getElementById('profileXP').textContent = stats.xp;
  document.getElementById('profileCorrect').textContent = stats.totalCorrect;
  document.getElementById('profileStreak').textContent = stats.maxStreak;
  document.getElementById('profileBest').textContent = stats.testBest > 0 ? stats.testBest + '点' : '-';

  // バッジ
  const grid = document.getElementById('badgesGrid');
  grid.innerHTML = BADGES.map(b => {
    const has = stats.badges && stats.badges.includes(b.id);
    return `<div class="badge-item ${has ? '' : 'locked'}" title="${b.desc}">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
    </div>`;
  }).join('');
}

// ===== リセット =====
function resetAllData() {
  if (!confirm('すべての学習データ・ランキングデータをリセットしますか？\nこの操作は取り消せません。')) return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  location.reload();
}
