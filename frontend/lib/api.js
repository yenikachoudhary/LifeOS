const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:4000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "lifeos-token";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const getToken = () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY));
export const setToken = (t) => window.localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY);

async function request(base, path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }

  if (res.status === 401 && auth) {
    clearToken();
    window.dispatchEvent(new Event("lifeos-logout"));
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    let message = "Something went wrong";
    if (typeof data?.message === "string") message = data.message;
    else if (typeof data?.detail === "string") message = data.detail;
    else if (Array.isArray(data?.detail)) message = data.detail.map((d) => d.msg).join(", ");
    throw new ApiError(message, res.status);
  }
  return data;
}

export const authApi = {
  register: (payload) => request(AUTH_URL, "/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request(AUTH_URL, "/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request(AUTH_URL, "/auth/me"),
};

export const api = {
  get: (path) => request(API_URL, path),
  post: (path, body) => request(API_URL, path, { method: "POST", body }),
  put: (path, body) => request(API_URL, path, { method: "PUT", body }),
  patch: (path, body) => request(API_URL, path, { method: "PATCH", body }),
  del: (path) => request(API_URL, path, { method: "DELETE" }),
};
