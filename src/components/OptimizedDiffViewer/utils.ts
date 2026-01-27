import { diffLines, diffChars, Change } from 'diff';

export interface DiffLineResult {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
  charChanges?: Change[];
}

export const processDiff = (oldText: string, newText: string): DiffLineResult[] => {
  const changes = diffLines(oldText, newText);
  const result: DiffLineResult[] = [];
  
  let oldLineNum = 1;
  let newLineNum = 1;
  let i = 0;

  while (i < changes.length) {
    const current = changes[i];
    const next = changes[i + 1];

    // Split content into lines, removing the last empty string if it comes from trailing newline
    const currentLines = current.value.replace(/\n$/, '').split('\n');

    if (current.removed && next && next.added) {
      // Potential Modification Block
      const nextLines = next.value.replace(/\n$/, '').split('\n');
      
      const count = Math.min(currentLines.length, nextLines.length);
      
      // Process paired lines (modifications)
      for (let j = 0; j < count; j++) {
        const oldContent = currentLines[j];
        const newContent = nextLines[j];
        
        // Calculate character diffs for the removed line (left side / top line)
        const removedCharDiffs = diffChars(oldContent, newContent);
        // We only care about 'removed' parts and 'unchanged' parts for the "Old" line display
        // But typically in unified view for a modification, we show:
        // - Old Line (Red bg, darker red for removed chars)
        // - New Line (Green bg, darker green for added chars)
        
        result.push({
          type: 'removed', // Visually it's a removed line
          oldLineNumber: oldLineNum++,
          content: oldContent,
          charChanges: removedCharDiffs
        });

        // For the new line
        result.push({
          type: 'added', // Visually it's an added line
          newLineNumber: newLineNum++,
          content: newContent,
          charChanges: removedCharDiffs // We use the same diff result, but render 'added' parts
        });
      }

      // Handle remaining lines
      if (currentLines.length > count) {
        // More removed lines
        for (let j = count; j < currentLines.length; j++) {
          result.push({
            type: 'removed',
            oldLineNumber: oldLineNum++,
            content: currentLines[j]
          });
        }
      }
      
      if (nextLines.length > count) {
        // More added lines
        for (let j = count; j < nextLines.length; j++) {
          result.push({
            type: 'added',
            newLineNumber: newLineNum++,
            content: nextLines[j]
          });
        }
      }

      i += 2; // Skip both current and next
    } else {
      // Standard processing
      currentLines.forEach(line => {
        if (current.added) {
          result.push({
            type: 'added',
            newLineNumber: newLineNum++,
            content: line
          });
        } else if (current.removed) {
          result.push({
            type: 'removed',
            oldLineNumber: oldLineNum++,
            content: line
          });
        } else {
          result.push({
            type: 'unchanged',
            oldLineNumber: oldLineNum++,
            newLineNumber: newLineNum++,
            content: line
          });
        }
      });
      i++;
    }
  }

  return result;
};
