# PROJECT CONTEXT

## 1. Project overview
- Название проекта: `segmentation-text` (`package.json`), браузерный UI с заголовком `Text Segmentation` (`index.html`).
- Тип проекта: одностраничное frontend-приложение на React + TypeScript + Vite.
- Назначение проекта: интерфейс для ручной разметки диалога на сегменты по справочнику сущностей.
- Краткое описание реализованного: приложение загружает mock CSV-диалог и mock JSON со списком сущностей, показывает трехколоночный layout, позволяет выделять текст, создавать сегменты (`marks`), редактировать текст сообщений, менять границы сегментов drag-resize, скрывать/показывать сегменты, сортировать и фильтровать их в правой панели, а также отмечать checkbox-поля у выбранного сегмента. Список сообщений в `Workspace` рендерится инкрементально чанками по мере прокрутки вниз. Разметка сейчас доступна для всех ролей, присутствующих в загруженном CSV; список разрешенных ролей вычисляется динамически из `csvRows`. В `Workspace` отображается progress tracking по общему числу сообщений, доступным для разметки, размеченным и неразмеченным сообщениям; рядом со счетчиком неразмеченных есть стрелки перехода к предыдущей/следующей неразмеченной реплике. Поддерживаются overlapping / nested segments без дублирования текста: один текстовый диапазон может быть покрыт несколькими `marks`. Сегменты в центральном блоке имеют компактную entity-label, чтобы было визуально понятно, к какой сущности относится segment. В верхнем toolbar есть кнопка просмотра итогового JSON-результата текущей разметки.

## 2. Stack
- Framework / library: React 18.
- Language: TypeScript 5, `strict: true`.
- Bundler / build tool: Vite 5.
- Routing: явного роутера нет, `react-router` не используется.
- State management: React Context + `useState` / `useMemo` / `useEffect` в одном провайдере.
- Styling: глобальный CSS + CSS Modules.
- UI libraries: отсутствуют.
- Forms: нативные `input`, `checkbox`, `radio`; редактирование текста сообщений сделано через inline `contentEditable`, без `textarea`.
- Tables: отдельной табличной библиотеки нет; данные рендерятся списками/карточками.
- Data fetching: локальная загрузка mock-данных, CSV парсится через `papaparse`.
- Validation: отдельной библиотеки нет; локальные проверки корректности диапазонов в `src/utils/marks.ts`; пересечения сегментов сейчас разрешены.
- Date utilities: отсутствуют.
- Testing: не настроено, тестовых зависимостей и scripts нет.
- Lint / format: не настроены, eslint/prettier конфиги отсутствуют.

## 3. Run commands
- install: `npm install`
- dev: `npm run dev`
- build: `npm run build`
- preview/start: `npm run preview`
- test: не настроен
- lint: не настроен
- typecheck: отдельного script нет; typecheck выполняется внутри `npm run build` через `tsc -b`
- прочие полезные scripts: отсутствуют

## 4. Folder structure
- `/mocks` — реальные mock-данные приложения: `entities.json` и CSV-диалог.
- `/public` — статические ассеты Vite; на момент анализа папка пустая.
- `/src/app` — верхнеуровневый `App.tsx` и глобальные стили.
- `/src/components` — основной UI: layout, панели, workspace, resize control.
- `/src/context` — `AppContext` с глобальным состоянием приложения и основными action-функциями.
- `/src/hooks` — небольшие кастомные hooks (`useAppState`, `useEntitiesList`).
- `/src/mocks` — только `README.md`, фактические mock-данные лежат в корневой `/mocks`.
- `/src/types` — центральные доменные типы приложения.
- `/src/utils` — утилиты для selection, marks, colors, offsets, UI-констант.

## 5. Entry points and config
- Главная точка входа: `src/main.tsx`
- Корневой компонент: `src/app/App.tsx`
- Главный layout приложения: `src/components/MainLayout.tsx`
- HTML shell: `index.html`
- Основные конфигурации:
- `package.json` — scripts и зависимости
- `tsconfig.json` — project references
- `tsconfig.app.json` — TypeScript-настройки приложения
- `vite.config.ts` — подключен только React plugin
- `src/context/AppContext.tsx` — также содержит runtime-конфигурацию `allowedRolesForSegmentation`, которая сейчас вычисляется динамически из загруженных `csvRows`
- Файлы, критичные для запуска:
- `index.html`
- `src/main.tsx`
- `src/app/App.tsx`
- `src/context/AppContext.tsx`
- `mocks/entities.json`
- `mocks/0b2a5a2a058e4df59b344416a45bc259.csv`

## 6. Routes and screens
- route: `/`
- screen: основной экран разметки диалога
- file: `src/components/MainLayout.tsx`
- крупные компоненты: `EntitiesPanel`, `Workspace`, `SelectedSegmentsPanel`
- статус: реализовано

- route: дополнительные маршруты
- screen: не обнаружены
- file: отсутствует роутинг
- крупные компоненты: отсутствуют
- статус: реализовано как single-screen app без маршрутизации

## 7. Main architecture
- Приложение организовано как single-screen SPA без роутинга.
- Верхний слой: `App` оборачивает UI в `AppProvider`.
- Layout-слой: `MainLayout` собирает три колонки и управляет шириной боковых панелей через локальный `resizeSide` и глобальные width-state.
- Бизнес-логика и state сосредоточены в `src/context/AppContext.tsx`. Там находятся загрузка данных, хранение `csvRows`, `entities`, `marks`, выбранного сегмента, ошибок, draft selection, а также все мутации.
- Правила разметки по ролям централизованы в `AppContext` через `allowedRolesForSegmentation`; на текущий момент массив собирается из всех ролей, реально присутствующих в `csvRows`, поэтому все загруженные реплики доступны для разметки.
- Data layer тоже находится в `AppContext`: CSV парсится один раз при mount, JSON подключается как модуль.
- Поток данных:
- mock CSV/JSON -> `AppContext`
- `csvRows` -> `fullPlainText` и `messageOffsets`
- `Workspace` формирует `draftSelection` через DOM selection
- `EntitiesPanel` создает `mark` из `draftSelection`
- `marks` отображаются в `Workspace` и `SelectedSegmentsPanel`
- изменения текста в `Workspace` -> `saveEditedRows` -> `rebuildMarksAfterTextEdit`
- Overlap rendering: `src/utils/messageMarks.ts` строит атомарные text slices по всем boundary-точкам видимых `marks`; каждый slice хранит `markIndexes[]`, поэтому текст рендерится один раз даже при вложенных/пересекающихся segment.
- Архитектурные паттерны: centralized context store, utility-first domain helpers, presentational panels с доступом к общему context.
- Спорные места:
- `AppContext` сочетает data loading, domain logic, UI-state и side effects в одном крупном файле.
- Часть состояния тесно связана индексами массива `marks`, что повышает риск ошибок при удалении/сортировке.
- `getEmptyDraftSelection()` возвращает одну и ту же константу-объект, что обычно безопасно здесь, но делает API менее очевидным.

## 8. Main entities and types
- `CsvRow` — строка диалога из CSV, `src/types/app.ts`
- `EntityField` — поле сущности, поддерживаются `checkbox | text | select`, `src/types/app.ts`
- `Entity` — классификатор для создания сегмента, `src/types/app.ts`
- `MarkFieldValue` — значение поля сегмента, сейчас хранится как `string[]` для всех типов, `src/types/app.ts`
- `Mark` — центральная сущность сегмента с диапазоном, текстом, полями, видимостью и диапазонами по сообщениям, `src/types/app.ts`
- `DraftSelection` — временное выделение пользователя до создания сегмента, `src/types/app.ts`
- `MessageOffset` — глобальные текстовые оффсеты по сообщениям, `src/types/app.ts`
- Слабые места типизации:
- `MarkFieldValue.value` всегда `string[]`, хотя типы полей допускают `text` и `select`.
- `CsvRow.text` типизирован как `string`, но код часто пишет `row.text ?? ''`, что намекает на неуверенность в данных.
- Отдельного типа для store actions нет; большой inline-тип `AppContextValue` сложен в сопровождении.

## 9. Key components
- `src/context/AppContext.tsx` — единый store и бизнес-операции разметки; важность: high; риск изменения: high
- `src/components/Workspace.tsx` — центральный экран диалога, выделение, редактирование текста, resize сегментов; важность: high; риск изменения: high
- `src/components/SelectedSegmentsPanel.tsx` — управление созданными сегментами, сортировка/фильтрация/поля/видимость; важность: high; риск изменения: high
- `src/components/MainLayout.tsx` — каркас приложения и ресайз колонок; важность: high; риск изменения: medium
- `src/components/EntitiesPanel.tsx` — список сущностей, поиск и infinite scroll-подобная пагинация; важность: medium; риск изменения: medium
- `src/utils/selection.ts` — вычисление выделения и глобальных оффсетов через DOM API; важность: high; риск изменения: high
- `src/utils/marks.ts` — создание, базовая валидация диапазонов и пересборка сегментов после редактирования текста; важность: high; риск изменения: high
- `src/utils/messageMarks.ts` — атомарное разбиение текста сообщения на slices с `markIndexes[]`, поддержка overlap/nested rendering и цветовая схема; важность: high; риск изменения: high
- `src/hooks/useEntitiesList.ts` — фильтрация и chunked rendering списка сущностей; важность: medium; риск изменения: low
- `src/components/Resizer.tsx` — кнопка-зона для изменения ширины боковых панелей; важность: low; риск изменения: low

## 10. State and data flow
- Глобальный state в `AppContext`:
- `allowedRolesForSegmentation`
- `segmentationProgress`
- `csvRows`, `entities`, `loading`, `error`
- `globalHidden`
- `leftPanelWidth`, `rightPanelWidth`
- `marks`, `activeMarkIndex`
- `draftSelection`
- Derived state:
- `fullPlainText` — склейка `csvRows` через `\n`
- `messageOffsets` — абсолютные диапазоны каждого сообщения в `fullPlainText`
- Локальный state:
- `MainLayout`: `resizeSide`
- `EntitiesPanel`: `searchQuery`
- `Workspace`: `dragState`, `isEditingText`, `editableRows`
- `Workspace`: `visibleCount` для incremental rendering списка сообщений
- `SelectedSegmentsPanel`: `expandedMarkIndex`, `sortMode`, `isSortMenuOpen`, `isFilterOpen`, `filteredEntityIds`
- Обновление данных:
- начальная загрузка в `useEffect` провайдера
- создание сегмента через `createMarkFromDraftSelection`
- удаление/скрытие/редактирование сегментов через actions context
- редактирование текста через локальный `editableRows` с последующим `saveEditedRows`
- создание сегмента дополнительно проверяет, что все сообщения в `draftSelection` имеют разрешенную роль; при текущей конфигурации это условие выполняется для всех ролей из загруженного CSV
- Где возможны рассинхронизации:
- `Workspace` в режиме редактирования использует локальный `editableRows`, но `messageOffsets` до сохранения остаются от старых `csvRows`.
- `activeMarkIndex` и `expandedMarkIndex` завязаны на индекс массива `marks`; при удалении/сортировке возможны неочевидные состояния.
- `removeMark` сбрасывает активный элемент только при точном совпадении индекса, но не переиндексирует ссылки на элементы после удаления.

## 11. Data sources
- Backend: отсутствует.
- Mocks:
- `mocks/entities.json` — справочник сущностей, на момент анализа `1687` записей.
- `mocks/0b2a5a2a058e4df59b344416a45bc259.csv` — расширенный mock-диалог, на текущий момент `1000` data-rows.
- Local data: JSON импортируется напрямую, CSV импортируется как raw string через `?raw`.
- Преобразование данных:
- CSV -> `Papa.parse<CsvRow>({ header: true, skipEmptyLines: true })`
- `csvRows` -> `fullPlainText`
- `csvRows` -> `messageOffsets`
- `draftSelection`/`marks` -> UI-подсветка через `buildMessageTextParts`
- В UI попадают:
- сообщения диалога
- список сущностей
- созданные сегменты с чекбокс-полями и локальными диапазонами по сообщениям

## 12. UI/UX implementation notes
- Layout: три колонки, боковые панели ресайзятся мышью; на ширине до `1080px` layout становится вертикальным.
- Sidebar / panels:
- левая панель — список сущностей и поиск
- центр — диалог и редактирование текста
- правая панель — выбранные сегменты, сортировка, фильтр, видимость
- Forms: поиск по сущностям с clear action, чекбоксы фильтра, radio сортировки, чекбоксы полей сегмента; текст сообщений редактируется inline через `contentEditable` в том же визуальном формате, без отображения `textarea`.
- Tables / lists: списки карточек, без табличного грида.
- Messages list rendering: упрощенный infinite scroll без удаления уже отрендеренных элементов; `Workspace` сначала показывает первые 25 сообщений и при достижении около 80% высоты контейнера догружает следующий chunk.
- Overlapping / nested segments: пересекающиеся и вложенные segment разрешены; `Workspace` отображает один текстовый поток, а overlap-зоны подсвечиваются дополнительным striped/layered стилем. В overlap slice primary segment выбирается как active mark, если он покрывает slice, иначе как самый короткий/специфичный segment; click/context menu работают по primary segment, а boundary handles — по конкретному start/end mark на границе.
- Selection over marked text: декоративные элементы segment (`resizeHandle`, `entityLabel`) помечены как selection decorators и не участвуют в расчете текстового offset в `selection.ts`; это нужно, чтобы выделение поверх существующего segment не расширялось за счет label/handle DOM.
- Role-based segmentation: механизм ограничений по ролям сохранен, но текущая конфигурация `allowedRolesForSegmentation` автоматически включает все роли из загруженного CSV, поэтому в стандартном mock-сценарии все сообщения доступны для разметки.
- Role-based segmentation для resize: логика ограничения границ существующего segment по разрешенным ролям сохранена, но при текущей конфигурации не создает дополнительных барьеров между существующими сообщениями.
- Progress tracking: в `AppContext` вычисляется агрегированная статистика по сообщениям (`totalMessages`, `availableMessages`, `markedMessages`), а в `Workspace` она показывается отдельным summary-блоком. `Workspace` дополнительно считает неразмеченные доступные реплики и показывает счетчик `Не размечено` с кнопками перехода к предыдущей/следующей неразмеченной реплике; после программной прокрутки целевая реплика кратко подсвечивается.
- Result preview: в toolbar `Workspace` есть кнопка `Показать результат`, которая открывает modal через portal и показывает JSON с `totalMessages`, `totalSegments` и массивом `segments` (`entityId`, `entityName`, `position`, `text`, `selectedSegment`, `messageRanges`, `fields`, visibility flags).
- Entity identification in Workspace: у старта сегмента показывается компактная label с `entity.name`; длинные названия обрезаются через ellipsis, а при наведении на label полный текст показывается через native tooltip (`title`).
- Edit mode layout behavior: при переходе в режим редактирования центральный блок не должен показывать `textarea` и не должен убирать визуальную подсветку segment; сообщение редактируется inline через `contentEditable` поверх того же segmented rendering, но без интерактивных resize/delete handles, сохранение по-прежнему идет через `saveEditedRows`, а scroll позиция списка сообщений сохраняется при входе/выходе из edit mode.
- Resize start-handle stabilized: drag-resize начала segment в `Workspace` теперь использует более стабильный drag flow через ref-состояние и временно отключает text selection во время resize, чтобы уменьшить jitter и скачки левого бортика.
- Resize overlay behavior: во время drag у `resizeHandle` и `entityLabel` временно отключаются pointer events, а label редактируемого segment скрывается до `mouse up`, чтобы вычисление caret/offset происходило по тексту под сегментом, а не по overlay-элементам.
- End-handle drag reliability: hit area у правого resize-handle увеличена, сам handle поднят по `z-index` и смещен глубже внутрь правого края segment, чтобы drag конца segment надежнее стартовал даже после предыдущего resize, у коротких сегментов и рядом с концом сообщения.
- Resize vertical stability: во время drag-resize `Workspace` нормализует `Y`-координату курсора относительно текущего selectable-text блока, чтобы вертикальный уход курсора ниже текста не вызывал скачки caret-position и jitter сегмента, но переход между строками внутри многострочного текста оставался возможным.
- Segment border rendering: визуальные левый/правый бортики сегмента теперь привязаны к boundary resize-handle и показываются только на стартовой и конечной визуальной строке segment, а не как сплошная рамка у всего многострочного marked text фрагмента.
- Segment resize without line reflow: `markedText` в `Workspace` больше не должен менять переносы строк при resize сегмента; layout-affecting `inline-block`/padding/margin убраны из текстовых частей, а декоративные границы и handles оставлены как overlay-элементы.
- Boundary anchor rendering: start/end бортики в `Workspace` теперь якорятся к нулевой boundary-точке segment, а расширенная hit area вынесена в отдельный невидимый overlay, чтобы бортики визуально двигались вместе с реальной границей без влияния на flow текста.
- Independent start/end boundary rendering: `Workspace` теперь рендерит start и end handle как отдельные inline boundary anchors внутри сегмента, а не как декор общего highlight-wrapper; это нужно, чтобы левый и правый бортики оставались независимо привязаны к своим реальным range boundary.
- Multiline end-resize without cross-line reflow: end-handle в `Workspace` теперь оформлен как максимально non-layout-affecting inline anchor (`display: inline`, `font-size: 0`, `line-height: 0`), чтобы правый boundary-marker не провоцировал перенос символов между строками при изменении конца многострочного segment.
- Boundary movement restoration: boundary-anchor в `Workspace` оставлен нулевой ширины, но возвращен в `inline-block`, чтобы start/end бортики визуально двигались вместе с соответствующей границей segment, не теряя привязку к inline flow текста.
- Full overlay handles: start/end resize handles в `Workspace` снова переведены в absolute overlay-режим относительно `markedText`, чтобы геометрия бортиков и hit area вообще не участвовала в переносе символов.
- Stable text gutter for resize: у `messageText` добавлен постоянный горизонтальный запас под boundary handles, а `resizeHandle` возвращен к нулевой-width `inline-block` anchor; это нужно, чтобы бортики снова двигались вместе с границей segment, но доступная ширина строки не менялась на лету во время resize.
- Boundary-safe text inset: start/end части segment в `Workspace` снова имеют небольшой внутренний сдвиг текста на толщину boundary-линии, а общий gutter у `messageText` резервирует место под это смещение заранее, чтобы крайние символы не перекрывались бортиком и не должны были переезжать на другую строку из-за resize.
- Smooth boundary overlay: start/end части segment больше не получают горизонтальный padding под бортик; видимая boundary-линия остается zero-width overlay-handle и не должна раздвигать символы или менять переносы строк во время selection/resize.
- Stable word wrapping: `Workspace` группирует непробельные последовательности text parts в `.wordChunk` (`inline-block`, `white-space: nowrap`), чтобы segment boundaries внутри слова не создавали новые browser line-break points и отдельные символы не перескакивали между строками при resize; start/end бортики при этом рендерятся только на первом/последнем непробельном куске исходного segment part, а не на каждом слове.
- Empty-state layout behavior: левая панель со списком сущностей сохраняет стабильный размер даже если поиск вернул `0` результатов; empty state не должен схлопывать колонку до минимальной высоты.
- Segment navigation: клик по segment-card в правой панели только активирует/раскрывает segment без прокрутки; явная прокрутка к segment выполняется только отдельной кнопкой `↗` у каждого segment. Навигация идет через `requestMarkNavigation(markIndex)` / `markNavigationRequest`, поэтому повторный клик по `↗` у уже активного segment тоже запускает scroll. Обычный клик по segment внутри `Workspace` только меняет `activeMarkIndex` и не запускает автопрокрутку. Если сообщение еще не отрендерено из-за chunk rendering, `Workspace` сначала увеличивает `visibleCount`, затем прокручивает внутренний `messagesRef` контейнер через `scrollTo`.
- Context delete in Workspace: по правому клику на segment в центральном блоке показывается локальная delete overlay-кнопка; она удаляет segment через существующий `removeMark` и закрывается при outside click, scroll, `Escape`, смене active segment или входе в edit mode.
- Tooltip rendering: tooltip в `SelectedSegmentsPanel` рендерятся на уровне `document.body` через portal и `position: fixed`, поэтому не должны обрезаться контейнерами с `overflow: hidden`.
- Dropdown/popup positioning: popup сортировки и фильтра в `SelectedSegmentsPanel` позиционируются через `getBoundingClientRect()` и viewport-check; если не хватает места справа, popup смещается влево, если снизу не хватает высоты, popup открывается вверх.
- Right panel button UX: control buttons в `SelectedSegmentsPanel` имеют явный `cursor: pointer`, hover/focus state, а кнопка удаления (`×`) увеличена для более удобного попадания.
- Draft selection summary: блок `Draft selection` в правой панели по умолчанию компактный, с ограниченной высотой текста и внутренним scroll; при необходимости его можно развернуть/свернуть отдельной кнопкой.
- Filters / sorting / search:
- поиск по `entity.id` и `entity.name`
- в поиске сущностей есть clear action (`×`), который очищает строку и возвращает список к полному состоянию
- сортировка сегментов: `newest | oldest | class`
- фильтр сегментов по `entityId`
- Responsive behavior: базовый, через CSS media queries; на мобильной ширине колонки складываются вертикально.
- Theme support: отсутствует.
- Resize zones: есть, реализованы отдельным компонентом `Resizer` + глобальные mouse listeners.
- Drag and drop: в классическом виде нет, но есть drag-resize границ сегмента по краям выделения.
- Hotkeys: не обнаружены.
- Accessibility notes:
- у многих кнопок есть `aria-label`
- часть кликабельного UI в правой панели сделана через `div` с `role="button"` и `tabIndex={0}`
- полноценные a11y-паттерны для клавиатурного управления сегментами реализованы частично

## 13. Risk zones
- `src/context/AppContext.tsx` — высокая связанность, много state и mutating logic в одном месте.
- `src/components/Workspace.tsx` — сложная интерактивность: DOM selection, drag-resize, edit mode, подсветка.
- `src/components/SelectedSegmentsPanel.tsx` — крупный компонент с несколькими независимыми UI-состояниями и действиями над сегментами.
- `src/utils/selection.ts` — зависит от браузерных DOM API (`Selection`, `Range`, `caretPositionFromPoint`, `caretRangeFromPoint`), легко получить регрессию.
- `src/utils/marks.ts` — критичная логика создания, пересборки диапазонов после редактирования текста и инвариантов `start < finish`.
- `src/utils/messageMarks.ts` — критичная логика overlap rendering; ошибка здесь может привести к дублированию текста, неверным boundary handles или неправильному active segment в `Workspace`.
- `mocks/entities.json` — большой файл, изменение структуры сломает создание/отображение сегментов.
- Зоны потенциальных регрессий:
- пересчет глобальных и локальных диапазонов после редактирования текста
- корректность `activeMarkIndex` после удаления сегментов
- скрытие сегментов при сочетании `globalHidden`, `hidden`, `forceVisible`

## 14. Safe edit zones
- Безопаснее менять стили:
- `src/components/*.module.css`
- `src/app/styles/global.css`
- Безопаснее менять UI:
- `src/components/Resizer.tsx`
- части `EntitiesPanel.tsx`, не затрагивающие создание `mark`
- где менять роуты:
- сейчас роутов нет; если появятся, точка интеграции будет начинаться с `src/main.tsx` / `src/app/App.tsx`
- где менять типы:
- `src/types/app.ts`
- где менять mock-данные:
- `/mocks/entities.json`
- `/mocks/0b2a5a2a058e4df59b344416a45bc259.csv`
- где добавлять новые компоненты:
- `/src/components`
- где расширять бизнес-логику:
- предпочтительно через `src/utils/*` и `src/context/AppContext.tsx`, минимизируя расползание логики по UI-компонентам

## 15. Current implementation status
- Реализованные экраны:
- один основной экран разметки диалога
- Реализованные механики:
- загрузка mock CSV и mock entities
- отображение списка сообщений с типом отправителя
- инкрементальный chunk rendering списка сообщений при скролле вниз
- role-based segmentation: в текущем состоянии проекта сегменты можно создавать по всем сообщениям из загруженного CSV, потому что все их роли автоматически считаются разрешенными
- resize segment по-прежнему использует те же role-based проверки, но при текущей конфигурации они не ограничивают растяжение между существующими сообщениями
- progress tracking разметки по сообщениям с учетом role-filter, включая счетчик неразмеченных доступных реплик и навигацию по ним
- edit mode с фиксированным layout центрального блока
- навигация к segment из правой панели с учетом chunk loading, включая отдельную кнопку `↗` у каждого выбранного segment
- tooltip в правой панели поверх UI без clipping контейнером
- viewport-aware popup positioning для sort/filter controls правой панели
- улучшенный UX control buttons правой панели
- компактный `Draft selection` summary с возможностью развернуть/свернуть длинный текст выделения
- визуальная entity-идентификация segment в центральном блоке
- clear action в поиске сущностей левой панели
- delete action через context interaction в Workspace
- поддержка overlapping / nested segments без дублирования текста
- просмотр итогового JSON-результата разметки через кнопку в верхнем toolbar
- выбор текста мышью внутри сообщений
- создание сегмента кликом по сущности
- визуальная подсветка сегментов в тексте
- изменение границ сегмента drag-resize
- редактирование текста сообщений с сохранением
- пересборка сегментов после редактирования текста
- удаление сегмента
- скрытие одного сегмента и глобальное скрытие всех сегментов
- сортировка сегментов
- фильтрация сегментов по сущности
- редактирование checkbox-полей у сегмента
- работающие пользовательские сценарии:
- оператор открывает диалог и список сущностей
- выделяет фрагмент текста
- создает сегмент по выбранной сущности
- управляет созданными сегментами в правой панели
- корректирует текст диалога и сохраняет обновленные диапазоны сегментов
- Частично реализованные части:
- типы полей `text` и `select` присутствуют в типах, но в UI правой панели обрабатывается только `checkbox`
- состояния сортировки/фильтрации существуют локально, но не синхронизируются с URL или внешним store
- Заглушки / временные решения:
- приложение целиком работает на локальных mock-данных
- основной CSV mock расширен до 1000 сообщений для тестирования chunk rendering и поведения `Workspace` на длинном списке
- `/src/mocks/README.md` указывает только на назначение папки, но фактические моки лежат в корне `/mocks`
- Отсутствующие части, если судить по структуре:
- нет сохранения результатов разметки наружу
- нет backend/API слоя
- нет тестов, linting, error boundary, notification system
- нет явной навигации между несколькими диалогами/экранами

## 16. Technical debt
- `AppContext` перегружен ответственностями и уже стал центральным узким местом.
- `SelectedSegmentsPanel.tsx` и `Workspace.tsx` крупные и насыщены логикой, что усложняет безопасные точечные изменения.
- В `Workspace.tsx` интерактивность selection/resize теперь совмещена с incremental rendering, поэтому изменения в scroll logic нужно проверять особенно аккуратно.
- Overlap rendering усложняет `messageMarks.ts` и `Workspace`: один text slice может ссылаться на несколько `markIndexes`, но resize/delete/context-menu управляют одним primary или boundary mark; это нужно проверять на nested и partial overlap cases.
- `selection.ts` теперь вручную считает offset только по selectable text nodes и игнорирует `[data-selection-decorator="true"]`; при добавлении новых декоративных элементов внутрь `data-selectable-text` их нужно помечать тем же атрибутом.
- Result preview в `Workspace` сейчас является UI-only JSON snapshot из текущих `marks`; это не backend export и не сохраняет данные наружу.
- Ограничение по ролям завязано на `draftSelection.messageIds` и `csvRows`, поэтому любые изменения selection flow или формата ролей могут повлиять на создание segment.
- Логика role-based segmentation по-прежнему влияет и на `updateMarkRange`; если в будущем список разрешенных ролей снова станет явной фильтрацией, нужно перепроверять не только создание сегментов, но и drag-resize существующих.
- `segmentationProgress` считается по `marks.selectedSegment`; если в будущем изменится модель привязки mark к сообщениям, прогресс тоже нужно будет пересматривать.
- В `Workspace` edit mode теперь завязан на inline `contentEditable`, сохранение highlighted segment context и восстановление `messagesRef.scrollTop`; при изменениях важно не ломать синхронизацию `editableRowsRef`, сохранение через `saveEditedRows`, сохранение scroll позиции и отсутствие влияния edit mode на selection/resize flow вне режима редактирования.
- Entity-label в `Workspace` опирается на текущий `entities` lookup и `markIndex`; при изменениях модели marks/entities или рендера частей сообщения нужно перепроверять label positioning, selection и resize handles.
- Delete overlay в `Workspace` завязана на индекс `mark` и существующий `removeMark`; с учетом индексной модели marks нужно отдельно проверять сценарии удаления первого/последнего/active segment.
- Segment navigation завязана на `marks[index].selectedSegment[0]` и отдельный `markNavigationRequest`; `activeMarkIndex` сам по себе не должен вызывать scroll, чтобы клики по segment внутри `Workspace` и клики по card в `SelectedSegmentsPanel` не подбрасывали список. Любые изменения модели segment или порядка массива `marks` нужно проверять вместе с логикой прокрутки и повторных navigation requests.
- В `SelectedSegmentsPanel` навигация и действия над segment должны использовать исходный индекс `mark` из глобального массива `marks`, а не индекс элемента после сортировки/фильтрации; иначе ломаются активный segment, удаление, видимость и scroll-to-segment.
- Tooltip в `SelectedSegmentsPanel` теперь завязаны на portal-rendering и координаты из `getBoundingClientRect`; при будущих изменениях tooltip/UI controls нужно перепроверять hover/focus/scroll behavior.
- Popup sort/filter в `SelectedSegmentsPanel` завязаны на ручной viewport positioning; при изменениях размеров popup или кнопок нужно обновлять эвристики ширины/высоты и перепроверять поведение у краев экрана.
- Внутренний scroll popup sort/filter не должен закрывать сам popup; закрытие по scroll применяется только к внешним viewport/container scroll событиям.
- Hover/focus состояния control buttons и увеличенный размер кнопки удаления завязаны только на CSS; при дальнейших визуальных изменениях важно не ухудшить размер hit area.
- Clear action поиска в `EntitiesPanel` завязан на локальный `searchQuery`; при изменениях логики поиска важно перепроверять reset `visibleCount` внутри `useEntitiesList`.
- Инварианты держатся на индексах массива `marks`, а не на стабильных id сегментов.
- Поддержка типов полей шире, чем реальная UI-реализация.
- Нет тестов на критичные алгоритмы `selection` и `rebuildMarksAfterTextEdit`.
- Нет явного слоя API/репозитория; data loading и доменная логика смешаны.
- Есть логическое расхождение между `src/mocks` и корневой `/mocks`.

## 17. Important files
- `src/context/AppContext.tsx` — главный store, data loading и все основные actions; change risk: high
- `src/components/Workspace.tsx` — центральный пользовательский сценарий и сложные интеракции; change risk: high
- `src/components/SelectedSegmentsPanel.tsx` — управление уже созданными сегментами; change risk: high
- `src/utils/selection.ts` — критично для корректного выделения и drag-resize; change risk: high
- `src/utils/marks.ts` — критично для инвариантов сегментов; change risk: high
- `src/types/app.ts` — вся доменная модель; change risk: medium
- `src/components/MainLayout.tsx` — каркас экрана и resize панелей; change risk: medium
- `src/components/EntitiesPanel.tsx` — создание сегментов начинается отсюда; change risk: medium
- `mocks/entities.json` — структура и объем справочника сущностей; change risk: high
- `mocks/0b2a5a2a058e4df59b344416a45bc259.csv` — исходный диалог, от него зависит поведение selection/marks; change risk: medium

## 18. How to work with this project in future tasks
- Перед любыми изменениями сначала прочитать `PROJECT_CONTEXT.md`.
- Затем проверить релевантные файлы из раздела `Important files`.
- Не делать массовый рефакторинг без прямого запроса.
- Минимизировать область изменений и не расползаться по нескольким крупным файлам без необходимости.
- Сохранять текущую архитектурную стилистику: React Context + утилиты + CSS Modules.
- Не ломать существующие паттерны именования и shape доменных типов.
- При изменениях, связанных с сегментами, отдельно перепроверять `AppContext`, `selection.ts`, `marks.ts`, `Workspace.tsx`, `SelectedSegmentsPanel.tsx`.
- Осторожно работать с индексами массива `marks`; это зона повышенного риска регрессий.
- Если задача затрагивает data layer, помнить, что сейчас приложение использует только локальные mocks.
- После завершения любой новой задачи обязательно обновлять `PROJECT_CONTEXT.md`:
- что изменилось
- какие файлы добавлены/изменены
- какие новые возможности появились
- изменились ли risk zones / safe edit zones / routes / state / components

## 19. Update log

### Update log
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
