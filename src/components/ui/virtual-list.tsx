import * as React from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  containerClassName?: string;
  emptyMessage?: React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  className,
  containerClassName,
  emptyMessage = 'Nenhum item encontrado',
  keyExtractor = (_, index) => String(index),
}: VirtualListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);

  // Update container height on resize
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();
    
    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Handle scroll
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-12 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("overflow-auto", containerClassName)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div
              key={keyExtractor(item, startIndex + i)}
              style={{ height: itemHeight }}
              className={className}
            >
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for virtual list with dynamic heights
interface UseDynamicVirtualListOptions {
  itemCount: number;
  estimatedItemHeight: number;
  overscan?: number;
  getScrollElement: () => HTMLElement | null;
}

export function useDynamicVirtualList({
  itemCount,
  estimatedItemHeight,
  overscan = 5,
  getScrollElement,
}: UseDynamicVirtualListOptions) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const measurementsCache = React.useRef<Map<number, number>>(new Map());

  React.useEffect(() => {
    const scrollElement = getScrollElement();
    if (!scrollElement) return;

    const handleScroll = () => {
      setScrollTop(scrollElement.scrollTop);
    };

    const handleResize = () => {
      setViewportHeight(scrollElement.clientHeight);
    };

    handleResize();
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [getScrollElement]);

  const getItemOffset = React.useCallback((index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += measurementsCache.current.get(i) || estimatedItemHeight;
    }
    return offset;
  }, [estimatedItemHeight]);

  const getTotalHeight = React.useCallback(() => {
    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      total += measurementsCache.current.get(i) || estimatedItemHeight;
    }
    return total;
  }, [itemCount, estimatedItemHeight]);

  const getVisibleRange = React.useCallback(() => {
    let startIndex = 0;
    let offset = 0;

    // Find start index
    for (let i = 0; i < itemCount; i++) {
      const height = measurementsCache.current.get(i) || estimatedItemHeight;
      if (offset + height > scrollTop) {
        startIndex = i;
        break;
      }
      offset += height;
    }

    // Find end index
    let endIndex = startIndex;
    let visibleHeight = 0;
    for (let i = startIndex; i < itemCount; i++) {
      const height = measurementsCache.current.get(i) || estimatedItemHeight;
      visibleHeight += height;
      endIndex = i + 1;
      if (visibleHeight > viewportHeight) break;
    }

    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex: Math.min(itemCount, endIndex + overscan),
    };
  }, [scrollTop, viewportHeight, itemCount, estimatedItemHeight, overscan]);

  const measureElement = React.useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      const height = element.getBoundingClientRect().height;
      if (measurementsCache.current.get(index) !== height) {
        measurementsCache.current.set(index, height);
      }
    }
  }, []);

  return {
    getVisibleRange,
    getItemOffset,
    getTotalHeight,
    measureElement,
    scrollTop,
    viewportHeight,
  };
}

// Infinite scroll integration
interface UseInfiniteVirtualListOptions<T> {
  items: T[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  threshold?: number;
}

export function useInfiniteVirtualList<T>({
  items,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 5,
}: UseInfiniteVirtualListOptions<T>) {
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: `${threshold * 50}px` }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, threshold]);

  return { loadMoreRef, items };
}
