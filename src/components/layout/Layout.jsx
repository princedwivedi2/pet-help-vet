import { Outlet, useLocation } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar/Sidebar';
import Navbar from './Navbar/Navbar';
import PageTransition from '../common/PageTransition';
import styles from './Layout.module.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      {sidebarOpen && <div className={styles.overlay} onClick={closeSidebar} />}
      <div className={styles.main}>
        <Navbar onToggleSidebar={toggleSidebar} />
        <div className={styles.content}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
