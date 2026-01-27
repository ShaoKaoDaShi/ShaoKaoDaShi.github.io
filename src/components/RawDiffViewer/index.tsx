import React, { useState } from "react";
import { useDiff, DiffLine } from "./useDiff";

interface RawDiffViewerProps {
  oldText: string;
  newText: string;
  viewMode?: "split" | "unified";
  fileName?: string;
}

const RawDiffViewer: React.FC<RawDiffViewerProps> = ({
  oldText,
  newText,
  viewMode = "split",
  fileName,
}) => {
  const diffRows = useDiff(oldText, newText);
  const [mode, setMode] = useState<"split" | "unified">(viewMode);

  return (
    <div className="font-mono text-xs md:text-sm border border-gray-300 rounded-md bg-white overflow-hidden flex flex-col h-full">
      {/* Header / Toolbar */}
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex justify-between items-center shrink-0">
        <span className="font-semibold text-gray-700 truncate">
          {fileName || "Diff"}
        </span>
        <div className="flex space-x-2 text-xs">
          <button
            onClick={() => setMode("split")}
            className={`px-3 py-1 rounded border ${
              mode === "split"
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setMode("unified")}
            className={`px-3 py-1 rounded border ${
              mode === "unified"
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Unified
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse">
          <tbody className="divide-y divide-gray-100">
            {diffRows.map((row, index) => {
              if (mode === "split") {
                return (
                  <tr key={index}>
                    {/* Left Side */}
                    <td
                      className={`w-[50px] text-right px-2 py-0.5 select-none border-r border-gray-200 text-gray-400 bg-gray-50 ${getLineNumberClass(row.left.type)}`}
                    >
                      {row.left.lineNumber}
                    </td>
                    <td
                      className={`w-[calc(50%-50px)] px-2 py-0.5 break-all whitespace-pre-wrap ${getContentClass(row.left.type)}`}
                    >
                      <span className="select-text">{row.left.content}</span>
                    </td>

                    {/* Right Side */}
                    <td
                      className={`w-[50px] text-right px-2 py-0.5 select-none border-r border-l border-gray-200 text-gray-400 bg-gray-50 ${getLineNumberClass(row.right.type)}`}
                    >
                      {row.right.lineNumber}
                    </td>
                    <td
                      className={`w-[calc(50%-50px)] px-2 py-0.5 break-all whitespace-pre-wrap ${getContentClass(row.right.type)}`}
                    >
                      <span className="select-text">{row.right.content}</span>
                    </td>
                  </tr>
                );
              } else {
                // Unified Mode
                // If both are unchanged, render once.
                // If split (removed/added), render separately.

                const rowsToRender = [];

                if (row.left.type === "removed") {
                  rowsToRender.push({
                    lineNumLeft: row.left.lineNumber,
                    lineNumRight: undefined as number | undefined,
                    type: "removed",
                    content: row.left.content,
                  });
                }

                if (row.right.type === "added") {
                  rowsToRender.push({
                    lineNumLeft: undefined as number | undefined,
                    lineNumRight: row.right.lineNumber,
                    type: "added",
                    content: row.right.content,
                  });
                }

                if (
                  row.left.type === "unchanged" &&
                  row.right.type === "unchanged"
                ) {
                  rowsToRender.push({
                    lineNumLeft: row.left.lineNumber,
                    lineNumRight: row.right.lineNumber,
                    type: "unchanged",
                    content: row.left.content,
                  });
                }

                return (
                  <React.Fragment key={index}>
                    {rowsToRender.map((r, i) => (
                      <tr key={`${index}-${i}`}>
                        <td
                          className={`w-[50px] text-right px-2 py-0.5 select-none border-r border-gray-200 text-gray-400 bg-gray-50 ${getLineNumberClass(r.type as DiffLine["type"])}`}
                        >
                          {r.lineNumLeft}
                        </td>
                        <td
                          className={`w-[50px] text-right px-2 py-0.5 select-none border-r border-gray-200 text-gray-400 bg-gray-50 ${getLineNumberClass(r.type as DiffLine["type"])}`}
                        >
                          {r.lineNumRight}
                        </td>
                        <td
                          className={`px-2 py-0.5 break-all whitespace-pre-wrap ${getContentClass(r.type as DiffLine["type"])}`}
                        >
                          <span className="select-text">
                            {r.type === "added" && "+ "}
                            {r.type === "removed" && "- "}
                            {r.type === "unchanged" && "  "}
                            {r.content}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper functions for styles
const getLineNumberClass = (type: DiffLine["type"]) => {
  switch (type) {
    case "added":
      return "bg-green-100 border-green-200 text-green-700";
    case "removed":
      return "bg-red-100 border-red-200 text-red-700";
    case "placeholder":
      return "bg-gray-50"; // Empty
    default:
      return "";
  }
};

const getContentClass = (type: DiffLine["type"]) => {
  switch (type) {
    case "added":
      return "bg-green-50";
    case "removed":
      return "bg-red-50";
    case "placeholder":
      return "bg-gray-50 select-none"; // Empty space should not be selectable/copyable ideally, but select-none helps
    default:
      return "";
  }
};

export default RawDiffViewer;
