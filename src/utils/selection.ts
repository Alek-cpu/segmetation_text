import type { DraftSelection, MessageOffset } from '../types/app';

type SelectionContext = {
  fullPlainText: string;
  messageOffsets: MessageOffset[];
  rootElement: HTMLElement;
};

const EMPTY_SELECTION: DraftSelection = {
  entityId: null,
  selectedText: '',
  start: null,
  finish: null,
  messageIds: [],
};

export function getEmptyDraftSelection(): DraftSelection {
  return EMPTY_SELECTION;
}

export function getDraftSelectionFromDomSelection(
  selection: Selection,
  context: SelectionContext,
): DraftSelection {
  if (selection.rangeCount === 0 || selection.isCollapsed) {
    return EMPTY_SELECTION;
  }

  const startMessageElement = getMessageElement(selection.anchorNode, context.rootElement);
  const endMessageElement = getMessageElement(selection.focusNode, context.rootElement);

  if (!startMessageElement || !endMessageElement) {
    return EMPTY_SELECTION;
  }

  const startMessageId = startMessageElement.dataset.messageId;
  const endMessageId = endMessageElement.dataset.messageId;

  if (!startMessageId || !endMessageId) {
    return EMPTY_SELECTION;
  }

  const startMessageOffset = context.messageOffsets.find((item) => item.messageId === startMessageId);
  const endMessageOffset = context.messageOffsets.find((item) => item.messageId === endMessageId);

  if (!startMessageOffset || !endMessageOffset) {
    return EMPTY_SELECTION;
  }

  const startTextElement = getSelectableTextElement(startMessageElement);
  const endTextElement = getSelectableTextElement(endMessageElement);

  if (!startTextElement || !endTextElement) {
    return EMPTY_SELECTION;
  }

  const anchorGlobalOffset =
    startMessageOffset.start +
    getTextOffsetWithinElement(startTextElement, selection.anchorNode, selection.anchorOffset);
  const focusGlobalOffset =
    endMessageOffset.start +
    getTextOffsetWithinElement(endTextElement, selection.focusNode, selection.focusOffset);

  const start = Math.min(anchorGlobalOffset, focusGlobalOffset);
  const finish = Math.max(anchorGlobalOffset, focusGlobalOffset);

  if (start === finish) {
    return EMPTY_SELECTION;
  }

  const messageIds = context.messageOffsets
    .filter((item) => item.end > start && item.start < finish)
    .map((item) => item.messageId);

  return {
    entityId: null,
    selectedText: context.fullPlainText.slice(start, finish),
    start,
    finish,
    messageIds,
  };
}

export function getGlobalOffsetFromPoint(params: {
  clientX: number;
  clientY: number;
  rootElement: HTMLElement;
  messageOffsets: MessageOffset[];
}): number | null {
  const caretPosition = getCaretPosition(params.clientX, params.clientY);

  if (!caretPosition) {
    return null;
  }

  const messageElement = getMessageElement(caretPosition.offsetNode, params.rootElement);

  if (!messageElement) {
    return null;
  }

  const messageId = messageElement.dataset.messageId;

  if (!messageId) {
    return null;
  }

  const messageOffset = params.messageOffsets.find((item) => item.messageId === messageId);
  const textElement = getSelectableTextElement(messageElement);

  if (!messageOffset || !textElement) {
    return null;
  }

  const localOffset = getTextOffsetWithinElement(textElement, caretPosition.offsetNode, caretPosition.offset);

  return Math.min(messageOffset.end, Math.max(messageOffset.start, messageOffset.start + localOffset));
}

function getCaretPosition(clientX: number, clientY: number): { offsetNode: Node; offset: number } | null {
  if ('caretPositionFromPoint' in document) {
    const caretPosition = document.caretPositionFromPoint(clientX, clientY);

    if (!caretPosition) {
      return null;
    }

    return {
      offsetNode: caretPosition.offsetNode,
      offset: caretPosition.offset,
    };
  }

  if ('caretRangeFromPoint' in document) {
    const caretRange = document.caretRangeFromPoint(clientX, clientY);

    if (!caretRange) {
      return null;
    }

    return {
      offsetNode: caretRange.startContainer,
      offset: caretRange.startOffset,
    };
  }

  return null;
}

function getMessageElement(node: Node | null, rootElement: HTMLElement): HTMLElement | null {
  if (!node) {
    return null;
  }

  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;

  if (!element) {
    return null;
  }

  const messageElement = element.closest<HTMLElement>('[data-message-id]');

  if (!messageElement || !rootElement.contains(messageElement)) {
    return null;
  }

  return messageElement;
}

function getSelectableTextElement(messageElement: HTMLElement): HTMLElement | null {
  return messageElement.querySelector<HTMLElement>('[data-selectable-text="true"]');
}

function getTextOffsetWithinElement(
  textElement: HTMLElement,
  targetNode: Node | null,
  targetOffset: number,
): number {
  if (!targetNode || !textElement.contains(targetNode)) {
    return 0;
  }

  let offset = 0;
  let foundTarget = false;

  const visitNode = (node: Node) => {
    if (foundTarget || isSelectionDecorator(node)) {
      return;
    }

    if (node === targetNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += Math.min(targetOffset, node.textContent?.length ?? 0);
      } else {
        Array.from(node.childNodes)
          .slice(0, targetOffset)
          .forEach((childNode) => {
            offset += getSelectableTextLength(childNode);
          });
      }

      foundTarget = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length ?? 0;
      return;
    }

    node.childNodes.forEach(visitNode);
  };

  visitNode(textElement);

  return offset;
}

function getSelectableTextLength(node: Node): number {
  if (isSelectionDecorator(node)) {
    return 0;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length ?? 0;
  }

  return Array.from(node.childNodes).reduce((length, childNode) => length + getSelectableTextLength(childNode), 0);
}

function isSelectionDecorator(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;

  return Boolean(element?.closest('[data-selection-decorator="true"]'));
}
