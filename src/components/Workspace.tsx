import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
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
import type { Mark } from '../types/app';

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

type MessageScrollRequest = {
  messageId: string;
  requestId: number;
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
    markNavigationRequest,
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
  const lastNavigationRequestIdRef = useRef<number | null>(null);
  const pendingMessagesScrollTopRef = useRef<number | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const deleteOverlayRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const editableRowsRef = useRef(csvRows);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [deleteOverlay, setDeleteOverlay] = useState<DeleteOverlayState | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [editableRows, setEditableRows] = useState(csvRows);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MESSAGES);
  const [messageScrollRequest, setMessageScrollRequest] = useState<MessageScrollRequest | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const displayedRows = isEditingText ? editableRows : csvRows;
  const visibleRows = displayedRows.slice(0, visibleCount);
  const draggedMarkIndex = dragState?.markIndex ?? null;
  const entityNameById = useMemo(() => {
    return new Map(entities.map((entity) => [entity.id, entity.name]));
  }, [entities]);
  const resultPayload = useMemo(() => ({
    totalMessages: csvRows.length,
    totalSegments: marks.length,
    segments: marks.map((mark, markIndex) => ({
      index: markIndex,
      entityId: mark.entityId,
      entityName: entityNameById.get(mark.entityId) ?? mark.entityId,
      type: mark.type,
      position: mark.position,
      text: mark.text,
      selectedSegment: mark.selectedSegment,
      messageRanges: mark.messageRanges,
      fields: mark.fields,
      hidden: mark.hidden,
      forceVisible: mark.forceVisible,
    })),
  }), [csvRows.length, entityNameById, marks]);
  const resultJson = useMemo(() => JSON.stringify(resultPayload, null, 2), [resultPayload]);
  const markedMessageIds = useMemo(() => {
    return new Set(marks.flatMap((mark) => mark.selectedSegment));
  }, [marks]);
  const unmarkedRows = useMemo(() => {
    return displayedRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => isRoleAllowedForSegmentation(row.usertype) && !markedMessageIds.has(row.messageid));
  }, [displayedRows, isRoleAllowedForSegmentation, markedMessageIds]);

  const requestMessageScroll = useCallback((messageId: string) => {
    pendingScrollMessageIdRef.current = messageId;
    setMessageScrollRequest((currentRequest) => ({
      messageId,
      requestId: (currentRequest?.requestId ?? 0) + 1,
    }));
  }, []);

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
      editableRowsRef.current = csvRows;
    }
  }, [csvRows, isEditingText]);

  useLayoutEffect(() => {
    const pendingScrollTop = pendingMessagesScrollTopRef.current;
    const container = messagesRef.current;

    if (pendingScrollTop === null || !container) {
      return;
    }

    container.scrollTop = Math.min(pendingScrollTop, container.scrollHeight - container.clientHeight);
    pendingMessagesScrollTopRef.current = null;
  }, [isEditingText]);

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
        setIsResultOpen(false);
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
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
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
    if (!markNavigationRequest || markNavigationRequest.requestId === lastNavigationRequestIdRef.current) {
      return;
    }

    lastNavigationRequestIdRef.current = markNavigationRequest.requestId;

    const targetMarkIndex = markNavigationRequest.markIndex;
    const targetMark = marks[targetMarkIndex];
    const targetMessageId = targetMark?.selectedSegment[0];

    if (targetMessageId) {
      requestMessageScroll(targetMessageId);
    }
  }, [markNavigationRequest, marks, requestMessageScroll]);

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
      const container = messagesRef.current;
      const targetElement = Array.from(container?.querySelectorAll<HTMLElement>('[data-message-id]') ?? []).find(
        (element) => element.dataset.messageId === targetMessageId,
      );

      if (!container || !targetElement) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const centeredScrollTop =
        container.scrollTop +
        targetRect.top -
        containerRect.top -
        container.clientHeight / 2 +
        targetElement.clientHeight / 2;

      container.scrollTo({
        top: Math.max(0, centeredScrollTop),
        behavior: 'smooth',
      });
      setHighlightedMessageId(targetMessageId);

      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }

      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedMessageId(null);
        highlightTimeoutRef.current = null;
      }, 1400);

      pendingScrollMessageIdRef.current = null;
    });
  }, [displayedRows, messageScrollRequest, visibleCount]);

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

  const getCurrentMessageIndex = () => {
    const container = messagesRef.current;

    if (!container) {
      return 0;
    }

    const containerCenter = container.getBoundingClientRect().top + container.clientHeight / 2;
    const visibleMessageElements = Array.from(container.querySelectorAll<HTMLElement>('[data-message-id]'));
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    visibleMessageElements.forEach((element) => {
      const messageId = element.dataset.messageId;
      const rowIndex = displayedRows.findIndex((row) => row.messageid === messageId);

      if (rowIndex === -1) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elementCenter - containerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = rowIndex;
      }
    });

    return closestIndex;
  };

  const handleUnmarkedNavigation = (direction: 'previous' | 'next') => {
    if (unmarkedRows.length === 0) {
      return;
    }

    const currentIndex = getCurrentMessageIndex();
    const target =
      direction === 'next'
        ? unmarkedRows.find(({ index }) => index > currentIndex) ?? unmarkedRows[0]
        : [...unmarkedRows].reverse().find(({ index }) => index < currentIndex) ?? unmarkedRows[unmarkedRows.length - 1];

    requestMessageScroll(target.row.messageid);
  };

  const handleMouseUp = (_event: MouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current || isEditingText) {
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

  const handleEditToggle = () => {
    pendingMessagesScrollTopRef.current = messagesRef.current?.scrollTop ?? null;

    if (isEditingText) {
      saveEditedRows(editableRowsRef.current);
      setEditableRows(editableRowsRef.current);
      setIsEditingText(false);
      return;
    }

    editableRowsRef.current = csvRows;
    setEditableRows(csvRows);
    setIsEditingText(true);
  };

  const updateEditableRowText = (messageId: string, text: string) => {
    editableRowsRef.current = editableRowsRef.current.map((row) =>
      row.messageid === messageId ? { ...row, text } : row,
    );
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

  const renderTextPart = (renderPart: TextRenderPart, options: { interactive?: boolean } = {}) => {
    const { part, text, key, showStartBoundary, showEndBoundary } = renderPart;
    const isInteractive = options.interactive ?? true;

    if (!part.isMarked) {
      return <span key={key}>{text}</span>;
    }

    const hasStartBoundary =
      isInteractive && showStartBoundary && part.hasStartBorder && part.startBoundaryMarkIndex !== undefined;
    const hasEndBoundary =
      isInteractive && showEndBoundary && part.hasEndBorder && part.endBoundaryMarkIndex !== undefined;
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
          if (isInteractive && part.markIndex !== undefined) {
            setActiveMarkIndex(part.markIndex);
          }
        }}
        onContextMenu={(event) => {
          if (isInteractive && part.markIndex !== undefined) {
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
          <button type="button" className={styles.resultButton} onClick={() => setIsResultOpen(true)}>
            Показать результат
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
          <div className={[styles.progressItem, styles.progressItemWithActions].join(' ')}>
            <div>
              <span className={styles.progressLabel}>Не размечено</span>
              <strong className={styles.progressValue}>{unmarkedRows.length}</strong>
            </div>
            <div className={styles.unmarkedNavigation}>
              <button
                type="button"
                className={styles.unmarkedNavigationButton}
                onClick={() => handleUnmarkedNavigation('previous')}
                disabled={unmarkedRows.length === 0}
                aria-label="Перейти к предыдущей неразмеченной реплике"
                title="Предыдущая неразмеченная реплика"
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.unmarkedNavigationButton}
                onClick={() => handleUnmarkedNavigation('next')}
                disabled={unmarkedRows.length === 0}
                aria-label="Перейти к следующей неразмеченной реплике"
                title="Следующая неразмеченная реплика"
              >
                ↓
              </button>
            </div>
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
                  isSelected ? styles.messageRowSelected : '',
                  highlightedMessageId === row.messageid ? styles.messageRowScrollHighlight : '',
                  !isSegmentationAllowed ? styles.messageRowDisabled : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
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
                    <p
                      className={[styles.messageText, styles.messageEditable].join(' ')}
                      contentEditable
                      role="textbox"
                      aria-label="Редактировать текст сообщения"
                      suppressContentEditableWarning
                      onInput={(event) => {
                        updateEditableRowText(row.messageid, event.currentTarget.textContent ?? '');
                      }}
                    >
                      {messageParts.length > 0
                        ? buildWordChunks(messageParts).map((chunk, chunkIndex) => {
                            const content = chunk.parts.map((part) => renderTextPart(part, { interactive: false }));

                            if (chunk.type === 'space') {
                              return content;
                            }

                            return (
                              <span className={styles.wordChunk} key={`${row.messageid}-edit-word-${chunkIndex}`}>
                                {content}
                              </span>
                            );
                          })
                        : row.text}
                    </p>
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
      {isResultOpen
        ? createPortal(
            <div className={styles.resultOverlay} role="dialog" aria-modal="true" aria-labelledby="result-title">
              <div className={styles.resultPanel}>
                <div className={styles.resultHeader}>
                  <div>
                    <h2 id="result-title" className={styles.resultTitle}>Результат разметки</h2>
                    <p className={styles.resultMeta}>
                      Сегментов: {resultPayload.totalSegments} · Сообщений: {resultPayload.totalMessages}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.resultCloseButton}
                    aria-label="Закрыть результат"
                    onClick={() => setIsResultOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <pre className={styles.resultPre}>{resultJson}</pre>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
