# Optional pre-recorded narration

The site is configured to try MP3 recordings first and fall back to browser text-to-speech whenever a recording is not present or cannot be played. Add recordings using the exact filenames below. Use clear, child-friendly English and keep each clip short.

## Instructions
- `instructions/welcome.mp3` – “Hello, Food Explorers! Are you ready to discover the wonderful world of food?”
- `instructions/missions.mp3` – the three pupil-facing learning missions shown on the objectives page.

## Vocabulary (repeat for each food ID: apple, banana, orange, carrot, broccoli, spinach, fish, chicken, bread, milk)
- `vocabulary/<food-id>-word.mp3` – say the English food word.
- `vocabulary/<food-id>-clues.mp3` – read the three clues aloud.
- `vocabulary/<food-id>-sentence.mp3` – read the example sentence aloud.

## Sarah interview
Add `interview/line-01.mp3` through `interview/line-10.mp3`, one spoken interview line per file, in the same order as the interview transcript in `js/data.js`. Keep the Interviewer and Sarah voices distinct if possible.

No audio files are included yet. Until recordings are added, the site automatically uses the browser voice as a fallback.
