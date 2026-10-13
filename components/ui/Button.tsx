import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent/85 disabled:hover:bg-accent",
  secondary: "bg-panel text-fg border border-line hover:border-line-strong hover:bg-raised",
  ghost: "text-fg-muted hover:text-fg hover:bg-raised",
  danger: "text-danger hover:bg-danger-soft",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-8 px-3 text-[13px] gap-2",
  lg: "h-10 px-4 text-sm gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** 只有圖示的按鈕：必須提供 aria-label */
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", iconOnly, className = "", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant],
        iconOnly ? (size === "sm" ? "size-7" : size === "lg" ? "size-10" : "size-8") : SIZES[size],
        className,
      ].join(" ")}
      {...props}
    />
  );
});
