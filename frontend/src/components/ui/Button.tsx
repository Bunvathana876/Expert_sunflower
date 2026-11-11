import type React from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = "primary",
    size = "md",
    fullWidth = false,
    isLoading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    type = "button",
    ...props
  },
  ref,
) {
  const variantClass = {
    primary: "sf-btn--primary",
    secondary: "sf-btn--secondary",
    accent: "sf-btn--accent",
    outline: "sf-btn--outline-primary",
    ghost: "sf-btn--ghost",
    danger: "sf-btn--danger",
  }[variant];

  const sizeClass = {
    sm: "sf-btn--sm",
    md: "",
    lg: "sf-btn--lg",
  }[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        "sf-btn",
        variantClass,
        sizeClass,
        fullWidth && "sf-btn--full",
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});
