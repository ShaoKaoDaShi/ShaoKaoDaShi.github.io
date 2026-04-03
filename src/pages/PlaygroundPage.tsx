import React, { useState } from "react";
import DynamicTags, { TagItem } from "../components/DynamicTags";

const sampleTags: TagItem[] = [
  { id: 1, name: "React" },
  { id: 2, name: "TypeScript" },
  { id: 3, name: "Tailwind CSS" },
  { id: 4, name: "Vite" },
  { id: 5, name: "Frontend Development" },
  { id: 6, name: "Web Performance" },
  { id: 7, name: "UI/UX Design" },
  { id: 8, name: "State Management" },
  { id: 9, name: "Responsive Design" },
  { id: 10, name: "Component Library" },
];

const PlaygroundPage: React.FC = () => {
  const [containerWidth, setContainerWidth] = useState(600);

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50 overflow-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Playground</h1>
      <p className="text-gray-600 mb-6">
        Here you can test and preview various components.
      </p>

      {/* DynamicTags Component Demo */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-2">Dynamic Tags Component</h2>
        <p className="text-sm text-gray-500 mb-4">
          Adjust the slider to change the container width and see how the tags
          adapt.
        </p>

        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium whitespace-nowrap">
            Container Width:
          </label>
          <input
            type="range"
            min="200"
            max="1000"
            value={containerWidth}
            onChange={(e) => setContainerWidth(Number(e.target.value))}
            className="w-full max-w-md"
          />
          <span className="text-sm text-gray-500 w-16">{containerWidth}px</span>
        </div>

        <div
          className="border border-dashed border-gray-400 p-4 bg-gray-50 rounded"
          style={{ width: `${containerWidth}px` }}
        >
          <DynamicTags tags={sampleTags} />
        </div>
      </div>
    </div>
  );
};

export default PlaygroundPage;
