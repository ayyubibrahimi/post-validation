'use client';

import { ReactNode } from 'react';
import AppHeader from './AppHeader';
import styles from './DashboardLayout.module.scss';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * DashboardLayout - Three-column layout container
 *
 * Layout:
 * - Header: Full width with app title
 * - Left Sidebar: 240px fixed (stats + queue + navigation)
 * - Main Content: Flexible width (officer details)
 * - Right Sidebar: 280px fixed (validation actions)
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className={styles.pageContainer}>
      <AppHeader />
      <div className={styles.contentWrapper}>
        {children}
      </div>
    </div>
  );
}
