import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context";
import { registerSchema, type RegisterFormData } from "../schemas";

export function RegisterPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError(null);
      await registerUser(data);
      navigate("/");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error && err.message ? err.message : t("auth.register_failed");
      setServerError(errorMsg);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100dvh",
        padding: "1.5rem",
        backgroundColor: "var(--color-bg)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "28rem",
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          padding: "2rem",
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "2.5rem" }}>🌻</span>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-text)",
              marginTop: "0.5rem",
            }}
          >
            {t("auth.register_title")}
          </h1>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.875rem",
              marginTop: "0.25rem",
            }}
          >
            {t("auth.register_subtitle")}
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            style={{
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              backgroundColor: "hsl(4 80% 95%)",
              color: "var(--color-error)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              border: "1px solid hsl(4 80% 85%)",
            }}
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              {t("auth.email_label")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.email_placeholder")}
              {...register("email")}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: "0.9375rem",
                outline: "none",
              }}
            />
            {errors.email?.message && (
              <p
                role="alert"
                style={{
                  color: "var(--color-error)",
                  fontSize: "0.8125rem",
                  marginTop: "0.25rem",
                }}
              >
                {t(errors.email.message)}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                marginBottom: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              {t("auth.username_label")}
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder={t("auth.username_placeholder")}
              {...register("username")}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: "0.9375rem",
                outline: "none",
              }}
            />
            {errors.username?.message && (
              <p
                role="alert"
                style={{
                  color: "var(--color-error)",
                  fontSize: "0.8125rem",
                  marginTop: "0.25rem",
                }}
              >
                {t(errors.username.message)}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              {t("auth.password_label")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={t("auth.password_placeholder")}
              {...register("password")}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: "0.9375rem",
                outline: "none",
              }}
            />
            {errors.password?.message && (
              <p
                role="alert"
                style={{
                  color: "var(--color-error)",
                  fontSize: "0.8125rem",
                  marginTop: "0.25rem",
                }}
              >
                {t(errors.password.message)}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-primary)",
              color: "hsl(220, 20%, 14%)",
              fontWeight: 700,
              fontSize: "1rem",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.7 : 1,
              transition: "background-color var(--transition-fast)",
            }}
          >
            {isSubmitting ? t("common.loading") : t("auth.sign_up_btn")}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.25rem",
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
          }}
        >
          {t("auth.already_have_account")}{" "}
          <Link
            to="/login"
            style={{
              color: "var(--color-secondary)",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            {t("auth.login_link")}
          </Link>
        </p>
      </div>
    </div>
  );
}
