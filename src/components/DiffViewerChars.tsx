import React, { useMemo } from "react";
import { diffLines } from "diff";
import styled from "styled-components";

const DiffContainer = styled.div`
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  overflow: hidden;
`;

const DiffHeader = styled.div`
  background: #f6f8fa;
  padding: 8px 16px;
  border-bottom: 1px solid #e1e4e8;
  font-weight: 600;
  color: #24292e;
`;

const DiffContent = styled.div`
  background: white;
`;

const DiffLine = styled.div<{ type: "added" | "removed" | "unchanged" }>`
  display: flex;
  background-color: ${(props) => {
    switch (props.type) {
      case "added":
        return "#f6ffed";
      case "removed":
        return "#ffeef0";
      default:
        return "transparent";
    }
  }};
  border-left: 4px solid
    ${(props) => {
      switch (props.type) {
        case "added":
          return "#28a745";
        case "removed":
          return "#d73a49";
        default:
          return "transparent";
      }
    }};
`;

const LineNumber = styled.div`
  width: 50px;
  padding: 4px 8px;
  text-align: right;
  color: #6a737d;
  background: #f6f8fa;
  border-right: 1px solid #e1e4e8;
  user-select: none;
`;

const LineContent = styled.div`
  flex: 1;
  padding: 4px 8px;
  white-space: pre;
`;

const ChangedText = styled.span<{ type: "added" | "removed" }>`
  background-color: ${(props) =>
    props.type === "added" ? "#a6f3a6" : "#fdb8c0"};
  font-weight: bold;
`;

interface DiffViewerProps {
  oldText: string;
  newText: string;
  showCharacterDiff?: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  oldText,
  newText,
  showCharacterDiff = true,
}) => {
  const diff = useMemo(() => {
    return diffLines(oldText, newText, { ignoreWhitespace: false });
  }, [oldText, newText]);

  const renderDiff = () => {
    let oldLineNumber = 0;
    let newLineNumber = 0;

    return diff.map((change, index) => {
      const lines = change.value.split("\n").filter((line) => line.length > 0);

      return lines.map((line, lineIndex) => {
        if (change.added) {
          newLineNumber++;
          return (
            <DiffLine key={`${index}-${lineIndex}`} type="added">
              <LineNumber>{newLineNumber}</LineNumber>
              <LineContent>+ {showCharacterDiff ? line : line}</LineContent>
            </DiffLine>
          );
        }

        if (change.removed) {
          oldLineNumber++;
          return (
            <DiffLine key={`${index}-${lineIndex}`} type="removed">
              <LineNumber>{oldLineNumber}</LineNumber>
              <LineContent>- {showCharacterDiff ? line : line}</LineContent>
            </DiffLine>
          );
        }

        oldLineNumber++;
        newLineNumber++;

        return (
          <DiffLine key={`${index}-${lineIndex}`} type="unchanged">
            <LineNumber>{newLineNumber}</LineNumber>
            <LineContent>{line}</LineContent>
          </DiffLine>
        );
      });
    });
  };

  return (
    <DiffContainer>
      <DiffHeader>文件差异对比</DiffHeader>
      <DiffContent>{renderDiff()}</DiffContent>
    </DiffContainer>
  );
};

export default DiffViewer;
