'use client';

import { ReactNode, Children } from 'react';
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
 * - Left Sidebar: 280px fixed (stats + queue + navigation)
 * - Main Content: Flexible width (officer details)
 * - Right Sidebar: 340px fixed (validation actions)
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const childArray = Children.toArray(children);

  return (
    <div className={styles.pageContainer}>
      <AppHeader />
      <div className={styles.contentWrapper}>
        {/* Left Sidebar */}
        <div className={styles.leftColumn}>
          {childArray[0]}
        </div>

        {/* Main Content */}
        <div className={styles.mainColumn}>
          {childArray[1]}
        </div>

        {/* Right Sidebar */}
        <div className={styles.rightColumn}>
          {childArray[2]}
        </div>
      </div>
    </div>
  );
}
