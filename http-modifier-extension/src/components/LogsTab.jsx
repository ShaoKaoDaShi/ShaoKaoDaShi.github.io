import { useState, useEffect, useCallback } from "react";

const LOG_REFRESH_INTERVAL = 2000;

const METHOD_COLORS = {
  GET: "bg-blue-100 text-blue-700",
  POST: "bg-green-100 text-green-700",
  PUT: "bg-orange-100 text-orange-700",
  DELETE: "bg-red-100 text-red-700",
  PATCH: "bg-yellow-100 text-yellow-700",
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "Unknown time"
    : date.toLocaleTimeString([], { hour12: false });
};

const getMethodColor = (method) => {
  return METHOD_COLORS[method] || "bg-gray-100 text-gray-700";
};

const getRuntimeError = (fallback) =>
  chrome.runtime.lastError?.message || fallback;

const LogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  const loadLogs = useCallback(() => {
    if (typeof chrome === "undefined" || !chrome.runtime) {
      setError("Extension runtime is unavailable.");
      return;
    }

    try {
      chrome.runtime.sendMessage({ type: "GET_LOGS" }, (response) => {
        if (chrome.runtime.lastError) {
          setError(getRuntimeError("Unable to load intercept logs."));
          return;
        }
        if (!Array.isArray(response?.logs)) {
          setError("The extension returned an invalid logs response.");
          return;
        }
        setLogs(response.logs);
        setError("");
      });
    } catch (runtimeError) {
      setError(runtimeError.message || "Unable to load intercept logs.");
    }
  }, []);

  const handleClear = useCallback(() => {
    if (!confirm("Clear all intercept logs?")) return;

    if (typeof chrome === "undefined" || !chrome.runtime) {
      setError("Extension runtime is unavailable.");
      return;
    }

    try {
      chrome.runtime.sendMessage({ type: "CLEAR_LOGS" }, (response) => {
        if (chrome.runtime.lastError || response?.success !== true) {
          setError(getRuntimeError("Unable to clear intercept logs."));
          return;
        }
        setLogs([]);
        setError("");
      });
    } catch (runtimeError) {
      setError(runtimeError.message || "Unable to clear intercept logs.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(loadLogs, 0);
    const interval = setInterval(loadLogs, LOG_REFRESH_INTERVAL);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadLogs]);

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3
          id="intercept-logs-heading"
          className="text-sm font-bold text-gray-800 flex items-center gap-2"
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-500"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Intercept Logs
        </h3>
        <button
          type="button"
          aria-label="Clear intercept logs"
          onClick={handleClear}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:text-red-600 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Clear Logs
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      <div
        role="region"
        aria-labelledby="intercept-logs-heading"
        tabIndex="0"
        className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-inner custom-scrollbar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs">No intercepted requests yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((entry, index) => {
              const log = entry && typeof entry === "object" ? entry : {};
              const id =
                typeof log.id === "string" && log.id
                  ? log.id
                  : `malformed-${index}`;
              const method =
                typeof log.method === "string" && log.method
                  ? log.method
                  : "Unknown method";
              const url =
                typeof log.url === "string" && log.url
                  ? log.url
                  : "Unknown URL";
              const tabUrl =
                typeof log.tabUrl === "string" && log.tabUrl
                  ? log.tabUrl
                  : "Unknown tab URL";
              const tabId = Number.isInteger(log.tabId)
                ? `Tab ${log.tabId}`
                : "Unknown tab";
              const response =
                log.mockResponse && typeof log.mockResponse === "object"
                  ? log.mockResponse
                  : {};
              const bodyLength = Number.isFinite(response.bodyLength)
                ? `${response.bodyLength}b`
                : "Unknown";
              const preview =
                typeof response.preview === "string"
                  ? response.preview
                  : "Preview unavailable";

              return (
                <div
                  key={id}
                  data-testid={`log-${id}`}
                  className="p-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start gap-3 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0 ${getMethodColor(method)}`}
                    >
                      {method}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="text-xs font-medium text-gray-800 truncate"
                          title={url}
                        >
                          {url}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                          {formatTime(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pl-[52px]">
                    <div className="mb-1.5 min-w-0 text-[10px] text-gray-500">
                      <span className="font-medium text-gray-600">{tabId}</span>
                      <span className="mx-1" aria-hidden="true">
                        &middot;
                      </span>
                      <span className="break-all" title={tabUrl}>
                        {tabUrl}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-500 mb-1.5">
                      <span>
                        {log.type === "debugger"
                          ? "Debugger API"
                          : "Client Script"}
                      </span>
                      <span>
                        Status: {log.originalResponse?.status || "200"}
                      </span>
                      <span>Size: {bodyLength}</span>
                    </div>

                    <div className="bg-gray-50 rounded border border-gray-100 p-2 font-mono text-[10px] text-gray-600 break-all relative group-hover:border-gray-200 transition-colors">
                      {preview}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsTab;
