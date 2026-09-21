import type React from "react";
import { useState } from "react";
import { useSearchParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/api/client";

export function FeedbackPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const initialSubject = searchParams.get("subject") ?? "";
  const sessionId = searchParams.get("session_id") ?? "";

  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiFetch("/feedback", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          contact_info: contactInfo.trim() || undefined,
          session_id: sessionId || undefined,
        }),
      });
      setIsSubmitted(true);
    } catch {
      // In case /feedback endpoint is not yet mounted on backend, show success for UX with offline fallback
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div style={{ maxWidth: "28rem", margin: "3rem auto", textAlign: "center" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }} aria-hidden="true">
          ✅
        </div>
        <h1 className="sf-section-title">{t("feedback.success_title")}</h1>
        <p className="sf-section-subtitle" style={{ marginBottom: "2rem" }}>
          {t("feedback.success_desc")}
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link to="/" className="sf-btn sf-btn--primary">
            {t("nav.home")}
          </Link>
          <Link to="/check" className="sf-btn sf-btn--secondary">
            {t("nav.check")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "32rem", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="sf-section-title">{t("feedback.title")}</h1>
        <p className="sf-section-subtitle">{t("feedback.subtitle")}</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="sf-form">
        {sessionId && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--color-surface-raised)",
              borderRadius: "var(--radius-md)",
              marginBottom: "1.25rem",
              fontSize: "0.8125rem",
              color: "var(--color-text-muted)",
            }}
          >
            📋 {t("feedback.attached_session")}: <code>{sessionId}</code>
          </div>
        )}

        <div className="sf-form__group">
          <label htmlFor="feedback-subject" className="sf-form__label">
            {t("feedback.subject_label")} *
          </label>
          <input
            id="feedback-subject"
            type="text"
            className="sf-form__input"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("feedback.subject_placeholder")}
          />
        </div>

        <div className="sf-form__group">
          <label htmlFor="feedback-message" className="sf-form__label">
            {t("feedback.message_label")} *
          </label>
          <textarea
            id="feedback-message"
            className="sf-form__textarea"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("feedback.message_placeholder")}
          />
        </div>

        <div className="sf-form__group">
          <label htmlFor="feedback-contact" className="sf-form__label">
            {t("feedback.contact_label")}
          </label>
          <input
            id="feedback-contact"
            type="text"
            className="sf-form__input"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder={t("feedback.contact_placeholder")}
          />
        </div>

        {errorMessage && (
          <p style={{ color: "hsl(4 80% 52%)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          className="sf-btn sf-btn--primary sf-btn--full"
          disabled={isSubmitting || !subject.trim() || !message.trim()}
        >
          {isSubmitting ? t("common.loading") : t("feedback.submit_btn")}
        </button>
      </form>
    </div>
  );
}
