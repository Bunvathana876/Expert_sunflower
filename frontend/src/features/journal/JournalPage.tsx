import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  Leaf,
  MapPin,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useJournal } from "./useJournal";
import { isDue, journalCsv, localDate, type Observation, type ObservationDraft } from "./store";
import { ObservationForm } from "./ObservationForm";

type Filter = "all" | "monitoring" | "due" | "resolved";

export function JournalPage() {
  const { scope, ...journal } = useJournal();
  // Reset editor state immediately when the signed-in account changes.
  return <JournalWorkspace key={scope} {...journal} />;
}

function JournalWorkspace({
  entries,
  update,
  storageError,
  readable,
  isLoading,
}: Omit<ReturnType<typeof useJournal>, "scope">) {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const initialNotes = params.get("observation")?.slice(0, 2000) ?? "";
  const [editor, setEditor] = useState<Observation | "new" | null>(initialNotes ? "new" : null);
  const [filter, setFilter] = useState<Filter>(params.get("filter") === "due" ? "due" : "all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const due = entries.filter((entry) => isDue(entry)).length;
  const resolved = entries.filter((entry) => entry.status === "resolved").length;
  const visible = entries
    .filter((entry) => {
      const matchesFilter =
        filter === "all" || (filter === "due" ? isDue(entry) : entry.status === filter);
      return (
        matchesFilter &&
        `${entry.field} ${entry.notes}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase())
      );
    })
    .sort(
      (a, b) => b.observedOn.localeCompare(a.observedOn) || b.updatedAt.localeCompare(a.updatedAt),
    );
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));

  function closeEditor() {
    setEditor(null);
    if (params.has("observation")) {
      const next = new URLSearchParams(params);
      next.delete("observation");
      setParams(next, { replace: true });
    }
  }

  function save(draft: ObservationDraft) {
    const now = new Date().toISOString();
    const entry: Observation = {
      ...draft,
      id: editor && editor !== "new" ? editor.id : crypto.randomUUID(),
      createdAt: editor && editor !== "new" ? editor.createdAt : now,
      updatedAt: now,
    };
    const success = update((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
    if (success) {
      closeEditor();
      setNotice(t("journal.saved"));
    }
    return success;
  }

  function exportVisible() {
    const url = URL.createObjectURL(
      new Blob([journalCsv(visible)], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `sunflower-journal-${localDate()}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="studio-page journal-page">
      <header className="studio-page-heading">
        <div>
          <span className="studio-eyebrow">
            <Leaf size={14} /> {t("journal.eyebrow")}
          </span>
          <h1>{t("journal.title")}</h1>
          <p>{t("journal.subtitle")}</p>
        </div>
        <button
          className="sf-btn sf-btn--primary"
          disabled={!readable || isLoading}
          onClick={() => setEditor("new")}
        >
          <Plus size={17} />
          {t("journal.new")}
        </button>
      </header>

      <div className="journal-stats">
        {(
          [
            { value: entries.length, label: "total", icon: NotebookPen },
            { value: due, label: "due", icon: CalendarDays },
            { value: resolved, label: "resolved", icon: CheckCircle2 },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <div className="journal-stat" key={label}>
            <span className={`studio-tile-icon ${label === "due" ? "is-gold" : ""}`}>
              <Icon size={21} />
            </span>
            <div>
              <strong>{isLoading ? "—" : value}</strong>
              <span>{t(`journal.${label}`)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="journal-local-note">
        <span className="studio-status-dot" />
        <p>{t("journal.local_notice")}</p>
      </div>
      {storageError && (
        <div role="alert" className="journal-error">
          {t("journal.storage_error")}
        </div>
      )}
      <div role="status" className="journal-notice">
        {notice}
      </div>

      <section className="journal-board" aria-label={t("journal.title")}>
        <div className="journal-toolbar">
          <div className="studio-search">
            <Search size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("journal.search")}
              placeholder={t("journal.search")}
            />
          </div>
          <button
            className="sf-btn sf-btn--secondary sf-btn--sm"
            disabled={!visible.length}
            onClick={exportVisible}
          >
            <Download size={15} />
            {t("journal.export")}
          </button>
        </div>
        <div className="journal-filters" role="group" aria-label={t("journal.filter")}>
          {(["all", "monitoring", "due", "resolved"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? "is-selected" : ""}
              onClick={() => setFilter(value)}
            >
              {t(`journal.${value}`)}
              {value === "due" && due > 0 && <span>{due}</span>}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="journal-empty" role="status">
            {t("common.loading")}
          </p>
        ) : !visible.length ? (
          <div className="journal-empty">
            <span className="journal-empty-icon">
              <NotebookPen size={32} />
            </span>
            <h2>
              {t(
                entries.length || query || filter !== "all"
                  ? "journal.no_results"
                  : "journal.empty_title",
              )}
            </h2>
            <p>
              {t(
                entries.length || query || filter !== "all"
                  ? "journal.no_results_desc"
                  : "journal.empty_desc",
              )}
            </p>
            {entries.length || query || filter !== "all" ? (
              <button
                className="sf-btn sf-btn--secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                {t("journal.clear_filters")}
              </button>
            ) : (
              <button
                className="sf-btn sf-btn--primary"
                disabled={!readable}
                onClick={() => setEditor("new")}
              >
                <Plus size={16} />
                {t("journal.new")}
              </button>
            )}
          </div>
        ) : (
          <div className="journal-entries">
            {visible.map((entry) => (
              <article
                className={`journal-entry ${entry.status === "resolved" ? "is-resolved" : ""}`}
                key={entry.id}
              >
                <div className="journal-entry-heading">
                  <div>
                    <span className="journal-entry-date">{formatDate(entry.observedOn)}</span>
                    <h2>
                      <MapPin size={17} />
                      {entry.field}
                    </h2>
                  </div>
                  <span className={`journal-severity severity-${entry.severity}`}>
                    {t(`journal.${entry.severity}`)}
                  </span>
                </div>
                <p className="journal-entry-notes">{entry.notes}</p>
                <div className="journal-entry-meta">
                  <span className={`journal-status status-${entry.status}`}>
                    <span className="studio-status-dot" />
                    {t(`journal.${entry.status}`)}
                  </span>
                  {entry.followUp && (
                    <span className={isDue(entry) ? "journal-due" : ""}>
                      <CalendarDays size={14} />
                      {t(isDue(entry) ? "journal.due_date" : "journal.follow_date", {
                        date: formatDate(entry.followUp),
                      })}
                    </span>
                  )}
                </div>
                <div className="journal-entry-actions">
                  <button
                    className="journal-text-button"
                    onClick={() => {
                      if (
                        update((current) =>
                          current.map((item) =>
                            item.id === entry.id
                              ? {
                                  ...item,
                                  status: item.status === "resolved" ? "monitoring" : "resolved",
                                  updatedAt: new Date().toISOString(),
                                }
                              : item,
                          ),
                        )
                      )
                        setNotice(t("journal.updated"));
                    }}
                  >
                    <Check size={15} />
                    {t(entry.status === "resolved" ? "journal.reopen" : "journal.resolve")}
                  </button>
                  <div>
                    <button
                      className="studio-icon-button"
                      aria-label={t("journal.edit_entry", { field: entry.field })}
                      onClick={() => setEditor(entry)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="studio-icon-button journal-delete"
                      aria-label={t("journal.delete_entry", { field: entry.field })}
                      onClick={() => {
                        if (
                          window.confirm(t("journal.delete_confirm", { field: entry.field })) &&
                          update((current) => current.filter((item) => item.id !== entry.id))
                        )
                          setNotice(t("journal.deleted"));
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="journal-bottom-tip">
        <Leaf size={24} />
        <div>
          <h2>{t("journal.tip_title")}</h2>
          <p>{t("journal.tip_desc")}</p>
        </div>
        <Link to="/check">
          {t("studio.start")}
          <ArrowRight size={17} />
        </Link>
      </aside>
      {editor !== null && !isLoading && (
        <ObservationForm
          entry={editor === "new" ? null : editor}
          initialNotes={initialNotes}
          onSave={save}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}
