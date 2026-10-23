
import React from "react";

export function FormField({
  id,
  label,
  error,
  required = false,
  helpText,
  children,
  className = "form-group",
}) {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText && !error ? `${id}-help` : undefined;

  const describedBy = errorId || helpId;

  const inputProps = React.isValidElement(children)
    ? {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      }
    : {};

  const input = React.isValidElement(children)
    ? React.cloneElement(children, {
        ...inputProps,
        "aria-describedby": [
          children.props["aria-describedby"],
          describedBy,
        ]
          .filter(Boolean)
          .filter((value, index, array) => array.indexOf(value) === index)
          .join(" ") || undefined,
      })
    : children;

  return (
    <div className={`${className}${error ? " is-error" : ""}`}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && (
            <>
              {" "}
              <span className="required-indicator" aria-hidden="true">
                *
              </span>
            </>
          )}
        </label>
      )}

      {input}

      {helpText && !error && (
        <small id={helpId} className="field-help">
          {helpText}
        </small>
      )}

      {error && (
        <small
          id={errorId}
          className="field-error error-message-inline"
          role="alert"
        >
          <span aria-hidden="true">⚠ </span>
          {error}
        </small>
      )}
    </div>
  );
}
