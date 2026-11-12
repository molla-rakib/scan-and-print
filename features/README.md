# features/

Every page's code lives here, one folder per feature. `app/` only holds Next.js route files
(`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, metadata images); a `page.tsx` exports its
`metadata` / `generateMetadata` and renders one component from its feature folder.

```
features/<feature>/
  <feature>-page.tsx     entry rendered by app/**/page.tsx (server component: layout, <Suspense>, data loading)
  components/            view components; client components get their logic from a hook
  hooks/use-*.ts         client logic: state, handlers, server-action calls, navigation
  actions.ts             "use server" actions of this feature
  queries.ts             "server-only" data loading for the page (DB reads), returning what the view needs
  content.ts             static texts/data of the page, when it has a lot
```

Not every feature needs every file. Code used by several features stays shared:
`components/` (UI pieces such as `DeviceStepper`, `TableSearch`, `TablePagination`, `components/ui/` shadcn),
`hooks/` (shared client hooks), `lib/` (models, business rules, helpers).

## Rules

- **View vs logic.** A client component that has state, effects or calls actions moves that into
  `hooks/use-<component>.ts` and only renders. Server components fetch through `queries.ts`.
- **Imports.** Inside a feature use relative imports (`./components/…`, `../hooks/…`); across features or to
  shared code use `@/…`. A feature never imports another feature's `components/` or `hooks/`; shared things
  move to `components/` or `hooks/`.
- **Next.js rules from CLAUDE.md still apply**: dynamic work behind `<Suspense>`, `await connection()` before DB
  reads on public pages, no `Date.now()` in render, actions return `ActionResult` and call `refresh()`.
- **Pending states.** Use `useAction` (`components/use-action.ts`); its `pending` stays true through any
  navigation started in `onSuccess`, so buttons keep spinning until the next page is shown.

## Tables: search and pagination

Every dashboard table shows 20 rows (`PAGE_SIZE`) with a search box and pagination, kept in the URL:

1. The page passes `searchParams` to its feature page; inside `<Suspense>` read them with
   `readListParams(await searchParams, prefix?)` from `lib/list-params.ts` → `{ q, page, skip, limit }`.
2. Query with `.skip(skip).limit(limit)` and count the total with `countDocuments` on the same filter;
   build "contains" filters with `containsRegex(q)`.
3. Render `<TableSearch placeholder="…" />` above the table and `<TablePagination page={page} total={total} />`
   below it. A page with two tables gives each a `prefix` (e.g. `"h"` → `?hq=&hpage=`).
