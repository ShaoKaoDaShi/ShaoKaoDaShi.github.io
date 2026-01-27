import React, { useMemo } from 'react';
import { processDiff, DiffLineResult } from './utils';

interface OptimizedDiffViewerProps {
  oldText: string;
  newText: string;
  fileName?: string;
}

const OptimizedDiffViewer: React.FC<OptimizedDiffViewerProps> = ({
  oldText,
  newText,
  fileName = 'Diff',
}) => {
  const diffLines = useMemo(() => processDiff(oldText, newText), [oldText, newText]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    diffLines.forEach(l => {
      if (l.type === 'added') added++;
      if (l.type === 'removed') removed++;
    });
    return { added, removed };
  }, [diffLines]);

  return (
    <div className="border border-gray-300 rounded-lg bg-white overflow-hidden font-mono text-sm shadow-sm">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <span className="font-semibold text-gray-700">{fileName}</span>
        <div className="flex space-x-4 text-xs font-medium">
          <span className="text-green-600">+{stats.added} Added</span>
          <span className="text-red-600">-{stats.removed} Removed</span>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {diffLines.map((line, index) => (
              <DiffLineRow key={index} line={line} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DiffLineRow: React.FC<{ line: DiffLineResult }> = ({ line }) => {
  const { type, oldLineNumber, newLineNumber, content, charChanges } = line;

  const getBgClass = () => {
    switch (type) {
      case 'added': return 'bg-green-50';
      case 'removed': return 'bg-red-50';
      default: return 'bg-white';
    }
  };

  const getLineNumberClass = () => {
    switch (type) {
      case 'added': return 'bg-green-100 text-green-700 border-green-200';
      case 'removed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-white text-gray-400 border-gray-100';
    }
  };

  const renderContent = () => {
    if (!charChanges) {
      return (
        <span>
          {type === 'added' && <span className="text-green-600 font-bold mr-1 select-none">+</span>}
          {type === 'removed' && <span className="text-red-600 font-bold mr-1 select-none">-</span>}
          {type === 'unchanged' && <span className="text-transparent font-bold mr-1 select-none"> </span>}
          {content}
        </span>
      );
    }

    // Render with char highlighting
    return (
      <span>
        {type === 'added' && <span className="text-green-600 font-bold mr-1 select-none">+</span>}
        {type === 'removed' && <span className="text-red-600 font-bold mr-1 select-none">-</span>}
        
        {charChanges.map((change, i) => {
          if (type === 'removed') {
            // For removed line, we show 'removed' parts and 'unchanged' parts
            // We do NOT show 'added' parts (those belong to the new line)
            if (change.removed) {
              return <span key={i} className="bg-red-200 text-red-900 font-semibold">{change.value}</span>;
            }
            if (!change.added) {
              return <span key={i}>{change.value}</span>;
            }
            return null;
          } else if (type === 'added') {
            // For added line, we show 'added' parts and 'unchanged' parts
            if (change.added) {
              return <span key={i} className="bg-green-200 text-green-900 font-semibold">{change.value}</span>;
            }
            if (!change.removed) {
              return <span key={i}>{change.value}</span>;
            }
            return null;
          }
          return null;
        })}
      </span>
    );
  };

  return (
    <tr className={`hover:bg-opacity-80 ${getBgClass()}`}>
      {/* Old Line Number */}
      <td className={`w-[50px] text-right px-2 py-0.5 select-none border-r ${getLineNumberClass()}`}>
        {oldLineNumber || ''}
      </td>
      {/* New Line Number */}
      <td className={`w-[50px] text-right px-2 py-0.5 select-none border-r ${getLineNumberClass()}`}>
        {newLineNumber || ''}
      </td>
      {/* Content */}
      <td className="px-3 py-0.5 whitespace-pre-wrap break-all w-full text-gray-800">
        {renderContent()}
      </td>
    </tr>
  );
};

export default OptimizedDiffViewer;
