import React from "react";

export function FormField({
  id,
  label,
  error,
  required,
  helpText,
  children,
  className = "form-group",
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`${className}${error ? " is-error" : ""}`}>
      {label && (
        <label htmlFor={id}>
          {label} {required && <span aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {helpText && !error && <small className="field-help">{helpText}</small>}
      {error && (
        <small
          id={errorId}
          className="field-error error-message-inline"
          role="alert"
        >
          ⚠ {error}
        </small>
      )}
    </div>
  );
}
