import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PANEL_MAX_WIDTH, PANEL_MIN_WIDTH } from '../utils/constants';
import { EntitiesPanel } from './EntitiesPanel';
import { Resizer } from './Resizer';
import { SelectedSegmentsPanel } from './SelectedSegmentsPanel';
import { Workspace } from './Workspace';
import styles from './MainLayout.module.css';

export function MainLayout() {
  const { leftPanelWidth, rightPanelWidth, setLeftPanelWidth, setRightPanelWidth } = useAppContext();
  const [resizeSide, setResizeSide] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (!resizeSide) {
      document.body.style.userSelect = '';
      return;
    }

    document.body.style.userSelect = 'none';

    const handleMouseMove = (event: MouseEvent) => {
      if (resizeSide === 'left') {
        setLeftPanelWidth(clampWidth(event.clientX - 16));
        return;
      }

      setRightPanelWidth(clampWidth(window.innerWidth - event.clientX - 16));
    };

    const handleMouseUp = () => {
      setResizeSide(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeSide, setLeftPanelWidth, setRightPanelWidth]);

  return (
    <main className={styles.page}>
      <section className={styles.sideColumn} style={{ width: leftPanelWidth, minWidth: leftPanelWidth }}>
        <EntitiesPanel />
        <Resizer side="left" onMouseDown={() => setResizeSide('left')} />
      </section>

      <section className={styles.centerColumn}>
        <Workspace />
      </section>

      <section className={styles.sideColumn} style={{ width: rightPanelWidth, minWidth: rightPanelWidth }}>
        <Resizer side="right" onMouseDown={() => setResizeSide('right')} />
        <SelectedSegmentsPanel />
      </section>
    </main>
  );
}

function clampWidth(width: number) {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, width));
}
