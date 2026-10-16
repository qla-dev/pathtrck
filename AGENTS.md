# Shared agent coordination

This workspace can be edited simultaneously by Codex, Claude and Copilot.
Before modifying files, read the shared board:

```powershell
python D:\FreightBook\tools\agent_board.py --board-dir D:\FreightBook\.agent-board status
```

Use a unique session ID, such as `codex-ui`, `claude-components` or `copilot-pages`.
Create a task and claim files **before editing them**:

```powershell
python D:\FreightBook\tools\agent_board.py --board-dir D:\FreightBook\.agent-board create my-task --agent codex-ui --title "Concrete task"
python D:\FreightBook\tools\agent_board.py --board-dir D:\FreightBook\.agent-board claim my-task --agent codex-ui --scope frontend/src/components/Example.tsx
```

## Board rules

- Claim files before editing. Directory claims cover all descendants.
- Refresh leases every 10 min: `heartbeat --agent YOUR_ID`.
- Reserve `@git-write` before git operations.
- `finish` puts task in **Ceka test**, not Done. Test separately with `pass` / `fail`.
- Post a summary at the end of each task.
- Attach evidence: `screenshot`, `record`, `attach`.

## Dashboard

Central board: `http://api.bosancica.ai:82` (or `http://127.0.0.1:8001`).
Login with your credentials (ask admin for an account).

---

# Frontend database safety - mandatory

Frontend work does not authorize modifying, resetting, or reseeding the backend database.

- Never run backend `migrate:fresh`, `migrate:reset`, `migrate:refresh`, `db:wipe`, destructive rollbacks, truncation, mass deletion, or equivalent commands while implementing or testing frontend changes.
- Never run backend seeders or migrations with `--seed` or `--force` unless the user explicitly requests that exact operation after being told which database will be affected.
- Do not assume `--env=testing` or `phpunit.xml` selects an isolated database. A missing `.env.testing` may cause Laravel to use the ordinary `.env` connection.
- If backend verification is required, run tests only with explicitly configured SQLite `:memory:`, unless the user explicitly authorizes another isolated test database.
- Before any database write command, follow the backend safety rules and verify the effective driver, host, port, and database name using read-only checks.
- If a connection is remote or cannot be proven disposable, stop. Do not modify it.

# SmartFreight and PANTHEON

The PANTHEON connection lives in Company details → Integracije (`CompanyIntegrations.tsx`), not in Accounting. UI actions only change SmartFreight data; PANTHEON is reached through the backend sync. See `backend/docs/agents/pantheon-integration.md`.
