import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { NotebookPen, X } from "lucide-react";
import { localDate, type Observation, type ObservationDraft } from "./store";

interface Props {
  entry: Observation | null;
  initialNotes?: string;
  onSave: (draft: ObservationDraft) => boolean;
  onClose: () => void;
}

export function ObservationForm({ entry, initialNotes = "", onSave, onClose }: Props) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<ObservationDraft>(() => ({
    field: entry?.field ?? "",
    notes: entry?.notes ?? initialNotes,
    observedOn: entry?.observedOn ?? localDate(),
    followUp: entry?.followUp ?? "",
    severity: entry?.severity ?? "moderate",
    status: entry?.status ?? "monitoring",
  }));
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.field.trim() || !draft.notes.trim()) {
      setFailed(true);
      return;
    }
    if (!onSave({ ...draft, field: draft.field.trim(), notes: draft.notes.trim() }))
      setFailed(true);
  }

  return (
    <dialog
      ref={dialog}
      className="studio-dialog"
      onCancel={onClose}
      aria-labelledby="observation-title"
    >
      <form onSubmit={submit} className="journal-form">
        <div className="studio-section-heading">
          <div>
            <span className="studio-eyebrow">
              <NotebookPen size={14} /> {t("journal.eyebrow")}
            </span>
            <h2 id="observation-title">{t(entry ? "journal.edit" : "journal.new")}</h2>
          </div>
          <button
            type="button"
            className="studio-icon-button"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>
        <label>
          {t("journal.field")}
          <input
            autoFocus
            required
            maxLength={80}
            value={draft.field}
            placeholder={t("journal.field_placeholder")}
            onChange={(e) => setDraft({ ...draft, field: e.target.value })}
          />
        </label>
        <div className="journal-form-row">
          <label>
            {t("journal.observed")}
            <input
              required
              type="date"
              max={localDate()}
              value={draft.observedOn}
              onChange={(e) => setDraft({ ...draft, observedOn: e.target.value })}
            />
          </label>
          <label>
            {t("journal.severity")}
            <select
              value={draft.severity}
              onChange={(e) =>
                setDraft({ ...draft, severity: e.target.value as ObservationDraft["severity"] })
              }
            >
              {(["low", "moderate", "high"] as const).map((value) => (
                <option key={value} value={value}>
                  {t(`journal.${value}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {t("journal.notes")}
          <textarea
            required
            rows={5}
            maxLength={2000}
            value={draft.notes}
            placeholder={t("journal.notes_placeholder")}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
          <span className="journal-hint">{draft.notes.length}/2000</span>
        </label>
        <div className="journal-form-row">
          <label>
            {t("journal.follow_up")}
            <input
              type="date"
              min={draft.observedOn}
              value={draft.followUp}
              onChange={(e) => setDraft({ ...draft, followUp: e.target.value })}
            />
          </label>
          <label>
            {t("journal.status")}
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as ObservationDraft["status"] })
              }
            >
              <option value="monitoring">{t("journal.monitoring")}</option>
              <option value="resolved">{t("journal.resolved")}</option>
            </select>
          </label>
        </div>
        <p className="journal-hint">{t("journal.reminder_hint")}</p>
        {failed && (
          <p role="alert" className="journal-error">
            {t("journal.save_error")}
          </p>
        )}
        <div className="journal-form-actions">
          <button type="button" className="sf-btn sf-btn--secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="sf-btn sf-btn--primary" type="submit">
            {t("journal.save")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
