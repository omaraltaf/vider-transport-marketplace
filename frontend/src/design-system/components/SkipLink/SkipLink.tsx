/**
 * SkipLink Component
 * Provides a skip-to-content link for keyboard navigation accessibility
 * Requirements: 6.2
 */

import React from 'react';
import styles from './SkipLink.module.css';

interface SkipLinkProps {
  targetId?: string;
  children?: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ 
  targetId = 'main-content',
  children = 'Skip to main content'
}) => {
  return (
    <a href={`#${targetId}`} className={styles.skipLink}>
      {children}
    </a>
  );
};
