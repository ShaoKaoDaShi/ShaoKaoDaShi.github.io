import React, { useRef, useState } from "react";

const toId = (label, index) =>
  String(label || `section-${index}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const Layout = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef([]);

  const tabs = React.Children.toArray(children).map((child, index) => ({
    label: child.props.label,
    icon: child.props.icon,
    index,
    id: toId(child.props.label, index),
    component: child,
  }));

  const selectAndFocus = (index) => {
    setActiveTab(index);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event, index) => {
    let nextIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectAndFocus(nextIndex);
  };

  const selectedTab = tabs[activeTab];

  return (
    <div className="w-[680px] h-[600px] bg-gray-50 flex flex-col font-sans text-sm text-gray-700 overflow-hidden shadow-xl rounded-lg">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
            aria-hidden="true"
          >
            M
          </div>
          <h1 className="text-lg font-bold text-gray-800 tracking-tight">
            HTTP Modifier
          </h1>
        </div>
        <div className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-md">
          v1.1.0
        </div>
      </header>

      <div
        role="tablist"
        aria-label="HTTP Modifier sections"
        className="flex bg-white border-b border-gray-200 px-2 shrink-0 overflow-x-auto scrollbar-hide"
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.index;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[tab.index] = element;
              }}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={`
                relative px-4 py-3 text-sm font-medium transition-colors duration-200
                flex items-center gap-2 whitespace-nowrap focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
                ${
                  selected
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }
              `}
              onClick={() => setActiveTab(tab.index)}
              onKeyDown={(event) => handleKeyDown(event, tab.index)}
            >
              {tab.icon ? <span aria-hidden="true">{tab.icon}</span> : null}
              {tab.label}
              {selected ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <main className="flex-1 overflow-y-auto p-6 pb-20 bg-gray-50 custom-scrollbar">
        <div
          id={`panel-${selectedTab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${selectedTab.id}`}
          tabIndex={0}
          className="max-w-3xl mx-auto min-h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {selectedTab.component}
        </div>
      </main>
    </div>
  );
};

export default Layout;
