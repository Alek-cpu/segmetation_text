import type { Mark, MessageOffset } from '../types/app';

export type MessageTextPart = {
  text: string;
  isMarked: boolean;
  markIndexes: number[];
  markIndex?: number;
  isActive?: boolean;
  entityId?: string;
  color?: string;
  overlapColor?: string;
  overlapCount?: number;
  hasStartBorder?: boolean;
  hasEndBorder?: boolean;
  startBoundaryMarkIndex?: number;
  endBoundaryMarkIndex?: number;
};

type MessageMarkSegment = {
  markIndex: number;
  start: number;
  finish: number;
  entityId: string;
  hasStartBorder: boolean;
  hasEndBorder: boolean;
};

export function buildMessageTextParts(
  messageOffset: MessageOffset,
  marks: Mark[],
  activeMarkIndex: number | null,
  visibleMarkIndexes?: Set<number>,
): MessageTextPart[] {
  const segments = marks
    .map((mark, markIndex) => ({ mark, markIndex }))
    .filter(({ markIndex }) => !visibleMarkIndexes || visibleMarkIndexes.has(markIndex))
    .filter(({ mark }) => mark.position.finish > messageOffset.start && mark.position.start < messageOffset.end)
    .map<MessageMarkSegment>(({ mark, markIndex }) => ({
      markIndex,
      start: Math.max(mark.position.start, messageOffset.start),
      finish: Math.min(mark.position.finish, messageOffset.end),
      entityId: mark.entityId,
      hasStartBorder: mark.position.start >= messageOffset.start,
      hasEndBorder: mark.position.finish <= messageOffset.end,
    }))
    .sort((left, right) => left.start - right.start);

  if (segments.length === 0) {
    return [{ text: messageOffset.text, isMarked: false, markIndexes: [] }];
  }

  const boundaryPoints = [...new Set([
    messageOffset.start,
    messageOffset.end,
    ...segments.flatMap((segment) => [segment.start, segment.finish]),
  ])].sort((left, right) => left - right);

  const parts: MessageTextPart[] = [];

  for (let index = 0; index < boundaryPoints.length - 1; index += 1) {
    const start = boundaryPoints[index];
    const finish = boundaryPoints[index + 1];

    if (start === finish) {
      continue;
    }

    const text = messageOffset.text.slice(start - messageOffset.start, finish - messageOffset.start);
    const coveringSegments = segments.filter((segment) => segment.finish > start && segment.start < finish);

    if (coveringSegments.length === 0) {
      parts.push({
        text,
        isMarked: false,
        markIndexes: [],
      });
      continue;
    }

    const primarySegment = getPrimarySegment(coveringSegments, activeMarkIndex);
    const startBoundarySegment = getBoundarySegment({
      segments: coveringSegments,
      boundary: start,
      activeMarkIndex,
      edge: 'start',
    });
    const endBoundarySegment = getBoundarySegment({
      segments: coveringSegments,
      boundary: finish,
      activeMarkIndex,
      edge: 'finish',
    });

    parts.push({
      text,
      isMarked: true,
      markIndexes: coveringSegments.map((segment) => segment.markIndex),
      markIndex: primarySegment.markIndex,
      isActive: coveringSegments.some((segment) => segment.markIndex === activeMarkIndex),
      entityId: primarySegment.entityId,
      color: getEntityColor(primarySegment.entityId),
      overlapColor: getOverlapColor(coveringSegments, primarySegment),
      overlapCount: coveringSegments.length,
      hasStartBorder: Boolean(startBoundarySegment),
      hasEndBorder: Boolean(endBoundarySegment),
      startBoundaryMarkIndex: startBoundarySegment?.markIndex,
      endBoundaryMarkIndex: endBoundarySegment?.markIndex,
    });
  }

  return parts.filter((part) => part.text.length > 0);
}

function getOverlapColor(segments: MessageMarkSegment[], primarySegment: MessageMarkSegment) {
  const secondarySegment = segments.find((segment) => segment.markIndex !== primarySegment.markIndex);

  return secondarySegment ? getEntityColor(secondarySegment.entityId) : undefined;
}

function getPrimarySegment(segments: MessageMarkSegment[], activeMarkIndex: number | null) {
  const activeSegment = segments.find((segment) => segment.markIndex === activeMarkIndex);

  if (activeSegment) {
    return activeSegment;
  }

  return [...segments].sort((left, right) => {
    const leftLength = left.finish - left.start;
    const rightLength = right.finish - right.start;

    if (leftLength !== rightLength) {
      return leftLength - rightLength;
    }

    return right.markIndex - left.markIndex;
  })[0];
}

function getBoundarySegment(params: {
  segments: MessageMarkSegment[];
  boundary: number;
  activeMarkIndex: number | null;
  edge: 'start' | 'finish';
}) {
  const boundarySegments = params.segments.filter((segment) => {
    if (params.edge === 'start') {
      return segment.hasStartBorder && segment.start === params.boundary;
    }

    return segment.hasEndBorder && segment.finish === params.boundary;
  });

  if (boundarySegments.length === 0) {
    return undefined;
  }

  const activeBoundarySegment = boundarySegments.find((segment) => segment.markIndex === params.activeMarkIndex);

  if (activeBoundarySegment) {
    return activeBoundarySegment;
  }

  return getPrimarySegment(boundarySegments, params.activeMarkIndex);
}

export function getEntityColor(entityId: string): string {
  let hash = 0;

  for (let index = 0; index < entityId.length; index += 1) {
    hash = (hash * 31 + entityId.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;

  return `hsl(${hue} 70% 46%)`;
}
