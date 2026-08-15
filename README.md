# Lumio 📚

A native PDF reader built with [Expo] and React Native, featuring a personal library, reading progress tracking, and a webview-based reader. Its standout feature is **on-the-spot word lookup** — long-press any word to find its meaning without leaving the page.

## The search-for-meaning experience

Lumio turns your PDF into a look-up-anywhere reading surface. Unlike a dictionary app or a separate browser tab, the meaning is one long-press away:

- **Long-press any word, get its meaning instantly** — no switching screens, no breaking your reading flow.
- **Hit-testing built on the actual rendered text layer** — word boxes come from the PDF's own text geometry, so the word you press is exactly the word that's highlighted. No OCR guesswork.
- **Works in both reading layouts** — word lookup is just as precise in Continuous scroll as it is in Single page, even when you're zoomed in.

- **Clean, dismissible lookup card** — the result slides up over the page and closes with a tap.

## Features

- **Instant word lookup** — long-press any word to search for its meaning, powered by the PDF's real text layer.
- **Library management** — import PDFs from your device, sort (recent / A–Z / Z–A), rename, remove from library, or delete permanently.
- **Collections / bookshelf** — organize books into collections.
- **Reader** — a native WebView-powered PDF reader (pdf.js) with:
   - Pinch-to-zoom, single-finger pan while zoomed, and double-tap zoom.
   - Swipe between pages; tap-to-flip; page controls with progress saving.
   - **Layout modes** — Single page or Continuous scroll, toggled from the reader menu and persisted across sessions.
   - Light / dark reading modes, including an in-reader override.
   - Auto-captured book thumbnails.
- **Progress tracking** — your reading position is saved per book and resumed on open.

## Tech stack

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing)
- [pdf.js](https://mozilla.github.io/pdf.js/) rendered inside a `react-native-webview`
- [expo-file-system](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/) for storage
- [expo-sqlite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) for the library/progress database
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
├── app/                  # Expo Router screens (library, reader/[id])
├── components/
│   ├── brand/            # Brand header, loader
│   ├── library/          # Book cards, empty states, sort control
│   ├── reader/           # PdfViewer (WebView), header, page controls, word lookup
│   └── theme-*.tsx       # Themed primitives
├── constants/theme.ts    # Colors, spacing, fonts
├── context/              # Theme mode context
├── hooks/                # useTheme, useColorScheme
└── lib/                  # Library, progress DB, types
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
