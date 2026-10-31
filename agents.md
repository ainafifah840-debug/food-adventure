# AGENTS.md – Food Adventure!

## What this is
A static, single-page educational website (Year 5 English, Food and Health, Malaysia). The user explicitly asked for **HTML5 + CSS3 + vanilla JavaScript with no frameworks or backend**. Keep it that way: no build step, no npm dependencies, no external services or API keys.

## Structure
- `index.html`: every screen as a `<section class="screen" data-route="…">`, plus the header nav, status/badge bar, back/next "journey" bar and footer.
- `css/styles.css`: all styling. Palette variables are at the top (pastel green, light yellow, soft orange, cream, light blue, heading green `#356B48`). Responsive breakpoints are at 1080/860/640px.
- `js/data.js`: **all learning content** (`window.FA_DATA`): foods, checkpoint, matching rounds, speaking content, interview script, True/False items and quiz. Edit content here, not in `app.js`.
- `js/app.js`: one IIFE containing the hash router (`ROUTES` order drives Back/Next), the `Speech` TTS helper, the `benny(pose)` SVG mascot generator, and the modules `Flash`, `Check`, `Match`, speaking setup, `Listening`, `TF`, `Quiz` and `renderSummary`.
- `netlify.toml`: publishes the repo root as-is.

## Conventions and decisions
- Routing is hash-based (`#menu`, `#discovery`, …). The "Home" nav item goes to the dashboard (`#menu`). The brand logo goes to the welcome page.
- Any element with `data-say="text"` speaks that text through a delegated click handler.
- Interview playback speaks line by line. Pause cancels speech and resumes from the start of the current line, which is more reliable across browsers than `speechSynthesis.pause()`. A `token` guards against stale `onend` callbacks.
- Choice inputs are native radios/checkboxes styled as tiles, which gives keyboard support and single selection. Quiz True/False answers are stored as option indexes (0 = TRUE).
- The flashcard back face uses `inert` while hidden. The Malay translation must never appear on the front face, because pupils infer meaning first.
- The speaking page must not claim to assess speech. No speech recognition is implemented.
- Content Standards shown are only 1.3, 2.1 and 2.3 as supplied. Do not invent Learning Standard codes. Add exact codes only if the teacher's instructional plan provides them.
- Progress is stored under `localStorage["foodAdventureProgress.v1"]`, holding flags and scores only and no personal data.
