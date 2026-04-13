import type { DraftSelection, Entity, Mark, MarkFieldValue, MessageOffset } from '../types/app';

export function initializeMarkFields(entity: Entity): Record<string, MarkFieldValue> {
  return entity.fields.reduce<Record<string, MarkFieldValue>>((accumulator, field) => {
    accumulator[field.name] = {
      type: field.type,
      value: [],
    };

    return accumulator;
  }, {});
}

export function hasIntersectingMark(marks: Mark[], draftSelection: DraftSelection): boolean {
  if (draftSelection.start === null || draftSelection.finish === null) {
    return false;
  }

  return marks.some((mark) => {
    return mark.position.finish > draftSelection.start! && mark.position.start < draftSelection.finish!;
  });
}

export function hasIntersectingRange(
  marks: Mark[],
  range: { start: number; finish: number },
  excludeMarkIndex?: number,
): boolean {
  return marks.some((mark, index) => {
    if (excludeMarkIndex !== undefined && index === excludeMarkIndex) {
      return false;
    }

    return mark.position.finish > range.start && mark.position.start < range.finish;
  });
}

export function createMark(entity: Entity, draftSelection: DraftSelection): Mark | null {
  if (draftSelection.start === null || draftSelection.finish === null || !draftSelection.selectedText) {
    return null;
  }

  return {
    entityId: entity.id,
    position: {
      start: draftSelection.start,
      finish: draftSelection.finish,
    },
    type: 'segment',
    text: draftSelection.selectedText,
    fields: initializeMarkFields(entity),
    selectedSegment: draftSelection.messageIds,
    messageRanges: [],
    hidden: false,
    forceVisible: false,
  };
}

export function buildMarkRangePayload(params: {
  start: number;
  finish: number;
  fullPlainText: string;
  messageOffsets: MessageOffset[];
}): Pick<Mark, 'position' | 'text' | 'selectedSegment' | 'messageRanges'> {
  const start = Math.min(params.start, params.finish);
  const finish = Math.max(params.start, params.finish);
  const messageRanges = params.messageOffsets
    .filter((item) => item.end > start && item.start < finish)
    .map((item) => ({
      messageId: item.messageId,
      start: Math.max(0, start - item.start),
      finish: Math.min(item.text.length, finish - item.start),
    }));

  return {
    position: {
      start,
      finish,
    },
    text: params.fullPlainText.slice(start, finish),
    selectedSegment: messageRanges.map((item) => item.messageId),
    messageRanges,
  };
}

export function rebuildMarksAfterTextEdit(params: {
  marks: Mark[];
  previousRows: Array<{ messageid: string; text: string }>;
  rows: Array<{ messageid: string; text: string }>;
  messageOffsets: MessageOffset[];
  fullPlainText: string;
}): Mark[] {
  return params.marks.flatMap((mark) => {
    const rebuiltRanges = mark.messageRanges
      .map((range) => {
        const previousRow = params.previousRows.find((item) => item.messageid === range.messageId);
        const row = params.rows.find((item) => item.messageid === range.messageId);
        const offset = params.messageOffsets.find((item) => item.messageId === range.messageId);

        if (!previousRow || !row || !offset) {
          return null;
        }

        const maxLength = row.text.length;
        const lengthDelta = row.text.length - previousRow.text.length;
        const nextStart = Math.min(range.start, maxLength);
        const nextFinish = Math.max(nextStart, Math.min(range.finish + lengthDelta, maxLength));

        return {
          messageId: range.messageId,
          start: nextStart,
          finish: nextFinish,
          globalStart: offset.start + nextStart,
          globalFinish: offset.start + nextFinish,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (rebuiltRanges.length === 0) {
      return [];
    }

    const start = rebuiltRanges[0].globalStart;
    const finish = rebuiltRanges[rebuiltRanges.length - 1].globalFinish;
    const nextText = params.fullPlainText.slice(start, finish);

    if (nextText.length === 0) {
      return [];
    }

    return [{
      ...mark,
      position: {
        start,
        finish,
      },
      text: nextText,
      selectedSegment: rebuiltRanges.map((item) => item.messageId),
      messageRanges: rebuiltRanges.map(({ messageId, start: localStart, finish: localFinish }) => ({
        messageId,
        start: localStart,
        finish: localFinish,
      })),
    }];
  });
}
