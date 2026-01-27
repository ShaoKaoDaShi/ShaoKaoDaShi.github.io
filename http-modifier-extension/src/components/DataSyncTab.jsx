/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';

const API_BASE_URL = "http://localhost:3000/api";

const DataSyncTab = () => {
  const [user, setUser] = useState(null);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [debuggerEnabled, setDebuggerEnabled] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['user', 'debuggerEnabled'], (result) => {
        setUser(result.user || null);
        setDebuggerEnabled(!!result.debuggerEnabled);
      });
    }
  }, []);

  const handleExport = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['rules'], (result) => {
        const rules = result.rules || [];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rules, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "http-modifier-rules.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      });
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedRules = JSON.parse(e.target.result);
        if (!Array.isArray(importedRules)) {
          alert("Invalid file format: content must be an array of rules.");
          return;
        }

        const validRules = importedRules.filter(r => r.id && r.type && r.urlPattern);
        if (validRules.length === 0) {
          alert("No valid rules found in the file.");
          return;
        }

        if (confirm(`Found ${validRules.length} rules. Do you want to merge them with existing rules? (Duplicate IDs will be skipped)`)) {
          mergeRules(validRules);
        }
      } catch (err) {
        alert("Error parsing JSON file: " + err.message);
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  const mergeRules = (newRules) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(["rules"], (result) => {
        const existingRules = result.rules || [];
        const existingIds = new Set(existingRules.map((r) => r.id));

        let addedCount = 0;
        newRules.forEach((rule) => {
          if (!existingIds.has(rule.id)) {
            if (existingIds.has(rule.id)) {
              rule.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            }
            existingRules.push(rule);
            existingIds.add(rule.id);
            addedCount++;
          }
        });

        chrome.storage.local.set({ rules: existingRules }, () => {
          alert(`Successfully synced/imported ${addedCount} new rules.`);
        });
      });
    }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      alert("Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      const userData = data.data;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ user: userData }, () => {
          setUser(userData);
          alert("Login successful");
        });
      }
    } catch (err) {
      alert("Login failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove("user", () => {
        setUser(null);
        setLoginData({ email: '', password: '' });
      });
    }
  };

  const handlePush = async () => {
    if (!user) return;
    setIsLoading(true);
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(["rules"], async (result) => {
        try {
          const response = await fetch(`${API_BASE_URL}/sync/push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({ rules: result.rules || [] }),
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          alert("Rules synced to cloud successfully");
        } catch (err) {
          alert("Sync failed: " + err.message);
        } finally {
          setIsLoading(false);
        }
      });
    }
  };

  const handlePull = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/sync/pull`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      const rules = data.data.rules;
      if (!rules || rules.length === 0) {
        alert("No rules found in cloud");
        return;
      }

      if (confirm(`Found ${rules.length} rules in cloud. Merge with local?`)) {
        mergeRules(rules);
      }
    } catch (err) {
      alert("Sync failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDebugger = (checked) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    if (checked) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.runtime.sendMessage(
            { type: "ENABLE_DEBUGGER", tabId: tabs[0].id },
            (response) => {
              if (response && response.success) {
                chrome.storage.local.set({ debuggerEnabled: true });
                setDebuggerEnabled(true);
              } else {
                alert("Failed to enable Debugger Mode: " + (response ? response.error : "Unknown error"));
                setDebuggerEnabled(false);
              }
            }
          );
        }
      });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.runtime.sendMessage(
            { type: "DISABLE_DEBUGGER", tabId: tabs[0].id },
            () => {
              chrome.storage.local.set({ debuggerEnabled: false });
              setDebuggerEnabled(false);
            }
          );
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Debugger Mode Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-800 mb-1">Debugger Mode (Advanced)</h4>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Enables network-level mocking via Chrome Debugger API. Allows mocked responses to be visible in the Network tab.
              <span className="block mt-1 text-amber-700 font-medium">Note: Will show a "Debugging" banner in Chrome.</span>
            </p>
            
            <label className="inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={debuggerEnabled}
                onChange={(e) => toggleDebugger(e.target.checked)}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {debuggerEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Local Data Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Backup & Restore
        </h3>
        <p className="text-xs text-gray-500 mb-4">Export your rules to a JSON file or import from an existing backup.</p>
        
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export JSON
          </button>
          <button
            onClick={() => document.getElementById('import-file').click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import JSON
          </button>
          <input
            type="file"
            id="import-file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/><path d="M12 12v.01"/></svg>
          Cloud Sync
        </h3>
        
        {!user ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-2">Sign in to sync your rules across devices.</p>
            <div>
              <input
                type="email"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-2"
                placeholder="Email address"
                value={loginData.email}
                onChange={e => setLoginData({ ...loginData, email: e.target.value })}
              />
              <input
                type="password"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Password"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Login / Register'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 rounded text-blue-800 text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Logged in as <span className="font-bold">{user.email}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={handlePush}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? '...' : 'Push to Cloud'}
              </button>
              <button
                onClick={handlePull}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? '...' : 'Pull from Cloud'}
              </button>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSyncTab;
