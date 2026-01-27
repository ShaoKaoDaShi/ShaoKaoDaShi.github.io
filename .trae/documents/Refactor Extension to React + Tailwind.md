# Refactor http-modifier-extension with React & Tailwind CSS

## 1. Environment Setup & Backup
- Create a `legacy` directory inside `http-modifier-extension` and move existing source files there to preserve history.
- Initialize a new **Vite + React** project in the `http-modifier-extension` root.
- Install **Tailwind CSS**, `postcss`, and `autoprefixer`.
- Initialize Tailwind configuration (`tailwind.config.js`).

## 2. Project Structure & Assets
- **Manifest & Scripts**: Move `manifest.json`, `background.js`, `content.js`, and `inject.js` to the `public` directory.
    - This ensures they are copied to the `dist` folder during the build.
    - Update `manifest.json` to point `default_popup` to `index.html`.
- **Source Code**:
    - `src/main.jsx`: Entry point.
    - `src/App.jsx`: Main container with Tab navigation.
    - `src/components/`: Directory for individual feature components.

## 3. Component Architecture (UI Refactor)
We will split the monolithic `popup.html` into modular React components:
- **`Layout`**: Main wrapper handling the tab switching logic.
- **`HeaderRuleTab`**:
    - Form to add/edit header rules.
    - List of active header rules with Toggle/Edit/Delete actions.
- **`ResponseRuleTab`**:
    - Form to add/edit response rules.
    - List of active response rules.
- **`DataSyncTab`**:
    - Import/Export functionality.
    - Cloud Sync (Login, Push, Pull) using the existing backend API.
    - **Debugger Mode** toggle (Advanced feature).
- **`LogsTab`**:
    - Display intercepted request logs with mock previews.
    - Clear logs button.

## 4. Logic Migration
- Port all logic from `popup.js` to React Hooks (`useState`, `useEffect`).
- Use `chrome.storage.local` within `useEffect` to persist and retrieve rules/user data.
- Ensure the `chrome.runtime.sendMessage` logic for Logs works within the React component lifecycle.

## 5. Styling
- Replace all custom CSS in `popup.html` (and inline styles) with **Tailwind CSS** utility classes.
- Ensure a consistent and modern design system.

## 6. Build & Verification
- Configure `vite.config.js` to ensure proper output for a Chrome Extension.
- Run `npm run build` to generate the `dist` folder.
- Verify the extension loads correctly in Chrome from the `dist` folder.
