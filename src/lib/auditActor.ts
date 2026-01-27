const KEY = "audit_actor_label";

export function getAuditActorLabel(): string {
  try {
    return String(localStorage.getItem(KEY) ?? "").trim();
  } catch {
    return "";
  }
}

export function setAuditActorLabel(label: string) {
  const v = String(label ?? "").trim();
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // ignore
  }
  return v;
}
