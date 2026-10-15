// All dates are the user's LOCAL calendar day as "YYYY-MM-DD".
// The server never guesses time zones; the browser tells it which day it is.
const pad = (n) => String(n).padStart(2, "0");

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());

export const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

export const formatLong = (s) =>
  parseDate(s).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

export const formatShort = (s) => parseDate(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
