import { z } from "zod";

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && localDate(date) === value;
  });

export const observationSchema = z
  .object({
    id: z.string().min(1),
    field: z.string().trim().min(1).max(80),
    notes: z.string().trim().min(1).max(2000),
    observedOn: dateOnly,
    followUp: z.union([dateOnly, z.literal("")]),
    severity: z.enum(["low", "moderate", "high"]),
    status: z.enum(["monitoring", "resolved"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .refine((entry) => !entry.followUp || entry.followUp >= entry.observedOn);

export type Observation = z.infer<typeof observationSchema>;
export type ObservationDraft = Omit<Observation, "id" | "createdAt" | "updatedAt">;
const journalSchema = z.object({
  version: z.literal(1),
  entries: z.array(observationSchema).max(2000),
});
export const JOURNAL_EVENT = "sunflower-journal-change";
export const UNAVAILABLE = "__storage_unavailable__";

export function journalKey(userId?: number): string {
  return `sf-field-journal:v1:${userId === undefined ? "guest" : `user-${userId}`}`;
}

export function readSnapshot(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return UNAVAILABLE;
  }
}

export function parseJournal(raw: string | null): Observation[] {
  if (raw === null) return [];
  return journalSchema.parse(JSON.parse(raw)).entries;
}

// Read the latest snapshot before writing, so another tab's entries are retained.
// Failed reads or validation never overwrite existing data.
export function updateJournal(
  key: string,
  update: (entries: Observation[]) => Observation[],
): void {
  const next = journalSchema.parse({
    version: 1,
    entries: update(parseJournal(readSnapshot(key))),
  });
  localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event(JOURNAL_EVENT));
}

export function isDue(entry: Observation, today = localDate()): boolean {
  return entry.status === "monitoring" && !!entry.followUp && entry.followUp <= today;
}

export function journalCsv(entries: Observation[]): string {
  const cell = (value: string) => {
    // Prevent spreadsheet formula execution for user-authored text.
    const safe = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return (
    "\uFEFF" +
    [
      ["Field", "Observation date", "Notes", "Severity", "Status", "Follow-up date"],
      ...entries.map((entry) => [
        entry.field,
        entry.observedOn,
        entry.notes,
        entry.severity,
        entry.status,
        entry.followUp,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
