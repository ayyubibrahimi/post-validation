'use client';

import React from 'react';
import styles from './DashboardLayout.module.scss';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * DashboardLayout - Two-column container structure
 *
 * Layout:
 * - Left column: 340px fixed width (contains ProgressStats, QueueStatus)
 * - Right column: Flex 1 - fills remaining space (contains OfficerDetail)
 * - 24px gap between columns
 *
 * Usage:
 * ```tsx
 * <DashboardLayout>
 *   <div className="left-column">
 *     <ProgressStats />
 *     <QueueStatus />
 *   </div>
 *   <div className="right-column">
 *     <OfficerDetail />
 *   </div>
 * </DashboardLayout>
 * ```
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className={styles.container}>
      {children}
    </div>
  );
}
