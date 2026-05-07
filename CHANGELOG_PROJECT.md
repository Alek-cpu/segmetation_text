# CHANGELOG PROJECT

### Update log
- Date: 2026-05-06
- What was analyzed: `Workspace.tsx`, `AppContext.tsx`, `utils/marks.ts`, `utils/messageMarks.ts`, `utils/selection.ts`, edit-mode save flow and marked text rendering.
- What was added/updated in context: fixed the crash after saving a heavily shortened reply by hardening mark normalization after text edits, clamping message text parts during rendering and remounting plain `contentEditable` rows separately from view-mode marked spans.
- Cause: old marks could collapse to empty/out-of-bounds local ranges after a reply was shortened to one character, and edit mode also kept React-managed `<span>` trees inside a browser-mutated `contentEditable`, which could produce `NotFoundError` during React commit.
- Notes: one-character replies remain valid; fully empty/whitespace-only replies are still blocked before save; invalid marks are removed or rebuilt from valid clamped ranges; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-05-06
- What was analyzed: `PROJECT_CONTEXT.md`, `CODEX_RULES.md`, `Workspace.tsx`, `Workspace.module.css`, `AppContext.tsx` and the current inline edit/save flow.
- What was added/updated in context: `Workspace` now validates current edit-mode rows before calling `saveEditedRows`; saving is blocked if any reply is empty after `trim()`, with a visible error message and highlighted invalid reply.
- Notes: the user remains in edit mode until all replies contain at least one non-whitespace character; `AppContext`, marks shape, selection, resize and overlap logic were not changed; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-05-06
- What was analyzed: `PROJECT_CONTEXT.md`, `CODEX_RULES.md` and the entity-change button in `SelectedSegmentsPanel.tsx`.
- What was added/updated in context: UI-only change replacing the entity-change glyph with a compact inline SVG circular refresh/replace icon and updating the tooltip text to `Сменить класс`.
- Notes: entity-change handlers, `AppContext`, marks shape and segment logic were not changed.

- Date: 2026-05-06
- What was analyzed: `PROJECT_CONTEXT.md`, `CODEX_RULES.md`, `SelectedSegmentsPanel.tsx`, `SelectedSegmentsPanel.module.css`, `AppContext.tsx`, `types/app.ts` and existing right-panel portal popup patterns.
- What was added/updated in context: right-panel segment text previews now detect overflow and support per-mark `Показать еще` / `Свернуть`; existing marks can change `entityId` through a searchable portal entity picker backed by the new `updateMarkEntity(markIndex, entityId)` context action.
- Notes: entity changes preserve segment text, offsets, `selectedSegment` and existing fields; sorted/filtered rendering uses the source `markIndex`; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-05-06
- What was analyzed: `PROJECT_CONTEXT.md`, `CODEX_RULES.md`, `MainLayout.tsx`, `AppContext.tsx`, layout styles and panel width constants.
- What was added/updated in context: panel width state now initializes from safe `localStorage` reads and persists left/right sidebar widths under `tagme-segmentation-left-panel-width` and `tagme-segmentation-right-panel-width`; documented the persisted layout behavior and width constraints.
- Notes: invalid, missing or unavailable `localStorage` values fall back safely and all applied values are clamped to `260-460px`; `resetState` does not clear saved layout widths; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: direct `tmAPI.task.premarkup` flow, source logging and fallback from empty `marks` to `segments` in premarkup normalization.
- What was added/updated in context: `getTagMePremarkup()` now explicitly logs premarkup source and reads `task.premarkup` before `task.data.premarkup` / `task.data.answer`; `normalizePremarkupMarks()` uses `segments` when `marks` is absent or empty.
- Notes: premarkup still applies only once during AppContext initialization; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: TagMe premarkup sources, current strict `AppContext` mark extraction and existing `Mark` shape.
- What was added/updated in context: added typed premarkup support for `task.premarkup`, `task.data.premarkup` and `task.data.answer`; created `src/utils/premarkup.ts` to normalize `marks` / `segments` into initial `Mark[]` with defaults and invalid-item filtering.
- Notes: premarkup is applied once during AppContext initialization, string JSON is parsed in the adapter, invalid marks do not crash the app, and development-mode debug/warn logs use `[TAGME][PREMARKUP]`.

- Date: 2026-04-28
- What was analyzed: all project CSV mocks under `/mocks`, Papa Parse field-mismatch errors and the demo CSV text column formatting.
- What was added/updated in context: normalized `mocks/demoDialog.csv` so every `text` field is quoted and rows match the 8-column header.
- Notes: both `mocks/0b2a5a2a058e4df59b344416a45bc259.csv` and `mocks/demoDialog.csv` parse with `0` Papa Parse errors; AppContext and UI were not changed.

- Date: 2026-04-28
- What was analyzed: demo-mode mock source flow in `tagmeApi.ts`, current heavy mock entities/CSV imports and local TagMe simulator creation.
- What was added/updated in context: added lightweight `mocks/demoEntities.json` and `mocks/demoDialog.csv`, plus a separate demo mock tmAPI singleton used only when `tmAPI.task.config.demoMode === true`.
- Notes: demo mode now skips the large mock entities and large CSV, still performs no fetch or real payload reads, and development-mode debug logs include `data source: "demo-mock"`, entities count, CSV length and CSV rows count.

- Date: 2026-04-28
- What was analyzed: AppContext initial loading flow, `loading` state transitions, demo-mode adapter branches and TagMe callback registration.
- What was added/updated in context: added dev-only init diagnostics via `debugTagMeEvent`, kept `setLoading(false)` in `finally`, and guarded TagMe validate/submit registration with `try/catch` so registration errors become `error` state instead of blocking UI.
- Notes: demo mode still returns mock CSV/entities before any real-data fetch branches; `npm run build` and `npm run build:tagme` pass with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: demo mode control flow in `tagmeApi.ts`, real config reads, data getters for entities/CSV/premarkup, role rules and feature flag reads.
- What was added/updated in context: hardened demo mode so only `window.parent.tmAPI.task.config.demoMode` is read from real TagMe before switching all data getters to mock-only sources; feature flags still read real config.
- Notes: in demo mode `linkToEntities`, `config.entities`, payload, `task.dialog`, answer/premarkup and fetch branches are skipped; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: TagMe API selection flow, real/mock environment helpers, debug prefix behavior and external data-source branches in `tagmeApi.ts`.
- What was added/updated in context: added `config.demoMode`; when real TagMe config sets it to `true`, the adapter always returns mock tmAPI and ignores real payload, `linkToEntities`, `task.dialog` and fetch sources.
- Notes: demo mode has priority over real tmAPI; build passes with the existing Vite chunk-size warning; UI and AppContext architecture were not changed.

- Date: 2026-04-28
- What was analyzed: TagMe debug flow in `tagmeApi.ts`, Workspace result preview button rendering and AppContext feature flag plumbing.
- What was added/updated in context: added `config.developmentMode` support; debug logs now emit only in development mode with `[TAGME MOCK][DEV]` / `[TAGME REAL][DEV]`, and the `Показать результат` button is hidden unless the flag is `true`.
- Notes: result payload/modal logic, marks, selection, resize and overlap logic were not changed; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: TagMe config adapter, `Workspace` progress bar rendering, `SelectedSegmentsPanel` segment summary rendering and existing AppContext feature data flow.
- What was added/updated in context: added `config.progressTool` support; `AppContext` exposes `isProgressToolEnabled`, and progress bar / segment summary render only when the flag is `true`.
- Notes: segmentation progress calculations, marks, selection, resize, overlap logic and submit/result shape were not changed; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: `Workspace` internal `messagesRef` scroll flow, chunk loading threshold, existing message scroll navigation and CSS layout of the scroll container.
- What was added/updated in context: added compact floating quick-scroll buttons inside `Workspace` for scrolling `messagesRef` to the dialog start/end, with visibility based on current scroll position.
- Notes: controls use existing `messagesRef`, do not change chunk rendering, selection, resize or overlap logic; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: `SelectedSegmentsPanel` header layout, current marks count source, `Workspace` progressBlock and existing `segmentationProgress`.
- What was added/updated in context: added a right-panel segment count summary based on total `marks.length` and a central `Workspace` progress bar based on `markedMessages / availableMessages * 100`.
- Notes: changes are UI/CSS only; existing progress cards, filtering/sorting, selection, resize, overlap logic and result/onSubmit shape were not changed; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: current `allowedRolesForSegmentation` flow in `AppContext`, existing use of `CsvRow.usertype`, resize restrictions, progress tracking and TagMe config adapter boundaries.
- What was added/updated in context: added TagMe role rules support for `config.rolesForMarking` and `config.rolesForNotMarking`, with allow-list priority over deny-list and fallback to all CSV roles.
- Notes: role rules are read only through `tagmeApi.ts`; progress tracking, segment creation and resize restrictions use the resolved allowed roles; UI, Mark model, selection and overlap logic were not changed; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: TagMe adapter data-source priority, `tmAPI.task.config`, `tmAPI.task.dialog`, current async loading in `AppContext`, and fallback behavior for local mocks.
- What was added/updated in context: `getTagMeEntities()` and `getTagMeCsv()` now load asynchronously through the adapter, support `config.linkToEntities`, `config.entities`, `payload.entities`, `task.dialog`, and fallback to mock entities/CSV with source debug logs.
- Notes: fetch/error handling stays inside `src/integrations/tagme/tagmeApi.ts`; `AppContext` only awaits ready CSV/entities; UI, marks model, selection, resize and overlap logic were not changed; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: `src/integrations/tagme/tagmeApi.ts` mock/real adapter flow and where CSV/entities/premarkup are read.
- What was added/updated in context: added centralized mock-only debug logging in `tagmeApi.ts` for mock tmAPI initialization, entities, CSV and premarkup, with one-time logging per label.
- Notes: no logging was added to `AppContext` or UI components; real TagMe mode does not log; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: существующий TagMe adapter, требования к local TagMe simulator, загрузка CSV/entities в `AppContext` и контракт `tmAPI.onValidate` / `tmAPI.onSubmit`.
- What was added/updated in context: добавлен `tagmeMock.ts`, `tagmeApi.ts` переведен на единый adapter с real API или singleton mock API, а `AppContext` теперь получает CSV, entities и premarkup только через TagMe adapter.
- Notes: local mode теперь тоже работает через mock `tmAPI`; submit result использует `source: "real-tagme" | "mock-tagme"` и записывается в `api.result`; UI, selection, resize и overlap algorithms не менялись.

- Date: 2026-04-28
- What was analyzed: `AppContext` data loading/result flow, current `Workspace` result preview shape, project rules for isolated integrations, and TypeScript build errors around Vite declarations.
- What was added/updated in context: added `src/integrations/tagme` with typed TagMe API helpers, integrated entities/premarkup fallback plus ref-based `onValidate`/`onSubmit` registration in `AppContext`, and documented TagMe/local modes in project context.
- Notes: UI components do not access `window.parent.tmAPI`; local mock CSV loading remains intact; `npm run build` passes with the existing Vite chunk-size warning.

- Date: 2026-04-28
- What was analyzed: структура `PROJECT_CONTEXT.md`, разделы актуального состояния, правила работы Codex и существующий `Update log`.
- What was added/updated in context: контекст разделен на `PROJECT_CONTEXT.md` для актуального состояния, `CODEX_RULES.md` для правил работы Codex и `CHANGELOG_PROJECT.md` для истории изменений; в начало `PROJECT_CONTEXT.md` добавлен блок `How to use this context`.
- Notes: исходный `Update log` перенесен без сокращений; сведения о run commands, routes/screens и data sources сохранены внутри актуального контекста как подпункты разрешенных разделов.

- Date: 2026-04-22
- What was analyzed: `SelectedSegmentsPanel` click behavior для `.markButton` и `.jumpButton`, а также существующий portal-tooltip flow.
- What was added/updated in context: прокрутка к segment теперь запускается только кнопкой `↗`; клик по карточке segment только активирует/раскрывает ее через `setActiveMarkIndex`. Для `↗` добавлен tooltip через `data-tooltip` и `getTooltipProps`.
- Notes: `requestMarkNavigation` больше не вызывается из `.markButton`; navigation request flow в `Workspace` не менялся.

- Date: 2026-04-22
- What was analyzed: визуальное расположение `.progressLabel` и `.progressValue` в компактных progress cards.
- What was added/updated in context: `.progressLabel` и `.progressValue` сделаны `display: block`, чтобы значение всегда отображалось отдельной строкой под label.
- Notes: изменение только CSS-level в `Workspace.module.css`, без изменения счетчиков или навигации.

- Date: 2026-04-22
- What was analyzed: визуальный размер progress summary в `Workspace` после добавления четвертой карточки и навигации по неразмеченным репликам.
- What was added/updated in context: progress cards сделаны компактнее через CSS: уменьшены gap, padding, border-radius, размер label/value и размер кнопок `↑`/`↓`.
- Notes: изменение только визуальное в `Workspace.module.css`; счетчики и navigation logic не менялись.

- Date: 2026-04-22
- What was analyzed: `Workspace` double-click handler, который создавал `draftSelection` на всю реплику через `handleMessageDoubleClick`.
- What was added/updated in context: double-click shortcut для выбора всей реплики удален; сегментирование теперь начинается только через обычное выделение текста мышью.
- Notes: обычная selection-логика через `mouseup`, resize, edit mode и navigation flow не менялись.

- Date: 2026-04-22
- What was analyzed: программная прокрутка `messagesRef` к segment/unmarked message и необходимость визуально подтвердить целевую реплику после scroll.
- What was added/updated in context: `Workspace` теперь хранит временный `highlightedMessageId` и добавляет CSS-анимацию `.messageRowScrollHighlight` к целевой реплике после scroll request.
- Notes: подсветка живет примерно 1.4 секунды и сбрасывается таймером; selection/resize/edit logic не менялись.

- Date: 2026-04-22
- What was analyzed: текущий progress summary в `Workspace`, связь `marks.selectedSegment` с сообщениями и существующий внутренний scroll request для списка реплик.
- What was added/updated in context: добавлен счетчик `Не размечено` для доступных сообщений без mark и стрелки `↑`/`↓`, которые прокручивают `messagesRef` к предыдущей/следующей неразмеченной реплике относительно текущего центра списка.
- Notes: навигация по неразмеченным репликам использует локальный `requestMessageScroll`; role-based logic и модель marks не менялись.

- Date: 2026-04-22
- What was analyzed: размер блока `Draft selection` в `SelectedSegmentsPanel` и влияние длинного выделенного текста на удобство просмотра выбранных segments.
- What was added/updated in context: `Draft selection` теперь отображается компактно по умолчанию: текст имеет ограниченную высоту и внутренний scroll, а кнопка `Развернуть` / `Свернуть` переключает расширенный просмотр.
- Notes: изменение только UI-level в правой панели, без изменения draft selection state, создания segment или selection logic.

- Date: 2026-04-22
- What was analyzed: автопрокрутка при обычном клике по segment внутри `Workspace` после добавления navigation request flow.
- What was added/updated in context: `Workspace` больше не использует `activeMarkIndex` как fallback-триггер прокрутки; scroll запускается только при новом `markNavigationRequest`, который приходит из правой панели.
- Notes: клики по segment в центральном блоке теперь только активируют segment, а явная навигация из правой панели сохраняет прокрутку к нужной реплике.

- Date: 2026-04-22
- What was analyzed: почему после `requestMarkNavigation` центральный блок не прокручивался, хотя кнопка `↗` меняла navigation request.
- What was added/updated in context: scroll-effect в `Workspace` теперь подписан на `markNavigationRequest` / `activeMarkIndex` и прокручивает именно внутренний контейнер `messagesRef` через расчет `scrollTop`, а не полагается только на `scrollIntoView` и изменения `visibleCount`.
- Notes: причина была в том, что pending target записывался в ref, но эффект прокрутки не запускался, если нужное сообщение уже было в отрендеренном chunk и `visibleCount` не менялся.

- Date: 2026-04-22
- What was analyzed: отсутствие прокрутки по кнопке `↗` при клике на уже активный segment, текущая зависимость `Workspace` scroll effect только от изменения `activeMarkIndex`.
- What was added/updated in context: добавлен отдельный navigation request flow: `requestMarkNavigation(markIndex)` в `AppContext` обновляет `activeMarkIndex` и инкрементирует `markNavigationRequest`, а `Workspace` реагирует на новый `requestId` как на one-shot request и прокручивает список реплик даже при повторном клике по тому же segment.
- Notes: кнопка `↗` и клик по карточке в правой панели теперь используют `requestMarkNavigation`; chunk loading и существующий `scrollIntoView` flow сохранены.

- Date: 2026-04-22
- What was analyzed: `SelectedSegmentsPanel` actions per mark, существующая navigation через `setActiveMarkIndex` и `Workspace` scroll-to-segment effect.
- What was added/updated in context: у каждого выбранного segment в правой панели добавлена отдельная кнопка `↗`, которая активирует исходный `markIndex` и запускает существующую прокрутку `Workspace` к связанному segment.
- Notes: навигация использует уже существующий `activeMarkIndex` flow; карточка по-прежнему кликабельна, но теперь есть явный action button для scroll-to-segment.

- Date: 2026-04-22
- What was analyzed: текущий inline edit mode в `Workspace`, исчезновение segment highlights при редактировании, лишний `messageRowEditing` layout shift и сохранение текста через `editableRows`.
- What was added/updated in context: edit mode теперь использует тот же segmented text rendering с подсветкой overlap/marks, но отключает интерактивные handles/context actions; текстовые изменения собираются в `editableRowsRef` до нажатия `Сохранить`, а отдельный editing min-height больше не применяется.
- Notes: это делает переход в edit mode визуально ближе к обычному просмотру и уменьшает scroll/layout jump; после сохранения `saveEditedRows` по-прежнему пересобирает marks по текущей логике.

- Date: 2026-04-22
- What was analyzed: переключение `isEditingText` в `Workspace`, `displayedRows`, scroll container `messagesRef` и сценарий входа в edit mode из середины длинного списка.
- What was added/updated in context: `Workspace` сохраняет `messagesRef.scrollTop` перед переключением edit mode и восстанавливает его после перерендера, чтобы список реплик не прыгал к началу.
- Notes: изменение локальное для edit mode scroll preservation; right-panel navigation через `pendingScrollMessageIdRef` не менялась.

- Date: 2026-04-22
- What was analyzed: `Workspace` edit mode, `editableRows`, `saveEditedRows`, старый `textarea`-рендер и CSS `messageEditor`.
- What was added/updated in context: edit mode переведен на inline `contentEditable` в визуальном формате обычного сообщения; `textarea` больше не показывается, а сохранение продолжает использовать текущий flow `editableRows -> saveEditedRows`.
- Notes: contentEditable синхронизируется через `useLayoutEffect`, чтобы не перетирать курсор во время ввода; double click selection больше не используется.

- Date: 2026-04-22
- What was analyzed: `Workspace` toolbar, текущие `marks`, `entities`, `csvRows` и существующий portal-подход для overlay UI.
- What was added/updated in context: добавлена кнопка `Показать результат` в верхний toolbar; она открывает modal с JSON snapshot результата текущей разметки (`totalMessages`, `totalSegments`, `segments` с entity, offsets, text, message ranges, fields и visibility flags).
- Notes: это UI-preview результата, без изменения shape `marks`, без backend/API export и без влияния на selection/resize/edit/navigation flow.

- Date: 2026-04-16
- What was analyzed: line wrapping instability when segment boundary splits a word into multiple inline spans during overlap/end-resize.
- What was added/updated in context: `Workspace` now groups adjacent non-space rendered text parts into word chunks, so a word remains one no-break inline unit even when several segment slices/overlays cover different characters inside it; boundary handles are limited to the first/last non-space split of the original segment part to avoid duplicate borders on every word.
- Notes: natural wrapping between words is preserved; very long words may no longer break character-by-character inside the message line, which is the tradeoff for preventing single-character jumps caused by segment DOM boundaries.

- Date: 2026-04-16
- What was analyzed: CSS box model marked segment boundaries in `Workspace`, especially `markedTextStart` / `markedTextEnd` padding and visible resize boundary width.
- What was added/updated in context: removed layout-affecting horizontal padding from start/end segment parts and made the visible boundary line thinner, so borders no longer push text characters during selection or resize.
- Notes: this is a presentation-layer fix in `Workspace.module.css`; resize state, selection math and overlap data model were not changed.

- Date: 2026-04-16
- What was analyzed: `getTextOffsetWithinElement` в `src/utils/selection.ts`, DOM-структура marked segment в `Workspace` и влияние `resizeHandle` / `entityLabel` на расчет offset при выделении поверх существующего segment.
- What was added/updated in context: selection offset теперь считается только по реальному тексту сообщения; segment decorations помечены `data-selection-decorator="true"` и исключаются из подсчета, чтобы новый overlap segment не захватывал лишние символы.
- Notes: исправление локальное для selection math и DOM attributes, без изменения shape `marks`, overlap rendering или createMark flow.

- Date: 2026-04-16
- What was analyzed: `AppContext` creation/resize checks, `src/utils/marks.ts`, `src/utils/messageMarks.ts`, `Workspace` rendering of marked text, active mark interaction, delete overlay and right-panel navigation assumptions.
- What was added/updated in context: overlapping / nested segments are now supported; intersection blocking was removed from create/resize flow, and message rendering now uses atomic text slices with `markIndexes[]` so text is rendered once even when multiple segments cover the same range.
- Notes: overlap UX uses primary segment selection per slice plus boundary-specific handles; in multi-cover slices active mark wins, otherwise the shortest/specific segment is primary. Remaining limitation: simultaneous display of all labels/handles in one exact overlap point is intentionally simplified to avoid visual chaos.

- Date: 2026-04-16
- What was analyzed: текущий формат `mocks/0b2a5a2a058e4df59b344416a45bc259.csv`, количество строк, header и совместимость с `Papa.parse`.
- What was added/updated in context: mock CSV расширен до `1000` data-rows; документация обновлена с актуальным размером тестового диалога.
- Notes: header сохранен, пустые строки не добавлены, `Papa.parse` проверен на `1000` строк и `0` ошибок.

- Date: 2026-04-15
- What was analyzed: текущая role-based segmentation логика в `src/context/AppContext.tsx`, использование `allowedRolesForSegmentation` в `createMarkFromDraftSelection`, `updateMarkRange` и progress tracking.
- What was added/updated in context: зафиксировано, что `allowedRolesForSegmentation` теперь вычисляется динамически из ролей, реально присутствующих в `csvRows`, поэтому в текущем состоянии проекта все загруженные реплики доступны для разметки.
- Notes: механика role-based checks в коде сохранена, но для текущих mock-данных больше не создает ограничений по ролям и не делает сообщения визуально недоступными.

- Date: 2026-04-15
- What was analyzed: `package.json`, `package-lock.json`, `index.html`, `tsconfig*.json`, `vite.config.ts`, весь `src`, корневые mock-данные в `/mocks`, существующая структура папок и ключевые CSS Modules.
- What was added/updated in context: создан первичный `PROJECT_CONTEXT.md` с описанием стека, entry points, архитектуры, state/data flow, ключевых компонентов, risk zones, safe edit zones, текущего статуса реализации и списка важных файлов.
- Notes: приложение на момент анализа является single-screen mock-driven tool без роутинга, backend и тестов; основная сложность сосредоточена в логике selection/marks и в `AppContext`.

- Date: 2026-04-15
- What was analyzed: `src/components/Workspace.tsx`, текущая реализация списка сообщений, связь с `messageOffsets`, selection logic и mark-resize логикой.
- What was added/updated in context: добавлена информация о chunk rendering / incremental rendering списка сообщений в `Workspace`, обновлены разделы overview, state, UI notes, current status и technical debt.
- Notes: virtual scrolling в полном смысле не используется; реализован упрощенный infinite scroll без удаления ранее отрендеренных сообщений.

- Date: 2026-04-15
- What was analyzed: `mocks/0b2a5a2a058e4df59b344416a45bc259.csv`, формат исходного CSV и требования к тестовым данным для длинного списка сообщений.
- What was added/updated in context: обновлена информация о размере mock CSV; зафиксировано, что основной диалог теперь содержит 100+ сообщений и используется для нагрузочного тестирования `Workspace`.
- Notes: header сохранен, пустые строки не добавлялись, новые строки добавлены как тестовый хвост без изменения структуры колонок.

- Date: 2026-04-15
- What was analyzed: `src/context/AppContext.tsx`, `src/components/Workspace.tsx`, текущий flow создания `mark` из `draftSelection` и отображение ролей сообщений.
- What was added/updated in context: добавлена информация о role-based segmentation, конфигурации `allowedRolesForSegmentation`, визуальном disabled-состоянии недоступных ролей и дополнительной проверке перед созданием segment.
- Notes: selection для недоступных ролей сохранен, но `createMarkFromDraftSelection` блокирует создание нового segment, если выделение включает хотя бы одно сообщение с неразрешенной ролью.

- Date: 2026-04-15
- What was analyzed: логика `updateMarkRange`, drag-resize превью в `Workspace` и сценарий с разрешенными/запрещенными ролями между соседними сообщениями.
- What was added/updated in context: зафиксировано, что role-based segmentation теперь ограничивает не только создание новых segment, но и расширение/сжатие существующих; запрещенные роли работают как барьеры для resize.
- Notes: segment нельзя протянуть через запрещенную реплику к следующему разрешенному сообщению; превью resize и финальное сохранение диапазона теперь согласованы с этим правилом.

- Date: 2026-04-15
- What was analyzed: `AppContext` как источник derived state, связь `marks.selectedSegment` с сообщениями и размещение summary UI в `Workspace`.
- What was added/updated in context: добавлена информация о progress tracking разметки; зафиксированы метрики `totalMessages`, `availableMessages`, `markedMessages` и то, что они учитывают role-based segmentation.
- Notes: сообщение считается размеченным, если у него есть хотя бы один `mark`; прогресс показывает агрегаты по сообщениям, а не по количеству segment.

- Date: 2026-04-15
- What was analyzed: поведение `Workspace` в edit mode, CSS для `.messageRow` / `.messageEditor` и влияние `textarea` на общий layout центрального блока.
- What was added/updated in context: зафиксирован layout fix для edit mode; отмечено, что редактирование теперь использует фиксированную высоту `textarea` и внутренний scroll, чтобы не менять размер центрального блока.
- Notes: редактирование текста сохранено, но вертикальный рост `textarea` отключен ради стабильности layout.

- Date: 2026-04-15
- What was analyzed: ширина корневого блока `Workspace` и поведение центральной колонки layout.
- What was added/updated in context: для `.workspace` добавлено `width: 100%`, чтобы центральный блок гарантированно занимал всю доступную ширину контейнера.
- Notes: изменение точечное, только на уровне layout-стиля `Workspace`.

- Date: 2026-04-15
- What was analyzed: empty state левой панели `EntitiesPanel` и поведение колонки при отсутствии найденных сущностей.
- What was added/updated in context: зафиксирован layout fix для пустого списка сущностей; панель теперь сохраняет высоту и не схлопывается при `0` результатах поиска.
- Notes: изменение сделано только через CSS `EntitiesPanel`, без вмешательства в логику поиска или создания segment.

- Date: 2026-04-15
- What was analyzed: взаимодействие `SelectedSegmentsPanel` с `Workspace`, текущий `activeMarkIndex`, chunk rendering списка сообщений и сценарий навигации к segment вне видимой области.
- What was added/updated in context: добавлена информация о segment navigation; зафиксировано, что клик по segment в правой панели прокручивает `Workspace` к первому сообщению segment и при необходимости предварительно догружает нужный chunk.
- Notes: навигация реализована без отдельной ref-map структуры; используется поиск DOM-элемента по `data-message-id` после обеспечения его рендера.

- Date: 2026-04-15
- What was analyzed: связь между `sortedMarks` в `SelectedSegmentsPanel` и глобальным массивом `marks`, влияние сортировки/фильтрации на `activeMarkIndex`.
- What was added/updated in context: зафиксировано, что для segment navigation и других действий в правой панели нужно использовать исходный индекс `mark`, а не индекс элемента в отсортированном списке.
- Notes: это критично для корректного scroll-to-segment, удаления segment, переключения видимости и раскрытия полей после сортировки/фильтрации.

- Date: 2026-04-15
- What was analyzed: реализация tooltip в `SelectedSegmentsPanel`, clipping из-за `overflow: hidden` у панели и поведение hover/focus подсказок у control buttons.
- What was added/updated in context: tooltip правой панели переведены с CSS pseudo-elements на portal-rendering через `document.body` и `position: fixed`, чтобы они всегда были поверх UI и не обрезались контейнером.
- Notes: быстрое решение через body-level rendering; tooltip скрываются при scroll/resize и не перехватывают pointer events.

- Date: 2026-04-15
- What was analyzed: popup сортировки и фильтра в `SelectedSegmentsPanel`, их текущее позиционирование относительно кнопок и риск выхода за границы viewport.
- What was added/updated in context: добавлено viewport-aware позиционирование popup через `getBoundingClientRect()`; sort/filter popup теперь могут открываться влево и/или вверх, если справа/снизу не хватает места.
- Notes: решение без сторонних библиотек; popup рендерятся на уровне `document.body` и при scroll/resize закрываются, чтобы не зависать в неверной позиции.

- Date: 2026-04-15
- What was analyzed: поведение filter popup при внутреннем scroll списка и обработчик глобального `scroll` в `SelectedSegmentsPanel`.
- What was added/updated in context: уточнено поведение popup: внутренний scroll содержимого фильтра/сортировки не должен закрывать popup, тогда как внешний scroll viewport по-прежнему закрывает его.
- Notes: это исправляет сценарий, когда длинный список фильтрации нельзя было прокрутить до конца из-за мгновенного закрытия popup.

- Date: 2026-04-15
- What was analyzed: UX control buttons в правой панели, размер hit area кнопки удаления и визуальная обратная связь на hover/focus.
- What was added/updated in context: улучшены стили control buttons в `SelectedSegmentsPanel`; кнопка удаления увеличена, а для всех основных кнопок добавлены заметные hover/focus состояния.
- Notes: изменение только в CSS Modules, без изменения логики кнопок.

- Date: 2026-04-15
- What was analyzed: рендер segment в `Workspace`, связь `mark -> entityId -> entity.name`, текущее поведение selection/resize handles и визуальная читаемость segment в тексте.
- What was added/updated in context: добавлена визуальная entity-идентификация segment в центральном блоке; у старта segment показывается компактная label с именем сущности, с ellipsis для длинных названий и `title` для полного текста.
- Notes: label hoverable и показывает native tooltip с полным названием сущности; логика segment, selection, drag-resize и edit mode не менялась.

- Date: 2026-04-15
- What was analyzed: поиск в `EntitiesPanel`, локальный `searchQuery`, текущая фильтрация/пагинация в `useEntitiesList` и UX поля поиска.
- What was added/updated in context: в поиск сущностей добавлен clear action (`×`), который очищает строку поиска, возвращает список к полному состоянию и сохраняет focus в input.
- Notes: логика фильтрации не менялась; reset списка происходит за счет уже существующего эффекта в `useEntitiesList`, который сбрасывает `visibleCount` при изменении `normalizedQuery`.

- Date: 2026-04-15
- What was analyzed: рендер `mark` в `Workspace`, текущий `removeMark` в `AppContext`, сценарии удаления segment из центрального блока и зависимость `activeMarkIndex` от индексной модели.
- What was added/updated in context: добавлена поддержка delete action через context interaction в `Workspace`; правый клик по segment показывает локальную кнопку `Удалить`, которая использует существующий `removeMark`.
- Notes: системное browser context menu подавляется только для `mark` segment; overlay сделана компактной и закрывается по outside click, scroll, `Escape`, смене active segment и входу в edit mode.

- Date: 2026-04-15
- What was analyzed: стили toolbar-кнопки `Редактировать текст` в `Workspace`.
- What was added/updated in context: обновлен визуальный стиль `editButton`; основная action-кнопка в toolbar теперь использует синий фон `#2A72F8` и белый текст.
- Notes: изменение только косметическое, без влияния на логику edit mode.

- Date: 2026-04-15
- What was analyzed: drag-resize логика начала segment в `Workspace`, связь `dragState` с window-listeners и влияние `selection` на поведение левого resize-handle.
- What was added/updated in context: зафиксирована стабилизация resize start-handle; во время drag используется ref-backed drag state, listener-ы не должны пересоздаваться на каждый микрошаг, а текстовое выделение во время resize подавляется.
- Notes: изменение локальное, без переработки domain model marks; правый resize-handle и обычный сценарий выделения текста должны остаться совместимыми с существующей логикой.

- Date: 2026-04-15
- What was analyzed: наложение `resizeHandle` / `entityLabel` поверх текста сегмента и их влияние на вычисление caret-позиции во время resize.
- What was added/updated in context: уточнено, что во время drag overlay-элементы segment временно не должны перехватывать pointer events, чтобы уменьшить jitter start-handle.
- Notes: это локальный UX/stability fix поверх существующей логики resize, без изменения модели marks или selection API.

- Date: 2026-04-15
- What was analyzed: влияние `entityLabel` на визуальную плавность resize segment во время drag.
- What was added/updated in context: label редактируемого segment теперь временно скрывается на время drag-resize и возвращается после отпускания кнопки мыши.
- Notes: изменение только в UI-рендере `Workspace`, без изменений в marks/model/state shape.

- Date: 2026-04-15
- What was analyzed: правый resize-handle в `Workspace`, hit area у конца segment и приоритет pointer interaction поверх текста.
- What was added/updated in context: повышена надежность старта drag для end-handle; область захвата увеличена, handle поднят поверх соседних текстовых слоев и помечен как более явная pointer-target зона.
- Notes: изменение локальное на уровне CSS hit area, без переработки resize state machine.

- Date: 2026-04-15
- What was analyzed: повторный захват правого бортика после первого resize и влияние геометрии inline-segment на hit area end-handle.
- What was added/updated in context: end-handle сдвинут ближе внутрь segment, а правый край marked-text получил дополнительный внутренний запас под стабильную pointer-зону.
- Notes: цель изменения — убрать сценарий, где hover у правого бортика есть, но фактический повторный `mousedown` после первого resize попадает в соседний текстовый слой вместо handle.

- Date: 2026-04-15
- What was analyzed: jitter resize при вертикальном смещении курсора ниже строки и зависимость `getGlobalOffsetFromPoint` от живой `clientY`.
- What was added/updated in context: drag-resize теперь использует `lockedClientY`, зафиксированный в момент `mousedown` по handle, чтобы вертикальное отклонение курсора не влияло на вычисление нового диапазона.
- Notes: изменение локальное в `Workspace` resize-flow; горизонтальное движение продолжает определять новый offset, а вертикальная позиция во время drag больше не должна вызывать подергивания.

- Date: 2026-04-15
- What was analyzed: resize segment в многострочном тексте и ограничение предыдущего fix, который слишком жестко фиксировал `Y` на одной линии.
- What was added/updated in context: вместо жесткого `lockedClientY` resize теперь использует нормализацию pointer `Y` в границах текущего `data-selectable-text` блока; это должно сохранять стабильность и одновременно позволять переходить на следующую строку текста.
- Notes: изменение локальное в `Workspace`; горизонтальный drag остается основным источником offset, но многострочный текст больше не должен блокировать корректировку границы segment.

- Date: 2026-04-15
- What was analyzed: визуальная логика левого/правого бортика segment в `Workspace` и соответствие бортиков реальной boundary-точке segment.
- What was added/updated in context: бортики сегмента переведены на boundary-handle rendering; левый бортик показывается только у start-handle, правый — только у end-handle на фактической границе выделенного segment.
- Notes: изменение касается визуального слоя `Workspace`; сама бизнес-логика `hasStartBorder` / `hasEndBorder` и resize-flow не перерабатывались.

- Date: 2026-04-15
- What was analyzed: многострочные segment в `Workspace` и поведение boundary-handle при переносе текста на несколько визуальных строк.
- What was added/updated in context: геометрия resize-handle скорректирована так, чтобы start-boundary рисовалась только у верхней строки segment, а end-boundary — только у нижней; промежуточные строки должны оставаться только с подсветкой текста.
- Notes: это CSS-level change без изменения структуры `messageParts`; resize handles остаются привязаны к start/end части segment.

- Date: 2026-04-15
- What was analyzed: line reflow во время resize segment и влияние `inline-block`/padding/margin у `markedTextStart` / `markedTextEnd` на перенос текста в `Workspace`.
- What was added/updated in context: текстовые части segment переведены обратно в normal inline-flow без layout-affecting padding/margin; декоративные start/end границы и handles оставлены вне потока как overlay.
- Notes: цель изменения — чтобы resize сегмента менял только границы выделения, а не визуальную раскладку строк в сообщении.

- Date: 2026-04-15
- What was analyzed: визуальное движение boundary-бортиков при resize segment и связь между видимой линией бортика и фактической boundary-точкой handle.
- What was added/updated in context: бортики start/end переведены на anchor-based positioning; видимая линия сидит на точной boundary-точке, а увеличенная зона захвата вынесена в отдельный невидимый слой.
- Notes: изменение локальное на уровне CSS `Workspace`; задача — чтобы бортик визуально двигался вместе с границей segment, не раздвигая текст и не теряя удобный hit area.

- Date: 2026-04-15
- What was analyzed: рассинхронизация между highlight и start/end бортиками при resize segment, особенно при изменении только одной стороны диапазона.
- What was added/updated in context: start/end handles переведены на независимый inline-anchor rendering внутри `Workspace`; source of truth для каждой boundary остается соответствующий `start` или `end` offset preview range.
- Notes: цель изменения — чтобы `start` handle управлял только началом segment, `end` handle только концом, а визуальные бортики не схлопывались к одному общему anchor контейнера подсветки.

- Date: 2026-04-15
- What was analyzed: перепрыгивание символов между первой и второй строкой при end-resize многострочного segment и влияние end-handle anchor на inline layout.
- What was added/updated in context: end/start boundary anchors дополнительно переведены в non-layout-affecting inline mode; handle больше не должен создавать заметную inline-box геометрию, которая влияет на переносы строк.
- Notes: это локальная CSS-коррекция `Workspace`; цель — чтобы правая граница менялась как overlay-декор, а line wrapping продолжал определяться только текстом и шириной контейнера.

- Date: 2026-04-15
- What was analyzed: потеря визуального движения start/end бортиков после слишком агрессивного упрощения inline-anchor geometry.
- What was added/updated in context: boundary-anchor переведен в `inline-block` нулевой ширины с видимым overlay; это должно сохранить non-layout-affecting поведение и вернуть бортикам движение вместе с выделением.
- Notes: изменение локальное на уровне CSS `Workspace`; цель — сохранить баланс между стабильным line wrapping и визуально корректным движением границ segment.

- Date: 2026-04-15
- What was analyzed: остаточное влияние boundary-anchor geometry на перенос символов при resize segment.
- What was added/updated in context: start/end handles и бортики переведены в fully overlay positioning относительно `markedText`, чтобы line wrapping определялся только текстом и шириной контейнера, а не DOM-геометрией boundary anchor.
- Notes: изменение локальное в CSS `Workspace`; цель — приоритетно исключить перенос символов, вызванный бортиками, даже если для этого boundary rendering становится сильнее зависимым от абсолютного позиционирования.

- Date: 2026-04-15
- What was analyzed: компромисс между движением boundary-бортиков и стабильностью line wrapping при resize segment.
- What was added/updated in context: возвращен почти рабочий boundary-anchor вариант (`inline-block` нулевой ширины) и добавлен постоянный горизонтальный gutter у `messageText`, чтобы ширина под start/end handles учитывалась заранее, а не менялась в момент drag.
- Notes: цель изменения — сохранить движение бортиков вместе с сегментом и одновременно убрать перенос символов, который возникал из-за изменяющейся доступной ширины строки.

- Date: 2026-04-15
- What was analyzed: визуальная толщина boundary-бортиков в `Workspace` и перекрытие отдельных символов у границы segment.
- What was added/updated in context: толщина видимой boundary-линии у resize handles уменьшена, чтобы бортики меньше перекрывали крайние символы текста.
- Notes: изменение только косметическое, на уровне CSS `Workspace`, без влияния на логику resize или selection.

- Date: 2026-04-15
- What was analyzed: перекрытие крайних символов boundary-линией и необходимость сместить текст на толщину бортика без динамического изменения ширины строки при resize.
- What was added/updated in context: start/end части segment снова получают небольшой внутренний inset под boundary-line, а ранее добавленный постоянный gutter у `messageText` считается частью этого решения и должен компенсировать влияние inset на line wrapping.
- Notes: это компромиссный CSS-fix; цель — отодвинуть символы от бортика и одновременно избежать переноса символов между строками из-за изменения границы segment.

- Date: 2026-04-15
- What was analyzed: видимая boundary-линия перекрывала соседние внешние символы, потому что рисовалась по центру boundary-точки.
- What was added/updated in context: start/end boundary-line смещены внутрь segment: левый бортик больше не заходит на символ слева от диапазона, правый — на символ справа.
- Notes: изменение только в CSS-позиционировании видимой линии у resize handles; hit area и resize-логика не менялись.
