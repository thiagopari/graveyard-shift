export interface Check {
  id: string;
  pass: boolean;
  reason: string;
  /** A failed blocking check means the reading cannot be trusted. */
  blocking?: boolean;
}

export function check(id: string, pass: boolean, reason: string, blocking = false): Check {
  return { id, pass, reason, blocking };
}
