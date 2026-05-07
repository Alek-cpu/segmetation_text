import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../context/AppContext';
import { getEntityColor } from '../utils/messageMarks';
import styles from './SelectedSegmentsPanel.module.css';

type SortMode = 'newest' | 'oldest' | 'class';

const SORT_ORDER: SortMode[] = ['newest', 'oldest', 'class'];

type TooltipState = {
  text: string;
  top: number;
  left: number;
};

type PopupPosition = {
  top: number;
  left: number;
};

const POPUP_OFFSET = 8;
const SORT_MENU_WIDTH = 180;
const SORT_MENU_HEIGHT = 140;
const FILTER_PANEL_WIDTH = 260;
const FILTER_PANEL_HEIGHT = 540;
const ENTITY_PICKER_WIDTH = 320;
const ENTITY_PICKER_HEIGHT = 420;
const ENTITY_PICKER_LIMIT = 80;

export function SelectedSegmentsPanel() {
  const {
    marks,
    entities,
    draftSelection,
    isProgressToolEnabled,
    globalHidden,
    activeMarkIndex,
    removeMark,
    setActiveMarkIndex,
    requestMarkNavigation,
    toggleGlobalMarksVisibility,
    toggleMarkVisibility,
    updateMarkEntity,
    updateMarkFieldValue,
  } = useAppContext();
  const [expandedMarkIndex, setExpandedMarkIndex] = useState<number | null>(null);
  const [expandedTextMarkIndexes, setExpandedTextMarkIndexes] = useState<Set<number>>(() => new Set());
  const [overflowingTextMarkIndexes, setOverflowingTextMarkIndexes] = useState<Set<number>>(() => new Set());
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [entityPickerMarkIndex, setEntityPickerMarkIndex] = useState<number | null>(null);
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [isDraftSelectionExpanded, setIsDraftSelectionExpanded] = useState(false);
  const [filteredEntityIds, setFilteredEntityIds] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [sortMenuPosition, setSortMenuPosition] = useState<PopupPosition | null>(null);
  const [filterPanelPosition, setFilterPanelPosition] = useState<PopupPosition | null>(null);
  const [entityPickerPosition, setEntityPickerPosition] = useState<PopupPosition | null>(null);
  const sortButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const entityPickerRef = useRef<HTMLDivElement | null>(null);
  const entitySearchInputRef = useRef<HTMLInputElement | null>(null);
  const markTextRefs = useRef(new Map<number, HTMLParagraphElement>());

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

  const entityPickerOptions = useMemo(() => {
    const normalizedQuery = entitySearchQuery.trim().toLowerCase();
    const nextEntities = normalizedQuery
      ? entities.filter((entity) => {
          const normalizedName = entity.name.toLowerCase();
          const normalizedId = entity.id.toLowerCase();

          return normalizedName.includes(normalizedQuery) || normalizedId.includes(normalizedQuery);
        })
      : entities;

    return nextEntities.slice(0, ENTITY_PICKER_LIMIT);
  }, [entities, entitySearchQuery]);

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

      if (
        entityPickerMarkIndex !== null &&
        entityPickerRef.current &&
        !entityPickerRef.current.contains(target)
      ) {
        closeEntityPicker();
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [entityPickerMarkIndex, isFilterOpen, isSortMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEntityPicker();
        setIsSortMenuOpen(false);
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;

      if (
        (filterPanelRef.current && target && filterPanelRef.current.contains(target)) ||
        (sortMenuRef.current && target && sortMenuRef.current.contains(target)) ||
        (entityPickerRef.current && target && entityPickerRef.current.contains(target))
      ) {
        return;
      }

      setTooltip(null);
      setIsSortMenuOpen(false);
      setIsFilterOpen(false);
      closeEntityPicker();
    };

    const handleResize = () => {
      setTooltip(null);
      setIsSortMenuOpen(false);
      setIsFilterOpen(false);
      closeEntityPicker();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    setIsDraftSelectionExpanded(false);
  }, [draftSelection.start, draftSelection.finish]);

  useEffect(() => {
    setExpandedTextMarkIndexes((currentIndexes) => {
      const existingIndexes = new Set(marks.map((_, index) => index));
      const nextIndexes = new Set([...currentIndexes].filter((markIndex) => existingIndexes.has(markIndex)));

      return nextIndexes.size === currentIndexes.size ? currentIndexes : nextIndexes;
    });
  }, [marks]);

  useLayoutEffect(() => {
    const nextOverflowingIndexes = new Set<number>();

    markTextRefs.current.forEach((element, markIndex) => {
      if (element.scrollHeight > element.clientHeight + 1) {
        nextOverflowingIndexes.add(markIndex);
      }
    });

    setOverflowingTextMarkIndexes(nextOverflowingIndexes);
  }, [sortedMarks, expandedTextMarkIndexes]);

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
    setSortMenuPosition(getPopupPosition(event.currentTarget, {
      width: SORT_MENU_WIDTH,
      height: SORT_MENU_HEIGHT,
    }));
    setIsSortMenuOpen((currentState) => !currentState);
  };

  const handleFilterToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    setFilterPanelPosition(getPopupPosition(event.currentTarget, {
      width: FILTER_PANEL_WIDTH,
      height: FILTER_PANEL_HEIGHT,
    }));
    setIsFilterOpen((currentState) => !currentState);
  };

  const openEntityPicker = (event: ReactMouseEvent<HTMLButtonElement>, markIndex: number) => {
    event.stopPropagation();
    setEntityPickerPosition(getPopupPosition(event.currentTarget, {
      width: ENTITY_PICKER_WIDTH,
      height: ENTITY_PICKER_HEIGHT,
    }));
    setEntityPickerMarkIndex(markIndex);
    setEntitySearchQuery('');
    setIsSortMenuOpen(false);
    setIsFilterOpen(false);
  };

  const closeEntityPicker = () => {
    setEntityPickerMarkIndex(null);
    setEntityPickerPosition(null);
    setEntitySearchQuery('');
  };

  const toggleExpandedText = (event: ReactMouseEvent<HTMLButtonElement>, markIndex: number) => {
    event.stopPropagation();
    setExpandedTextMarkIndexes((currentIndexes) => {
      const nextIndexes = new Set(currentIndexes);

      if (nextIndexes.has(markIndex)) {
        nextIndexes.delete(markIndex);
      } else {
        nextIndexes.add(markIndex);
      }

      return nextIndexes;
    });
  };

  const toggleEntityFilter = (entityId: string, checked: boolean) => {
    setFilteredEntityIds((currentIds) => {
      if (checked) {
        return [...currentIds, entityId];
      }

      return currentIds.filter((currentId) => currentId !== entityId);
    });
  };

  const showTooltip = (event: ReactMouseEvent<HTMLElement> | ReactFocusEvent<HTMLElement>) => {
    const text = event.currentTarget.dataset.tooltip;

    if (!text) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    setTooltip({
      text,
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  useEffect(() => {
    if (entityPickerMarkIndex !== null) {
      entitySearchInputRef.current?.focus();
    }
  }, [entityPickerMarkIndex]);

  const getTooltipProps = () => ({
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
  });

  return (
    <>
      <aside className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Выбранные сегменты</h2>
          {isProgressToolEnabled ? (
            <div className={styles.segmentsSummary} aria-label={`Сегментов выбрано: ${marks.length}`}>
              <strong className={styles.segmentsSummaryValue}>{marks.length}</strong>
              <span className={styles.segmentsSummaryLabel}>сегментов выбрано</span>
            </div>
          ) : null}
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
              {...getTooltipProps()}
            >
              ⇅
            </button>
          </div>

          <div className={styles.controlGroup}>
            <button
              ref={filterButtonRef}
              type="button"
              className={styles.squareButton}
              onClick={handleFilterToggle}
              aria-label="Фильтрация"
              data-tooltip="Фильтрация"
              {...getTooltipProps()}
            >
              ☰
            </button>
          </div>

          <button
            type="button"
            className={`${styles.squareButton} ${globalHidden ? styles.squareButtonOff : ''}`}
            onClick={toggleGlobalMarksVisibility}
            aria-label={globalHidden ? 'Показать все marks' : 'Скрыть все marks'}
            data-tooltip={globalHidden ? 'Показать все сегменты' : 'Скрыть все сегменты'}
            {...getTooltipProps()}
          >
            {globalHidden ? '◌' : '◉'}
          </button>
        </div>

        {draftSelection.start !== null && draftSelection.finish !== null ? (
          <div className={styles.selectionSummary}>
            <div className={styles.selectionHeader}>
              <p className={styles.selectionTitle}>Draft selection</p>
              <button
                type="button"
                className={styles.selectionToggle}
                onClick={() => setIsDraftSelectionExpanded((isExpanded) => !isExpanded)}
                aria-expanded={isDraftSelectionExpanded}
              >
                {isDraftSelectionExpanded ? 'Свернуть' : 'Развернуть'}
              </button>
            </div>
            <p className={styles.selectionMeta}>
              start: {draftSelection.start}, finish: {draftSelection.finish}, messages:{' '}
              {draftSelection.messageIds.length}
            </p>
            <p
              className={[
                styles.selectionText,
                isDraftSelectionExpanded ? styles.selectionTextExpanded : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {draftSelection.selectedText}
            </p>
          </div>
        ) : null}

        {sortedMarks.length === 0 ? (
          <div className={styles.emptyState}>Нет выбранных сегментов</div>
        ) : (
          <div className={styles.list}>
            {sortedMarks.map(({ mark, index: markIndex }) => {
              const isVisible = !mark.hidden && (!globalHidden || mark.forceVisible);
              const entityName = entities.find((entity) => entity.id === mark.entityId)?.name ?? mark.entityId;
              const isTextExpanded = expandedTextMarkIndexes.has(markIndex);
              const canExpandText = overflowingTextMarkIndexes.has(markIndex) || isTextExpanded;

              return (
                <article
                  key={`${mark.entityId}-${mark.position.start}-${markIndex}`}
                  className={`${styles.markItem} ${isVisible ? '' : styles.markItemMuted} ${
                    activeMarkIndex === markIndex ? styles.markItemActive : ''
                  }`}
                >
                  <div
                    className={styles.markButton}
                    onClick={() => {
                      setActiveMarkIndex(markIndex);
                      toggleExpanded(markIndex);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveMarkIndex(markIndex);
                        toggleExpanded(markIndex);
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
                        <div className={styles.markEntityRow}>
                          <p className={styles.markEntity}>{entityName}</p>
                          <button
                            type="button"
                            className={styles.changeEntityButton}
                            onClick={(event) => openEntityPicker(event, markIndex)}
                            aria-label="Сменить класс сегмента"
                            data-tooltip="Сменить класс"
                            {...getTooltipProps()}
                          >
                            <svg
                              className={styles.changeEntityIcon}
                              viewBox="0 0 16 16"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path
                                d="M13.25 5.25A5.7 5.7 0 0 0 8 2a5.5 5.5 0 1 0 4.35 8.86"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.6"
                              />
                              <path
                                d="M13.25 2.75v2.5h-2.5"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.6"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className={styles.markMeta}>
                          {mark.position.start} - {mark.position.finish}
                        </p>
                      </div>
                    </div>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.jumpButton}
                        onClick={(event) => {
                          event.stopPropagation();
                          requestMarkNavigation(markIndex);
                        }}
                        aria-label="Прокрутить к сегменту"
                        data-tooltip="Прокрутить к сегменту"
                        onMouseEnter={showTooltip}
                        onMouseLeave={hideTooltip}
                        onFocus={showTooltip}
                        onBlur={hideTooltip}
                      >
                        ↗
                      </button>
                      <button
                        type="button"
                        className={styles.eyeButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleMarkVisibility(markIndex);
                      }}
                      aria-label="Переключить видимость mark"
                      data-tooltip={isVisible ? 'Скрыть сегмент' : 'Показать сегмент'}
                      {...getTooltipProps()}
                    >
                      {isVisible ? '◉' : '◌'}
                    </button>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeMark(markIndex);
                        setExpandedMarkIndex((current) => (current === markIndex ? null : current));
                      }}
                      aria-label="Удалить mark"
                      data-tooltip="Удалить сегмент"
                      {...getTooltipProps()}
                    >
                      ×
                    </button>
                    </div>
                  </div>

                  <div className={styles.markTextBlock}>
                    <p
                      ref={(element) => {
                        if (element) {
                          markTextRefs.current.set(markIndex, element);
                        } else {
                          markTextRefs.current.delete(markIndex);
                        }
                      }}
                      className={`${styles.markText} ${isTextExpanded ? styles.markTextExpanded : ''}`}
                    >
                      {mark.text}
                    </p>
                    {canExpandText ? (
                      <button
                        type="button"
                        className={styles.markTextToggle}
                        onClick={(event) => toggleExpandedText(event, markIndex)}
                        aria-expanded={isTextExpanded}
                      >
                        {isTextExpanded ? 'Свернуть' : 'Показать еще'}
                      </button>
                    ) : null}
                  </div>

                  {expandedMarkIndex === markIndex ? (
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
                                        markIndex: markIndex,
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
      {isSortMenuOpen && sortMenuPosition
        ? createPortal(
            <div
              ref={sortMenuRef}
              className={styles.sortMenu}
              style={{
                position: 'fixed',
                top: sortMenuPosition.top,
                left: sortMenuPosition.left,
              }}
            >
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
            </div>,
            document.body,
          )
        : null}
      {isFilterOpen && filterPanelPosition
        ? createPortal(
            <div
              ref={filterPanelRef}
              className={styles.filterPanel}
              style={{
                position: 'fixed',
                top: filterPanelPosition.top,
                left: filterPanelPosition.left,
              }}
            >
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
            </div>,
            document.body,
          )
        : null}
      {entityPickerMarkIndex !== null && entityPickerPosition
        ? createPortal(
            <div
              ref={entityPickerRef}
              className={styles.entityPicker}
              style={{
                position: 'fixed',
                top: entityPickerPosition.top,
                left: entityPickerPosition.left,
              }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <label className={styles.entityPickerSearch}>
                <span className={styles.entityPickerLabel}>Entity</span>
                <input
                  ref={entitySearchInputRef}
                  type="text"
                  value={entitySearchQuery}
                  onChange={(event) => setEntitySearchQuery(event.target.value)}
                  className={styles.entityPickerInput}
                  placeholder="Поиск по id или name"
                />
              </label>
              <div className={styles.entityPickerList}>
                {entityPickerOptions.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    className={`${styles.entityPickerOption} ${
                      marks[entityPickerMarkIndex]?.entityId === entity.id ? styles.entityPickerOptionActive : ''
                    }`}
                    onClick={() => {
                      updateMarkEntity({
                        markIndex: entityPickerMarkIndex,
                        entityId: entity.id,
                      });
                      closeEntityPicker();
                    }}
                  >
                    <span className={styles.entityPickerOptionName}>{entity.name}</span>
                    <span className={styles.entityPickerOptionId}>{entity.id}</span>
                  </button>
                ))}

                {entityPickerOptions.length === 0 ? (
                  <div className={styles.entityPickerEmpty}>Ничего не найдено</div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
      {tooltip
        ? createPortal(
            <div
              className={styles.tooltip}
              style={{
                top: tooltip.top,
                left: tooltip.left,
              }}
            >
              {tooltip.text}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function getPopupPosition(
  anchorElement: HTMLElement,
  popupSize: { width: number; height: number },
): PopupPosition {
  const rect = anchorElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = rect.left;
  let top = rect.bottom + POPUP_OFFSET;

  if (left + popupSize.width > viewportWidth - POPUP_OFFSET) {
    left = rect.right - popupSize.width;
  }

  if (top + popupSize.height > viewportHeight - POPUP_OFFSET) {
    top = rect.top - popupSize.height - POPUP_OFFSET;
  }

  return {
    left: Math.max(POPUP_OFFSET, left),
    top: Math.max(POPUP_OFFSET, top),
  };
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
