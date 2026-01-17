import React, { Suspense } from 'react';
import DashboardContent from './DashboardContent';

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
  return (
    <Suspense fallback={<div style={{ padding: '20px' }}>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
