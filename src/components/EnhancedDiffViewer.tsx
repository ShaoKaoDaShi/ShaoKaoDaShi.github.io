import React, { useMemo } from "react";
import { diffLines, diffWords } from "diff";
import styled from "styled-components";

const Container = styled.div`
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 14px;
  line-height: 1.5;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  overflow: hidden;
  max-width: 100%;
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
  &:hover {
    background-color: ${(props) => {
      switch (props.type) {
        case "added":
          return "#cdffd8";
        case "removed":
          return "#ffdce0";
        default:
          return "#f6f8fa";
      }
    }};
  }
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

const ContextLine = styled.div`
  color: #656d76;
  font-style: italic;
`;

interface EnhancedDiffViewerProps {
  oldText: string;
  newText: string;
  fileName?: string;
  contextLines?: number;
}

interface LineDiff {
  oldLineNumber?: number;
  newLineNumber?: number;
  type: "added" | "removed" | "unchanged";
  oldContent?: string;
  newContent?: string;
  charChanges?: Array<{
    type: "added" | "removed" | "unchanged";
    value: string;
  }>;
}

const EnhancedDiffViewer: React.FC<EnhancedDiffViewerProps> = ({
  oldText,
  newText,
  fileName = "文件",
  contextLines: _contextLines = 3,
}) => {
  const lineDiffs = useMemo(() => {
    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");
    const lineChanges = diffLines(oldText, newText);

    const diffs: LineDiff[] = [];
    let oldLineNum = 0;
    let newLineNum = 0;

    lineChanges.forEach((change) => {
      const lines = change.value.split("\n");

      lines.forEach((line) => {
        if (line === "" && lines.length > 1) return;

        if (change.added) {
          newLineNum++;
          const oldContent = oldLines[oldLineNum] || "";
          const newContent = line;

          // 计算字符级别的差异
          const charChanges = diffWords(oldContent, newContent);

          diffs.push({
            oldLineNumber: undefined,
            newLineNumber: newLineNum,
            type: "added",
            oldContent: oldContent,
            newContent: newContent,
            charChanges: charChanges.map((part) => ({
              type: part.added
                ? "added"
                : part.removed
                  ? "removed"
                  : "unchanged",
              value: part.value,
            })),
          });
        } else if (change.removed) {
          oldLineNum++;
          const oldContent = line;
          const newContent = newLines[newLineNum] || "";

          // 计算字符级别的差异
          const charChanges = diffWords(oldContent, newContent);

          diffs.push({
            oldLineNumber: oldLineNum,
            newLineNumber: undefined,
            type: "removed",
            oldContent: oldContent,
            newContent: newContent,
            charChanges: charChanges.map((part) => ({
              type: part.added
                ? "added"
                : part.removed
                  ? "removed"
                  : "unchanged",
              value: part.value,
            })),
          });
        } else {
          oldLineNum++;
          newLineNum++;

          diffs.push({
            oldLineNumber: oldLineNum,
            newLineNumber: newLineNum,
            type: "unchanged",
            oldContent: line,
            newContent: line,
          });
        }
      });
    });

    return diffs;
  }, [oldText, newText]);

  const renderLineContent = (lineDiff: LineDiff) => {
    if (lineDiff.type === "unchanged") {
      return <UnchangedChar>{lineDiff.newContent}</UnchangedChar>;
    }
    // TODO: 处理不改动的地方
    if (lineDiff.type === "added") {
      console.log(lineDiff.charChanges, "lineDiff.charChanges");
      return (
        <>
          {lineDiff.charChanges?.map((change, index) => {
            if (change.type === "added") {
              return <AddedChar key={index}>{change.value}</AddedChar>;
            }
            if (change.type === "unchanged") {
              return <UnchangedChar key={index}>{change.value}</UnchangedChar>;
            }
            // return <UnchangedChar key={index}>{change.value}</UnchangedChar>;
          })}
        </>
      );
    }

    if (lineDiff.type === "removed") {
      return (
        <>
          {lineDiff.charChanges?.map((change, index) => {
            if (change.type === "removed") {
              return <RemovedChar key={index}>{change.value}</RemovedChar>;
            }
            // return <UnchangedChar key={index}>{change.value}</UnchangedChar>;
          })}
        </>
      );
    }

    return null;
  };

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;

    lineDiffs.forEach((diff) => {
      if (diff.type === "added") added++;
      if (diff.type === "removed") removed++;
    });
    console.log("lineDiffs", lineDiffs);
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
              {lineDiff.oldLineNumber && (
                <OldLineNumber>{lineDiff.oldLineNumber || ""}-</OldLineNumber>
              )}
              {lineDiff.type === "added" && lineDiff.newLineNumber && (
                <NewLineNumber>{lineDiff.newLineNumber || ""}+</NewLineNumber>
              )}
            </LineNumbers>
            <LineContent>{renderLineContent(lineDiff)}</LineContent>
          </DiffRow>
        ))}
      </DiffTable>
    </Container>
  );
};

export default EnhancedDiffViewer;
