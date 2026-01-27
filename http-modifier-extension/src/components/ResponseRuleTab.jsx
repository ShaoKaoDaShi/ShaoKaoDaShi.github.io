/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';

const ResponseRuleTab = () => {
  const [rules, setRules] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    urlPattern: '',
    responseBody: ''
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['rules'], (result) => {
        setRules((result.rules || []).filter(r => r.type === 'response'));
      });
    }
  };

  const saveToStorage = (updatedRules) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['rules'], (result) => {
        const otherRules = (result.rules || []).filter(r => r.type !== 'response');
        chrome.storage.local.set({ rules: [...otherRules, ...updatedRules] }, () => {
          loadRules();
        });
      });
    } else {
      setRules(updatedRules);
    }
  };

  const handleSubmit = () => {
    if (!formData.urlPattern || !formData.responseBody) {
      alert('Please fill in all required fields');
      return;
    }

    const newRule = {
      id: editingId || Date.now().toString(),
      type: 'response',
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
      responseBody: rule.responseBody
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
      responseBody: ''
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
              Edit Response Rule
            </>
          ) : (
             <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              New Response Rule
            </>
          )}
        </h3>
        
        <div className="space-y-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">URL Pattern (regex)</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
              placeholder="e.g. api/v1/user"
              value={formData.urlPattern}
              onChange={e => setFormData({ ...formData, urlPattern: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Response Body (JSON)</label>
            <textarea
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono h-32 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors resize-y"
              placeholder='{"status": "ok", "data": {...}}'
              value={formData.responseBody}
              onChange={e => setFormData({ ...formData, responseBody: e.target.value })}
            />
          </div>
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
            className="px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm transition-all active:scale-95"
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
                    ? 'border-gray-200 shadow-sm hover:shadow-md hover:border-green-200' 
                    : 'border-gray-100 bg-gray-50 opacity-75'
                  }
                `}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">
                        MOCK
                      </span>
                      <span className="text-xs font-medium text-gray-500 truncate max-w-[200px]" title={rule.urlPattern}>
                        {rule.urlPattern}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={rule.enabled !== false}
                          onChange={(e) => handleToggle(rule.id, e.target.checked)}
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                          onClick={() => handleEdit(rule)}
                          className="p-1 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors"
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

                  <div className="bg-gray-50 rounded p-2 border border-gray-100 font-mono text-[10px] text-gray-600 truncate">
                    {rule.responseBody.substring(0, 100)}
                    {rule.responseBody.length > 100 && '...'}
                  </div>
                  <div className="mt-1 text-[10px] text-gray-400 text-right">
                    Size: {rule.responseBody.length} chars
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

export default ResponseRuleTab;
