import React, { useCallback, useEffect, useState, useMemo } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { parseJsonDeep } from "./parseJsonDeep";
import { ResizeBox } from "../ResizeBox";
import { db } from "../Database/jsonParseHistory";
import { useLiveQuery } from "dexie-react-hooks";
import { debounce } from "lodash";
import styled from "styled-components";
import { jsonrepair } from "jsonrepair";

try {
  loader.config({ monaco });
} catch (e) {
  console.error("Error configuring Monaco loader:", e);
}

const HistorySidebar = styled.div<{ $isOpen: boolean }>`
  width: ${(props) => (props.$isOpen ? "300px" : "0")};
  min-width: ${(props) => (props.$isOpen ? "300px" : "0")};
  height: 100%;
  background: #252526;
  border-right: 1px solid #1e1e1e;
  transition:
    width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 20;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
  position: relative;
`;

const HistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #333;
  color: #fff;
  font-weight: bold;
  border-bottom: 1px solid #444;
`;

const HistoryList = styled.div`
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 3px;
  }
`;

const HistoryItem = styled.div`
  padding: 10px 15px;
  border-bottom: 1px solid #333;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #37373d;
  }

  .date {
    font-size: 12px;
    color: #888;
    margin-bottom: 4px;
  }

  .content {
    font-size: 13px;
    color: #ccc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: monospace;
  }
`;

const ToggleButton = styled.button<{ $isOpen: boolean }>`
  position: absolute;
  left: 20px;
  bottom: 20px;
  z-index: 1000;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #007acc;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 20px;

  transform: translateX(${(props) => (props.$isOpen ? "260px" : "0")});

  &:hover {
    background: #0062a3;
    transform: translateX(${(props) => (props.$isOpen ? "260px" : "0")})
      scale(1.1);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
  }

  svg {
    transition: transform 0.3s;
    transform: rotate(${(props) => (props.$isOpen ? "180deg" : "0deg")});
  }
`;

const ErrorContainer = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: #f44336;
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  max-width: 80%;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const RepairButton = styled.button`
  background: white;
  color: #f44336;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 12px;
  transition: background-color 0.2s;
  white-space: nowrap;

  &:hover {
    background: #ffebee;
  }

  &:active {
    background: #ffcdd2;
  }
`;

// 提取样式到对象
const styles = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    overflow: "hidden",
    position: "relative",
  } as React.CSSProperties,
  output: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  } as React.CSSProperties,
};

function JsonEditor() {
  const [state, setState] = useState({
    jsonValue: null as unknown,
    orgValue: "",
    error: null as string | null,
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [canRepair, setCanRepair] = useState(false);

  const history = useLiveQuery(() =>
    db.jsonParseHistory.orderBy("date").reverse().limit(50).toArray(),
  );

  const saveToHistory = useMemo(
    () =>
      debounce((value: string) => {
        db.jsonParseHistory.add({
          jsonString: value,
          date: new Date().getTime(),
        });
      }, 2000),
    [],
  );

  // 处理编辑器内容变化
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!value) return;

      saveToHistory(value);

      try {
        // 先尝试标准解析验证
        JSON.parse(value);

        // 如果成功，执行深度解析
        const parsedValue = parseJsonDeep(value);
        setState((prev) => ({
          ...prev,
          orgValue: value,
          jsonValue: parsedValue,
          error: null,
        }));
        setCanRepair(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Invalid JSON";

        // 尝试检测是否可修复
        let repairable = false;
        try {
          const repaired = jsonrepair(value);
          // 只有当修复后的内容与原内容不同，且修复后的内容能被解析时，才认为可修复
          if (repaired !== value) {
            JSON.parse(repaired);
            repairable = true;
          }
        } catch {
          // ignore repair error
        }

        setState((prev) => ({
          ...prev,
          orgValue: value,
          jsonValue: null,
          error: errorMessage,
        }));
        setCanRepair(repairable);
      }
    },
    [saveToHistory],
  );

  const handleRepair = () => {
    try {
      const repaired = jsonrepair(state.orgValue);
      // 更新编辑器内容，这会触发 handleEditorChange
      handleEditorChange(repaired);
    } catch (e) {
      console.error("Repair failed:", e);
    }
  };

  const loadHistoryItem = (jsonString: string) => {
    handleEditorChange(jsonString);
  };

  useEffect(() => {
    db.jsonParseHistory.toArray().then((data) => {
      if (data.length) {
        // Find the most recent one
        const history = data.sort((a, b) => b.date - a.date)[0];
        if (history?.jsonString) {
          loadHistoryItem(history.jsonString);
        }
      }
    });
  }, []);

  return (
    <div style={styles.container}>
      <HistorySidebar $isOpen={isHistoryOpen}>
        <HistoryHeader>
          History
          <span
            style={{ cursor: "pointer", fontSize: "16px" }}
            onClick={() => setIsHistoryOpen(false)}
          >
            ×
          </span>
        </HistoryHeader>
        <HistoryList>
          {history?.map((item) => (
            <HistoryItem
              key={item.id}
              onClick={() => loadHistoryItem(item.jsonString)}
            >
              <div className="date">{new Date(item.date).toLocaleString()}</div>
              <div className="content">{item.jsonString.slice(0, 50)}...</div>
            </HistoryItem>
          ))}
          {history?.length === 0 && (
            <div
              style={{ padding: "20px", color: "#666", textAlign: "center" }}
            >
              No history
            </div>
          )}
        </HistoryList>
      </HistorySidebar>

      <ToggleButton
        $isOpen={isHistoryOpen}
        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
        title={isHistoryOpen ? "Close History" : "Open History"}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
        </svg>
      </ToggleButton>

      <ResizeBox>
        <MonacoEditor value={state.orgValue} onChange={handleEditorChange} />
        {state.error && (
          <ErrorContainer>
            <span>{state.error}</span>
            {canRepair && (
              <RepairButton onClick={handleRepair}>Auto Fix JSON</RepairButton>
            )}
          </ErrorContainer>
        )}
      </ResizeBox>

      <div style={styles.output}>
        <MonacoEditor
          value={JSON.stringify(state.jsonValue, null, 4) || ""}
          readOnly
        />
      </div>
    </div>
  );
}

// 提取通用 MonacoEditor 组件
const MONACO_OPTIONS = {
  theme: "vs-dark",
  defaultLanguage: "json",
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
};

function MonacoEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value?: string;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
}) {
  return (
    <Editor
      value={value}
      onChange={onChange}
      options={{ ...MONACO_OPTIONS, readOnly }}
    />
  );
}

export default JsonEditor;
