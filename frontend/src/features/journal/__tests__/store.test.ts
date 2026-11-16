import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isDue,
  journalCsv,
  journalKey,
  localDate,
  parseJournal,
  readSnapshot,
  UNAVAILABLE,
  updateJournal,
  type Observation,
} from "../store";

const entry: Observation = {
  id: "one",
  field: "North field",
  notes: "Brown spots",
  observedOn: "2026-11-15",
  followUp: "2026-11-16",
  severity: "moderate",
  status: "monitoring",
  createdAt: "2026-11-15T12:00:00.000Z",
  updatedAt: "2026-11-15T12:00:00.000Z",
};

describe("Field journal persistence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });
  it("isolates guest records and each account", () => {
    updateJournal(journalKey(), () => [entry]);
    updateJournal(journalKey(12), () => [{ ...entry, field: "Private field" }]);
    expect(parseJournal(readSnapshot(journalKey()))[0]?.field).toBe("North field");
    expect(parseJournal(readSnapshot(journalKey(12)))[0]?.field).toBe("Private field");
    expect(parseJournal(readSnapshot(journalKey(13)))).toEqual([]);
  });
  it("preserves the latest records when a second writer adds an observation", () => {
    updateJournal(journalKey(), () => [entry]);
    updateJournal(journalKey(), (current) => [...current, { ...entry, id: "two" }]);
    expect(parseJournal(readSnapshot(journalKey())).map((item) => item.id)).toEqual(["one", "two"]);
  });
  it.each(["{broken", '{"version":2,"entries":[]}', '{"version":1,"entries":[{}]}'])(
    "refuses to overwrite unreadable data: %s",
    (raw) => {
      localStorage.setItem(journalKey(), raw);
      expect(() => updateJournal(journalKey(), () => [])).toThrow();
      expect(localStorage.getItem(journalKey())).toBe(raw);
    },
  );
  it("rejects impossible dates and follow-ups before the observation", () => {
    expect(() =>
      updateJournal(journalKey(), () => [{ ...entry, observedOn: "2026-02-30" }]),
    ).toThrow();
    expect(() =>
      updateJournal(journalKey(), () => [{ ...entry, followUp: "2026-11-14" }]),
    ).toThrow();
    expect(localStorage.getItem(journalKey())).toBeNull();
  });
  it("reports storage failures without claiming to persist", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    expect(() => updateJournal(journalKey(), () => [entry])).toThrow();
    expect(readSnapshot(journalKey())).toBeNull();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    expect(readSnapshot(journalKey())).toBe(UNAVAILABLE);
  });
  it("counts today's and overdue follow-ups, but excludes resolved or unscheduled entries", () => {
    expect(isDue(entry, "2026-11-16")).toBe(true);
    expect(isDue(entry, "2026-11-17")).toBe(true);
    expect(isDue(entry, "2026-11-15")).toBe(false);
    expect(isDue({ ...entry, status: "resolved" }, "2026-11-17")).toBe(false);
    expect(isDue({ ...entry, followUp: "" }, "2026-11-17")).toBe(false);
  });
  it("uses local calendar dates instead of shifting dates through UTC", () => {
    expect(localDate(new Date(2026, 0, 2, 0, 1))).toBe("2026-01-02");
  });
  it("exports multilingual CSV with quotes, newlines, and formula protection", () => {
    const csv = journalCsv([
      { ...entry, field: '=HYPERLINK("bad")', notes: 'ស្លឹក, "spots"\nSecond line' },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"ស្លឹក, ""spots""\nSecond line"');
  });
});
