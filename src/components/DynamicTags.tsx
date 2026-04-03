import React, { useRef, useState, useEffect } from "react";

export interface TagItem {
  id: string | number;
  name: string;
}

export interface DynamicTagsProps {
  tags: TagItem[];
  gap?: number;
  className?: string;
  tagClassName?: string;
  moreTagClassName?: string;
}

const DynamicTags: React.FC<DynamicTagsProps> = ({
  tags,
  gap = 8,
  className = "",
  tagClassName = "bg-blue-100 text-blue-800 border border-blue-200 px-2 py-1 rounded text-sm whitespace-nowrap",
  moreTagClassName = "bg-gray-100 text-gray-800 border border-gray-200 px-2 py-1 rounded text-sm whitespace-nowrap cursor-default",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenContainerRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState<number>(tags.length);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !hiddenContainerRef.current) return;

    const measure = () => {
      if (!containerRef.current || !hiddenContainerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const hiddenNodes = Array.from(
        hiddenContainerRef.current.children,
      ) as HTMLElement[];

      if (hiddenNodes.length === 0) return;

      // The last node is the "+X" measuring tag
      const moreTagNode = hiddenNodes[hiddenNodes.length - 1];
      const moreTagWidth = moreTagNode.offsetWidth;

      const tagNodes = hiddenNodes.slice(0, hiddenNodes.length - 1);
      const tagWidths = tagNodes.map((node) => node.offsetWidth);

      let totalWidthIfAllFit = 0;
      for (let i = 0; i < tagWidths.length; i++) {
        totalWidthIfAllFit += tagWidths[i] + (i > 0 ? gap : 0);
      }

      if (totalWidthIfAllFit <= containerWidth) {
        setVisibleCount(tags.length);
        return;
      }

      let currentWidth = 0;
      let count = 0;

      // Iterate and see how many fit, leaving room for the "+X" tag
      for (let i = 0; i < tagWidths.length; i++) {
        // Space needed = width of this tag + gap before it (if any) + gap before "+X" tag + width of "+X" tag
        const widthRequiredForThisTag = tagWidths[i] + (count > 0 ? gap : 0);
        const widthRequiredForMoreTag = gap + moreTagWidth;

        if (
          currentWidth + widthRequiredForThisTag + widthRequiredForMoreTag >
          containerWidth
        ) {
          // Check if it's the very first tag. We might still want to show it if it's super long
          // but typically we hide it if it doesn't fit with the "+X" tag.
          if (count === 0 && tagWidths[i] <= containerWidth) {
            count = 1;
          }
          break;
        }

        currentWidth += widthRequiredForThisTag;
        count++;
      }

      setVisibleCount(count);
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    resizeObserver.observe(containerRef.current);
    measure();

    return () => {
      resizeObserver.disconnect();
    };
  }, [tags, gap]);

  const visibleTags = tags.slice(0, visibleCount);
  const hiddenTags = tags.slice(visibleCount);

  return (
    <div ref={containerRef} className={`w-full relative ${className}`}>
      {/* Hidden container for accurate width measurement */}
      <div
        ref={hiddenContainerRef}
        className="absolute invisible flex opacity-0 pointer-events-none"
        style={{
          top: -9999,
          left: -9999,
          gap: `${gap}px`,
          whiteSpace: "nowrap",
        }}
      >
        {tags.map((tag) => (
          <div key={tag.id} className={tagClassName}>
            {tag.name}
          </div>
        ))}
        <div className={moreTagClassName}>
          +{hiddenTags.length || tags.length}
        </div>
      </div>

      {/* Visible container */}
      <div className="flex items-center" style={{ gap: `${gap}px` }}>
        {visibleTags.map((tag) => (
          <div key={tag.id} className={tagClassName}>
            {tag.name}
          </div>
        ))}

        {hiddenTags.length > 0 && (
          <div
            className={`relative ${moreTagClassName}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            +{hiddenTags.length}
            {/* Tooltip for hidden tags */}
            {isHovered && (
              <div
                className="absolute right-0 top-full mt-2 bg-white border border-gray-200 shadow-xl rounded-md p-3 z-50 flex flex-wrap cursor-default"
                style={{ width: "max-content", maxWidth: "300px", gap: "8px" }}
              >
                {hiddenTags.map((tag) => (
                  <div key={tag.id} className={tagClassName}>
                    {tag.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicTags;
