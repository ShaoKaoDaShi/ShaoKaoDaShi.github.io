# HTTP Modifier

HTTP Modifier is a Chrome Manifest V3 extension for modifying request or response headers and mocking JSON responses on user-selected URL patterns. Rules and logs stay in the browser's extension storage and runtime memory; the extension has no account system or cloud sync.

## Install From Source

Requirements: a current Node.js release supported by Vite and npm.

```sh
npm install
npm run build
npm run verify:build
```

Load the build in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project's `dist/` directory.

Rebuild and reload the unpacked extension after source changes.

## Rule Semantics

- Header rules use Chrome Declarative Net Request to set, append, or remove request or response headers.
- Response rules mock JSON for `fetch` and asynchronous XHR in the page. Debugger Mode can mock requests through the Chrome Debugger API.
- **Contains** performs a case-sensitive substring match against the normalized absolute URL.
- **Regex** uses a JavaScript regular expression. Header-rule regexes must also be accepted by Chrome's DNR engine.
- Wildcards have no special meaning. Select Regex when wildcard-like matching is needed.
- Rules apply to every HTTP method. The first enabled matching response rule wins.
- Logs identify the request URL, source tab, method, interception engine, response size, and preview. Logs are bounded and are cleared when the extension service worker restarts.

## Privacy And Permissions

All rules are stored locally through `chrome.storage.local`. Backup and restore use local JSON files. There is no cloud sync, login, analytics, or remote rule service.

The extension requests broad host access because user-created rules may target any site. It also uses:

- `declarativeNetRequest` and `declarativeNetRequestWithHostAccess` for header rules.
- `storage` for local rules and settings.
- `tabs` for active-tab controls and trusted source-tab metadata in logs.
- `debugger` only when Debugger Mode is enabled for a tab. Chrome displays its standard debugger warning while attached.

Rules can contain sensitive headers or mocked data. Review JSON backups before sharing them.

## Development

```sh
npm run dev
npm test
npm run lint
npm run build
npm run verify:build
```

`npm` is the only supported package manager. `npm run verify:build` validates the generated manifest version, permissions, content-script order and execution world, plus every referenced popup, script, and icon asset.

## Limitations

- Chrome and Chromium-based browsers with Manifest V3 are the supported targets.
- Page-level response mocking covers `fetch` and asynchronous XHR. Synchronous XHR and unsupported XHR response types are not mocked.
- Content scripts cannot run on browser-internal pages, the Chrome Web Store, or other restricted URLs.
- Debugger Mode may conflict with DevTools or another debugger attached to the same tab.
- Header changes remain subject to Chrome DNR quotas and regex support.
- Response mocks return status `200` with JSON-oriented headers; arbitrary status codes, delays, streaming, and binary bodies are not supported.
- Logs are diagnostic and temporary, not a persistent network archive.
