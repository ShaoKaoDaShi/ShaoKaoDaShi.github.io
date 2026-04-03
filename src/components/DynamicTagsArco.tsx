import React, { useRef, useState, useEffect } from "react";
import { Tag, Tooltip, Space, TagProps } from "@arco-design/web-react";

export interface TagItem {
  id: string | number;
  name: string;
}

export interface DynamicTagsProps {
  tags: TagItem[];
  gap?: number;
  className?: string;
  tagProps?: TagProps; // Allows passing extra props to Arco Tag
}

const DynamicTagsArco: React.FC<DynamicTagsProps> = ({
  tags,
  gap = 8,
  className = "",
  tagProps,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenContainerRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState<number>(tags.length);

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
          <Tag key={tag.id} {...tagProps}>
            {tag.name}
          </Tag>
        ))}
        <Tag {...tagProps}>+{hiddenTags.length || tags.length}</Tag>
      </div>

      {/* Visible container */}
      <div className="flex items-center" style={{ gap: `${gap}px` }}>
        {visibleTags.map((tag) => (
          <Tag key={tag.id} {...tagProps}>
            {tag.name}
          </Tag>
        ))}

        {hiddenTags.length > 0 && (
          <Tooltip
            content={
              <Space wrap size={8} style={{ maxWidth: 300 }}>
                {hiddenTags.map((tag) => (
                  <Tag key={tag.id} {...tagProps}>
                    {tag.name}
                  </Tag>
                ))}
              </Space>
            }
          >
            <Tag {...tagProps} style={{ cursor: "default" }}>
              +{hiddenTags.length}
            </Tag>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default DynamicTagsArco;
