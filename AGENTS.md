# Frontend database safety — mandatory

Frontend work does not authorize modifying, resetting, or reseeding the backend database.

- Never run backend `migrate:fresh`, `migrate:reset`, `migrate:refresh`, `db:wipe`, destructive rollbacks, truncation, mass deletion, or equivalent commands while implementing or testing frontend changes.
- Never run backend seeders or migrations with `--seed` or `--force` unless the user explicitly requests that exact operation after being told which database will be affected.
- Do not assume `--env=testing` or `phpunit.xml` selects an isolated database. A missing `.env.testing` may cause Laravel to use the ordinary `.env` connection.
- If backend verification is required, run tests only with explicitly configured SQLite `:memory:`, unless the user explicitly authorizes another isolated test database.
- Before any database write command, follow the backend safety rules and verify the effective driver, host, port, and database name using read-only checks.
- If a connection is remote or cannot be proven disposable, stop. Do not modify it.
