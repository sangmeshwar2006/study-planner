// StudyPlanner: task management, streaks, pomodoro, analytics, dark mode.
const STORAGE_KEY = 'study_planner_tasks_v2';
const STREAK_KEY = 'study_planner_streak';
const THEME_KEY = 'study_planner_theme';

const taskListEl = document.getElementById('task-list');
const taskForm = document.getElementById('task-form');
const taskCountEl = document.getElementById('task-count');
const editIdInput = document.getElementById('edit-id');

const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statPending = document.getElementById('stat-pending');
const statHours = document.getElementById('stat-hours');

const streakCountEl = document.getElementById('streak-count');
const streakMainEl = document.getElementById('streak-main');

const toastEl = document.getElementById('toast');

const quoteEls = [document.getElementById('quote'), document.getElementById('quote-main')];

// Pomodoro elements
const timerDisplay = document.getElementById('timer-display');
const timerLabel = document.getElementById('timer-label');
const progressRing = document.getElementById('progress-ring');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

let tasks = [];
let statusChart, dailyChart, weeklyChart;
let streak = { count: 0, lastDate: null };

// ------------------ Quotes ------------------
const quotes = [
  'Small progress is still progress.',
  'Discipline beats motivation.',
  'Focus on the process, not the outcome.',
  'One page at a time gets the book done.',
  'Your future self is counting on you.',
  'Consistency makes miracles look easy.',
];

const setQuote = () => {
  const pick = quotes[Math.floor(Math.random() * quotes.length)];
  quoteEls.forEach((el) => el && (el.textContent = pick));
};

// ------------------ LocalStorage helpers ------------------
const saveTasks = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
const loadTasks = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  tasks = data ? JSON.parse(data) : [];
  tasks = tasks.map((t) => ({
    id: t.id,
    subject: t.subject || t.title || 'Subject',
    title: t.title || t.description || 'Task',
    date: t.date,
    priority: t.priority || 'Medium',
    completed: Boolean(t.completed),
    completedDate: t.completedDate || null,
  }));
};

const saveStreak = () => localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
const loadStreak = () => {
  const data = localStorage.getItem(STREAK_KEY);
  streak = data ? JSON.parse(data) : { count: 0, lastDate: null };
};

// ------------------ Toast ------------------
const toast = (msg) => {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1700);
};

// ------------------ Task rendering ------------------
const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const renderTasks = () => {
  taskListEl.innerHTML = '';
  if (!tasks.length) {
    taskListEl.innerHTML = `<p class="empty">No tasks yet. Add one to begin!</p>`;
    taskCountEl.textContent = '0 items';
    updateStats();
    return;
  }

  tasks
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((task) => {
      const card = document.createElement('div');
      card.className = `task-card ${task.completed ? 'completed' : ''}`;
      card.innerHTML = `
        <header>
          <div>
            <strong>${task.subject}</strong>
            <p>${task.title}</p>
          </div>
          <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
        </header>
        <div class="task-meta">
          <span><i class="fa-regular fa-calendar"></i> ${formatDate(task.date)}</span>
          <span class="badge ${task.completed ? 'done' : ''}">${task.completed ? 'Completed' : 'Pending'}</span>
        </div>
        <div class="task-actions">
          <button data-action="complete" data-id="${task.id}"><i class="fa-solid fa-check"></i></button>
          <button data-action="edit" data-id="${task.id}"><i class="fa-solid fa-pen"></i></button>
          <button data-action="delete" data-id="${task.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      taskListEl.appendChild(card);
    });

  taskCountEl.textContent = `${tasks.length} item${tasks.length > 1 ? 's' : ''}`;
  updateStats();
};

// ------------------ Stats & charts ------------------
const updateStats = () => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const todayIso = new Date().toISOString().slice(0, 10);
  const completedToday = tasks.filter((t) => t.completedDate === todayIso).length;
  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statPending.textContent = pending;
  statHours.textContent = Math.max(0, Math.round((completedToday * 25) / 60)); // rough estimate: 25 mins per task
  renderCharts(completed, pending);
};

const renderCharts = (completed, pending) => {
  const statusCtx = document.getElementById('status-chart');
  const dailyCtx = document.getElementById('daily-chart');
  const weeklyCtx = document.getElementById('weekly-chart');

  statusChart?.destroy();
  dailyChart?.destroy();
  weeklyChart?.destroy();

  statusChart = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{ data: [completed, pending], backgroundColor: ['#14b8a6', '#7c3aed'], borderWidth: 0 }],
    },
    options: { plugins: { legend: { position: 'bottom' } } },
  });

  // Daily counts
  const dayCounts = tasks.reduce((acc, t) => {
    acc[t.date] = (acc[t.date] || 0) + 1;
    return acc;
  }, {});
  const dayLabels = Object.keys(dayCounts).sort();
  const dayValues = dayLabels.map((k) => dayCounts[k]);

  dailyChart = new Chart(dailyCtx, {
    type: 'bar',
    data: {
      labels: dayLabels.map((d) => formatDate(d)),
      datasets: [{ label: 'Tasks', data: dayValues, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 8 }],
    },
    options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } },
  });

  // Weekly productivity (last 7 days, completed tasks)
  const today = new Date();
  const weeks = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const count = tasks.filter((t) => t.completed && t.completedDate === iso).length;
    return { label: d.toLocaleDateString(undefined, { weekday: 'short' }), count };
  });

  weeklyChart = new Chart(weeklyCtx, {
    type: 'line',
    data: {
      labels: weeks.map((w) => w.label),
      datasets: [
        { label: 'Completed', data: weeks.map((w) => w.count), borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.25)', tension: 0.35, fill: true },
      ],
    },
    options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } },
  });
};

// ------------------ Streak logic ------------------
const updateStreak = (completedDate) => {
  if (!completedDate) return;
  const today = new Date(completedDate);
  const last = streak.lastDate ? new Date(streak.lastDate) : null;
  const diffDays = last ? Math.floor((today - last) / (1000 * 60 * 60 * 24)) : null;

  if (diffDays === 0) {
    // same day, no change
  } else if (diffDays === 1 || last === null) {
    streak.count += 1;
    streak.lastDate = completedDate;
  } else if (diffDays > 1) {
    streak.count = 1;
    streak.lastDate = completedDate;
  }

  streakCountEl.textContent = streak.count;
  streakMainEl.textContent = `${streak.count} Day${streak.count === 1 ? '' : 's'}`;
  saveStreak();
};

// ------------------ Form handlers ------------------
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const subject = document.getElementById('subject').value.trim();
  const title = document.getElementById('title').value.trim();
  const date = document.getElementById('date').value;
  const priority = document.getElementById('priority').value;

  if (!subject || !title || !date) return;

  const id = editIdInput.value ? Number(editIdInput.value) : Date.now();
  const existing = tasks.find((t) => t.id === id);

  if (existing) {
    Object.assign(existing, { subject, title, date, priority });
    toast('Task updated');
  } else {
    tasks.push({ id, subject, title, date, priority, completed: false, completedDate: null });
    toast('Task added');
  }

  editIdInput.value = '';
  taskForm.reset();
  saveTasks();
  renderTasks();
});

taskListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  if (action === 'delete') {
    tasks = tasks.filter((t) => t.id !== id);
    toast('Task deleted');
  }
  if (action === 'complete') {
    const todayIso = new Date().toISOString().slice(0, 10);
    task.completed = !task.completed;
    task.completedDate = task.completed ? todayIso : null;
    if (task.completed) updateStreak(todayIso);
    toast(task.completed ? 'Task completed' : 'Marked pending');
  }
  if (action === 'edit') {
    document.getElementById('subject').value = task.subject;
    document.getElementById('title').value = task.title;
    document.getElementById('date').value = task.date;
    document.getElementById('priority').value = task.priority;
    editIdInput.value = task.id;
    toast('Edit mode: update and save');
    window.scrollTo({ top: document.getElementById('tasks').offsetTop - 10, behavior: 'smooth' });
  }

  saveTasks();
  renderTasks();
});

// ------------------ Pomodoro ------------------
let mode = 'focus';
let seconds = 25 * 60;
let timerInterval = null;
const circumference = 2 * Math.PI * 100; // r=100

progressRing.style.strokeDasharray = circumference;

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const setTimerDisplay = () => {
  timerDisplay.textContent = formatTime(seconds);
  timerLabel.textContent = mode === 'focus' ? 'Focus' : 'Break';
  const progress = (seconds / (mode === 'focus' ? 1500 : 300)) * circumference;
  progressRing.style.strokeDashoffset = circumference - progress;
};

const switchMode = () => {
  mode = mode === 'focus' ? 'break' : 'focus';
  seconds = mode === 'focus' ? 25 * 60 : 5 * 60;
  setTimerDisplay();
};

const tick = () => {
  if (seconds <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    alert(mode === 'focus' ? 'Time for a 5 minute break!' : "Let's focus again!");
    switchMode();
    return;
  }
  seconds -= 1;
  setTimerDisplay();
};

startBtn.addEventListener('click', () => {
  if (timerInterval) return;
  timerInterval = setInterval(tick, 1000);
});

pauseBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
});

resetBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
  mode = 'focus';
  seconds = 25 * 60;
  setTimerDisplay();
});

// ------------------ Navigation highlighting ------------------
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// ------------------ Theme toggle ------------------
const body = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');

const applyTheme = (theme) => {
  if (theme === 'dark') body.classList.add('dark');
  else body.classList.remove('dark');
  localStorage.setItem(THEME_KEY, theme);
};

themeToggle.addEventListener('click', () => {
  const newTheme = body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(newTheme);
});

// ------------------ Init ------------------
document.getElementById('random-quote')?.addEventListener('click', setQuote);
document.getElementById('quote-refresh')?.addEventListener('click', setQuote);

const init = () => {
  loadTasks();
  loadStreak();
  const storedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(storedTheme);
  streakCountEl.textContent = streak.count;
  streakMainEl.textContent = `${streak.count} Day${streak.count === 1 ? '' : 's'}`;
  setQuote();
  renderTasks();
  setTimerDisplay();
};

init();
