import entitiesMock from '../../../mocks/entities.json';
import demoEntitiesMock from '../../../mocks/demoEntities.json';
import csvMockSource from '../../../mocks/0b2a5a2a058e4df59b344416a45bc259.csv?raw';
import demoCsvSource from '../../../mocks/demoDialog.csv?raw';
import type { EntitiesMock, Entity, Mark } from '../../types/app';
import { createMockTagMeApi } from './tagmeMock';
import type { TagMeApi, TagMeRoleRules, TagMeSubmitResult, TagMeTaskConfig } from './tagmeTypes';

type WindowWithTagMe = Window & {
  tmAPI?: TagMeApi;
};

let mockTagMeApi: TagMeApi | null = null;
let demoTagMeApi: TagMeApi | null = null;
const loggedKeys = new Set<string>();

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isEntity(value: unknown): value is Entity {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.fields)
  );
}

function isEntityList(value: unknown): value is Entity[] {
  return Array.isArray(value) && value.every(isEntity);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isUrl(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export async function fetchJsonLike<T>(url: string): Promise<T> {
  const text = await fetchText(url);

  return JSON.parse(text) as T;
}

export function normalizeEntitiesResponse(value: unknown): Entity[] {
  let normalizedValue = value;

  if (typeof normalizedValue === 'string') {
    normalizedValue = JSON.parse(normalizedValue) as unknown;
  }

  if (isEntityList(normalizedValue)) {
    return normalizedValue;
  }

  if (isObject(normalizedValue) && isEntityList(normalizedValue.entities)) {
    return normalizedValue.entities;
  }

  throw new Error('Unknown entities response format.');
}

function getMockTagMeApi() {
  if (!mockTagMeApi) {
    mockTagMeApi = createMockTagMeApi({
      csv: csvMockSource,
      entities: (entitiesMock as EntitiesMock).entities,
    });
  }

  return mockTagMeApi;
}

function getDemoEntities() {
  return (demoEntitiesMock as EntitiesMock).entities;
}

function getDemoTagMeApi() {
  if (!demoTagMeApi) {
    demoTagMeApi = createMockTagMeApi({
      csv: demoCsvSource,
      entities: getDemoEntities(),
    });
  }

  return demoTagMeApi;
}

function getCsvRowsCount(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return Math.max(lines.length - 1, 0);
}

function debugTagMe(label: string, data: unknown): void {
  const isDemoMode = getDemoModeFlag();

  if (!getDevelopmentModeFlag()) {
    return;
  }

  if (loggedKeys.has(label)) {
    return;
  }

  loggedKeys.add(label);

  if (isMockTagMeEnvironment()) {
    const modeLabel = isDemoMode ? '[DEMO]' : '[DEV]';

    console.log(`[TAGME MOCK]${modeLabel} ${label}:`, data);
    return;
  }

  console.log(`[TAGME REAL][DEV] ${label}:`, data);
}

export function debugTagMeEvent(label: string, data: unknown = true): void {
  debugTagMe(label, data);
}

export function debugTagMePremarkup(label: string, data: unknown): void {
  if (!getDevelopmentModeFlag()) {
    return;
  }

  console.log(`[TAGME][PREMARKUP] ${label}:`, data);
}

export function warnTagMePremarkup(label: string, data: unknown): void {
  if (!getDevelopmentModeFlag()) {
    return;
  }

  console.warn(`[TAGME][PREMARKUP] ${label}:`, data);
}

export function getRealTagMeApi(): TagMeApi | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const parentWindow = window.parent as WindowWithTagMe | undefined;

    return parentWindow?.tmAPI ?? null;
  } catch {
    return null;
  }
}

export function getRealTagMeConfigOnly(): TagMeTaskConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const parentWindow = window.parent as WindowWithTagMe | undefined;

    return parentWindow?.tmAPI?.task?.config ?? null;
  } catch {
    return null;
  }
}

export function getTagMeApi(): TagMeApi {
  const realApi = getRealTagMeApi();
  const demoMode = getDemoModeFlag();

  debugTagMe('demoMode', demoMode);

  if (demoMode) {
    const api = getDemoTagMeApi();

    debugTagMe('demoMode enabled', 'using mock data only');
    debugTagMe('environment', api);

    return api;
  }

  if (realApi) {
    debugTagMe('environment', realApi);

    return realApi;
  }

  const api = getMockTagMeApi();

  debugTagMe('environment', api);

  return api;
}

function getFeatureFlagConfig(): TagMeTaskConfig {
  return getRealTagMeConfigOnly() ?? getMockTagMeApi().task.config;
}

function getTagMeDataApi() {
  return getTagMeApi();
}

export function isRealTagMeEnvironment() {
  return !getDemoModeFlag() && getRealTagMeApi() !== null;
}

export function isMockTagMeEnvironment() {
  return getDemoModeFlag() || getRealTagMeApi() === null;
}

export async function getTagMeEntities() {
  const mockEntities = (entitiesMock as EntitiesMock).entities;

  if (getDemoModeFlag()) {
    const demoEntities = getDemoEntities();

    debugTagMe('data source', 'demo-mock');
    debugTagMe('entities source', 'demo-mock');
    debugTagMe('entities count', demoEntities.length);
    debugTagMe('entities', demoEntities);

    return demoEntities;
  }

  const api = getTagMeApi();

  if (isUrl(api.task.config.linkToEntities)) {
    try {
      const response = await fetchJsonLike<unknown>(api.task.config.linkToEntities);
      const entities = normalizeEntitiesResponse(response);

      debugTagMe('entities source', 'config.linkToEntities');
      debugTagMe('entities', entities);

      return entities;
    } catch (error) {
      console.error('[TAGME] Failed to load entities from config.linkToEntities:', error);
    }
  }

  try {
    const entities = normalizeEntitiesResponse(api.task.config.entities);

    debugTagMe('entities source', 'config.entities');
    debugTagMe('entities', entities);

    return entities;
  } catch {
    // Try the next source.
  }

  try {
    const entities = normalizeEntitiesResponse(api.task.data.payload?.entities);

    debugTagMe('entities source', 'payload.entities');
    debugTagMe('entities', entities);

    return entities;
  } catch {
    // Use mock entities below.
  }

  debugTagMe('entities source', 'mock');
  debugTagMe('entities', mockEntities);

  return mockEntities;
}

export async function getTagMeCsv() {
  if (getDemoModeFlag()) {
    debugTagMe('data source', 'demo-mock');
    debugTagMe('csv source', 'demo-mock');
    debugTagMe('csv length', demoCsvSource.length);
    debugTagMe('csv rows count', getCsvRowsCount(demoCsvSource));
    debugTagMe('csv', demoCsvSource);

    return demoCsvSource;
  }

  const dialog = getTagMeApi().task.dialog;

  if (isUrl(dialog)) {
    try {
      const csv = await fetchText(dialog);

      debugTagMe('csv source', 'task.dialog');
      debugTagMe('csv', csv);

      return csv;
    } catch (error) {
      console.error('[TAGME] Failed to load CSV from task.dialog:', error);
    }
  }

  debugTagMe('csv source', 'mock');
  debugTagMe('csv', csvMockSource);

  return csvMockSource;
}

export function getTagMePremarkup() {
  if (getDemoModeFlag()) {
    debugTagMe('premarkup source', 'demo-mock');
    debugTagMePremarkup('source', 'demo-mock');
    debugTagMe('premarkup', null);

    return null;
  }

  const api = getTagMeDataApi();
  const value = api.task?.premarkup
    ?? api.task?.data?.premarkup
    ?? api.task?.data?.answer
    ?? null;
  const source = api.task?.premarkup !== undefined && api.task.premarkup !== null
    ? 'task.premarkup'
    : api.task?.data?.premarkup !== undefined && api.task.data.premarkup !== null
      ? 'task.data.premarkup'
      : api.task?.data?.answer !== undefined && api.task.data.answer !== null
        ? 'task.data.answer'
        : null;

  if (source) {
    debugTagMePremarkup('source', source);
  }

  if (value === null || value === undefined || value === '') {
    debugTagMe('premarkup', null);

    return null;
  }

  if (typeof value === 'string') {
    try {
      const parsedPremarkup = JSON.parse(value) as unknown;

      debugTagMe('premarkup', parsedPremarkup);

      return parsedPremarkup;
    } catch (error) {
      console.warn('[TAGME] Failed to parse task premarkup JSON:', error);

      return null;
    }
  }

  if (!isObject(value)) {
    debugTagMe('premarkup', null);

    return null;
  }

  debugTagMe('premarkup', value);

  return value;
}

export function getTagMeRoleRules(): TagMeRoleRules {
  const config = getDemoModeFlag() ? getDemoTagMeApi().task.config : getTagMeApi().task.config;

  const normalizeRoleRule = (fieldName: 'rolesForMarking' | 'rolesForNotMarking') => {
    const value = config[fieldName];

    if (value === undefined) {
      return null;
    }

    if (isStringList(value)) {
      return value;
    }

    console.warn(`[TAGME] Invalid ${fieldName} format. Expected string[].`, value);

    return null;
  };

  const rolesForMarking = normalizeRoleRule('rolesForMarking');
  const rolesForNotMarking = normalizeRoleRule('rolesForNotMarking');
  const mode = rolesForMarking && rolesForMarking.length > 0
    ? 'allow-list'
    : rolesForNotMarking && rolesForNotMarking.length > 0
      ? 'deny-list'
      : 'all';
  const roleRules = {
    rolesForMarking,
    rolesForNotMarking,
  };

  debugTagMe('role rules', {
    ...roleRules,
    mode,
  });

  return roleRules;
}

export function getProgressToolFlag(): boolean {
  const value = getFeatureFlagConfig().progressTool === true;

  debugTagMe('progressTool', value);

  return value;
}

export function getDevelopmentModeFlag(): boolean {
  return getFeatureFlagConfig().developmentMode === true;
}

export function getDemoModeFlag(): boolean {
  return getRealTagMeConfigOnly()?.demoMode === true;
}

export function registerTagMeValidate(getCurrentMarks: () => Mark[]) {
  const api = getTagMeApi();

  api.onValidate = () => {
    return getCurrentMarks().length === 0 ? 'Разметьте хотя бы один сегмент' : true;
  };
}

export function registerTagMeSubmit(getResult: () => TagMeSubmitResult) {
  const api = getTagMeApi();

  api.onSubmit = () => {
    const result = getResult();
    api.result = result;
    debugTagMe('submit result', result);

    return result;
  };
}
