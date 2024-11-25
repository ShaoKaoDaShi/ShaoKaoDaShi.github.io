import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useState } from "react";
import { parseJsonDeep } from "./parseJsonDeep";
import { ResizeBox } from "../ResizeBox";

try {
  loader.config({ monaco });
} catch (e) {
  console.error(e);
}

function JsonEditor() {
  const [jsonValue, setJsonValue] = useState<unknown>();

  const handleEditorChange = (value: string | undefined) => {
    const parsedValue = parseJsonDeep(value);
    console.log("🚀 ~ JsonEditor ~ parsedValue:", parsedValue);
    setJsonValue(parsedValue);
  };

  return (
    <div style={{ width: "100vw", display: "flex", overflow: "hidden" }}>
      <ResizeBox>
        <Editor
          theme="vs-dark"
          defaultLanguage="json"
          onChange={handleEditorChange}
        />
      </ResizeBox>
      <div style={{ flex: 1, background: "blueviolet", overflow: "hidden" }}>
        <Editor
          theme="vs-dark"
          defaultLanguage="json"
          value={JSON.stringify(jsonValue, null, 4)}
        />
      </div>
    </div>
  );
}

export default JsonEditor;
