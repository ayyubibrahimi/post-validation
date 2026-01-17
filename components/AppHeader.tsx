'use client';

import styles from './AppHeader.module.scss';

/**
 * AppHeader - Application title header
 *
 * Displays the application name with a clean separator below
 */
export default function AppHeader() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>POST Entity Resolution Validator</h1>
    </header>
  );
}
