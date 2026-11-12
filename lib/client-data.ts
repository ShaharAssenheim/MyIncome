"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const values = new Map<string, { data: unknown; time: number }>();
const pending = new Map<string, Promise<any>>();
const listeners = new Set<() => void>();
let revision = 0;
export function seedData(url: string, data: unknown) {
  for (const [key, value] of values) {
    if (Date.now() - value.time >= 30_000) values.delete(key);
  }
  values.delete(url);
  while (values.size >= 100) values.delete(values.keys().next().value!);
  values.set(url, { data, time: Date.now() });
}

export function invalidateData() {
  revision++;
  values.clear();
  pending.clear();
  listeners.forEach((listener) => listener());
}

export async function loadData<T>(url: string): Promise<T> {
  const cached = values.get(url);
  if (cached && Date.now() - cached.time < 30_000) return cached.data as T;
  const existing = pending.get(url);
  if (existing) return existing;
  const started = revision;
  const request = (async () => {
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 401 || response.status === 403) {
      if (started !== revision) return loadData<T>(url);
      invalidateData();
      window.location.assign("/login?error=access_denied");
      throw new Error("Access denied");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "טעינת הנתונים נכשלה");
    if (started !== revision) return loadData<T>(url);
    seedData(url, data);
    return data as T;
  })();
  pending.set(url, request);
  try {
    return await request;
  } finally {
    if (pending.get(url) === request) pending.delete(url);
  }
}

export function useDataQuery<T>(url: string | null, initialData?: T) {
  const seeded = useRef<string | null>(null);
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string;
  }>({
    data: initialData ?? null,
    loading: Boolean(url) && !initialData,
    error: "",
  });
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);
  useEffect(() => {
    listeners.add(reload);
    window.addEventListener("focus", reload);
    return () => {
      listeners.delete(reload);
      window.removeEventListener("focus", reload);
    };
  }, [reload]);
  useEffect(() => {
    let active = true;
    if (!url) {
      setState({ data: null, loading: false, error: "" });
      return;
    }
    if (initialData && seeded.current !== url) {
      seedData(url, initialData);
      seeded.current = url;
    }
    const cached = values.get(url)?.data as T | undefined;
    setState({ data: cached ?? null, loading: !cached, error: "" });
    loadData<T>(url)
      .then((data) => {
        if (active) setState({ data, loading: false, error: "" });
      })
      .catch((error) => {
        if (active)
          setState((current) => ({
            ...current,
            loading: false,
            error: error.message,
          }));
      });
    return () => {
      active = false;
    };
  }, [url, refresh, initialData]);
  return { ...state, reload };
}
