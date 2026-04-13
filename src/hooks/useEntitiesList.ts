import { useEffect, useMemo, useState } from 'react';
import type { Entity } from '../types/app';

const PAGE_SIZE = 20;

type UseEntitiesListParams = {
  entities: Entity[];
  searchQuery: string;
};

export function useEntitiesList({ entities, searchQuery }: UseEntitiesListParams) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredEntities = useMemo(() => {
    if (!normalizedQuery) {
      return entities;
    }

    return entities.filter((entity) => {
      const searchableText = `${entity.id} ${entity.name}`.toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [entities, normalizedQuery]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [normalizedQuery, entities]);

  const visibleEntities = useMemo(() => {
    return filteredEntities.slice(0, visibleCount);
  }, [filteredEntities, visibleCount]);

  const hasMore = visibleEntities.length < filteredEntities.length;

  const loadMore = () => {
    if (!hasMore) {
      return;
    }

    setVisibleCount((currentCount) => currentCount + PAGE_SIZE);
  };

  return {
    filteredEntities,
    visibleEntities,
    hasMore,
    loadMore,
    pageSize: PAGE_SIZE,
  };
}
