import Papa from 'papaparse';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import entitiesMock from '../../mocks/entities.json';
import csvMockSource from '../../mocks/0b2a5a2a058e4df59b344416a45bc259.csv?raw';
import type { CsvRow, DraftSelection, EntitiesMock, Entity, Mark, MessageOffset } from '../types/app';
import { getEmptyDraftSelection } from '../utils/selection';
import { LEFT_SIDEBAR_WIDTH, RIGHT_SIDEBAR_WIDTH } from '../utils/constants';
import {
  buildMarkRangePayload,
  createMark,
  hasIntersectingMark,
  hasIntersectingRange,
  rebuildMarksAfterTextEdit,
} from '../utils/marks';

type AppContextValue = {
  allowedRolesForSegmentation: string[];
  segmentationProgress: {
    totalMessages: number;
    availableMessages: number;
    markedMessages: number;
  };
  csvRows: CsvRow[];
  entities: Entity[];
  loading: boolean;
  error: string | null;
  globalHidden: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  fullPlainText: string;
  messageOffsets: MessageOffset[];
  marks: Mark[];
  activeMarkIndex: number | null;
  draftSelection: DraftSelection;
  isRoleAllowedForSegmentation: (role: string) => boolean;
  canCreateMarkFromDraftSelection: boolean;
  setCsvRows: (rows: CsvRow[]) => void;
  setEntities: (entities: Entity[]) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setGlobalHidden: (value: boolean) => void;
  setLeftPanelWidth: (value: number) => void;
  setRightPanelWidth: (value: number) => void;
  setMarks: (marks: Mark[]) => void;
  setActiveMarkIndex: (value: number | null) => void;
  setDraftSelection: (selection: DraftSelection) => void;
  createMarkFromDraftSelection: (entity: Entity) => void;
  removeMark: (markIndex: number) => void;
  toggleGlobalMarksVisibility: () => void;
  toggleMarkVisibility: (markIndex: number) => void;
  updateMarkRange: (params: { markIndex: number; start: number; finish: number }) => boolean;
  saveEditedRows: (rows: CsvRow[]) => void;
  updateMarkFieldValue: (params: {
    markIndex: number;
    fieldName: string;
    optionValue: string;
    checked: boolean;
  }) => void;
  resetState: () => void;
};

const initialDraftSelection = getEmptyDraftSelection();
const allowedRolesForSegmentation = ['CUSTOMER', 'OPERATOR'];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalHidden, setGlobalHidden] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_SIDEBAR_WIDTH);
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_SIDEBAR_WIDTH);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [activeMarkIndex, setActiveMarkIndex] = useState<number | null>(null);
  const [draftSelection, setDraftSelection] = useState<DraftSelection>(initialDraftSelection);

  useEffect(() => {
    try {
      setLoading(true);
      setError(null);

      const parsedCsv = Papa.parse<CsvRow>(csvMockSource, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsedCsv.errors.length > 0) {
        throw new Error(parsedCsv.errors[0].message);
      }

      setCsvRows(parsedCsv.data);
      setEntities((entitiesMock as EntitiesMock).entities);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить mock-данные.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fullPlainText = useMemo(() => {
    return csvRows.map((row) => row.text ?? '').join('\n');
  }, [csvRows]);

  const messageOffsets = useMemo<MessageOffset[]>(() => {
    let currentOffset = 0;

    return csvRows.map((row, index) => {
      const text = row.text ?? '';
      const start = currentOffset;
      const end = start + text.length;
      const offset: MessageOffset = {
        rowId: row.ID,
        messageId: row.messageid,
        start,
        end,
        textStart: start,
        textEnd: end,
        text,
      };

      currentOffset = end;

      if (index < csvRows.length - 1) {
        currentOffset += 1;
      }

      return offset;
    });
  }, [csvRows]);

  const isRoleAllowedForSegmentation = (role: string) => {
    return allowedRolesForSegmentation.includes(role);
  };

  const getAllowedSegmentationBoundsForMark = (markIndex: number) => {
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
  };

  const canCreateMarkFromDraftSelection = useMemo(() => {
    if (
      draftSelection.start === null ||
      draftSelection.finish === null ||
      draftSelection.selectedText.trim().length === 0
    ) {
      return false;
    }

    if (draftSelection.messageIds.length === 0) {
      return false;
    }

    return draftSelection.messageIds.every((messageId) => {
      const row = csvRows.find((item) => item.messageid === messageId);

      return row ? isRoleAllowedForSegmentation(row.usertype) : false;
    });
  }, [csvRows, draftSelection]);

  const segmentationProgress = useMemo(() => {
    const totalMessages = csvRows.length;
    const availableMessages = csvRows.filter((row) => isRoleAllowedForSegmentation(row.usertype)).length;
    const markedMessageIds = new Set(
      marks.flatMap((mark) => mark.selectedSegment).filter((messageId) => {
        const row = csvRows.find((item) => item.messageid === messageId);

        return row ? isRoleAllowedForSegmentation(row.usertype) : false;
      }),
    );

    return {
      totalMessages,
      availableMessages,
      markedMessages: markedMessageIds.size,
    };
  }, [csvRows, marks]);

  const value = useMemo<AppContextValue>(
    () => ({
      allowedRolesForSegmentation,
      segmentationProgress,
      csvRows,
      entities,
      loading,
      error,
      globalHidden,
      leftPanelWidth,
      rightPanelWidth,
      fullPlainText,
      messageOffsets,
      marks,
      activeMarkIndex,
      draftSelection,
      isRoleAllowedForSegmentation,
      canCreateMarkFromDraftSelection,
      setCsvRows,
      setEntities,
      setLoading,
      setError,
      setGlobalHidden,
      setLeftPanelWidth,
      setRightPanelWidth,
      setMarks,
      setActiveMarkIndex,
      setDraftSelection,
      createMarkFromDraftSelection: (entity) => {
        if (
          draftSelection.start === null ||
          draftSelection.finish === null ||
          draftSelection.selectedText.trim().length === 0
        ) {
          return;
        }

        if (!canCreateMarkFromDraftSelection) {
          setError('Нельзя создать сегмент: выделение содержит сообщение с недоступной для разметки ролью.');
          return;
        }

        if (hasIntersectingMark(marks, draftSelection)) {
          setError('Нельзя создать сегмент: новый диапазон пересекается с существующим mark.');
          return;
        }

        const nextMark = createMark(entity, draftSelection);

        if (!nextMark) {
          return;
        }

        setMarks([
          ...marks,
          {
            ...nextMark,
            ...buildMarkRangePayload({
              start: nextMark.position.start,
              finish: nextMark.position.finish,
              fullPlainText,
              messageOffsets,
            }),
          },
        ]);
        setDraftSelection(getEmptyDraftSelection());
        setError(null);
      },
      removeMark: (markIndex) => {
        setMarks(marks.filter((_, index) => index !== markIndex));
        setActiveMarkIndex((currentIndex) => (currentIndex === markIndex ? null : currentIndex));
      },
      toggleGlobalMarksVisibility: () => {
        setGlobalHidden(!globalHidden);
      },
      toggleMarkVisibility: (markIndex) => {
        setMarks(
          marks.map((mark, index) => {
            if (index !== markIndex) {
              return mark;
            }

            if (globalHidden) {
              return {
                ...mark,
                forceVisible: !mark.forceVisible,
              };
            }

            return {
              ...mark,
              hidden: !mark.hidden,
              forceVisible: false,
            };
          }),
        );
      },
      updateMarkRange: ({ markIndex, start, finish }) => {
        if (start === finish) {
          return false;
        }

        const allowedBounds = getAllowedSegmentationBoundsForMark(markIndex);
        const normalizedRange = {
          start: Math.min(start, finish),
          finish: Math.max(start, finish),
        };

        const constrainedRange = allowedBounds
          ? {
              start: Math.max(allowedBounds.start, normalizedRange.start),
              finish: Math.min(allowedBounds.finish, normalizedRange.finish),
            }
          : normalizedRange;

        if (constrainedRange.start >= constrainedRange.finish) {
          setError('Нельзя изменить границы сегмента: выделение упирается в сообщение с недоступной для разметки ролью.');
          return false;
        }

        if (
          allowedBounds &&
          (constrainedRange.start !== normalizedRange.start || constrainedRange.finish !== normalizedRange.finish)
        ) {
          setError('Нельзя изменить границы сегмента: диапазон не может пересекать сообщения с недоступной для разметки ролью.');
          return false;
        }

        if (hasIntersectingRange(marks, constrainedRange, markIndex)) {
          setError('Нельзя изменить границы сегмента: диапазон пересекается с другим mark.');
          return false;
        }

        setMarks(
          marks.map((mark, index) => {
            if (index !== markIndex) {
              return mark;
            }

            return {
              ...mark,
              ...buildMarkRangePayload({
                start: constrainedRange.start,
                finish: constrainedRange.finish,
                fullPlainText,
                messageOffsets,
              }),
            };
          }),
        );
        setError(null);
        return true;
      },
      saveEditedRows: (rows) => {
        let currentOffset = 0;
        const nextMessageOffsets: MessageOffset[] = rows.map((row, index) => {
          const text = row.text ?? '';
          const start = currentOffset;
          const end = start + text.length;
          currentOffset = end;

          if (index < rows.length - 1) {
            currentOffset += 1;
          }

          return {
            rowId: row.ID,
            messageId: row.messageid,
            start,
            end,
            textStart: start,
            textEnd: end,
            text,
          };
        });

        const nextFullPlainText = rows.map((row) => row.text ?? '').join('\n');

        setCsvRows(rows);
        setMarks(
          rebuildMarksAfterTextEdit({
            marks,
            previousRows: csvRows,
            rows,
            messageOffsets: nextMessageOffsets,
            fullPlainText: nextFullPlainText,
          }),
        );
        setError(null);
      },
      updateMarkFieldValue: ({ markIndex, fieldName, optionValue, checked }) => {
        setMarks(
          marks.map((mark, index) => {
            if (index !== markIndex) {
              return mark;
            }

            const currentField = mark.fields[fieldName];

            if (!currentField) {
              return mark;
            }

            const nextValue = checked
              ? [...currentField.value, optionValue]
              : currentField.value.filter((value) => value !== optionValue);

            return {
              ...mark,
              fields: {
                ...mark.fields,
                [fieldName]: {
                  ...currentField,
                  value: nextValue,
                },
              },
            };
          }),
        );
      },
      resetState: () => {
        setCsvRows([]);
        setEntities([]);
        setLoading(false);
        setError(null);
        setGlobalHidden(false);
        setLeftPanelWidth(LEFT_SIDEBAR_WIDTH);
        setRightPanelWidth(RIGHT_SIDEBAR_WIDTH);
        setMarks([]);
        setActiveMarkIndex(null);
        setDraftSelection(initialDraftSelection);
      },
    }),
    [
      csvRows,
      entities,
      loading,
      error,
      globalHidden,
      leftPanelWidth,
      rightPanelWidth,
      fullPlainText,
      messageOffsets,
      marks,
      activeMarkIndex,
      draftSelection,
      canCreateMarkFromDraftSelection,
      segmentationProgress,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider');
  }

  return context;
}
