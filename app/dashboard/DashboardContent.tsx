'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import OfficerDetail from '@/components/OfficerDetail';

/**
 * Dashboard Content - Client component with search params access
 *
 * Layout:
 * - Left Sidebar: Stats + Queue + Next Officer button
 * - Main Content: Officer detail with carousels
 * - Right Sidebar: Validation actions
 */
export default function DashboardContent() {
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

  return (
    <DashboardLayout>
      {/* Left Sidebar - Stats, Queue, Navigation */}
      <LeftSidebar
        validatorId={validatorId}
        currentOfficerUid={currentOfficerUid}
        onOfficerClaimed={handleOfficerClaimed}
        onOfficerReleased={handleOfficerReleased}
      />

      {/* Main Content - Officer Details */}
      <OfficerDetail mentionUid={currentOfficerUid} />

      {/* Right Sidebar - Validation Actions */}
      <RightSidebar
        mentionUid={currentOfficerUid}
        validatorId={validatorId}
        onValidationComplete={handleValidationComplete}
      />
    </DashboardLayout>
  );
}
