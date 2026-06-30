import React, { useState } from "react";

const Layout = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = React.Children.toArray(children).map((child, index) => ({
    label: child.props.label,
    icon: child.props.icon,
    index,
    component: child,
  }));

  return (
    <div className="w-[680px] h-[600px] bg-gray-50 flex flex-col font-sans text-sm text-gray-700 overflow-hidden shadow-xl rounded-lg">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            M
          </div>
          <h1 className="text-lg font-bold text-gray-800 tracking-tight">
            HTTP Modifier
          </h1>
        </div>
        <div className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-md">
          v1.0.0
        </div>
      </div>

      {/* Navigation */}
      <div className="flex bg-white border-b border-gray-200 px-2 shrink-0 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.index}
            className={`
              relative px-4 py-3 text-sm font-medium transition-colors duration-200 outline-none
              flex items-center gap-2 whitespace-nowrap
              ${
                activeTab === tab.index
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }
            `}
            onClick={() => setActiveTab(tab.index)}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            {activeTab === tab.index && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 pb-20 bg-gray-50 custom-scrollbar">
        <div className="max-w-3xl mx-auto min-h-full">
          {tabs[activeTab].component}
        </div>
      </div>
    </div>
  );
};

export default Layout;
