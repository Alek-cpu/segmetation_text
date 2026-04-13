import { useState, type ChangeEvent, type UIEvent } from 'react';
import styles from './EntitiesPanel.module.css';
import { useAppContext } from '../context/AppContext';
import { useEntitiesList } from '../hooks/useEntitiesList';

export function EntitiesPanel() {
  const { entities, loading, draftSelection, createMarkFromDraftSelection } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const { filteredEntities, visibleEntities, hasMore, loadMore } = useEntitiesList({
    entities,
    searchQuery,
  });
  const canCreateMark = draftSelection.start !== null && draftSelection.finish !== null;

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    const remainingDistance = scrollHeight - (scrollTop + clientHeight);

    if (remainingDistance <= 48) {
      loadMore();
    }
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Entities</p>
        <h2 className={styles.title}>Список сущностей</h2>
        <p className={styles.description}>
          Левая панель подготовлена под выбор entity для разметки.
        </p>
      </div>

      <label className={styles.search}>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          className={styles.searchInput}
          placeholder="Поиск по id или name"
        />
      </label>

      <div className={styles.meta}>
        {loading ? 'Загрузка...' : `${visibleEntities.length} из ${filteredEntities.length} entities`}
      </div>

      <div className={styles.list} onScroll={handleListScroll}>
        {visibleEntities.map((entity) => (
          <button
            key={entity.id}
            type="button"
            className={`${styles.entityItem} ${canCreateMark ? styles.entityItemActive : ''}`}
            onClick={() => createMarkFromDraftSelection(entity)}
          >
            <p className={styles.entityName}>{entity.name}</p>
          </button>
        ))}

        {!loading && visibleEntities.length === 0 ? (
          <div className={styles.emptyState}>Ничего не найдено</div>
        ) : null}

        {!loading && hasMore ? <div className={styles.loadMoreHint}>Прокрутите вниз, чтобы загрузить еще</div> : null}
      </div>
    </aside>
  );
}
