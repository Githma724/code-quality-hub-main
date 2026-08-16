# Setup — Selection Stats Dashboard

Shows how many developers have responded to your Google Form and which LLM
gets chosen most, pulled live from the Sheet — no backend, same philosophy
as the rest of the app.

## 1. Copy these files in

```
src/lib/csv.ts
src/hooks/useFormStats.ts
src/components/FormStatsDashboard.tsx
src/pages/Stats.tsx
src/App.tsx          (replaces the existing one — adds the /stats route)
src/pages/Index.tsx  (replaces the existing one — adds a "Selection Stats" link)
```

## 2. Publish the responses Sheet as CSV

1. Open the Google Sheet linked to your Form's responses.
2. **File → Share → Publish to web**.
3. Under "Link", pick the specific sheet/tab with the responses (not "Entire
   document" if you have multiple tabs).
4. Set format to **Comma-separated values (.csv)**.
5. Click **Publish**, confirm, and copy the URL it gives you. It looks like:
   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-1vT.../pub?output=csv
   ```

## 3. Wire the URL and column name into the code

Open `src/hooks/useFormStats.ts`:

```ts
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkDjn4O4oamE14JaVYRi9keo0wO7VTkvgOihsOuGwQZI8Dm4CCnnyR4E3PmEC3ww4pBUBA6MmjefpR/pub?output=csv";

const CHOSEN_LLM_COLUMN =
  "Which LLM output did you choose? (Claude / GPT-4 / Gemini)";
```

- Replace `SHEET_CSV_URL` with the link from step 2.
- Replace `CHOSEN_LLM_COLUMN` with the **exact text** of your Form's
  question that asks which LLM was chosen — Google Sheets uses the
  question text itself as the column header, so this has to match
  character-for-character (including punctuation).

`FormStatsDashboard.tsx` also references this same column name in one
place (the "Most recent responses" list) — update it there too if you
change the question wording later.

## 4. Try it

```bash
npm run dev
```

Click **Selection Stats** in the header of the main page, or go straight
to `/stats`. You should see:
- Total developers who've responded
- The most-picked LLM
- A bar chart of selections per LLM
- The 5 most recent responses

Click **Refresh** to pull the latest data — it re-fetches the CSV with a
cache-busting timestamp each time so you're not stuck looking at a stale
published snapshot.

## Known limitations

- Google's "Publish to web" snapshot isn't always instantaneous — there
  can be a short delay (seconds, occasionally longer) between a new form
  submission and it showing up in the published CSV. This is Google's
  caching, not something the app controls.
- The published CSV link is **public** — anyone with the URL can read all
  form responses. Fine for an internal research tool; don't publish this
  URL anywhere public if responses contain anything sensitive.
- If a developer's answer to "why chosen" contains commas or line breaks,
  the built-in parser in `src/lib/csv.ts` handles that correctly (it
  respects quoted CSV fields) — no extra config needed.
