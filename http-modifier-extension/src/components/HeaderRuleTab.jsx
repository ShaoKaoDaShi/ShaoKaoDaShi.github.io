/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';

const HeaderRuleTab = () => {
  const [rules, setRules] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    urlPattern: '',
    actionType: 'request',
    headerName: '',
    operation: 'set',
    headerValue: ''
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['rules'], (result) => {
        setRules((result.rules || []).filter(r => r.type === 'header'));
      });
    }
  };

  const saveToStorage = (updatedRules) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['rules'], (result) => {
        const otherRules = (result.rules || []).filter(r => r.type !== 'header');
        chrome.storage.local.set({ rules: [...otherRules, ...updatedRules] }, () => {
          loadRules();
        });
      });
    } else {
      // Fallback for dev mode
      setRules(updatedRules);
    }
  };

  const handleSubmit = () => {
    if (!formData.urlPattern || !formData.headerName || (formData.operation !== 'remove' && !formData.headerValue)) {
      alert('Please fill in all required fields');
      return;
    }

    const newRule = {
      id: editingId || Date.now().toString(),
      type: 'header',
      enabled: true,
      ...formData
    };

    let updatedRules;
    if (editingId) {
      updatedRules = rules.map(r => r.id === editingId ? { ...newRule, enabled: r.enabled } : r);
    } else {
      updatedRules = [...rules, newRule];
    }

    saveToStorage(updatedRules);
    handleCancel();
  };

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setFormData({
      urlPattern: rule.urlPattern,
      actionType: rule.actionType,
      headerName: rule.headerName,
      operation: rule.operation,
      headerValue: rule.headerValue || ''
    });
  };

  const handleDelete = (id) => {
    if (editingId === id) handleCancel();
    const updatedRules = rules.filter(r => r.id !== id);
    saveToStorage(updatedRules);
  };

  const handleToggle = (id, enabled) => {
    const updatedRules = rules.map(r => r.id === id ? { ...r, enabled } : r);
    saveToStorage(updatedRules);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      urlPattern: '',
      actionType: 'request',
      headerName: '',
      operation: 'set',
      headerValue: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 transition-all duration-200 hover:shadow-md">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          {editingId ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              Edit Header Rule
            </>
          ) : (
             <>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              New Header Rule
            </>
          )}
        </h3>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
           <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">URL Pattern (contains or regex)</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              placeholder="e.g. example.com/api"
              value={formData.urlPattern}
              onChange={e => setFormData({ ...formData, urlPattern: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={formData.actionType}
              onChange={e => setFormData({ ...formData, actionType: e.target.value })}
            >
              <option value="request">Request Header</option>
              <option value="response">Response Header</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Operation</label>
            <select
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={formData.operation}
              onChange={e => setFormData({ ...formData, operation: e.target.value })}
            >
              <option value="set">Set Value</option>
              <option value="remove">Remove Header</option>
              <option value="append">Append Value</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Header Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="e.g. Authorization"
              value={formData.headerName}
              onChange={e => setFormData({ ...formData, headerName: e.target.value })}
            />
          </div>

          {formData.operation !== 'remove' && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Header Value</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="e.g. Bearer token123"
                value={formData.headerValue}
                onChange={e => setFormData({ ...formData, headerValue: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
           {editingId && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-all active:scale-95"
          >
            {editingId ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Active Rules ({rules.length})</h3>
        
        {rules.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-400 text-sm">No rules configured yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <div 
                key={rule.id} 
                className={`
                  group relative bg-white rounded-lg border transition-all duration-200
                  ${rule.enabled !== false 
                    ? 'border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200' 
                    : 'border-gray-100 bg-gray-50 opacity-75'
                  }
                `}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`
                        px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                        ${rule.actionType === 'request' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                        }
                      `}>
                        {rule.actionType === 'request' ? 'REQ' : 'RES'}
                      </span>
                      <span className="text-xs font-medium text-gray-500 truncate max-w-[200px]" title={rule.urlPattern}>
                        {rule.urlPattern}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {/* Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={rule.enabled !== false}
                          onChange={(e) => handleToggle(rule.id, e.target.checked)}
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                          onClick={() => handleEdit(rule)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className={`font-mono font-medium ${rule.operation === 'remove' ? 'text-red-600 line-through' : 'text-gray-700'}`}>
                      {rule.headerName}
                    </span>
                    {rule.operation !== 'remove' && (
                      <>
                        <span className="text-gray-400 text-xs">
                          {rule.operation === 'append' ? '+=' : '='}
                        </span>
                        <span className="font-mono text-gray-600 truncate max-w-[220px]" title={rule.headerValue}>
                          {rule.headerValue}
                        </span>
                      </>
                    )}
                    {rule.operation === 'remove' && (
                       <span className="text-xs text-red-500 bg-red-50 px-1.5 rounded">Removed</span>
                    )}
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

export default HeaderRuleTab;
