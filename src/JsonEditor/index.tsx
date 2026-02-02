import React, { useCallback, useEffect, useState, useMemo } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { parseJsonDeep } from "./parseJsonDeep";
import { ResizeBox } from "../ResizeBox";
import { db } from "../Database/jsonParseHistory";
import { useLiveQuery } from "dexie-react-hooks";
import { debounce } from "lodash";
import styled from "styled-components";

try {
  loader.config({ monaco });
} catch (e) {
  console.error("Error configuring Monaco loader:", e);
}

const HistorySidebar = styled.div<{ $isOpen: boolean }>`
  width: ${(props) => (props.$isOpen ? "250px" : "0")};
  height: 100%;
  background: #1e1e1e;
  border-right: 1px solid #333;
  transition: width 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const HistoryHeader = styled.div`
  padding: 10px;
  color: #fff;
  font-weight: bold;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  white-space: nowrap;
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
  padding: 8px 10px;
  color: #ccc;
  cursor: pointer;
  border-bottom: 1px solid #2d2d2d;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: #2a2d2e;
    color: #fff;
  }

  .date {
    font-size: 10px;
    color: #888;
    margin-bottom: 4px;
  }

  .content {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 100;
  padding: 6px 12px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.8;

  &:hover {
    opacity: 1;
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
  } as React.CSSProperties,
};

function JsonEditor() {
  const [state, setState] = useState({
    jsonValue: null as unknown,
    orgValue: "",
    error: null as string | null,
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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
        const parsedValue = parseJsonDeep(value);
        setState((prev) => ({
          ...prev,
          orgValue: value,
          jsonValue: parsedValue,
          error: null,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          orgValue: value,
          jsonValue: null,
          error: error instanceof Error ? error.message : "Invalid JSON",
        }));
      }
    },
    [saveToHistory],
  );

  const loadHistoryItem = (jsonString: string) => {
    try {
      const parsedValue = parseJsonDeep(jsonString);
      setState({
        orgValue: jsonString,
        jsonValue: parsedValue,
        error: null,
      });
    } catch (error) {
      setState({
        orgValue: jsonString,
        jsonValue: null,
        error: error instanceof Error ? error.message : "Invalid JSON",
      });
    }
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

      <ToggleButton onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
        {isHistoryOpen ? "Hide History" : "Show History"}
      </ToggleButton>

      <ResizeBox>
        <MonacoEditor value={state.orgValue} onChange={handleEditorChange} />
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
