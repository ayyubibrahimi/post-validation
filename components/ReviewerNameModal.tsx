'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import styles from './ReviewerNameModal.module.scss';

interface ReviewerNameModalProps {
  defaultName: string;
  onSave: (name: string) => void;
}

export default function ReviewerNameModal({ defaultName, onSave }: ReviewerNameModalProps) {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.icon}>
          <User size={32} />
        </div>
        <h2 className={styles.title}>What&apos;s your name?</h2>
        <p className={styles.description}>
          This will be recorded with each validation you submit.
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            placeholder="Enter your name"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className={styles.button}
          >
            Start Reviewing
          </button>
        </form>
      </div>
    </div>
  );
}
