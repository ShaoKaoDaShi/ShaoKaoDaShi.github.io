document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const forms = document.querySelectorAll(".form-section");
  const rulesList = document.getElementById("rules-list");
  let editingRuleId = null;

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // If editing, confirm discard
      if (editingRuleId) {
        if (
          !confirm("Switching tabs will discard your current edits. Continue?")
        ) {
          return;
        }
        cancelEdit();
      }
      switchTab(tab);
    });
  });

  function switchTab(tab) {
    tabs.forEach((t) => t.classList.remove("active"));
    forms.forEach((f) => f.classList.add("hidden"));

    tab.classList.add("active");
    const targetId = tab.dataset.target;
    document.getElementById(targetId).classList.remove("hidden");

    // If switching to logs tab, refresh logs
    if (targetId === "request-logs") {
      loadLogs();
    }
  }

  // Load rules
  loadRules();
  // Check Login Status
  checkLoginStatus();
  // Check Debugger Status
  checkDebuggerStatus();

  // Debugger Toggle
  const debuggerToggle = document.getElementById("debugger-mode-toggle");
  debuggerToggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;

    // Request permission/attach debugger
    if (enabled) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.runtime.sendMessage(
            {
              type: "ENABLE_DEBUGGER",
              tabId: tabs[0].id,
            },
            (response) => {
              if (response && response.success) {
                chrome.storage.local.set({ debuggerEnabled: true });
              } else {
                debuggerToggle.checked = false;
                alert(
                  "Failed to enable Debugger Mode: " +
                    (response ? response.error : "Unknown error"),
                );
              }
            },
          );
        }
      });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.runtime.sendMessage(
            {
              type: "DISABLE_DEBUGGER",
              tabId: tabs[0].id,
            },
            () => {
              chrome.storage.local.set({ debuggerEnabled: false });
            },
          );
        }
      });
    }
  });

  function checkDebuggerStatus() {
    chrome.storage.local.get(["debuggerEnabled"], (result) => {
      if (result.debuggerEnabled) {
        document.getElementById("debugger-mode-toggle").checked = true;
      }
    });
  }

  // Add/Update Header Rule
  document.getElementById("add-header-rule").addEventListener("click", () => {
    const urlPattern = document.getElementById("header-url").value.trim();
    const actionType = document.getElementById("header-action-type").value;
    const headerName = document.getElementById("header-name").value.trim();
    const operation = document.getElementById("header-operation").value;
    const headerValue = document.getElementById("header-value").value.trim();

    if (
      !urlPattern ||
      !headerName ||
      (operation !== "remove" && !headerValue)
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const rule = {
      id: editingRuleId || Date.now().toString(),
      type: "header",
      enabled: true,
      urlPattern,
      actionType, // 'request' or 'response'
      headerName,
      operation,
      headerValue,
    };

    saveRule(rule);
  });

  // Cancel Header Edit
  document
    .getElementById("cancel-header-edit")
    .addEventListener("click", cancelEdit);

  // Add/Update Response Rule
  document.getElementById("add-response-rule").addEventListener("click", () => {
    const urlPattern = document.getElementById("response-url").value.trim();
    const responseBody = document.getElementById("response-body").value.trim();

    if (!urlPattern || !responseBody) {
      alert("Please fill in all required fields");
      return;
    }

    const rule = {
      id: editingRuleId || Date.now().toString(),
      type: "response",
      enabled: true,
      urlPattern,
      responseBody,
    };

    saveRule(rule);
  });

  // Cancel Response Edit
  document
    .getElementById("cancel-response-edit")
    .addEventListener("click", cancelEdit);

  // Listen for ESC key to cancel edit
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && editingRuleId) {
      cancelEdit();
    }
  });

  // Export Rules
  document.getElementById("export-rules").addEventListener("click", () => {
    chrome.storage.local.get(["rules"], (result) => {
      const rules = result.rules || [];
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(rules, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "http-modifier-rules.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    });
  });

  // Import Rules Trigger
  document.getElementById("import-rules-btn").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  // Import Rules File Handler
  document.getElementById("import-file").addEventListener("change", (event) => {
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

        // Basic validation
        const validRules = importedRules.filter(
          (r) => r.id && r.type && r.urlPattern,
        );

        if (validRules.length === 0) {
          alert("No valid rules found in the file.");
          return;
        }

        if (
          confirm(
            `Found ${validRules.length} rules. Do you want to merge them with existing rules? (Duplicate IDs will be skipped)`,
          )
        ) {
          mergeRules(validRules);
        }
      } catch (err) {
        alert("Error parsing JSON file: " + err.message);
      }
      // Reset file input
      event.target.value = "";
    };
    reader.readAsText(file);
  });

  // Logs Logic
  function loadLogs() {
    chrome.runtime.sendMessage({ type: "GET_LOGS" }, (response) => {
      const logs = response.logs || [];
      const container = document.getElementById("logs-container");
      container.innerHTML = "";

      if (logs.length === 0) {
        container.innerHTML =
          '<p style="color: #999; text-align: center;">No logs yet.</p>';
        return;
      }

      logs.forEach((log) => {
        const div = document.createElement("div");
        div.style.borderBottom = "1px solid #eee";
        div.style.padding = "5px 0";
        div.style.wordBreak = "break-all";

        const time = new Date(log.timestamp).toLocaleTimeString();
        const status = log.originalResponse
          ? log.originalResponse.status
          : "N/A";

        div.innerHTML = `
          <div style="font-weight: bold; color: #333;">
            <span style="color: #666;">[${time}]</span> 
            <span style="color: #007bff;">${log.method}</span> 
            ${log.url}
          </div>
          <div style="color: #666; margin-top: 2px;">
            Type: ${log.type} | Status: ${status} | Mock Length: ${log.mockResponse.bodyLength}
          </div>
          <div style="color: #28a745; margin-top: 2px; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            Mock Preview: ${log.mockResponse.preview}
          </div>
        `;
        container.appendChild(div);
      });
    });
  }

  document.getElementById("clear-logs").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "CLEAR_LOGS" }, () => {
      loadLogs();
    });
  });

  // Cloud Sync Logic
  const API_BASE_URL = "http://localhost:3000/api";

  // Login
  document.getElementById("login-btn").addEventListener("click", () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    const btn = document.getElementById("login-btn");
    const originalText = btn.textContent;
    btn.textContent = "Logging in...";
    btn.disabled = true;

    fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const user = data.data;
        chrome.storage.local.set({ user }, () => {
          updateLoginUI(user);
          alert("Login successful");
        });
      })
      .catch((err) => {
        alert("Login failed: " + err.message);
      })
      .finally(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      });
  });

  // Logout
  document.getElementById("logout-btn").addEventListener("click", () => {
    chrome.storage.local.remove("user", () => {
      updateLoginUI(null);
    });
  });

  // Push (Sync Up)
  document.getElementById("sync-push-btn").addEventListener("click", () => {
    chrome.storage.local.get(["user", "rules"], (result) => {
      if (!result.user) {
        alert("Please login first");
        return;
      }

      const btn = document.getElementById("sync-push-btn");
      btn.textContent = "Pushing...";
      btn.disabled = true;

      fetch(`${API_BASE_URL}/sync/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${result.user.token}`,
        },
        body: JSON.stringify({ rules: result.rules || [] }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          alert("Rules synced to cloud successfully");
        })
        .catch((err) => {
          alert("Sync failed: " + err.message);
        })
        .finally(() => {
          btn.textContent = "Push to Cloud";
          btn.disabled = false;
        });
    });
  });

  // Pull (Sync Down)
  document.getElementById("sync-pull-btn").addEventListener("click", () => {
    chrome.storage.local.get(["user"], (result) => {
      if (!result.user) {
        alert("Please login first");
        return;
      }

      const btn = document.getElementById("sync-pull-btn");
      btn.textContent = "Pulling...";
      btn.disabled = true;

      fetch(`${API_BASE_URL}/sync/pull`, {
        headers: {
          Authorization: `Bearer ${result.user.token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          const rules = data.data.rules;

          if (!rules || rules.length === 0) {
            alert("No rules found in cloud");
            return;
          }

          if (
            confirm(`Found ${rules.length} rules in cloud. Merge with local?`)
          ) {
            mergeRules(rules);
          }
        })
        .catch((err) => {
          alert("Sync failed: " + err.message);
        })
        .finally(() => {
          btn.textContent = "Pull from Cloud";
          btn.disabled = false;
        });
    });
  });

  function checkLoginStatus() {
    chrome.storage.local.get(["user"], (result) => {
      updateLoginUI(result.user);
    });
  }

  function updateLoginUI(user) {
    const loginForm = document.getElementById("login-form");
    const authView = document.getElementById("authenticated-view");
    const userDisplay = document.getElementById("user-email-display");

    if (user) {
      loginForm.classList.add("hidden");
      authView.classList.remove("hidden");
      userDisplay.textContent = user.email;
    } else {
      loginForm.classList.remove("hidden");
      authView.classList.add("hidden");
      userDisplay.textContent = "";
      document.getElementById("login-email").value = "";
      document.getElementById("login-password").value = "";
    }
  }

  function mergeRules(newRules) {
    chrome.storage.local.get(["rules"], (result) => {
      const existingRules = result.rules || [];
      const existingIds = new Set(existingRules.map((r) => r.id));

      let addedCount = 0;
      newRules.forEach((rule) => {
        if (!existingIds.has(rule.id)) {
          // If ID collision (rare but possible with timestamps), regenerate ID
          if (existingIds.has(rule.id)) {
            rule.id =
              Date.now().toString() + Math.random().toString(36).substr(2, 5);
          }
          existingRules.push(rule);
          existingIds.add(rule.id);
          addedCount++;
        }
      });

      chrome.storage.local.set({ rules: existingRules }, () => {
        loadRules();
        alert(`Successfully synced/imported ${addedCount} new rules.`);
      });
    });
  }

  function saveRule(rule) {
    chrome.storage.local.get(["rules"], (result) => {
      let rules = result.rules || [];

      if (editingRuleId) {
        // Update existing rule
        const index = rules.findIndex((r) => r.id === editingRuleId);
        if (index > -1) {
          // Keep enabled state if editing
          rule.enabled = rules[index].enabled;
          rules[index] = rule;
        }
      } else {
        // Add new rule
        rules.push(rule);
      }

      chrome.storage.local.set({ rules }, () => {
        loadRules();
        cancelEdit(); // Reset form
      });
    });
  }

  function loadRules() {
    chrome.storage.local.get(["rules"], (result) => {
      const rules = result.rules || [];
      renderRules(rules);
    });
  }

  function renderRules(rules) {
    rulesList.innerHTML = "";
    rules.forEach((rule) => {
      const li = document.createElement("li");
      li.className = `rule-item ${rule.enabled === false ? "disabled" : ""}`;

      let infoHtml = "";
      if (rule.type === "header") {
        infoHtml = `
          <span class="rule-type">[Header]</span> 
          ${rule.actionType === "request" ? "Req" : "Res"} | 
          ${rule.urlPattern} -> ${rule.operation} ${rule.headerName}
        `;
      } else {
        infoHtml = `
          <span class="rule-type">[Response]</span> 
          ${rule.urlPattern} -> Body (${rule.responseBody.length} chars)
        `;
      }

      li.innerHTML = `
        <div class="rule-info">${infoHtml}</div>
        <div class="rule-controls">
          <label class="switch">
            <input type="checkbox" class="toggle-rule" data-id="${rule.id}" ${rule.enabled !== false ? "checked" : ""}>
            <span class="slider"></span>
          </label>
          <button class="edit" data-id="${rule.id}">Edit</button>
          <button class="delete" data-id="${rule.id}">Del</button>
        </div>
      `;

      rulesList.appendChild(li);
    });

    // Add listeners
    document.querySelectorAll(".delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        deleteRule(id);
      });
    });

    document.querySelectorAll(".edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        startEdit(id);
      });
    });

    document.querySelectorAll(".toggle-rule").forEach((toggle) => {
      toggle.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        const enabled = e.target.checked;
        toggleRule(id, enabled);
      });
    });
  }

  function startEdit(id) {
    chrome.storage.local.get(["rules"], (result) => {
      const rules = result.rules || [];
      const rule = rules.find((r) => r.id === id);
      if (!rule) return;

      editingRuleId = id;

      // Switch to appropriate tab
      const targetTab =
        rule.type === "header" ? "header-form" : "response-form";
      const tabElement = document.querySelector(
        `.tab[data-target="${targetTab}"]`,
      );
      if (tabElement) {
        switchTab(tabElement);
      }

      // Populate form and update UI
      if (rule.type === "header") {
        document.getElementById("header-url").value = rule.urlPattern;
        document.getElementById("header-action-type").value = rule.actionType;
        document.getElementById("header-name").value = rule.headerName;
        document.getElementById("header-operation").value = rule.operation;
        document.getElementById("header-value").value = rule.headerValue || "";

        document.getElementById("add-header-rule").textContent =
          "Update Header Rule";
        document
          .getElementById("cancel-header-edit")
          .classList.remove("hidden");
      } else {
        document.getElementById("response-url").value = rule.urlPattern;
        document.getElementById("response-body").value = rule.responseBody;

        document.getElementById("add-response-rule").textContent =
          "Update Response Rule";
        document
          .getElementById("cancel-response-edit")
          .classList.remove("hidden");
      }
    });
  }

  function cancelEdit() {
    editingRuleId = null;

    // Reset inputs
    document
      .querySelectorAll("input, textarea")
      .forEach((el) => (el.value = ""));

    // Reset buttons
    document.getElementById("add-header-rule").textContent = "Add Header Rule";
    document.getElementById("cancel-header-edit").classList.add("hidden");

    document.getElementById("add-response-rule").textContent =
      "Add Response Rule";
    document.getElementById("cancel-response-edit").classList.add("hidden");
  }

  function deleteRule(id) {
    if (editingRuleId === id) {
      cancelEdit();
    }
    chrome.storage.local.get(["rules"], (result) => {
      const rules = result.rules || [];
      const newRules = rules.filter((r) => r.id !== id);
      chrome.storage.local.set({ rules: newRules }, () => {
        loadRules();
      });
    });
  }

  function toggleRule(id, enabled) {
    chrome.storage.local.get(["rules"], (result) => {
      const rules = result.rules || [];
      const ruleIndex = rules.findIndex((r) => r.id === id);
      if (ruleIndex > -1) {
        rules[ruleIndex].enabled = enabled;
        chrome.storage.local.set({ rules }, () => {
          loadRules();
        });
      }
    });
  }
});
