/**
 * Main Layout Component
 * Provides consistent layout structure with navigation
 */

import { type ReactNode } from 'react';
import Navbar from './Navbar';
import { Container } from '../design-system/components/Container/Container';

interface LayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
}

export default function Layout({ children, showNavbar = true }: LayoutProps) {
  return (
    <div className="min-h-screen ds-bg-page">
      {showNavbar && <Navbar />}
      <main role="main" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        <Container>
          {children}
        </Container>
      </main>
    </div>
  );
}
