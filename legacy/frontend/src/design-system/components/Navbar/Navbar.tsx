import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import styles from './Navbar.module.css';

export interface NavbarProps {
  logo?: React.ReactNode;
  children?: React.ReactNode;
  rightContent?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  logo,
  children,
  rightContent,
  sticky = true,
  className = '',
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for shadow effect
  useEffect(() => {
    if (!sticky) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sticky]);

  const navbarClasses = [
    styles.navbar,
    sticky && styles.sticky,
    isScrolled && styles.scrolled,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <nav className={navbarClasses} role="navigation">
        <div className={styles.container}>
          {/* Logo */}
          {logo && <div className={styles.logo}>{logo}</div>}

          {/* Desktop navigation */}
          <div className={styles.desktopNav}>{children}</div>

          {/* Right content (user menu, etc.) */}
          {rightContent && (
            <div className={styles.rightContent}>{rightContent}</div>
          )}

          {/* Mobile hamburger button */}
          <Button
            variant="ghost"
            size="sm"
            className={styles.hamburger}
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={isDrawerOpen}
          >
            <Menu size={24} />
          </Button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        position="left"
      >
        <div className={styles.drawerHeader}>
          {logo && <div className={styles.drawerLogo}>{logo}</div>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={24} />
          </Button>
        </div>
        <div className={styles.drawerContent}>
          {children}
          {rightContent && (
            <div className={styles.drawerRightContent}>{rightContent}</div>
          )}
        </div>
      </Drawer>
    </>
  );
};

Navbar.displayName = 'Navbar';
