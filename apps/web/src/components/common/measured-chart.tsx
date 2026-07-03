'use client';

import { useEffect, useRef, useState } from 'react';

type MeasuredChartProps = {
  className?: string;
  minWidth?: number;
  minHeight?: number;
  children: (size: { width: number; height: number }) => React.ReactNode;
};

export function MeasuredChart({
  className = 'h-72',
  minWidth = 240,
  minHeight = 240,
  children,
}: MeasuredChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }

    const updateSize = () => {
      const nextWidth = Math.max(0, Math.floor(node.clientWidth));
      const nextHeight = Math.max(0, Math.floor(node.clientHeight));

      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      );
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`min-w-0 w-full overflow-hidden ${className}`}
      style={{ minWidth, minHeight }}
    >
      {size.width >= minWidth && size.height >= minHeight ? children(size) : null}
    </div>
  );
}
