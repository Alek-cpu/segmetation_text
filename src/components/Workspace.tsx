import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import styles from './Workspace.module.css';
import { useAppContext } from '../context/AppContext';
import { buildMessageTextParts } from '../utils/messageMarks';
import {
  getDraftSelectionFromDomSelection,
  getEmptyDraftSelection,
  getGlobalOffsetFromPoint,
} from '../utils/selection';
import type { Mark, MessageOffset } from '../types/app';

type DragState = {
  markIndex: number;
  edge: 'start' | 'finish';
  previewStart: number;
  previewFinish: number;
};

export function Workspace() {
  const {
    csvRows,
    error,
    globalHidden,
    messageOffsets,
    fullPlainText,
    activeMarkIndex,
    draftSelection,
    setDraftSelection,
    marks,
    updateMarkRange,
    saveEditedRows,
  } = useAppContext();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editableRows, setEditableRows] = useState(csvRows);

  useEffect(() => {
    if (!isEditingText) {
      setEditableRows(csvRows);
    }
  }, [csvRows, isEditingText]);

  const handleMouseUp = (_event: MouseEvent<HTMLDivElement>) => {
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
  const visibleMarks = previewMarks.filter((mark) => !mark.hidden && (!globalHidden || mark.forceVisible));

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

    setDragState({
      markIndex: params.markIndex,
      edge: params.edge,
      previewStart: targetMark.position.start,
      previewFinish: targetMark.position.finish,
    });
  };

  useEffect(() => {
    if (!dragState || !messagesRef.current) {
      return;
    }

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const globalOffset = getGlobalOffsetFromPoint({
        clientX: event.clientX,
        clientY: event.clientY,
        rootElement: messagesRef.current!,
        messageOffsets,
      });

      if (globalOffset === null) {
        return;
      }

      setDragState((currentState) => {
        if (!currentState) {
          return currentState;
        }

        if (currentState.edge === 'start') {
          return {
            ...currentState,
            previewStart: Math.min(globalOffset, currentState.previewFinish - 1),
          };
        }

        return {
          ...currentState,
          previewFinish: Math.max(globalOffset, currentState.previewStart + 1),
        };
      });
    };

    const handleMouseUp = () => {
      const currentDragState = dragState;
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
  }, [dragState, messageOffsets, updateMarkRange]);

  return (
    <section className={styles.workspace}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Text Segmentation Tool</p>
        <h1 className={styles.title}>Диалог для разметки</h1>
        <p className={styles.description}>
          Центральный блок показывает сообщения построчно и подготовлен для следующего шага с
          выделением текста.
        </p>
      </header>

      <div className={styles.toolbar}>
        <button type="button" className={styles.editButton} onClick={handleEditToggle}>
          {isEditingText ? 'Сохранить' : 'Редактировать текст'}
        </button>
        <span className={styles.badge}>Сообщений: {csvRows.length}</span>
        {error ? <span className={styles.errorBadge}>Ошибка: {error}</span> : null}
      </div>

      <div ref={messagesRef} className={styles.messages} onMouseUp={handleMouseUp}>
        {(isEditingText ? editableRows : csvRows).map((row, index) => {
          const offset = messageOffsets[index];
          const isSelected = draftSelection.messageIds.includes(row.messageid);
          const messageParts = offset ? buildMessageTextParts(offset, visibleMarks, activeMarkIndex) : [];

          return (
            <article
              key={row.messageid}
              className={`${styles.messageRow} ${isSelected ? styles.messageRowSelected : ''}`}
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
                      ? messageParts.map((part, partIndex) =>
                          part.isMarked ? (
                            <span
                              key={`${row.messageid}-${partIndex}-${part.entityId}`}
                              className={[
                                styles.markedText,
                                part.isActive ? styles.markedTextActive : '',
                                part.hasStartBorder ? styles.markedTextStart : '',
                                part.hasEndBorder ? styles.markedTextEnd : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              style={{ '--mark-color': part.color } as CSSProperties}
                              data-entity-id={part.entityId}
                            >
                              {part.hasStartBorder && part.markIndex !== undefined ? (
                                <span
                                  className={styles.resizeHandle}
                                  data-edge="start"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleResizeStart({ markIndex: part.markIndex!, edge: 'start' });
                                  }}
                                />
                              ) : null}
                              {part.text}
                              {part.hasEndBorder && part.markIndex !== undefined ? (
                                <span
                                  className={styles.resizeHandle}
                                  data-edge="finish"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleResizeStart({ markIndex: part.markIndex!, edge: 'finish' });
                                  }}
                                />
                              ) : null}
                            </span>
                          ) : (
                            <span key={`${row.messageid}-${partIndex}`}>{part.text}</span>
                          ),
                        )
                      : row.text}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
