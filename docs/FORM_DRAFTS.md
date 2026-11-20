# Shared form recovery

The application session initializes `formDrafts.ts` with the authenticated user. `DraftDock` shows the save status and private draft manager. `useFormRecovery` binds React form state to this shared service; do not implement module-specific autosave requests.

Existing bindings cover vehicle registration/editing, carriers/drivers, customers, company administration, invoice editors and accounting actions (including expenses), POS baskets, loads, warehouses, CRM/logistics contracts and quotes, operations/orders, fleet maintenance/fuel/return/damage/coupling/tour forms, document forms, shipment actions, profile and operational settings. See the hook calls in the relevant components for their actual state and submission paths. Search/filter inputs, authentication credentials, payment card fields and immediately executed controls are not business drafts.

## Adding a form

```tsx
const recovery = useFormRecovery({
  module: 'customers',
  formKey: 'customer-editor',
  companyId,
  recordKey: String(customer?.id || 'new'),
  resource: customer?.id ? 'customers' : undefined,
  resourceId: customer?.id,
  baseVersion: customer?.draft_record_hash,
  submitPaths: ['^/customers(?:/[0-9]+)?$'],
}, {form, step}, saved => {
  setForm(previous => restoreFormValue(previous, saved.form));
  setStep(saved.step);
}, {active: open, scopeReady: !loadingOriginal});
```

Use a stable form key and actual account/company/record context. For multiple tasks in one record, include the task key. Capture all editable values, dates, selections, steps and pending files; exclude server lists/loading state. Restore after loading original defaults. Nested editors need distinct keys and precise `submitPaths`/`submitFields` so unrelated requests cannot complete them.

Matching API mutations first flush the draft and attach revision headers. Only a successful response completes it. For a sequence of mutations, use `deferCompletion` and call `complete()` after the entire sequence succeeds, or explicitly `flush()` before and `complete()` after an existing save callback. Closing/cancelling a dialog retains its draft; `discard()` explicitly deletes it. Saving a draft never calls the operational create/update endpoint.

## Recovery and limits

The debounce is 700 ms. Text snapshots are written locally before server synchronization. Selected files are retained in IndexedDB on the same browser/device; the server stores references, not unfinished file bytes. Reselect files when the original device storage is unavailable. Credentials and card fields are recursively excluded. Browsers may clear storage or deny persistence; no web application can promise recovery after deletion of its only local copy while offline.

Draft revisions reject concurrent changes. Source record fingerprints protect integrated record editors against outdated submissions; retain the source hash from the initial GET. Other editors must continue using their existing server revision checks. Conflict recovery requires deliberate review through the manager. Automatic retries are bounded and restart on an online event or user edits; manual retry is also available.

Deploy the backend with both 2026-11-20 draft migrations before activating this frontend. Main branch publication alone is not evidence of database migration or production deployment.

Validation: 38 focused Node tests, TypeScript and Vite build; real browser recovery checks use a disposable SQLite in-memory backend with real controllers. Invoice refresh, carrier navigation/retry, load step recovery and vehicle PDF upload were exercised. The browser harness is local and is not shipped.

Closed dialogs may be mounted without their record. Build draft contexts with optional record access and keep `scopeReady` false until the record exists; keep hooks unconditional. `node --test src/components/load/LoadDetails.closed.test.mjs` renders both real load-detail dialogs with a null selection to cover authenticated startup. Its jsdom dependency is for tests only.
