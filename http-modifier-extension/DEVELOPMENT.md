# Development Documentation

## Project Overview
**HTTP Modifier & Response Mocker** is a Chrome Extension designed to help developers modify HTTP headers and mock API responses. It supports two main modes of operation:
1.  **Default Mode**: Uses `declarativeNetRequest` for headers and injected scripts (`inject.js`) for response mocking.
2.  **Debugger Mode**: Uses `chrome.debugger` API to intercept network requests at the browser level, allowing mocked responses to be visible in the Chrome DevTools Network tab.

## Architecture

### 1. Extension Components
*   **manifest.json**: Manifest V3 configuration. Permissions include `declarativeNetRequest`, `storage`, `scripting`, `debugger`, etc.
*   **popup.html / popup.js**: The user interface for managing rules, viewing logs, and syncing data.
*   **background.js**: The service worker.
    *   Handles `declarativeNetRequest` rule updates.
    *   Manages `chrome.debugger` attachment and request interception (Debugger Mode).
    *   Stores request logs in memory.
*   **content.js**: Content script that runs on every page.
    *   Injects `inject.js` into the page context.
    *   Relays messages between `inject.js` and `background.js`.
    *   Listens for Debugger Mode status updates.
*   **inject.js**: Script injected into the page's main world execution context.
    *   Monkey-patches `window.fetch` and `XMLHttpRequest`.
    *   Handles client-side response mocking (Default Mode).
    *   Sends request logs to `content.js`.
    *   Disables itself when Debugger Mode is active to prevent conflicts.

### 2. Backend Server (`http-modifier-server`)
*   **Node.js + Express**: Provides API endpoints.
*   **SQLite**: Stores user accounts and synced rules.
*   **Endpoints**:
    *   `POST /api/login`: Auto-register/login.
    *   `POST /api/sync/push`: Upload rules.
    *   `GET /api/sync/pull`: Download rules.

## Development Process Log

### Phase 1: Initial Setup & Core Features
*   Created basic extension structure (Manifest V3).
*   Implemented `declarativeNetRequest` for Header modification.
*   Implemented `inject.js` for Response mocking (Client-side interception).
*   Built `popup` UI for rule management (CRUD).

### Phase 2: Data Synchronization
*   Added Import/Export functionality (JSON file).
*   Built `http-modifier-server` for cloud sync.
*   Implemented Login and Sync logic in the extension.

### Phase 3: Enhanced Visibility & Debugging
*   **Problem**: Users couldn't see mocked responses in the Network tab (client-side mock limitation).
*   **Solution**: Implemented **Debugger Mode**.
    *   Added `debugger` permission.
    *   Used `chrome.debugger.sendCommand` to intercept `Fetch.requestPaused` and `Fetch.fulfillRequest`.
    *   Result: Mocked responses appear as `200 OK` with custom body in the Network tab.

### Phase 4: Logging System
*   **Problem**: Hard to verify if rules matched or what data was returned.
*   **Solution**: Added a **Logs Panel**.
    *   Captured logs from both `inject.js` (Default Mode) and `background.js` (Debugger Mode).
    *   Displayed logs in Popup with request details and mock preview.

## Key Technical Decisions & Challenges

### 1. Mocking Visibility
*   **Challenge**: Client-side mocking (`window.fetch` patch) is invisible to the Network tab because it happens above the network layer.
*   **Decision**: Introduced `chrome.debugger` as an optional "Advanced Mode". It's heavier (shows a warning banner) but provides true network-level mocking visibility.

### 2. Messaging Architecture
*   **Flow**: `inject.js` -> `window.postMessage` -> `content.js` -> `chrome.runtime.sendMessage` -> `background.js` -> `popup.js`.
*   **Security**: `content.js` validates `event.source === window` to prevent external message injection.

### 3. Conflict Resolution
*   When **Debugger Mode** is enabled, `inject.js` is notified to **disable** its patching logic. This prevents double-handling or race conditions where both layers try to mock the same request.

## Known Issues & Limitations

1.  **Debugger Warning Banner**: When using Debugger Mode, Chrome forces a warning banner at the top of the browser. This is a security feature and cannot be removed by the extension.
2.  **Performance**: Keeping logs in memory (`background.js`) is limited to 50 entries to prevent memory leaks.
3.  **Conflict with DevTools**: If a user opens Chrome DevTools (F12) while Debugger Mode is active, the extension's debugger might detach (Chrome allows only one debugger per tab). We handle this by catching the detach event, but the user must re-enable it manually or via the toggle.

## Future Improvements
*   **Pattern Matching**: Support wildcard glob patterns in addition to Regex/Substring.
*   **Response Headers**: Allow modifying response headers in Response Mock rules (currently only body is mocked).
*   **Delay Simulation**: Add ability to simulate network latency for mocked responses.
