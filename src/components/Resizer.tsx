import styles from './Resizer.module.css';

type ResizerProps = {
  side: 'left' | 'right';
  onMouseDown: () => void;
};

export function Resizer({ side, onMouseDown }: ResizerProps) {
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Изменить ширину левой панели' : 'Изменить ширину правой панели'}
      className={`${styles.resizer} ${side === 'left' ? styles.left : styles.right}`}
      onMouseDown={onMouseDown}
    />
  );
}
