import React, { useState } from "react";
import MonacoDiffViewer from "../../components/MonacoDiffViewer";

const PreciseDiffViewerPage: React.FC = () => {
  const [oldText] = useState(`function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}

function formatPrice(price) {
  return '$' + price.toFixed(2);
}`);

  const [newText] = useState(`function calculateTotal(items) {
  return items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};`);

  const [renderSideBySide, setRenderSideBySide] = useState(true);
  const [theme, setTheme] = useState<"vs-dark" | "vs">("vs-dark");
  const [ignoreTrimWhitespace, setIgnoreTrimWhitespace] = useState(false);

  return (
    <div className="h-full flex flex-col p-4 gap-4 box-border">
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            高性能 Diff Viewer
          </h2>
          <p className="text-sm text-gray-500">
            基于 Monaco Editor 的高性能差异对比，支持大文件、语法高亮与智能 diff
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={renderSideBySide}
              onChange={(e) => setRenderSideBySide(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span className="text-gray-700 text-sm">
              双栏模式 (Side-by-Side)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ignoreTrimWhitespace}
              onChange={(e) => setIgnoreTrimWhitespace(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <span className="text-gray-700 text-sm">
              忽略空白 (Ignore Whitespace)
            </span>
          </label>

          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "vs-dark" | "vs")}
            className="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
          >
            <option value="vs-dark">Dark Theme</option>
            <option value="vs">Light Theme</option>
          </select>
        </div>
      </div>

      <div className="flex-1 bg-white rounded shadow-sm overflow-hidden border border-gray-200 relative">
        <MonacoDiffViewer
          original={oldText}
          modified={newText}
          theme={theme}
          options={{
            renderSideBySide: renderSideBySide,
            ignoreTrimWhitespace: ignoreTrimWhitespace,
            originalEditable: true, // 允许编辑左侧以便测试
            readOnly: false, // 允许编辑右侧以便测试
          }}
          height="100%"
        />
      </div>
    </div>
  );
};

export default PreciseDiffViewerPage;
