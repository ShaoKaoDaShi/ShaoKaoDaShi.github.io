import { ReactNode, useEffect, useRef } from "react";
import { throttle } from "lodash";
import "./index.css";

export const ResizeBox = (props: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resizableBox = ref.current;
    if (!resizableBox) return;

    let isResizing = false;
    let startX: number, startWidth: number;

    const MIN_WIDTH = 100;

    const handleMouseDown = (e: MouseEvent) => {
      const rect = resizableBox.getBoundingClientRect();
      if (e.clientX >= rect.right - 5) {
        isResizing = true;
        resizableBox.classList.add("resizing");
        startX = e.clientX;
        startWidth = rect.width;

        e.preventDefault();
      }
    };

    const handleMouseMove = throttle((e: MouseEvent) => {
      const rect = resizableBox.getBoundingClientRect();
      const isNearEdge =
        e.clientX > rect.right - 10 && e.clientX < rect.right + 10;

      if (isNearEdge && !isResizing) {
        resizableBox.style.cursor = "ew-resize";
        document.body.style.cursor = "ew-resize";
        return;
      }

      if (isResizing) {
        const newWidth = Math.max(startWidth + (e.clientX - startX), MIN_WIDTH);
        resizableBox.style.width = `${newWidth}px`;
        return;
      }

      document.body.style.cursor = "auto";
      resizableBox.style.cursor = "auto";
    }, 16);

    // 鼠标松开事件：结束拖拽
    const handleMouseUp = () => {
      isResizing = false;
      resizableBox.classList.remove("resizing");
      document.body.style.cursor = "auto";
      resizableBox.style.cursor = "auto";
    };

    resizableBox.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      resizableBox.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
  return (
    <div id="resizable-box" ref={ref}>
      {props.children}
    </div>
  );
};
