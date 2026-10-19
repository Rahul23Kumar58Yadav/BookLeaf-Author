import { forwardRef } from "react";
import { Spinner } from "./Spinner";
import "./Button.css";

/**
 * Polymorphic button: <Button as={Link} to="/x"> renders a router link with button styling.
 * `loading` disables interaction but keeps width stable so layouts don't jump.
 */
export const Button = forwardRef(function Button(
  { as: Tag = "button", variant = "primary", size = "md", loading = false, icon, children, className = "", disabled, ...rest },
  ref
) {
  const isNative = Tag === "button";
  return (
    <Tag
      ref={ref}
      className={`btn ${className}`.trim()}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      {...(isNative ? { type: rest.type ?? "button", disabled: disabled || loading } : { "aria-disabled": disabled || undefined })}
      {...rest}
    >
      {loading && <Spinner size={16} label="Working" />}
      {!loading && icon}
      <span className="btn__label">{children}</span>
    </Tag>
  );
});