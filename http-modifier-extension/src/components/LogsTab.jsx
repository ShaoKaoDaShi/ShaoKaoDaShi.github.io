/* global chrome */
import { useState, useEffect, useCallback } from 'react';

const LOG_REFRESH_INTERVAL = 2000;

const METHOD_COLORS = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-yellow-100 text-yellow-700',
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { hour12: false });
};

const getMethodColor = (method) => {
  return METHOD_COLORS[method] || 'bg-gray-100 text-gray-700';
};

const LogsTab = () => {
  const [logs, setLogs] = useState([]);

  const loadLogs = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (response) => {
        if (response && response.logs) {
          setLogs(response.logs);
        }
      });
    }
  }, []);

  const handleClear = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }, () => {
        setLogs([]);
      });
    } else {
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, LOG_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadLogs]);

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
          Intercept Logs
        </h3>
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:text-red-600 transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          Clear Logs
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-inner custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-xs">No intercepted requests yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log, index) => (
              <div key={index} className="p-3 hover:bg-gray-50 transition-colors group">
                <div className="flex items-start gap-3 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0 ${getMethodColor(log.method)}`}>
                    {log.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-gray-800 truncate" title={log.url}>
                        {log.url}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pl-[52px]">
                  <div className="flex items-center gap-4 text-[10px] text-gray-500 mb-1.5">
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${log.type === 'debugger' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                      {log.type === 'debugger' ? 'Debugger API' : 'Client Script'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Status: {log.originalResponse ? log.originalResponse.status : '200'}
                    </span>
                    <span>Size: {log.mockResponse.bodyLength}b</span>
                  </div>
                  
                  <div className="bg-gray-50 rounded border border-gray-100 p-2 font-mono text-[10px] text-gray-600 break-all relative group-hover:border-gray-200 transition-colors">
                    {log.mockResponse.preview}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsTab;
