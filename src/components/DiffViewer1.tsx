import React, { useMemo } from "react";
import { diffLines } from "diff";
import styled from "styled-components";

const DiffContainer = styled.div`
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 14px;
  line-height: 1.4;
  background: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow-x: auto;
`;

const DiffLine = styled.div<{
  type: "added" | "removed" | "common" | "changed";
}>`
  padding: 2px 8px;
  display: flex;
  background-color: ${(props) => {
    switch (props.type) {
      case "added":
        return "#e6ffe6";
      case "removed":
        return "#ffe6e6";
      case "changed":
        return "#fff2cc";
      default:
        return "transparent";
    }
  }};
  border-left: 3px solid
    ${(props) => {
      switch (props.type) {
        case "added":
          return "#28a745";
        case "removed":
          return "#d73a49";
        case "changed":
          return "#ffd33d";
        default:
          return "transparent";
      }
    }};
`;

const LineNumber = styled.span`
  color: #888;
  margin-right: 16px;
  min-width: 40px;
  text-align: right;
  user-select: none;
`;

const LineContent = styled.span`
  flex: 1;
  white-space: pre;
`;

interface DiffViewerProps {
  oldText: string;
  newText: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldText, newText }) => {
  const diff = useMemo(() => {
    return diffLines(oldText, newText, { ignoreWhitespace: false });
  }, [oldText, newText]);

  const renderLine = (change: any, index: number) => {
    const lineNumber = change.ln || change.ln2 || index + 1;

    if (change.added) {
      return (
        <DiffLine key={index} type="added">
          <LineNumber>+{lineNumber}</LineNumber>
          <LineContent>{change.value}</LineContent>
        </DiffLine>
      );
    }

    if (change.removed) {
      return (
        <DiffLine key={index} type="removed">
          <LineNumber>-{lineNumber}</LineNumber>
          <LineContent>{change.value}</LineContent>
        </DiffLine>
      );
    }

    // 处理修改的行
    if (change.value) {
      return (
        <DiffLine key={index} type="common">
          <LineNumber>{lineNumber}</LineNumber>
          <LineContent>{change.value}</LineContent>
        </DiffLine>
      );
    }

    return null;
  };

  return (
    <DiffContainer>
      {diff.map((change, index) => renderLine(change, index))}
    </DiffContainer>
  );
};

export default DiffViewer;
