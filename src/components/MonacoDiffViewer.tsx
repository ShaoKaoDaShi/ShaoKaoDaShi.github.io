import React from "react";
import { DiffEditor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// 确保 monaco loader 配置正确
try {
  loader.config({ monaco });
} catch (e) {
  console.error("Error configuring Monaco loader:", e);
}

interface MonacoDiffViewerProps {
  original: string;
  modified: string;
  language?: string;
  theme?: "vs-dark" | "vs";
  height?: string | number;
  width?: string | number;
  options?: monaco.editor.IDiffEditorOptions;
}

const MonacoDiffViewer: React.FC<MonacoDiffViewerProps> = ({
  original,
  modified,
  language = "javascript",
  theme = "vs-dark",
  height = "80vh",
  width = "100%",
  options = {},
}) => {
  return (
    <DiffEditor
      height={height}
      width={width}
      original={original}
      modified={modified}
      language={language}
      theme={theme}
      options={{
        originalEditable: false,
        readOnly: true,
        renderSideBySide: true, // true 为分栏模式，false 为内联模式
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        diffWordWrap: "on", // 自动换行
        ...options,
      }}
    />
  );
};

export default MonacoDiffViewer;
