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
  padding: 12px 16px;
  border-bottom: 1px solid #d0d7de;
  font-weight: 600;
  color: #24292e;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Stats = styled.div`
  display: flex;
  gap: 16px;
  font-size: 12px;
`;

const StatItem = styled.span<{ color: string }>`
  color: ${(props) => props.color};
  font-weight: bold;
`;

const DiffTable = styled.div`
  display: table;
  width: 100%;
`;

const DiffRow = styled.div<{ type: "added" | "removed" | "unchanged" }>`
  display: table-row;
  background-color: ${(props) => {
    switch (props.type) {
      case "added":
        return "#e6ffed";
      case "removed":
        return "#ffebe9";
      default:
        return "transparent";
    }
  }};
`;

const LineNumbers = styled.div`
  display: table-cell;
  width: 80px;
  background: #f6f8fa;
  border-right: 1px solid #e1e4e8;
  user-select: none;
`;

const OldLineNumber = styled.div`
  width: 40px;
  padding: 4px 8px;
  text-align: right;
  color: #656d76;
  border-right: 1px solid #e1e4e8;
  display: inline-block;
`;

const NewLineNumber = styled.div`
  width: 40px;
  padding: 4px 8px;
  text-align: right;
  color: #656d76;
  display: inline-block;
`;

const LineContent = styled.div`
  display: table-cell;
  padding: 4px 8px;
  white-space: pre-wrap;
  word-break: break-all;
`;

const AddedChar = styled.span`
  background-color: #28a745;
  color: white;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: bold;
`;

const RemovedChar = styled.span`
  background-color: #d73a49;
  color: white;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: bold;
  text-decoration: line-through;
`;

const UnchangedChar = styled.span`
  color: #24292e;
`;

interface PreciseDiffViewerProps {
  oldText: string;
  newText: string;
  fileName?: string;
}

const PreciseDiffViewer: React.FC<PreciseDiffViewerProps> = ({
  oldText,
  newText,
  fileName = "文件",
}) => {
  const lineDiffs = useMemo(() => {
    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");
    const lineChanges = diffLines(oldText, newText);

    const diffs: Array<{
      oldLineNumber?: number;
      newLineNumber?: number;
      type: "added" | "removed" | "unchanged";
      content: string;
      charDiffs?: Array<{
        type: "added" | "removed" | "unchanged";
        value: string;
      }>;
    }> = [];

    let oldLineNum = 0;
    let newLineNum = 0;

    lineChanges.forEach((change) => {
      const lines = change.value
        .split("\n")
        .filter((line, _index, lines) => line.length > 0 || lines.length > 1);

      lines.forEach((line) => {
        if (change.added) {
          newLineNum++;
          // 对于新增的行，所有字符都是新增的
          diffs.push({
            oldLineNumber: undefined,
            newLineNumber: newLineNum,
            type: "added",
            content: line,
            charDiffs: [{ type: "added", value: line }],
          });
        } else if (change.removed) {
          oldLineNum++;
          // 对于删除的行，所有字符都是被删除的
          diffs.push({
            oldLineNumber: oldLineNum,
            newLineNumber: undefined,
            type: "removed",
            content: line,
            charDiffs: [{ type: "removed", value: line }],
          });
        } else {
          oldLineNum++;
          newLineNum++;

          // 对于未改变的行，计算字符差异
          const oldLine = oldLines[oldLineNum - 1] || "";
          const newLine = newLines[newLineNum - 1] || "";

          if (oldLine !== newLine) {
            const charChanges = diffChars(oldLine, newLine);
            diffs.push({
              oldLineNumber: oldLineNum,
              newLineNumber: newLineNum,
              type: "unchanged",
              content: newLine,
              charDiffs: charChanges.map((part) => ({
                type: part.added
                  ? "added"
                  : part.removed
                    ? "removed"
                    : "unchanged",
                value: part.value,
              })),
            });
          } else {
            diffs.push({
              oldLineNumber: oldLineNum,
              newLineNumber: newLineNum,
              type: "unchanged",
              content: line,
              charDiffs: [{ type: "unchanged", value: line }],
            });
          }
        }
      });
    });

    return diffs;
  }, [oldText, newText]);

  const renderLineContent = (
    charDiffs?: Array<{
      type: "added" | "removed" | "unchanged";
      value: string;
    }>,
  ) => {
    if (!charDiffs) return null;

    return charDiffs.map((part, index) => {
      switch (part.type) {
        case "added":
          return <AddedChar key={index}>{part.value}</AddedChar>;
        case "removed":
          return <RemovedChar key={index}>{part.value}</RemovedChar>;
        default:
          return <UnchangedChar key={index}>{part.value}</UnchangedChar>;
      }
    });
  };

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;

    lineDiffs.forEach((diff) => {
      if (diff.type === "added") added++;
      if (diff.type === "removed") removed++;
    });

    return { added, removed };
  }, [lineDiffs]);

  return (
    <Container>
      <Header>
        <span>{fileName}</span>
        <Stats>
          <StatItem color="#28a745">+{stats.added} 新增</StatItem>
          <StatItem color="#d73a49">-{stats.removed} 删除</StatItem>
        </Stats>
      </Header>

      <DiffTable>
        {lineDiffs.map((lineDiff, index) => (
          <DiffRow key={index} type={lineDiff.type}>
            <LineNumbers>
              <OldLineNumber>{lineDiff.oldLineNumber || ""}</OldLineNumber>
              <NewLineNumber>{lineDiff.newLineNumber || ""}</NewLineNumber>
            </LineNumbers>
            <LineContent>{renderLineContent(lineDiff.charDiffs)}</LineContent>
          </DiffRow>
        ))}
      </DiffTable>
    </Container>
  );
};

export default PreciseDiffViewer;
