# FOOD ADVENTURE! – Discover, Guess & Match

An interactive English courseware website for Malaysian **Year 5** pupils on the topic **Food and Health**. Chef Benny, an original cartoon chef, guides pupils through bilingual flashcards, a matching game, a speaking corner, a listening interview and a final quiz. English is the main language, with short Bahasa Melayu support lines.

## What's inside

| Page | What pupils do | Objective |
| --- | --- | --- |
| Welcome | Meet Chef Benny, press START LEARNING | – |
| Learning Objectives | See today's three missions (teacher panel shows curriculum alignment) | – |
| Main Menu (dashboard) | Choose from four large activity cards and track badges | – |
| Food Discovery Book | 10 flip-cards: picture, word, 3 clues, optional guess → flip to see the Malay meaning and an example sentence, with pronunciation audio | 1 Vocabulary |
| Vocabulary Checkpoint | 5 multiple-choice clue questions with instant feedback, score and retry | 1 Vocabulary |
| Food Matching Challenge | Click/tap matching of pictures to words, 2 rounds, score and tries | 1 Vocabulary |
| Speaking Corner | Interview questions with audio and example answers, sentence starters, guided pair interview, word helper, confidence checklist | 2 Speaking |
| Listening Corner | Healthy Eating Interview audio (Play / Pause / Replay, voice and speed), 5 True/False statements, transcript after submitting | 3 Listening |
| Final Quiz | 10 mixed MCQ and True/False questions, one at a time, review answers and retake | 1–3 |
| Completion | Celebration, activity summary, return to menu or repeat | – |

## Technology

- Plain **HTML5, CSS3 and vanilla JavaScript**, with no framework, build step or backend.
- Audio uses the browser's built-in **Web Speech API** (text-to-speech). If a browser has no voices, the site says so and unlocks the transcript so a teacher can read it aloud.
- Illustrations are an original inline-SVG mascot plus emoji, so there are no external image files to break.
- Progress badges are kept in the browser's `localStorage` only. There are no accounts, no log-in and no personal data.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
netlify dev --port 8889
```

## Deploy

The site is static. `netlify.toml` publishes the project root with no build command.

## Editing content

All vocabulary, clues, translations, questions and the interview script are in `js/data.js`.
