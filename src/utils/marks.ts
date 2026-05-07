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
    }))
    .filter((range) => range.start < range.finish);

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
  const previousTextByMessageId = new Map(
    params.previousRows.map((row) => [row.messageid, row.text ?? '']),
  );
  const textByMessageId = new Map(
    params.rows.map((row) => [row.messageid, row.text ?? '']),
  );
  const offsetByMessageId = new Map(
    params.messageOffsets.map((offset) => [offset.messageId, offset]),
  );

  return params.marks.flatMap((mark) => {
    const rebuiltRanges = mark.messageRanges
      .map((range) => {
        const previousText = previousTextByMessageId.get(range.messageId);
        const text = textByMessageId.get(range.messageId);
        const offset = offsetByMessageId.get(range.messageId);

        if (previousText === undefined || text === undefined || !offset) {
          return null;
        }

        const maxLength = text.length;
        const lengthDelta = text.length - previousText.length;
        const nextStart = clampRangeOffset(range.start, maxLength);
        const nextFinish = clampRangeOffset(range.finish + lengthDelta, maxLength);
        const start = Math.min(nextStart, nextFinish);
        const finish = Math.max(nextStart, nextFinish);

        if (start >= finish) {
          return null;
        }

        return {
          messageId: range.messageId,
          start,
          finish,
          globalStart: offset.start + start,
          globalFinish: offset.start + finish,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => left.globalStart - right.globalStart);

    if (rebuiltRanges.length === 0) {
      return [];
    }

    const start = rebuiltRanges[0].globalStart;
    const finish = rebuiltRanges[rebuiltRanges.length - 1].globalFinish;
    const nextPayload = buildMarkRangePayload({
      start,
      finish,
      fullPlainText: params.fullPlainText,
      messageOffsets: params.messageOffsets,
    });

    if (
      nextPayload.position.start >= nextPayload.position.finish ||
      nextPayload.text.length === 0 ||
      nextPayload.messageRanges.length === 0
    ) {
      return [];
    }

    return [{
      ...mark,
      ...nextPayload,
    }];
  });
}

function clampRangeOffset(offset: number, maxLength: number) {
  if (!Number.isFinite(offset)) {
    return 0;
  }

  return Math.min(maxLength, Math.max(0, offset));
}
