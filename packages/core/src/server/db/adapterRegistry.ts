/**
 * Adapter registry — global singleton that holds the active GluonDatabaseAdapter.
 *
 * `setDbAdapter()` is called once during `loadConfig()`.
 * `getDb()` is the single access point used by every server file instead of
 * importing `prisma` directly.
 */
import type { GluonDatabaseAdapter } from "./adapter";

let _adapter: GluonDatabaseAdapter | null = null;

export function setDbAdapter(adapter: GluonDatabaseAdapter): void {
  _adapter = adapter;
}

export function getDb(): GluonDatabaseAdapter {
  if (!_adapter) {
    throw new Error(
      "[gluon-ai] DB adapter not initialized. " +
        "Make sure loadConfig() has been called before handling any requests.",
    );
  }
  return _adapter;
}
