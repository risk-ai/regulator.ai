/**
 * useVirtualScroll — P2 Performance
 * 
 * Lightweight virtual scrolling for lists with 1000+ items.
 * Only renders visible items + buffer, dramatically reducing DOM nodes.
 * 
 * Usage:
 *   const { visibleItems, containerProps, totalHeight } = useVirtualScroll({
 *     items: allItems,
 *     itemHeight: 48,
 *     containerHeight: 600,
 *     overscan: 5,
 *   });
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface UseVirtualScrollOptions<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem<T> {
  item: T;
  index: number;
  style: React.CSSProperties;
}

interface UseVirtualScrollResult<T> {
  visibleItems: VirtualItem<T>[];
  totalHeight: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: UseVirtualScrollOptions<T>): UseVirtualScrollResult<T> {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null!);

  const totalHeight = items.length * itemHeight;

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visible: VirtualItem<T>[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visible.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute' as const,
          top: `${i * itemHeight}px`,
          left: 0,
          right: 0,
          height: `${itemHeight}px`,
        },
      });
    }
    return visible;
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    containerRef,
    onScroll,
  };
}
