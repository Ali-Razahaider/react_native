# Lumio 📚

A native PDF reader built with [Expo] and React Native, featuring a personal library, reading progress tracking, reading statistics, a saved vocabulary, and a webview-based reader. Its standout feature is **on-the-spot word lookup** — long-press any word to find its meaning without leaving the page.

## The search-for-meaning experience

Lumio turns your PDF into a look-up-anywhere reading surface. Unlike a dictionary app or a separate browser tab, the meaning is one long-press away:

- **Long-press any word, get its meaning instantly** — no switching screens, no breaking your reading flow.
- **Hit-testing built on the actual rendered text layer** — word boxes come from the PDF's own text geometry, so the word you press is exactly the word that's highlighted. No OCR guesswork.
- **Works in both reading layouts** — word lookup is just as precise in Continuous scroll as it is in Single page, even when you're zoomed in.

- **Clean, dismissible lookup card** — the result slides up over the page and closes with a tap.

## Features

- **Instant word lookup** — long-press any word to search for its meaning, powered by the PDF's real text layer.
- **Vocabulary** — every word you successfully look up is saved automatically and reviewable on a dedicated screen, grouped by week (This week / Last week / Earlier).
- **Reading stats (gamified)** — reading sessions are tracked automatically (started when a book opens, closed when it backgrounds) and turned into a daily **streak**, time spent today, and a "this week" bar chart.
- **Library management** — import PDFs from your device, sort (recent / A–Z / Z–A), rename, remove from library, or delete permanently.
- **Collections / bookshelf** — organize books into collections.
- **Bottom navigation** — Library / Stats / Vocabulary, one tap apart.
- **Reader** — a native WebView-powered PDF reader (pdf.js) with:
   - Pinch-to-zoom, single-finger pan while zoomed, and double-tap zoom.
   - Swipe between pages; tap-to-flip; page controls with progress saving.
   - **Layout modes** — Single page or Continuous scroll, toggled from the reader menu and persisted across sessions.
   - Light / dark reading modes, including an in-reader override.
   - Auto-captured book thumbnails.
- **Progress tracking** — your reading position is saved per book and resumed on open.

## Gamified reading stats

Reading is turned into a game you can win daily. The app doesn't just save your page — it records *when* you read, then motivates you with a **streak** (read any day and your streak grows; miss a day and it resets), a **daily time total**, and a **weekly bar chart** showing your effort over the last seven days.

Every time you open a book, Lumio starts a **reading session**. The session stays open while you read and is closed the moment you leave the reader or background the app — so idle background time is never counted as reading:

```mermaid
sequenceDiagram
    participant U as User
    participant R as Reader screen
    participant A as AppState
    participant DB as reader.db

    U->>R: Open book
    R->>DB: startSession(bookId, startPage)
    DB-->>R: session id
    U->>R: Flip pages (repeatedly)
    R->>R: track lastPageRef
    U->>A: Background the app
    A->>R: state = background
    R->>DB: endSession(sessionId, lastPage)
    Note over R,DB: ended_at is set → minutes now count
    U->>A: Return to app
    A->>R: state = active
    R->>DB: startSession(bookId, currentPage)
    U->>R: Close reader
    R->>DB: endSession(sessionId, lastPage)
```

Reaching the final page also records a **book finished** milestone (once per book). Those raw events are then aggregated into the numbers the Stats screen shows — days-with-reading feed the streak, and every ended session's minutes are bucketed into the last 7 days for the chart:

```mermaid
flowchart LR
    S[sessions table] --> Q[getReadingStats]
    F[book_finishes table] --> Q
    Q --> S1[streakDays<br/>consecutive days with reading]
    Q --> S2[minutesToday<br/>ended sessions starting today]
    Q --> S3[weekMinutes<br/>7 buckets, today = last]
    S1 --> UI[Stats screen]
    S2 --> UI
    S3 --> UI
    UI --> H[streak hero card]
    UI --> C[time spent today card]
    UI --> B[This-week bar chart]
```

The streak has a forgiving rule: if today has no reading yet, it still counts from yesterday — a day-off doesn't break your run until a full day has gone by. All aggregation is derived from raw session rows, so the numbers always reflect reality the moment a session closes.

## Vocabulary

Every word you look up successfully (one that returns a real definition) is saved automatically to a **vocabulary list**, reviewable on its own screen, grouped by week:

```mermaid
flowchart LR
    P[Long-press a word] --> W[WordLookup panel]
    W -->|found a definition| L[recordWordLearned<br/>upsert by word]
    L --> DB[(vocab_words table)]
    DB --> G[grouped by Monday-based week]
    G --> V[Vocabulary screen<br/>This week / Last week / Earlier]
    V --> X[Expand a row → definition + part of speech]
```

Looking up the same word again refreshes its timestamp (bumping it to the top) instead of creating a duplicate. A bottom navigation bar — Library / Stats / Vocabulary — keeps every screen one tap away.

## Unique features at a glance

Most PDF readers just render pages. Lumio's distinctive engineering lives in a few features that are easy to take for granted but hard to build — here's how each one works:

### Pixel-accurate word lookup (no OCR)

Word boxes come from the PDF's own text layer geometry, not from guessing at coordinates:

```mermaid
flowchart TB
    subgraph render [pdf.js renders each page]
        C[canvas] --> L[.textLayer spans]
    end
    L --> B[buildWordBoxes<br/>Range + getBoundingClientRect<br/>per alphabetical word]
    B --> N[normalized by render scale<br/>→ stable layer-local boxes]
    N --> H[hit-test on long-press<br/>divide by current zoom]
    H --> W[word sent to Wiktionary]
    W --> D[parse wikitext →<br/>phonetic + definitions]
    D --> P[lookup card over the page]
```

Because boxes are zoom-normalized when built and divided by the *current* zoom at lookup time, a long-press is precise in Single page and Continuous scroll alike, at any zoom.

### Double-buffered page turns

pdf.js rendering is slow enough to flash blank between pages. Two stacked canvases hide that latency:

```mermaid
flowchart LR
    subgraph A [front canvas]
        P1[page N visible]
    end
    subgraph B [back canvas]
        P2[page N+1 rendered off-screen]
    end
    P2 -->|render done| S{swap}
    S -->|"make back the front + cross-fade"| A2[page N+1 visible]
    A2 -->|render next page into free canvas| B2[page N+2 off-screen]
    B2 --> S2{swap}
    S -->|busy flag guards in-flight renders| G[ignore flips mid-render]
```

The cross-fade makes turns smooth, and the `busy` flag drops flips that arrive mid-render so the two canvases never fall out of sync.

### Continuous scroll that doesn't melt memory

A 600-page book at full resolution would exhaust GPU memory, so the scroll layout reserves every page but renders only a window around the reader:

```mermaid
flowchart LR
    R[buildContinuousLayout<br/>reserve a height-only div per page] --> O[stable scroll offsets]
    R --> W[syncContWindow<br/>render current ± 2 pages]
    W --> K[keep live canvases near viewport]
    W --> F[release far pages → 1×1 canvas<br/>free their text layers & word boxes]
    S[scroll event] --> T[throttle 60ms] --> W
```

### Zoom & pan without re-rendering

Pinch, double-tap, and one-finger pan all transform a single CSS stage — pdf.js never re-renders:

```mermaid
flowchart LR
    G[pinch / double-tap / pan gesture] --> M[setTransform on #stage]
    M --> Z[zoom & focal point preserved]
    Z --> D[dark mode: canvas filter<br/>invert + hue-rotate]
    D --> R2[no re-render at any zoom]
```

Dark mode is a CSS filter on the canvas element itself, so it composes correctly under the transform and never needs a re-render — even mid-zoom.

## Features worth adding next

The backlog has some high-value additions. Here's how I'd design the two most impactful ones, plus the quick wins:

### Full-text search across books

Reading a PDF and forgetting which book it was in is common. Search should index text on import and let you jump straight to the hit:

```mermaid
flowchart TB
    P[import PDF] --> I[extract text layer per page<br/>offline, on import]
    I --> X[(search index<br/>page → text)]
    U[type query] --> Q[full-text search over index]
    Q --> R[results: book + page + snippet]
    R --> J[jump to page in reader]
    J --> H[highlight the matched term]
```

### Highlights & notes (annotations)

The text layer already gives precise word positions — the same geometry can anchor highlights that survive page renders:

```mermaid
flowchart LR
    S[select text range<br/>from text layer boxes] --> H[create highlight<br/>store anchors relative to page]
    H --> DB[(annotations table)]
    DB --> R[re-apply overlay on render]
    R --> E[export notes as Markdown]
```

### Quick wins from the backlog

```mermaid
flowchart LR
    subgraph quick [Backlog quick wins]
        T[Book tags<br/>filterable chips] 
        N[Night reading mode<br/>inverted colors]
        I2[Book info view<br/>author, size, pages, date]
    end
    subgraph nice [Nice-to-haves]
        C[Collection cover art]
        F[PDF form filling]
    end
```

## Tech stack

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing)
- [pdf.js](https://mozilla.github.io/pdf.js/) rendered inside a `react-native-webview`
- [expo-file-system](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/) for storage
- [expo-sqlite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) for the library/progress/stats/vocabulary database
- TypeScript, `react-native-reanimated`, `expo-symbols`

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   In the output, you'll find options to open the app in a
   - [development build](https://docs.expo.dev/develop/development-builds/introduction/)
   - [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Project structure

```
src/
├── app/                  # Expo Router screens (library, reader/[id], stats, vocab)
├── components/
│   ├── brand/            # Brand header, loader
│   ├── library/          # Book cards, empty states, sort control, bottom menu
│   ├── reader/           # PdfViewer (WebView), header, page controls, word lookup
│   └── theme-*.tsx       # Themed primitives
├── constants/theme.ts    # Colors, spacing, fonts
├── context/              # Theme mode context
├── hooks/                # useTheme, useColorScheme
└── lib/                  # Library, progress/stats/vocab DBs, types
```

## Linting

```bash
npx expo lint
```

Note: ESLint must be installed (`npm install -D eslint eslint-config-expo`) before linting works in a fresh checkout.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [pdf.js](https://mozilla.github.io/pdf.js/)
