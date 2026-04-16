import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './Workspace.module.css';
import { useAppContext } from '../context/AppContext';
import { buildMessageTextParts } from '../utils/messageMarks';
import type { MessageTextPart } from '../utils/messageMarks';
import {
  getDraftSelectionFromDomSelection,
  getEmptyDraftSelection,
  getGlobalOffsetFromPoint,
} from '../utils/selection';
import type { Mark, MessageOffset } from '../types/app';

const INITIAL_VISIBLE_MESSAGES = 25;
const VISIBLE_MESSAGES_STEP = 25;
const LOAD_MORE_SCROLL_THRESHOLD = 0.8;

type DragState = {
  markIndex: number;
  edge: 'start' | 'finish';
  previewStart: number;
  previewFinish: number;
};

type DeleteOverlayState = {
  markIndex: number;
  top: number;
  left: number;
};

type TextRenderPart = {
  part: MessageTextPart;
  text: string;
  key: string;
  showStartBoundary: boolean;
  showEndBoundary: boolean;
};

type TextRenderChunk = {
  type: 'word' | 'space';
  parts: TextRenderPart[];
};

function buildWordChunks(parts: MessageTextPart[]): TextRenderChunk[] {
  const chunks: TextRenderChunk[] = [];

  parts.forEach((part, partIndex) => {
    const splitTexts = part.text.split(/(\s+)/).filter((text) => text.length > 0);
    const firstSplitIndex = splitTexts.findIndex((text) => !/^\s+$/.test(text));
    const lastSplitIndex = splitTexts.reduce((lastIndex, text, splitIndex) => (
      /^\s+$/.test(text) ? lastIndex : splitIndex
    ), -1);

    splitTexts.forEach((text, splitIndex) => {
      const type = /^\s+$/.test(text) ? 'space' : 'word';
      const renderPart = {
        part,
        text,
        key: `${partIndex}-${splitIndex}-${part.markIndexes.join('-')}`,
        showStartBoundary: splitIndex === firstSplitIndex,
        showEndBoundary: splitIndex === lastSplitIndex,
      };
      const previousChunk = chunks[chunks.length - 1];

      if (previousChunk?.type === type) {
        previousChunk.parts.push(renderPart);
        return;
      }

      chunks.push({
        type,
        parts: [renderPart],
      });
    });
  });

  return chunks;
}

export function Workspace() {
  const {
    csvRows,
    entities,
    error,
    globalHidden,
    messageOffsets,
    fullPlainText,
    activeMarkIndex,
    draftSelection,
    setDraftSelection,
    marks,
    removeMark,
    setActiveMarkIndex,
    allowedRolesForSegmentation,
    isRoleAllowedForSegmentation,
    segmentationProgress,
    updateMarkRange,
    saveEditedRows,
  } = useAppContext();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollMessageIdRef = useRef<string | null>(null);
  const deleteOverlayRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [deleteOverlay, setDeleteOverlay] = useState<DeleteOverlayState | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editableRows, setEditableRows] = useState(csvRows);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MESSAGES);

  const displayedRows = isEditingText ? editableRows : csvRows;
  const visibleRows = displayedRows.slice(0, visibleCount);
  const draggedMarkIndex = dragState?.markIndex ?? null;
  const entityNameById = useMemo(() => {
    return new Map(entities.map((entity) => [entity.id, entity.name]));
  }, [entities]);

  const getAllowedSegmentationBoundsForMark = useCallback((markIndex: number) => {
    const targetMark = marks[markIndex];

    if (!targetMark) {
      return null;
    }

    const currentMessageIndices = messageOffsets
      .map((offset, index) => ({ offset, index }))
      .filter(({ offset }) => offset.end > targetMark.position.start && offset.start < targetMark.position.finish)
      .map(({ index }) => index);

    if (currentMessageIndices.length === 0) {
      return null;
    }

    let startIndex = currentMessageIndices[0];
    let finishIndex = currentMessageIndices[currentMessageIndices.length - 1];

    while (startIndex > 0) {
      const previousRow = csvRows[startIndex - 1];

      if (!previousRow || !isRoleAllowedForSegmentation(previousRow.usertype)) {
        break;
      }

      startIndex -= 1;
    }

    while (finishIndex < csvRows.length - 1) {
      const nextRow = csvRows[finishIndex + 1];

      if (!nextRow || !isRoleAllowedForSegmentation(nextRow.usertype)) {
        break;
      }

      finishIndex += 1;
    }

    const startOffset = messageOffsets[startIndex];
    const finishOffset = messageOffsets[finishIndex];

    if (!startOffset || !finishOffset) {
      return null;
    }

    return {
      start: startOffset.start,
      finish: finishOffset.end,
    };
  }, [csvRows, isRoleAllowedForSegmentation, marks, messageOffsets]);

  const getNormalizedDragPoint = useCallback((clientX: number, clientY: number) => {
    const elements = document.elementsFromPoint(clientX, clientY);
    const messageElement = elements.find((element) => element instanceof HTMLElement && element.dataset.messageId);

    if (!(messageElement instanceof HTMLElement)) {
      return { clientX, clientY };
    }

    const selectableTextElement = messageElement.querySelector<HTMLElement>('[data-selectable-text="true"]');

    if (!selectableTextElement) {
      return { clientX, clientY };
    }

    const rect = selectableTextElement.getBoundingClientRect();
    const minY = rect.top + 1;
    const maxY = rect.bottom - 1;

    return {
      clientX,
      clientY: Math.min(maxY, Math.max(minY, clientY)),
    };
  }, []);

  useEffect(() => {
    if (!isEditingText) {
      setEditableRows(csvRows);
    }
  }, [csvRows, isEditingText]);

  useEffect(() => {
    const handleDocumentMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;

      if (deleteOverlayRef.current?.contains(target)) {
        return;
      }

      setDeleteOverlay(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDeleteOverlay(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!deleteOverlay) {
      return;
    }

    if (isEditingText || dragState || activeMarkIndex !== deleteOverlay.markIndex) {
      setDeleteOverlay(null);
    }
  }, [activeMarkIndex, deleteOverlay, dragState, isEditingText]);

  useEffect(() => {
    setVisibleCount((currentVisibleCount) =>
      Math.min(
        displayedRows.length,
        Math.max(INITIAL_VISIBLE_MESSAGES, currentVisibleCount),
      ),
    );
  }, [displayedRows.length]);

  useEffect(() => {
    if (activeMarkIndex === null) {
      pendingScrollMessageIdRef.current = null;
      return;
    }

    const targetMark = marks[activeMarkIndex];
    const targetMessageId = targetMark?.selectedSegment[0];

    pendingScrollMessageIdRef.current = targetMessageId ?? null;
  }, [activeMarkIndex, marks]);

  useEffect(() => {
    const targetMessageId = pendingScrollMessageIdRef.current;

    if (!targetMessageId || !messagesRef.current) {
      return;
    }

    const targetIndex = displayedRows.findIndex((row) => row.messageid === targetMessageId);

    if (targetIndex === -1) {
      pendingScrollMessageIdRef.current = null;
      return;
    }

    if (targetIndex >= visibleCount) {
      setVisibleCount((currentVisibleCount) =>
        Math.min(displayedRows.length, Math.max(currentVisibleCount, targetIndex + 1)),
      );
      return;
    }

    requestAnimationFrame(() => {
      const targetElement = messagesRef.current?.querySelector<HTMLElement>(`[data-message-id="${targetMessageId}"]`);

      if (!targetElement) {
        return;
      }

      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      pendingScrollMessageIdRef.current = null;
    });
  }, [displayedRows, visibleCount]);

  const handleMessagesScroll = () => {
    const container = messagesRef.current;

    setDeleteOverlay(null);

    if (!container || visibleCount >= displayedRows.length) {
      return;
    }

    const maxScrollTop = container.scrollHeight - container.clientHeight;

    if (maxScrollTop <= 0) {
      return;
    }

    const scrollProgress = container.scrollTop / maxScrollTop;

    if (scrollProgress < LOAD_MORE_SCROLL_THRESHOLD) {
      return;
    }

    setVisibleCount((currentVisibleCount) =>
      Math.min(displayedRows.length, currentVisibleCount + VISIBLE_MESSAGES_STEP),
    );
  };

  const handleMouseUp = (_event: MouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current) {
      return;
    }

    const selection = window.getSelection();

    if (!selection || !messagesRef.current) {
      setDraftSelection(getEmptyDraftSelection());
      return;
    }

    const nextDraftSelection = getDraftSelectionFromDomSelection(selection, {
      fullPlainText,
      messageOffsets,
      rootElement: messagesRef.current,
    });

    setDraftSelection(nextDraftSelection);
  };

  const previewMarks = useMemo(() => {
    if (!dragState) {
      return marks;
    }

    return marks.map((mark, index) => {
      if (index !== dragState.markIndex) {
        return mark;
      }

      return {
        ...mark,
        position: {
          start: Math.min(dragState.previewStart, dragState.previewFinish),
          finish: Math.max(dragState.previewStart, dragState.previewFinish),
        },
      } satisfies Mark;
    });
  }, [dragState, marks]);
  const visibleMarkIndexes = useMemo(() => {
    return new Set(
      previewMarks
        .map((mark, index) => ({ mark, index }))
        .filter(({ mark }) => !mark.hidden && (!globalHidden || mark.forceVisible))
        .map(({ index }) => index),
    );
  }, [globalHidden, previewMarks]);

  const handleMessageDoubleClick = (offset: MessageOffset) => {
    setDraftSelection({
      entityId: null,
      selectedText: offset.text,
      start: offset.start,
      finish: offset.end,
      messageIds: [offset.messageId],
    });
  };

  const handleEditToggle = () => {
    if (isEditingText) {
      saveEditedRows(editableRows);
      setIsEditingText(false);
      return;
    }

    setEditableRows(csvRows);
    setIsEditingText(true);
  };

  const handleResizeStart = (params: { markIndex: number; edge: 'start' | 'finish' }) => {
    const targetMark = marks[params.markIndex];

    if (!targetMark) {
      return;
    }

    const nextDragState = {
      markIndex: params.markIndex,
      edge: params.edge,
      previewStart: targetMark.position.start,
      previewFinish: targetMark.position.finish,
    };

    window.getSelection()?.removeAllRanges();
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
    setActiveMarkIndex(params.markIndex);
    setDeleteOverlay(null);
  };

  useEffect(() => {
    if (!dragState) {
      dragStateRef.current = null;
      return;
    }

    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    if (!dragState || !messagesRef.current) {
      return;
    }

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const currentDragState = dragStateRef.current;

      if (!currentDragState) {
        return;
      }

      const normalizedPoint = getNormalizedDragPoint(event.clientX, event.clientY);
      const rawGlobalOffset = getGlobalOffsetFromPoint({
        clientX: normalizedPoint.clientX,
        clientY: normalizedPoint.clientY,
        rootElement: messagesRef.current!,
        messageOffsets,
      });

      if (rawGlobalOffset === null) {
        return;
      }

      const allowedBounds = getAllowedSegmentationBoundsForMark(currentDragState.markIndex);
      const globalOffset = allowedBounds
        ? Math.min(allowedBounds.finish, Math.max(allowedBounds.start, rawGlobalOffset))
        : rawGlobalOffset;

      const nextDragState =
        currentDragState.edge === 'start'
          ? {
              ...currentDragState,
              previewStart: Math.min(globalOffset, currentDragState.previewFinish - 1),
            }
          : {
              ...currentDragState,
              previewFinish: Math.max(globalOffset, currentDragState.previewStart + 1),
            };

      if (
        nextDragState.previewStart === currentDragState.previewStart &&
        nextDragState.previewFinish === currentDragState.previewFinish
      ) {
        return;
      }

      dragStateRef.current = nextDragState;
      setDragState(nextDragState);
    };

    const handleMouseUp = () => {
      const currentDragState = dragStateRef.current;

      if (!currentDragState) {
        return;
      }

      window.getSelection()?.removeAllRanges();
      dragStateRef.current = null;
      setDragState(null);

      updateMarkRange({
        markIndex: currentDragState.markIndex,
        start: currentDragState.previewStart,
        finish: currentDragState.previewFinish,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, getAllowedSegmentationBoundsForMark, getNormalizedDragPoint, messageOffsets, updateMarkRange]);

  const handleMarkedSegmentContextMenu = (event: MouseEvent<HTMLSpanElement>, markIndex: number) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();

    setActiveMarkIndex(markIndex);
    setDeleteOverlay({
      markIndex,
      top: Math.max(8, rect.top - 8),
      left: Math.min(window.innerWidth - 8, rect.right + 8),
    });
  };

  const handleDeleteOverlayClick = () => {
    if (!deleteOverlay) {
      return;
    }

    removeMark(deleteOverlay.markIndex);
    setDeleteOverlay(null);
  };

  const renderTextPart = (renderPart: TextRenderPart) => {
    const { part, text, key, showStartBoundary, showEndBoundary } = renderPart;

    if (!part.isMarked) {
      return <span key={key}>{text}</span>;
    }

    const hasStartBoundary = showStartBoundary && part.hasStartBorder && part.startBoundaryMarkIndex !== undefined;
    const hasEndBoundary = showEndBoundary && part.hasEndBorder && part.endBoundaryMarkIndex !== undefined;
    const startBoundaryMarkIndex = part.startBoundaryMarkIndex;
    const endBoundaryMarkIndex = part.endBoundaryMarkIndex;

    return (
      <span
        key={key}
        className={[
          styles.markedText,
          part.isActive ? styles.markedTextActive : '',
          (part.overlapCount ?? 0) > 1 ? styles.markedTextOverlap : '',
          hasStartBoundary ? styles.markedTextStart : '',
          hasEndBoundary ? styles.markedTextEnd : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          {
            '--mark-color': part.color,
            '--overlap-color': part.overlapColor ?? part.color,
          } as CSSProperties
        }
        data-entity-id={part.entityId}
        data-overlap-count={part.overlapCount}
        title={part.markIndexes
          .map((markIndex) => entityNameById.get(marks[markIndex]?.entityId ?? '') ?? marks[markIndex]?.entityId)
          .filter(Boolean)
          .join(' + ')}
        onClick={() => {
          if (part.markIndex !== undefined) {
            setActiveMarkIndex(part.markIndex);
          }
        }}
        onContextMenu={(event) => {
          if (part.markIndex !== undefined) {
            handleMarkedSegmentContextMenu(event, part.markIndex);
          }
        }}
      >
        {hasStartBoundary && startBoundaryMarkIndex !== undefined ? (
          <span
            className={styles.resizeHandle}
            data-edge="start"
            data-selection-decorator="true"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleResizeStart({ markIndex: startBoundaryMarkIndex, edge: 'start' });
            }}
          >
            {draggedMarkIndex !== startBoundaryMarkIndex ? (
              <span
                className={styles.entityLabel}
                data-selection-decorator="true"
                title={
                  entityNameById.get(marks[startBoundaryMarkIndex]?.entityId ?? '') ??
                  marks[startBoundaryMarkIndex]?.entityId
                }
              >
                {entityNameById.get(marks[startBoundaryMarkIndex]?.entityId ?? '') ??
                  marks[startBoundaryMarkIndex]?.entityId}
              </span>
            ) : null}
          </span>
        ) : null}
        {text}
        {hasEndBoundary && endBoundaryMarkIndex !== undefined ? (
          <span
            className={styles.resizeHandle}
            data-edge="finish"
            data-selection-decorator="true"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleResizeStart({ markIndex: endBoundaryMarkIndex, edge: 'finish' });
            }}
          />
        ) : null}
      </span>
    );
  };

  return (
    <>
      <section className={styles.workspace}>
        <header className={styles.header}>
          <h1 className={styles.title}>Диалог для разметки</h1>
        </header>

        <div className={styles.toolbar}>
          <button type="button" className={styles.editButton} onClick={handleEditToggle}>
            {isEditingText ? 'Сохранить' : 'Редактировать текст'}
          </button>
          <span className={styles.badge}>Сообщений: {csvRows.length}</span>
          <span className={styles.badge}>Разметка ролей: {allowedRolesForSegmentation.join(', ')}</span>
          {error ? <span className={styles.errorBadge}>Ошибка: {error}</span> : null}
        </div>

        <div className={styles.progressBlock}>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>Всего реплик</span>
            <strong className={styles.progressValue}>{segmentationProgress.totalMessages}</strong>
          </div>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>Доступно для разметки</span>
            <strong className={styles.progressValue}>{segmentationProgress.availableMessages}</strong>
          </div>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>Размечено</span>
            <strong className={styles.progressValue}>{segmentationProgress.markedMessages}</strong>
          </div>
        </div>

        <div
          ref={messagesRef}
          className={[styles.messages, dragState ? styles.messagesDragging : ''].filter(Boolean).join(' ')}
          onMouseUp={handleMouseUp}
          onScroll={handleMessagesScroll}
        >
          {visibleRows.map((row, index) => {
            const offset = messageOffsets[index];
            const isSelected = draftSelection.messageIds.includes(row.messageid);
            const isSegmentationAllowed = isRoleAllowedForSegmentation(row.usertype);
            const messageParts = offset
              ? buildMessageTextParts(offset, previewMarks, activeMarkIndex, visibleMarkIndexes)
              : [];

            return (
              <article
                key={row.messageid}
                className={[
                  styles.messageRow,
                  isEditingText ? styles.messageRowEditing : '',
                  isSelected ? styles.messageRowSelected : '',
                  !isSegmentationAllowed ? styles.messageRowDisabled : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDoubleClick={() => {
                  if (offset) {
                    handleMessageDoubleClick(offset);
                  }
                }}
                data-message-id={row.messageid}
                data-row-id={row.ID}
                data-offset-start={offset?.start ?? -1}
                data-offset-end={offset?.end ?? -1}
                data-usertype={row.usertype}
                data-segmentation-allowed={isSegmentationAllowed}
              >
                <div className={styles.userType}>{row.usertype}</div>
                <div className={styles.messageContent}>
                  {isEditingText ? (
                    <textarea
                      className={styles.messageEditor}
                      value={row.text}
                      onChange={(event) => {
                        setEditableRows((currentRows) =>
                          currentRows.map((currentRow) =>
                            currentRow.messageid === row.messageid
                              ? { ...currentRow, text: event.target.value }
                              : currentRow,
                          ),
                        );
                      }}
                    />
                  ) : (
                    <p className={styles.messageText} data-selectable-text="true">
                      {messageParts.length > 0
                        ? buildWordChunks(messageParts).map((chunk, chunkIndex) => {
                            const content = chunk.parts.map((part) => renderTextPart(part));

                            if (chunk.type === 'space') {
                              return content;
                            }

                            return (
                              <span className={styles.wordChunk} key={`${row.messageid}-word-${chunkIndex}`}>
                                {content}
                              </span>
                            );
                          })
                        : row.text}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {deleteOverlay
        ? createPortal(
            <button
              ref={deleteOverlayRef}
              type="button"
              className={styles.deleteOverlayButton}
              style={{
                top: deleteOverlay.top,
                left: deleteOverlay.left,
              }}
              onClick={handleDeleteOverlayClick}
            >
              Удалить
            </button>,
            document.body,
          )
        : null}
    </>
  );
}
