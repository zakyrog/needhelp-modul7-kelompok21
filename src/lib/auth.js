import { CURRENT_USER } from "./data.js";

export const SESSION_KEY = "needhelp.demo-session";

export function readSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ||
      window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (
      session &&
      typeof session === "object" &&
      session.id === CURRENT_USER.id &&
      session.email === CURRENT_USER.email
    ) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeSession(remember, user) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(user);
  try {
    if (remember) {
      window.localStorage.setItem(SESSION_KEY, payload);
      window.sessionStorage.removeItem(SESSION_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_KEY, payload);
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage quota or restriction fallback
    window.sessionStorage.setItem(SESSION_KEY, payload);
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export { CURRENT_USER };
