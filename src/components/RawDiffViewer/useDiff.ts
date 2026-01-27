import { useMemo } from "react";
import { diffLines } from "diff";

export interface DiffLine {
  type: "added" | "removed" | "unchanged" | "placeholder";
  lineNumber?: number;
  content: string;
}

export interface SplitDiffRow {
  left: DiffLine;
  right: DiffLine;
}

export const useDiff = (oldText: string, newText: string) => {
  const diffRows = useMemo(() => {
    const changes = diffLines(oldText, newText);

    // New Approach: Process chunks
    const result: SplitDiffRow[] = [];
    let i = 0;
    let oldLn = 1;
    let newLn = 1;

    while (i < changes.length) {
      const current = changes[i];
      const next = changes[i + 1];

      const currentLines = current.value.replace(/\n$/, "").split("\n");

      if (current.removed) {
        // Case: Removed
        // Check if next is Added (Modification)
        if (next && next.added) {
          const nextLines = next.value.replace(/\n$/, "").split("\n");
          const count = Math.max(currentLines.length, nextLines.length);

          for (let j = 0; j < count; j++) {
            const leftContent = currentLines[j];
            const rightContent = nextLines[j];

            result.push({
              left:
                leftContent !== undefined
                  ? {
                      type: "removed",
                      lineNumber: oldLn++,
                      content: leftContent,
                    }
                  : { type: "placeholder", content: "" },
              right:
                rightContent !== undefined
                  ? {
                      type: "added",
                      lineNumber: newLn++,
                      content: rightContent,
                    }
                  : { type: "placeholder", content: "" },
            });
          }
          i += 2; // Skip next
        } else {
          // Just removed
          currentLines.forEach((line) => {
            result.push({
              left: { type: "removed", lineNumber: oldLn++, content: line },
              right: { type: "placeholder", content: "" },
            });
          });
          i++;
        }
      } else if (current.added) {
        // Just added (previous wasn't removed because we handled it above)
        currentLines.forEach((line) => {
          result.push({
            left: { type: "placeholder", content: "" },
            right: { type: "added", lineNumber: newLn++, content: line },
          });
        });
        i++;
      } else {
        // Unchanged
        currentLines.forEach((line) => {
          result.push({
            left: { type: "unchanged", lineNumber: oldLn++, content: line },
            right: { type: "unchanged", lineNumber: newLn++, content: line },
          });
        });
        i++;
      }
    }

    return result;
  }, [oldText, newText]);

  return diffRows;
};
