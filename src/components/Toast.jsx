
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

const ToastContext = createContext({
  showToast: () => {},
});

const MAX_TOASTS = 3;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "success", duration = 4000) => {
      if (!message) return;

      const id = `${Date.now()}-${Math.random()}`;
      const safeType = ["success", "error", "info"].includes(type)
        ? type
        : "info";

      setToasts((prev) => [
        ...prev,
        { id, message, type: safeType },
      ].slice(-MAX_TOASTS));

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);

        timersRef.current.set(id, timer);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <aside
        className="toast-container"
        aria-label="Notifikasi"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type}`}
            role={toast.type === "error" ? "alert" : "status"}
          >
            <span>
              {toast.type === "success" && "✓ "}
              {toast.type === "error" && "⚠ "}
              {toast.type === "info" && "ℹ "}
              {toast.message}
            </span>

            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(toast.id)}
              aria-label="Tutup notifikasi"
            >
              &times;
            </button>
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
