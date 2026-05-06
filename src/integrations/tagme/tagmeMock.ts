import type { Entity } from '../../types/app';
import type { TagMeApi } from './tagmeTypes';

type CreateMockTagMeApiParams = {
  csv: string;
  entities: Entity[];
};

export function createMockTagMeApi(params: CreateMockTagMeApiParams): TagMeApi {
  return {
    task: {
      config: {
        entities: params.entities,
      },
      premarkup: null,
      data: {
        payload: {
          csv: params.csv,
          entities: params.entities,
        },
        answer: null,
        premarkup: null,
      },
    },
    result: null,
    onValidate: undefined,
    onSubmit: undefined,
  };
}
