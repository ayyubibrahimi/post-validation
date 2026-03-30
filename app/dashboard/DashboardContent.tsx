'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import ValidationHeader from '@/components/ValidationHeader';
import OfficerDetail from '@/components/OfficerDetail';
import ReviewerNameModal from '@/components/ReviewerNameModal';
import styles from './DashboardContent.module.scss';

const REVIEWER_NAME_KEY = 'reviewer_name';
const DEFAULT_REVIEWER_NAME = 'Reviewer 1';

/**
 * Dashboard Content - Client component with search params access
 *
 * Layout:
 * - Top Header: Navigation, progress, stats, and actions
 * - Main Content: Officer detail with split comparison, actions, citations, disambiguation
 */
export default function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get officer mention_uid from URL params
  const currentOfficerUid = searchParams.get('officer');

  // Reviewer name from localStorage (persists across sessions)
  const [reviewerName, setReviewerName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  // Load reviewer name from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(REVIEWER_NAME_KEY);
    if (stored && stored.trim()) {
      setReviewerName(stored.trim());
    } else {
      setShowNameModal(true);
    }
  }, []);

  const handleSaveReviewerName = (name: string) => {
    localStorage.setItem(REVIEWER_NAME_KEY, name);
    setReviewerName(name);
    setShowNameModal(false);
  };

  const validatorId = reviewerName || DEFAULT_REVIEWER_NAME;

  // Track navigation history of viewed officers
  const [officerHistory, setOfficerHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const lastProcessedOfficer = useRef<string | null>(null);

  // Clear all stale locks on mount
  useEffect(() => {
    const clearStaleLocks = async () => {
      try {
        const response = await fetch('/api/officers/clear-locks', {
          method: 'POST',
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Cleared stale locks on mount:', data.clearedCount);
        }
      } catch (error) {
        console.error('Failed to clear stale locks:', error);
      }
    };

    clearStaleLocks();
  }, []); // Run once on mount

  // Update history when officer changes
  useEffect(() => {
    if (!currentOfficerUid || currentOfficerUid === lastProcessedOfficer.current) {
      return;
    }

    lastProcessedOfficer.current = currentOfficerUid;

    setOfficerHistory(prev => {
      // If we're not at the end of history, clear forward history
      const newHistory = currentIndex >= 0 && currentIndex < prev.length - 1
        ? prev.slice(0, currentIndex + 1)
        : prev;

      // Add new officer to history
      return [...newHistory, currentOfficerUid];
    });

    setCurrentIndex(prev => {
      if (prev >= 0 && prev < officerHistory.length - 1) {
        // We were in the middle, now we're at the new end
        return prev + 1;
      }
      // We were at the end or start, move forward
      return prev + 1;
    });
  }, [currentOfficerUid]);

  /**
   * Handle successful officer claim
   * - Updates URL with officer mention_uid
   * - Shows success toast
   */
  const handleOfficerClaimed = (mentionUid: string) => {
    // Update URL with new officer
    const params = new URLSearchParams(searchParams.toString());
    params.set('officer', mentionUid);
    router.push(`/dashboard?${params.toString()}`);

    // Toast is handled in LeftSidebar
  };

  /**
   * Handle officer release
   * - Clears URL param
   * - Shows info toast
   */
  const handleOfficerReleased = () => {
    // Clear URL param
    router.push('/dashboard');

    // Show info toast
    toast.info('Officer released', {
      description: 'The officer has been returned to the queue',
    });
  };

  /**
   * Handle validation completion
   * - Clears URL param
   * - Shows success toast
   */
  const handleValidationComplete = () => {
    // Clear URL param
    router.push('/dashboard');

    // Show success toast
    toast.success('Validation saved successfully', {
      description: 'The officer has been validated and released',
    });
  };

  /**
   * Navigate to previous officer in history
   */
  const handlePreviousOfficer = useCallback(() => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;
      const previousOfficerUid = officerHistory[previousIndex];

      // Update ref to prevent adding to history again
      lastProcessedOfficer.current = previousOfficerUid;
      setCurrentIndex(previousIndex);

      const params = new URLSearchParams(searchParams.toString());
      params.set('officer', previousOfficerUid);
      router.push(`/dashboard?${params.toString()}`);
    }
  }, [currentIndex, officerHistory, router, searchParams]);

  /**
   * Navigate to next officer in history (only if forward history exists)
   */
  const handleNextInHistory = useCallback(() => {
    if (currentIndex < officerHistory.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextOfficerUid = officerHistory[nextIndex];

      // Update ref to prevent adding to history again
      lastProcessedOfficer.current = nextOfficerUid;
      setCurrentIndex(nextIndex);

      const params = new URLSearchParams(searchParams.toString());
      params.set('officer', nextOfficerUid);
      router.push(`/dashboard?${params.toString()}`);
    }
  }, [currentIndex, officerHistory, router, searchParams]);

  // Check if navigation is available
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < officerHistory.length - 1;

  return (
    <div className={styles.dashboard}>
      {/* Reviewer name modal - shown on first visit or when name is not set */}
      {showNameModal && (
        <ReviewerNameModal
          defaultName={reviewerName || DEFAULT_REVIEWER_NAME}
          onSave={handleSaveReviewerName}
        />
      )}

      {/* Top Header - Navigation, Progress, Stats, Actions */}
      <ValidationHeader
        validatorId={validatorId}
        reviewerName={reviewerName}
        currentOfficerUid={currentOfficerUid}
        currentIndex={currentIndex}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onPrevious={handlePreviousOfficer}
        onNextInHistory={handleNextInHistory}
        onOfficerClaimed={handleOfficerClaimed}
        onOfficerReleased={handleOfficerReleased}
        onChangeReviewerName={() => setShowNameModal(true)}
      />

      {/* Main Content - Officer Details with integrated actions */}
      <main className={styles.mainContent}>
        <OfficerDetail
          mentionUid={currentOfficerUid}
          validatorId={validatorId}
          onValidationComplete={handleValidationComplete}
        />
      </main>
    </div>
  );
}
