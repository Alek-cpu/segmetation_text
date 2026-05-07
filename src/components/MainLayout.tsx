import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { clampPanelWidth } from '../utils/panelWidths';
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
        setLeftPanelWidth(clampPanelWidth(event.clientX - 16));
        return;
      }

      setRightPanelWidth(clampPanelWidth(window.innerWidth - event.clientX - 16));
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
