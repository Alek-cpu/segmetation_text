import type { Entity, Mark } from '../../types/app';

export type TagMeTaskConfig = {
  entities?: Entity[];
  linkToEntities?: string;
  rolesForMarking?: string[];
  rolesForNotMarking?: string[];
  progressTool?: boolean;
  developmentMode?: boolean;
  demoMode?: boolean;
  [key: string]: unknown;
};

export type TagMeTaskPayload = {
  csv?: string;
  entities?: Entity[];
  [key: string]: unknown;
};

export type TagMeTaskData = {
  payload?: TagMeTaskPayload;
  answer?: unknown | null;
  premarkup?: unknown | null;
  [key: string]: unknown;
};

export type TagMePremarkupMark = Partial<Mark> & {
  [key: string]: unknown;
};

export type TagMePremarkup = {
  marks?: TagMePremarkupMark[];
  segments?: TagMePremarkupMark[];
  [key: string]: unknown;
};

export type TagMeTask = {
  config: TagMeTaskConfig;
  data: TagMeTaskData;
  dialog?: string;
  premarkup?: unknown | null;
  [key: string]: unknown;
};

export type TagMeValidationResult = true | string;

export type TagMeRoleRules = {
  rolesForMarking: string[] | null;
  rolesForNotMarking: string[] | null;
};

export type TagMeSubmitResult = {
  source: 'real-tagme' | 'mock-tagme';
  totalMessages: number;
  totalSegments: number;
  segments: Array<{
    index: number;
    entityId: string;
    entityName: string;
    type: Mark['type'];
    position: Mark['position'];
    text: string;
    selectedSegment: string[];
    messageRanges: Mark['messageRanges'];
    fields: Mark['fields'];
    hidden: boolean;
    forceVisible: boolean;
  }>;
  marks: Mark[];
};

export type TagMeApi = {
  task: TagMeTask;
  result: TagMeSubmitResult | null;
  onValidate?: () => TagMeValidationResult;
  onSubmit?: () => TagMeSubmitResult;
};
