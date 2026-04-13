import type { Mark, MessageOffset } from '../types/app';

export type MessageTextPart = {
  text: string;
  isMarked: boolean;
  markIndex?: number;
  isActive?: boolean;
  entityId?: string;
  color?: string;
  hasStartBorder?: boolean;
  hasEndBorder?: boolean;
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
): MessageTextPart[] {
  const segments = marks
    .map((mark, markIndex) => ({ mark, markIndex }))
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
    return [{ text: messageOffset.text, isMarked: false }];
  }

  const parts: MessageTextPart[] = [];
  let cursor = messageOffset.start;

  segments.forEach((segment) => {
    if (segment.start > cursor) {
      parts.push({
        text: messageOffset.text.slice(cursor - messageOffset.start, segment.start - messageOffset.start),
        isMarked: false,
      });
    }

    parts.push({
      text: messageOffset.text.slice(segment.start - messageOffset.start, segment.finish - messageOffset.start),
      isMarked: true,
      markIndex: segment.markIndex,
      isActive: activeMarkIndex === segment.markIndex,
      entityId: segment.entityId,
      color: getEntityColor(segment.entityId),
      hasStartBorder: segment.hasStartBorder,
      hasEndBorder: segment.hasEndBorder,
    });

    cursor = segment.finish;
  });

  if (cursor < messageOffset.end) {
    parts.push({
      text: messageOffset.text.slice(cursor - messageOffset.start),
      isMarked: false,
    });
  }

  return parts.filter((part) => part.text.length > 0);
}

export function getEntityColor(entityId: string): string {
  let hash = 0;

  for (let index = 0; index < entityId.length; index += 1) {
    hash = (hash * 31 + entityId.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;

  return `hsl(${hue} 70% 46%)`;
}
