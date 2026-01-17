'use client';

import React, { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import ProgressStats from '@/components/ProgressStats';
import QueueStatus from '@/components/QueueStatus';
import OfficerDetail from '@/components/OfficerDetail';
import styles from './page.module.scss';

/**
 * Dashboard Page - Main validation interface
 *
 * Features:
 * - Two-column layout using DashboardLayout
 * - Left column: ProgressStats + QueueStatus
 * - Right column: OfficerDetail
 * - URL state management using Next.js search params (?officer={mention_uid})
 * - Toast notifications for user feedback
 * - Validator ID (hardcoded for now: "validator_001")
 *
 * User Flow:
 * 1. Land on /dashboard → see stats and queue
 * 2. Click "Get Next Officer" → officer claimed, URL updates
 * 3. Review officer information
 * 4. Click validation button → confirmation dialog
 * 5. Confirm → validation saved, URL cleared, stats updated
 * 6. Repeat
 */
export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get officer mention_uid from URL params
  const currentOfficerUid = searchParams.get('officer');

  // Hardcoded validator ID (in production, this would come from auth/session)
  const validatorId = 'validator_001';

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

    // Show success toast
    toast.success('Officer claimed successfully', {
      description: 'You can now review and validate this officer',
    });
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

  return (
    <DashboardLayout>
      {/* Left Column */}
      <div className={styles.leftColumn}>
        <ProgressStats />
        <QueueStatus
          validatorId={validatorId}
          onOfficerClaimed={handleOfficerClaimed}
          onOfficerReleased={handleOfficerReleased}
        />
      </div>

      {/* Right Column */}
      <div className={styles.rightColumn}>
        <OfficerDetail
          mentionUid={currentOfficerUid}
          validatorId={validatorId}
          onValidationComplete={handleValidationComplete}
        />
      </div>
    </DashboardLayout>
  );
}
