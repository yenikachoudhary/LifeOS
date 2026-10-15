"use client";

import { useCallback, useEffect, useState } from "react";

// Small data-loading hook: runs `loader` on mount, exposes loading/error and a reload function.
export function useFetch(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    try {
      setError("");
      setData(await loader());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
