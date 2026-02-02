# Architecture Overview

This repository contains a multi-module project focused on JSON viewing, diffing, and HTTP request modification. It consists of a React-based web application, a Chrome extension, and a backend server.

## 1. Project Overview

### Components

*   **`react-json-viewer` (Root)**: A web application built with React, Vite, and TypeScript. It provides functionality for viewing and diffing JSON data. It utilizes Monaco Editor for code editing and Dexie (IndexedDB) for local storage.
*   **`http-modifier-extension`**: A Chrome extension built with React, Vite, and Tailwind CSS. It likely allows users to modify HTTP requests/responses and sync rules with the backend.
*   **`http-modifier-server`**: A Node.js (Express) backend server providing user authentication and data synchronization for the extension. It uses SQLite for persistence.

### Architecture

*   **Frontend**: React (v18/v19) with Vite as the build tool. State management likely relies on React hooks and local component state.
*   **Styling**: Tailwind CSS and Styled Components are used across the frontend projects.
*   **Backend**: Node.js with Express.js REST API.
*   **Database**: SQLite (`db.sqlite`) for the backend; IndexedDB (via Dexie) for the frontend web app.

## 2. Build & Commands

### Root Project (`react-json-viewer`)

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Vite development server. |
| `pnpm build` | Builds the project for production (outputs to `docs/`). |
| `pnpm lint` | Runs ESLint to check code quality. |
| `pnpm preview` | Previews the production build locally. |

### Extension (`http-modifier-extension`)

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Vite development server for the extension. |
| `pnpm build` | Builds the extension for production (outputs to `dist/`). |
| `pnpm lint` | Runs ESLint. |
| `pnpm generate-icons` | Generates extension icons from SVG. |

### Server (`http-modifier-server`)

| Command | Description |
| :--- | :--- |
| `pnpm start` | Starts the Express server on port 3000. |

## 3. Code Style

*   **Language**: TypeScript is used for the root project and extension (though some files might be JS). The server is pure JavaScript.
*   **Linting**: ESLint is configured with `typescript-eslint` and React hooks plugins.
*   **Formatting**: Prettier is included in dependencies.
*   **CSS**: Tailwind CSS is the primary styling framework, alongside Styled Components in the root project.

## 4. Testing

*   **Status**: Currently, there are no automated testing frameworks (like Jest or Vitest) configured in the `package.json` scripts for any of the modules.
*   **Recommendation**: Implement unit testing using Vitest (for Vite projects) and integration testing for the backend.

## 5. Security

*   **Authentication**: The server uses a custom token-based authentication mechanism.
*   **Hashing**: Password hashing currently uses MD5, which is considered weak for production use. **Recommendation**: Upgrade to stronger hashing algorithms like bcrypt or Argon2.
*   **Data Protection**: The server uses a local SQLite database file. Ensure proper access controls and backups are in place.

## 6. Configuration

*   **Vite**: Configured via `vite.config.ts` (root) and `vite.config.js` (extension). Note that the root project builds to `docs` (likely for GitHub Pages), while the extension builds to `dist`.
*   **Tailwind**: Configured via `tailwind.config.js`.
*   **Environment**: The root project uses `dotenv` for environment variable management.

## 7. Directory Structure

```
/
├── http-modifier-extension/  # Chrome Extension source
├── http-modifier-server/     # Backend Server source
├── src/                      # Root React App source
├── docs/                     # Root App build output
├── package.json              # Root App dependencies
├── vite.config.ts            # Root App Vite config
└── ...
```
