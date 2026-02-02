import React, { useMemo } from "react";
import { diffLines, diffChars } from "diff";
import styled from "styled-components";

const Container = styled.div`
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 14px;
  line-height: 1.5;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  overflow: hidden;
`;

const Header = styled.div`
  background: #f6f8fa;
  padding: 16px;
  border-bottom: 1px solid #d0d7de;
  font-weight: 600;
  color: #24292e;
`;

const DiffTable = styled.div`
  display: table;
  width: 100%;
`;

const DiffRow = styled.div<{
  type: "added" | "removed" | "unchanged" | "changed";
}>`
  display: table-row;
  background-color: ${(props) => {
    switch (props.type) {
      case "added":
        return "#dafbe1";
      case "removed":
        return "#ffebe9";
      case "changed":
        return "#fff8c5";
      default:
        return "transparent";
    }
  }};
`;

const LineNumber = styled.div`
  display: table-cell;
  width: 50px;
  padding: 4px 8px;
  text-align: right;
  color: #656d76;
  background: #f6f8fa;
  border-right: 1px solid #d0d7de;
  user-select: none;
`;

const LineContent = styled.div`
  display: table-cell;
  padding: 4px 8px;
  white-space: pre;
  font-family: inherit;
`;

const Marker = styled.span<{ type: "added" | "removed" }>`
  color: ${(props) => (props.type === "added" ? "#1a7f37" : "#d1242f")};
  margin-right: 8px;
  font-weight: bold;
`;

const ChangedPart = styled.span<{ type: "added" | "removed" }>`
  background-color: ${(props) =>
    props.type === "added" ? "#a6f3a6" : "#fdb8c0"};
  font-weight: bold;
`;

interface DiffViewerProps {
  oldText: string;
  newText: string;
  fileName?: string;
  showCharacterDiff?: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  oldText,
  newText,
  fileName = "文件",
  showCharacterDiff = true,
}) => {
  const diff = useMemo(() => {
    return diffLines(oldText, newText, {
      ignoreWhitespace: false,
      newlineIsToken: false,
    });
  }, [oldText, newText]);

  const getStats = () => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diff.forEach((change) => {
      const lines = change.count || 0;
      if (change.added) {
        added += lines;
      } else if (change.removed) {
        removed += lines;
      } else {
        unchanged += lines;
      }
    });

    return { added, removed, unchanged };
  };

  const renderCharacterDiff = (oldLine: string, newLine: string) => {
    const charDiff = diffChars(oldLine, newLine);
    return charDiff.map((part, index) => {
      if (part.added) {
        return (
          <ChangedPart key={index} type="added">
            {part.value}
          </ChangedPart>
        );
      }
      if (part.removed) {
        return (
          <ChangedPart key={index} type="removed">
            {part.value}
          </ChangedPart>
        );
      }
      return <span key={index}>{part.value}</span>;
    });
  };

  const renderDiff = () => {
    let oldLineNumber = 0;
    let newLineNumber = 0;
    const elements: JSX.Element[] = [];

    diff.forEach((change, changeIndex) => {
      const lines = change.value
        .split("\n")
        .filter((line, _index, arr) => line.length > 0 || arr.length > 1);

      lines.forEach((line, lineIndex) => {
        if (change.added) {
          newLineNumber++;
          elements.push(
            <DiffRow key={`${changeIndex}-${lineIndex}`} type="added">
              <LineNumber>
                {newLineNumber}
                <Marker type="added">+</Marker>
              </LineNumber>
              <LineContent>{line}</LineContent>
            </DiffRow>
          );
        } else if (change.removed) {
          oldLineNumber++;
          elements.push(
            <DiffRow key={`${changeIndex}-${lineIndex}`} type="removed">
              <LineNumber>
                {oldLineNumber}
                <Marker type="removed">-</Marker>
              </LineNumber>
              {/* <LineNumber /> */}
              <LineContent>{line}</LineContent>
            </DiffRow>
          );
        } else {
          oldLineNumber++;
          newLineNumber++;
          if (showCharacterDiff && lines.length === 1 && line) {
            // 检查是否有字符级别的变化
            const oldLines = oldText.split("\n");
            const newLines = newText.split("\n");
            const oldLineContent = oldLines[oldLineNumber - 1] || "";
            const newLineContent = newLines[newLineNumber - 1] || "";

            if (oldLineContent !== newLineContent) {
              elements.push(
                <DiffRow key={`${changeIndex}-${lineIndex}`} type="changed">
                  <LineNumber>{oldLineNumber}</LineNumber>
                  <LineNumber>{newLineNumber}</LineNumber>
                  <LineContent>
                    {renderCharacterDiff(oldLineContent, newLineContent)}
                  </LineContent>
                </DiffRow>
              );
            } else {
              elements.push(
                <DiffRow key={`${changeIndex}-${lineIndex}`} type="unchanged">
                  {/* <LineNumber>{oldLineNumber}</LineNumber> */}
                  <LineNumber>{newLineNumber}</LineNumber>
                  <LineContent>{line}</LineContent>
                </DiffRow>
              );
            }
          } else {
            elements.push(
              <DiffRow key={`${changeIndex}-${lineIndex}`} type="unchanged">
                <LineNumber>{oldLineNumber}</LineNumber>
                <LineNumber>{newLineNumber}</LineNumber>
                <LineContent>{line}</LineContent>
              </DiffRow>
            );
          }
        }
      });
    });

    return elements;
  };

  const stats = getStats();

  return (
    <Container>
      <Header>
        {fileName} -
        <span style={{ color: "#28a745", marginLeft: 8 }}>+{stats.added}</span>
        <span style={{ color: "#d73a49", marginLeft: 8 }}>
          -{stats.removed}
        </span>
        <span style={{ color: "#656d76", marginLeft: 8 }}>
          {stats.unchanged} unchanged
        </span>
      </Header>
      <DiffTable>{renderDiff()}</DiffTable>
    </Container>
  );
};

export default DiffViewer;
