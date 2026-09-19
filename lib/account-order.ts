export const ACCOUNT_ORDER_STORAGE_KEY = "usage-viewer:account-order:v1";

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== "string" || value === "" || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

export function readAccountOrder(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(ACCOUNT_ORDER_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? uniqueStrings(parsed) : [];
  } catch {
    return [];
  }
}

export function writeAccountOrder(order: string[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      ACCOUNT_ORDER_STORAGE_KEY,
      JSON.stringify(uniqueStrings(order)),
    );
  } catch {
    // Private mode or storage restrictions: ordering still works for this session.
  }
}

export function reconcileAccountOrder(
  savedOrder: string[],
  currentAccountIds: string[],
): string[] {
  const current = uniqueStrings(currentAccountIds);
  const currentSet = new Set(current);
  const reconciled = uniqueStrings(savedOrder).filter((id) => currentSet.has(id));
  const included = new Set(reconciled);

  for (const id of current) {
    if (included.has(id)) continue;
    included.add(id);
    reconciled.push(id);
  }

  return reconciled;
}

export function sameAccountOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
