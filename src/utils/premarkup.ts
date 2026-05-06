import type { Mark } from '../types/app';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeMessageRanges(value: unknown): Mark['messageRanges'] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const ranges = value.filter((item): item is Mark['messageRanges'][number] => {
    return (
      isObject(item) &&
      typeof item.messageId === 'string' &&
      isNumber(item.start) &&
      isNumber(item.finish)
    );
  });

  return ranges.length === value.length ? ranges : null;
}

function normalizeMark(value: unknown): Mark | null {
  if (!isObject(value) || !isObject(value.position)) {
    return null;
  }

  const start = value.position.start;
  const finish = value.position.finish;
  const messageRanges = normalizeMessageRanges(value.messageRanges);

  if (
    typeof value.entityId !== 'string' ||
    !isNumber(start) ||
    !isNumber(finish) ||
    start >= finish ||
    typeof value.text !== 'string' ||
    !isStringArray(value.selectedSegment) ||
    messageRanges === null
  ) {
    return null;
  }

  return {
    entityId: value.entityId,
    position: {
      start,
      finish,
    },
    type: 'segment',
    text: value.text,
    fields: isObject(value.fields) ? value.fields as Mark['fields'] : {},
    selectedSegment: value.selectedSegment,
    messageRanges,
    hidden: typeof value.hidden === 'boolean' ? value.hidden : false,
    forceVisible: typeof value.forceVisible === 'boolean' ? value.forceVisible : false,
  };
}

function getMarksCandidate(input: Record<string, unknown>) {
  if (Array.isArray(input.marks) && input.marks.length > 0) {
    return input.marks;
  }

  if (Array.isArray(input.segments)) {
    return input.segments;
  }

  return null;
}

export function getPremarkupMarksCandidateCount(input: unknown): number {
  if (!isObject(input)) {
    return 0;
  }

  const marksCandidate = getMarksCandidate(input);

  return Array.isArray(marksCandidate) ? marksCandidate.length : 0;
}

export function normalizePremarkupMarks(input: unknown): Mark[] {
  if (!isObject(input)) {
    return [];
  }

  const marksCandidate = getMarksCandidate(input);

  if (!Array.isArray(marksCandidate)) {
    return [];
  }

  return marksCandidate
    .map(normalizeMark)
    .filter((mark): mark is Mark => mark !== null);
}
