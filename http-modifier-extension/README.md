# HTTP Modifier & Response Mocker Extension

A powerful Chrome extension to modify HTTP headers and mock API responses, featuring cloud synchronization for your rules.

## Features

- **Modify HTTP Headers**: Add, remove, or modify Request and Response headers.
- **Mock API Responses**: Intercept `fetch` and `XMLHttpRequest` to return custom JSON or text responses.
- **Rule Management**: Enable/disable rules, edit existing rules, and delete rules.
- **Data Synchronization**:
  - **Import/Export**: Backup rules to a JSON file.
  - **Cloud Sync**: Sync rules across devices using a self-hosted backend server.

---

## Installation

1.  **Clone or Download** this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked** and select the `http-modifier-extension` directory.

---

## Usage Guide

### 1. Modifying HTTP Headers

Use this feature to inject authentication tokens, modify CORS headers, or strip unwanted headers.

1.  Click the extension icon to open the popup.
2.  Go to the **Header Rule** tab.
3.  **URL Contains**: Enter a partial URL (e.g., `api/v1`) or a regex pattern.
4.  **Action Type**: Choose `Modify Request Header` or `Modify Response Header`.
5.  **Header Name**: Enter the header key (e.g., `Authorization`).
6.  **Operation**:
    - `Set`: Add or replace the header value.
    - `Remove`: Delete the header.
    - `Append`: Append a value to an existing header.
7.  **Header Value**: Enter the value (not required for `Remove`).
8.  Click **Add Header Rule**.

### 2. Mocking HTTP Responses

Use this feature to simulate API responses for frontend development or testing.

1.  Go to the **Response Rule** tab.
2.  **URL Contains**: Enter a partial URL or regex to match the API endpoint.
3.  **Response Body**: Enter the JSON or text you want the API to return.
    ```json
    {
      "status": "success",
      "data": {
        "id": 123,
        "name": "Test User"
      }
    }
    ```
4.  Click **Add Response Rule**.
5.  Reload the target page. The extension will intercept requests matching the URL and return your custom body immediately.

### 3. Managing Rules

- **Toggle**: Use the switch next to each rule to enable or disable it without deleting.
- **Edit**: Click the **Edit** (yellow) button to modify an existing rule.
  - Press **Esc** or click **Cancel Edit** to exit edit mode.
- **Delete**: Click the **Del** (red) button to remove a rule permanently.

---

## Data Synchronization

### Local Backup (Import/Export)
1.  Go to the **Data Sync** tab.
2.  Click **Export Config (JSON)** to download your current rules.
3.  Click **Import Config** to restore rules from a file. You can choose to merge them with your existing rules.

### Cloud Sync (Self-Hosted)
This extension supports syncing rules to a private server.

#### Prerequisites
You need to run the backend server included in `http-modifier-server`.

1.  **Start the Server**:
    ```bash
    cd ../http-modifier-server
    npm install
    npm start
    ```
    The server will run at `http://localhost:3000`.

2.  **Login/Register**:
    - In the extension's **Data Sync** tab, enter an email and password.
    - Click **Login / Register**. (If the account doesn't exist, it will be created automatically).

3.  **Syncing**:
    - **Push to Cloud**: Upload your local rules to the server.
    - **Pull from Cloud**: Download rules from the server. You will be prompted to merge them if they differ from your local rules.

---

## Technical Details

- **Manifest V3**: Built using the latest Web Extension standards.
- **declarativeNetRequest**: Used for high-performance header modification.
- **Script Injection**: Used for response mocking by patching `window.fetch` and `XMLHttpRequest`.
- **SQLite**: Used by the backend server for lightweight data storage.
