import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useAppContext } from '../context/AppContext';
import { getEntityColor } from '../utils/messageMarks';
import styles from './SelectedSegmentsPanel.module.css';

type SortMode = 'newest' | 'oldest' | 'class';

const SORT_ORDER: SortMode[] = ['newest', 'oldest', 'class'];

export function SelectedSegmentsPanel() {
  const {
    marks,
    entities,
    draftSelection,
    globalHidden,
    activeMarkIndex,
    removeMark,
    setActiveMarkIndex,
    toggleGlobalMarksVisibility,
    toggleMarkVisibility,
    updateMarkFieldValue,
  } = useAppContext();
  const [expandedMarkIndex, setExpandedMarkIndex] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredEntityIds, setFilteredEntityIds] = useState<string[]>([]);
  const sortButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);

  const marksWithIndex = useMemo(() => {
    return marks.map((mark, index) => ({ mark, index }));
  }, [marks]);

  const filteredMarks = useMemo(() => {
    if (filteredEntityIds.length === 0) {
      return marksWithIndex;
    }

    return marksWithIndex.filter(({ mark }) => filteredEntityIds.includes(mark.entityId));
  }, [filteredEntityIds, marksWithIndex]);

  const sortedMarks = useMemo(() => {
    const nextMarks = [...filteredMarks];

    if (sortMode === 'newest') {
      return nextMarks.sort((left, right) => right.index - left.index);
    }

    if (sortMode === 'oldest') {
      return nextMarks.sort((left, right) => left.index - right.index);
    }

    return nextMarks.sort((left, right) => left.mark.entityId.localeCompare(right.mark.entityId, 'ru'));
  }, [filteredMarks, sortMode]);

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      return marks.some((mark) => mark.entityId === entity.id);
    });
  }, [entities, marks]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        isSortMenuOpen &&
        sortMenuRef.current &&
        !sortMenuRef.current.contains(target) &&
        !sortButtonRef.current?.contains(target)
      ) {
        setIsSortMenuOpen(false);
      }

      if (
        isFilterOpen &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(target) &&
        !filterButtonRef.current?.contains(target)
      ) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isFilterOpen, isSortMenuOpen]);

  const toggleExpanded = (markIndex: number) => {
    setExpandedMarkIndex((currentIndex) => (currentIndex === markIndex ? null : markIndex));
  };

  const handleSortCycle = () => {
    const currentIndex = SORT_ORDER.indexOf(sortMode);
    const nextIndex = (currentIndex + 1) % SORT_ORDER.length;
    setSortMode(SORT_ORDER[nextIndex]);
  };

  const handleSortContextMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsSortMenuOpen((currentState) => !currentState);
  };

  const handleFilterToggle = () => {
    setIsFilterOpen((currentState) => !currentState);
  };

  const toggleEntityFilter = (entityId: string, checked: boolean) => {
    setFilteredEntityIds((currentIds) => {
      if (checked) {
        return [...currentIds, entityId];
      }

      return currentIds.filter((currentId) => currentId !== entityId);
    });
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Selection</p>
        <h2 className={styles.title}>Выбранные сегменты</h2>
        <p className={styles.description}>
          Правая панель подготовлена под отображение выбранных сегментов.
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <button
            ref={sortButtonRef}
            type="button"
            className={styles.squareButton}
            onClick={handleSortCycle}
            onContextMenu={handleSortContextMenu}
            aria-label="Сортировка"
            data-tooltip="Сортировка"
          >
            ⇅
          </button>
          {isSortMenuOpen ? (
            <div ref={sortMenuRef} className={styles.sortMenu}>
              {SORT_ORDER.map((option) => (
                <label key={option} className={styles.radioOption}>
                  <input
                    type="radio"
                    name="sort-mode"
                    checked={sortMode === option}
                    onChange={() => {
                      setSortMode(option);
                      setIsSortMenuOpen(false);
                    }}
                  />
                  <span>{getSortLabel(option)}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.controlGroup}>
          <button
            ref={filterButtonRef}
            type="button"
            className={styles.squareButton}
            onClick={handleFilterToggle}
            aria-label="Фильтрация"
            data-tooltip="Фильтрация"
          >
            ☰
          </button>
          {isFilterOpen ? (
            <div ref={filterPanelRef} className={styles.filterPanel}>
              <div className={styles.filterList}>
                {filteredEntities.map((entity) => (
                  <label key={entity.id} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={filteredEntityIds.includes(entity.id)}
                      onChange={(event) => toggleEntityFilter(entity.id, event.target.checked)}
                    />
                    <span>{entity.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={`${styles.squareButton} ${globalHidden ? styles.squareButtonOff : ''}`}
          onClick={toggleGlobalMarksVisibility}
          aria-label={globalHidden ? 'Показать все marks' : 'Скрыть все marks'}
          data-tooltip={globalHidden ? 'Показать все сегменты' : 'Скрыть все сегменты'}
        >
          {globalHidden ? '◌' : '◉'}
        </button>
      </div>

      {draftSelection.start !== null && draftSelection.finish !== null ? (
        <div className={styles.selectionSummary}>
          <p className={styles.selectionTitle}>Draft selection</p>
          <p className={styles.selectionMeta}>
            start: {draftSelection.start}, finish: {draftSelection.finish}, messages:{' '}
            {draftSelection.messageIds.length}
          </p>
          <p className={styles.selectionText}>{draftSelection.selectedText}</p>
        </div>
      ) : null}

      {sortedMarks.length === 0 ? (
        <div className={styles.emptyState}>Нет выбранных сегментов</div>
      ) : (
        <div className={styles.list}>
          {sortedMarks.map(({ mark, index }) => {
            const isVisible = !mark.hidden && (!globalHidden || mark.forceVisible);

            return (
              <article
                key={`${mark.entityId}-${mark.position.start}-${index}`}
                className={`${styles.markItem} ${isVisible ? '' : styles.markItemMuted} ${
                  activeMarkIndex === index ? styles.markItemActive : ''
                }`}
              >
                <div
                  className={styles.markButton}
                  onClick={() => {
                    setActiveMarkIndex(index);
                    toggleExpanded(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleExpanded(index);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.markHead}>
                    <span
                      className={styles.colorDot}
                      style={{ backgroundColor: getEntityColor(mark.entityId) }}
                      aria-hidden="true"
                    />
                    <div className={styles.markMain}>
                      <p className={styles.markEntity}>{entities.find((entity) => entity.id === mark.entityId)?.name ?? mark.entityId}</p>
                      <p className={styles.markMeta}>
                        {mark.position.start} - {mark.position.finish}
                      </p>
                    </div>
                  </div>

                  <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.eyeButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleMarkVisibility(index);
                    }}
                    aria-label="Переключить видимость mark"
                    data-tooltip={isVisible ? 'Скрыть сегмент' : 'Показать сегмент'}
                  >
                    {isVisible ? '◉' : '◌'}
                  </button>
                  <button
                    type="button"
                      className={styles.removeButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeMark(index);
                      setExpandedMarkIndex((current) => (current === index ? null : current));
                    }}
                    aria-label="Удалить mark"
                    data-tooltip="Удалить сегмент"
                  >
                    ×
                  </button>
                  </div>
                </div>

                <p className={styles.markText}>{mark.text}</p>

                {expandedMarkIndex === index ? (
                  <div className={styles.markFields}>
                    {(entities.find((entity) => entity.id === mark.entityId)?.fields ?? []).map((field) => {
                      if (field.type !== 'checkbox') {
                        return null;
                      }

                      const currentValue = mark.fields[field.name]?.value ?? [];

                      return (
                        <div key={field.name} className={styles.fieldBlock}>
                          <p className={styles.fieldTitle}>{field.title}</p>

                          <div className={styles.options}>
                            {(field.options ?? []).map((option) => (
                              <label key={option.value} className={styles.optionLabel}>
                                <input
                                  type="checkbox"
                                  checked={currentValue.includes(option.value)}
                                  onChange={(event) =>
                                    updateMarkFieldValue({
                                      markIndex: index,
                                      fieldName: field.name,
                                      optionValue: option.value,
                                      checked: event.target.checked,
                                    })
                                  }
                                />
                                <span>{option.title}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function getSortLabel(sortMode: SortMode) {
  if (sortMode === 'newest') {
    return 'Сначала новые';
  }

  if (sortMode === 'oldest') {
    return 'Сначала старые';
  }

  return 'По классам';
}
