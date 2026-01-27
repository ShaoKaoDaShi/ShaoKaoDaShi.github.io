import React, { useCallback, useEffect, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { parseJsonDeep } from "./parseJsonDeep";
import { ResizeBox } from "../ResizeBox";
import { db } from "../Database/jsonParseHistory";

try {
  loader.config({ monaco });
} catch (e) {
  console.error("Error configuring Monaco loader:", e);
}

// 提取样式到对象
const styles = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    overflow: "hidden",

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
    error: null as string | null
  });

  // 处理编辑器内容变化
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!value) return;
    
    db.jsonParseHistory.add({
      jsonString: value,
      date: new Date().getTime(),
    });
    
    try {
      const parsedValue = parseJsonDeep(value);
      setState(prev => ({
        ...prev,
        orgValue: value,
        jsonValue: parsedValue,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        orgValue: value,
        jsonValue: null,
        error: error instanceof Error ? error.message : "Invalid JSON"
      }));
    }
  }, []);

  useEffect(() => {
    db.jsonParseHistory.toArray().then((data) => {
      console.log("🚀 ~ arr:", data);
      if (data.length) {
        const history = data.pop();
        if (history?.jsonString) {
          handleEditorChange(history.jsonString);
        }
      }
    });
  }, []);

  return (
    <div style={styles.container}>
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
      options={{...MONACO_OPTIONS, readOnly}}
    />
  );
}

export default JsonEditor;
