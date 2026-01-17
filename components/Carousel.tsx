'use client';

import { ReactNode, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Carousel.module.scss';

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  emptyState: ReactNode;
  title?: string;
  controlsPosition?: 'side' | 'bottom';
}

/**
 * Carousel - Reusable carousel component for navigating through items
 *
 * Features:
 * - Previous/Next arrow buttons (side or bottom)
 * - Counter showing current position (e.g., "2 of 5")
 * - Keyboard navigation (arrow keys)
 * - Smooth transitions
 * - Empty state support
 */
export default function Carousel<T>({
  items,
  renderItem,
  emptyState,
  title,
  controlsPosition = 'side',
}: CarouselProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when items change
  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (items.length === 0) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length]);

  // Empty state
  if (items.length === 0) {
    return <div className={styles.emptyState}>{emptyState}</div>;
  }

  const showControls = items.length > 1;

  if (controlsPosition === 'bottom') {
    return (
      <div className={styles.carousel}>
        {title && <h3 className={styles.title}>{title}</h3>}

        {/* Current Item */}
        <div className={styles.itemContainer}>
          {renderItem(items[currentIndex], currentIndex)}
        </div>

        {/* Bottom Controls */}
        {showControls && (
          <div className={styles.bottomControls}>
            <button
              className={styles.arrowButtonBottom}
              onClick={handlePrevious}
              aria-label="Previous item"
            >
              <ChevronLeft size={16} />
            </button>

            <div className={styles.counter}>
              {currentIndex + 1} of {items.length}
            </div>

            <button
              className={styles.arrowButtonBottom}
              onClick={handleNext}
              aria-label="Next item"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.carousel}>
      {title && <h3 className={styles.title}>{title}</h3>}

      <div className={styles.content}>
        {/* Previous Button */}
        {showControls && (
          <button
            className={styles.arrowButton}
            onClick={handlePrevious}
            aria-label="Previous item"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Current Item */}
        <div className={styles.itemContainer}>
          {renderItem(items[currentIndex], currentIndex)}
        </div>

        {/* Next Button */}
        {showControls && (
          <button
            className={styles.arrowButton}
            onClick={handleNext}
            aria-label="Next item"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Counter */}
      {showControls && (
        <div className={styles.counter}>
          {currentIndex + 1} of {items.length}
        </div>
      )}
    </div>
  );
}
