# CODEX RULES

These rules are based on the original "How to work with this project in future tasks" section from `PROJECT_CONTEXT.md` and define the working flow for future Codex tasks.

## REQUIRED READING ORDER
1. `PROJECT_CONTEXT.md` — always read first to understand the current project state.
2. `CODEX_RULES.md` — read next to understand safe working rules and constraints.
3. `CHANGELOG_PROJECT.md` — read only when it is necessary to understand change history, rationale, or previous implementation notes.

## GENERAL RULES
- Перед любыми изменениями сначала прочитать `PROJECT_CONTEXT.md`.
- Затем прочитать `CODEX_RULES.md`.
- Затем проверить релевантные файлы из раздела `Important files` в `PROJECT_CONTEXT.md`.
- Не делать массовый рефакторинг без прямого запроса.
- Минимизировать область изменений и не расползаться по нескольким крупным файлам без необходимости.
- Сохранять текущую архитектурную стилистику: React Context + утилиты + CSS Modules.
- Не ломать существующие паттерны именования и shape доменных типов.
- Если задача затрагивает data layer, помнить, что сейчас приложение использует только локальные mocks.
- При изменениях, связанных с сегментами, отдельно перепроверять `AppContext`, `selection.ts`, `marks.ts`, `Workspace.tsx`, `SelectedSegmentsPanel.tsx`.
- Осторожно работать с индексами массива `marks`; это зона повышенного риска регрессий.

## CRITICAL FILES
- `src/context/AppContext.tsx` — главный store, data loading и все основные actions; change risk: high.
- `src/components/Workspace.tsx` — центральный пользовательский сценарий и сложные интеракции; change risk: high.
- `src/components/SelectedSegmentsPanel.tsx` — управление уже созданными сегментами; change risk: high.
- `src/utils/selection.ts` — критично для корректного выделения и drag-resize; change risk: high.
- `src/utils/marks.ts` — критично для инвариантов сегментов; change risk: high.
- `src/utils/messageMarks.ts` — критично для overlap/nested rendering, boundary handles и active segment selection; change risk: high.
- `src/types/app.ts` — вся доменная модель; change risk: medium.
- `src/components/MainLayout.tsx` — каркас экрана и resize панелей; change risk: medium.
- `src/components/EntitiesPanel.tsx` — создание сегментов начинается отсюда; change risk: medium.
- `mocks/entities.json` — структура и объем справочника сущностей; change risk: high.
- `mocks/0b2a5a2a058e4df59b344416a45bc259.csv` — исходный диалог, от него зависит поведение selection/marks; change risk: medium.

## FORBIDDEN ACTIONS
- Не менять архитектуру проекта без явного запроса.
- Не переписывать `AppContext` без явного запроса.
- Не менять модель `marks` без явного запроса.
- Не менять shape доменных типов без необходимости и без проверки зависимых компонентов.
- Не удалять детали поведения `Workspace`, marks, selection и resize из контекстных файлов.
- Не заменять существующие React Context + utilities + CSS Modules паттерны сторонними зависимостями без явного запроса.
- Не делать массовые переименования, форматирование или перенос логики между крупными файлами, если задача этого прямо не требует.

## UPDATE RULES
- После каждой задачи обновлять `PROJECT_CONTEXT.md`, если изменилось актуальное состояние проекта.
- В `PROJECT_CONTEXT.md` фиксировать только текущее состояние: архитектуру, state/data flow, UI/UX notes, risk zones, safe edit zones, important files, implementation status и technical debt.
- Не добавлять в `PROJECT_CONTEXT.md` историю изменений, update log или инструкции для Codex.
- После каждой задачи добавлять запись в `CHANGELOG_PROJECT.md`.
- В `CHANGELOG_PROJECT.md` фиксировать дату, что анализировалось, что добавлено/обновлено в контексте и notes.
- При изменениях проверять, изменились ли risk zones / safe edit zones / routes / state / components, и обновлять актуальный контекст при необходимости.

## ORIGINAL RULES SECTION
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
