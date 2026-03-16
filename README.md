# StudyPlanner

A modern, student-friendly study planner web app built with HTML, CSS, and JavaScript. It includes:

- Task/subject planner with LocalStorage persistence and streak tracking.
- Pomodoro timer with circular progress and alerts.
- Dashboard stats and Chart.js analytics (doughnut, bar, weekly line charts).
- Dark mode, motivational quotes, and responsive layout.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000

## Structure

- `index.html` — layout and sections (dashboard, tasks, pomodoro, analytics, settings).
- `style.css` — gradient theme, glassmorphism cards, responsive grid, animations.
- `script.js` — task CRUD + LocalStorage, streaks, quotes, pomodoro logic, Chart.js setup.
- `assets/` — icons and images placeholders.

## Deploying to GitHub Pages

1. Create a GitHub repo (e.g., `study-planner`).
2. Push this code (see commands below).
3. In repo settings, enable Pages using branch `main`, folder `/root`.

### Push commands (after replacing placeholders)

```bash
git remote add origin https://github.com/<your-username>/<repo>.git
git branch -M main
git add .
git commit -m "Initial commit: StudyPlanner"
git push -u origin main
```
