import React, { useState } from "react";
// import DiffViewer from "../../components/DiffViewer";
import RawDiffViewer from "../../components/RawDiffViewer";

const DiffViewerPage: React.FC = () => {
  const [oldText] = useState(`function hello(name) {
  console.log('Hello ' + name);
  return 'Hello ' + name;
}

// 这是一个旧函数
function oldFunction() {
  return 1 + 1;
}`);

  const [newText] = useState(`function greet(name, greeting = 'Hello') {
  console.log(\`\${greeting}, \${name}!\`);
  return \`\${greeting}, \${name}!\`;
}

// 这是一个新函数
function newFunction() {
  return 2 + 2;
}`);

  return (
    <div className="h-full p-6 flex flex-col gap-4">
      <div className="bg-white p-4 rounded shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">
          自定义 Diff Viewer 实现
        </h2>
        <p className="text-gray-600 mt-2">
          完全使用 React + Tailwind CSS 实现的 Diff Viewer，不依赖 Monaco
          Editor。 支持 Split (双栏) 和 Unified (单栏) 模式，算法处理行对齐。
        </p>
      </div>

      <div className="flex-1 min-h-0 shadow-lg rounded-lg overflow-hidden">
        <RawDiffViewer
          oldText={oldText}
          newText={newText}
          fileName="example.js"
          viewMode="split"
        />
      </div>
    </div>
  );
};

export default DiffViewerPage;
