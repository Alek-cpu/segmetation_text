export type CsvRow = {
  ID: string;
  communicationid: string;
  stepid: string;
  chatid: string;
  messageid: string;
  usertype: string;
  sentat: string;
  text: string;
};

export type EntityField = {
  name: string;
  title: string;
  type: 'checkbox' | 'text' | 'select';
  options?: Array<{
    title: string;
    value: string;
  }>;
};

export type Entity = {
  id: string;
  name: string;
  fields: EntityField[];
};

export type MarkFieldValue = {
  type: EntityField['type'];
  value: string[];
};

export type Mark = {
  entityId: string;
  position: {
    start: number;
    finish: number;
  };
  type: 'segment';
  text: string;
  fields: Record<string, MarkFieldValue>;
  selectedSegment: string[];
  messageRanges: Array<{
    messageId: string;
    start: number;
    finish: number;
  }>;
  hidden: boolean;
  forceVisible: boolean;
};

export type DraftSelection = {
  entityId: string | null;
  selectedText: string;
  start: number | null;
  finish: number | null;
  messageIds: string[];
};

export type MessageOffset = {
  rowId: string;
  messageId: string;
  start: number;
  end: number;
  textStart: number;
  textEnd: number;
  text: string;
};

export type EntitiesMock = {
  entities: Entity[];
};
