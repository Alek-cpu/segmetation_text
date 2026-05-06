import Papa from 'papaparse';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type { CsvRow, DraftSelection, Entity, Mark, MessageOffset } from '../types/app';
import {
  debugTagMePremarkup,
  debugTagMeEvent,
  getTagMeCsv,
  getDevelopmentModeFlag,
  getDemoModeFlag,
  getTagMeEntities,
  getTagMePremarkup,
  getTagMeRoleRules,
  getProgressToolFlag,
  isRealTagMeEnvironment,
  registerTagMeSubmit,
  registerTagMeValidate,
  warnTagMePremarkup,
} from '../integrations/tagme/tagmeApi';
import type { TagMeRoleRules, TagMeSubmitResult } from '../integrations/tagme/tagmeTypes';
import { getEmptyDraftSelection } from '../utils/selection';
import { getPremarkupMarksCandidateCount, normalizePremarkupMarks } from '../utils/premarkup';
import { LEFT_SIDEBAR_WIDTH, RIGHT_SIDEBAR_WIDTH } from '../utils/constants';
import {
  buildMarkRangePayload,
  createMark,
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
  markNavigationRequest: { markIndex: number; requestId: number } | null;
  draftSelection: DraftSelection;
  isDevelopmentMode: boolean;
  isProgressToolEnabled: boolean;
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
  requestMarkNavigation: (markIndex: number) => void;
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
const AppContext = createContext<AppContextValue | null>(null);

function buildSubmitResult(params: {
  csvRows: CsvRow[];
  entities: Entity[];
  marks: Mark[];
  source: TagMeSubmitResult['source'];
}): TagMeSubmitResult {
  const entityNameById = new Map(params.entities.map((entity) => [entity.id, entity.name]));

  return {
    totalMessages: params.csvRows.length,
    totalSegments: params.marks.length,
    segments: params.marks.map((mark, markIndex) => ({
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
    marks: params.marks,
    source: params.source,
  };
}

function getRowRole(row: CsvRow) {
  const rowWithRoleAliases = row as CsvRow & Partial<Record<'role' | 'source' | 'Источник', string>>;

  return rowWithRoleAliases.role ?? rowWithRoleAliases.source ?? row.usertype ?? rowWithRoleAliases['Источник'] ?? '';
}

function getUniqueCsvRoles(rows: CsvRow[]) {
  return [...new Set(rows.map(getRowRole).filter(Boolean))];
}

function resolveAllowedRoles(rows: CsvRow[], roleRules: TagMeRoleRules) {
  const allRoles = getUniqueCsvRoles(rows);

  if (roleRules.rolesForMarking && roleRules.rolesForMarking.length > 0) {
    return roleRules.rolesForMarking;
  }

  if (roleRules.rolesForNotMarking && roleRules.rolesForNotMarking.length > 0) {
    const deniedRoles = new Set(roleRules.rolesForNotMarking);

    return allRoles.filter((role) => !deniedRoles.has(role));
  }

  return allRoles;
}

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
  const [markNavigationRequest, setMarkNavigationRequest] = useState<{ markIndex: number; requestId: number } | null>(null);
  const [draftSelection, setDraftSelection] = useState<DraftSelection>(initialDraftSelection);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const [isProgressToolEnabled, setIsProgressToolEnabled] = useState(false);
  const [roleRules, setRoleRules] = useState<TagMeRoleRules>({
    rolesForMarking: null,
    rolesForNotMarking: null,
  });
  const tagMeSourceRef = useRef<TagMeSubmitResult['source']>(isRealTagMeEnvironment() ? 'real-tagme' : 'mock-tagme');
  const marksRef = useRef<Mark[]>([]);
  const submitResultRef = useRef<TagMeSubmitResult>(buildSubmitResult({
    csvRows: [],
    entities: [],
    marks: [],
    source: tagMeSourceRef.current,
  }));

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);
        debugTagMeEvent('app init started');
        debugTagMeEvent('demoMode detected', getDemoModeFlag());

        const [csvSource, tagMeEntities] = await Promise.all([
          getTagMeCsv(),
          getTagMeEntities(),
        ]);
        debugTagMeEvent('csv loaded', csvSource.length);
        debugTagMeEvent('entities loaded', tagMeEntities.length);

        if (isCancelled) {
          return;
        }

        const parsedCsv = Papa.parse<CsvRow>(csvSource, {
          header: true,
          skipEmptyLines: true,
        });

        if (parsedCsv.errors.length > 0) {
          throw new Error(parsedCsv.errors[0].message);
        }

        tagMeSourceRef.current = isRealTagMeEnvironment() ? 'real-tagme' : 'mock-tagme';
        setCsvRows(parsedCsv.data);
        setEntities(tagMeEntities);
        setRoleRules(getTagMeRoleRules());
        setIsDevelopmentMode(getDevelopmentModeFlag());
        setIsProgressToolEnabled(getProgressToolFlag());

        const rawPremarkup = getTagMePremarkup();
        const premarkupMarks = normalizePremarkupMarks(rawPremarkup);
        const invalidPremarkupMarksCount = Math.max(
          getPremarkupMarksCandidateCount(rawPremarkup) - premarkupMarks.length,
          0,
        );

        debugTagMePremarkup('raw', rawPremarkup);
        debugTagMePremarkup('normalized count', premarkupMarks.length);
        debugTagMePremarkup('invalid marks count', invalidPremarkupMarksCount);

        if (invalidPremarkupMarksCount > 0) {
          warnTagMePremarkup('invalid marks filtered', invalidPremarkupMarksCount);
        }

        if (premarkupMarks.length > 0) {
          setMarks(premarkupMarks);
        }
        debugTagMeEvent('app init finished');
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить mock-данные.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          debugTagMeEvent('loading false');
        }
      }
    }

    void loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      registerTagMeValidate(() => marksRef.current);
      registerTagMeSubmit(() => submitResultRef.current);
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : 'Не удалось зарегистрировать TagMe callbacks.');
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

  const allowedRolesForSegmentation = useMemo(() => {
    return resolveAllowedRoles(csvRows, roleRules);
  }, [csvRows, roleRules]);

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

      if (!previousRow || !isRoleAllowedForSegmentation(getRowRole(previousRow))) {
        break;
      }

      startIndex -= 1;
    }

    while (finishIndex < csvRows.length - 1) {
      const nextRow = csvRows[finishIndex + 1];

      if (!nextRow || !isRoleAllowedForSegmentation(getRowRole(nextRow))) {
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

      return row ? isRoleAllowedForSegmentation(getRowRole(row)) : false;
    });
  }, [allowedRolesForSegmentation, csvRows, draftSelection]);

  const segmentationProgress = useMemo(() => {
    const totalMessages = csvRows.length;
    const availableMessages = csvRows.filter((row) => isRoleAllowedForSegmentation(getRowRole(row))).length;
    const markedMessageIds = new Set(
      marks.flatMap((mark) => mark.selectedSegment).filter((messageId) => {
        const row = csvRows.find((item) => item.messageid === messageId);

        return row ? isRoleAllowedForSegmentation(getRowRole(row)) : false;
      }),
    );

    return {
      totalMessages,
      availableMessages,
      markedMessages: markedMessageIds.size,
    };
  }, [allowedRolesForSegmentation, csvRows, marks]);

  const tagMeSubmitResult = useMemo(() => buildSubmitResult({
    csvRows,
    entities,
    marks,
    source: tagMeSourceRef.current,
  }), [csvRows, entities, marks]);

  marksRef.current = marks;
  submitResultRef.current = tagMeSubmitResult;

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
      markNavigationRequest,
      draftSelection,
      isDevelopmentMode,
      isProgressToolEnabled,
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
      requestMarkNavigation: (markIndex) => {
        setActiveMarkIndex(markIndex);
        setMarkNavigationRequest((currentRequest) => ({
          markIndex,
          requestId: (currentRequest?.requestId ?? 0) + 1,
        }));
      },
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
        setMarkNavigationRequest(null);
        setDraftSelection(initialDraftSelection);
        setIsDevelopmentMode(false);
        setIsProgressToolEnabled(false);
        setRoleRules({
          rolesForMarking: null,
          rolesForNotMarking: null,
        });
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
      markNavigationRequest,
      draftSelection,
      isDevelopmentMode,
      isProgressToolEnabled,
      allowedRolesForSegmentation,
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
