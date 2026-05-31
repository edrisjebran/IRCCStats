import { useEffect, useState } from "react";

export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseJsonDatasetOptions<T> {
  url: string;
  validate: (value: unknown) => T;
  errorMessage: string;
  enabled?: boolean;
}

export function useJsonDataset<T>({
  url,
  validate,
  errorMessage,
  enabled = true,
}: UseJsonDatasetOptions<T>): DataState<T> {
  const [state, setState] = useState<DataState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });
  const { data } = state;

  useEffect(() => {
    if (!enabled || data) return;
    let cancelled = false;

    async function load() {
      try {
        setState((current) => ({ ...current, loading: true, error: null }));
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} request failed.`);
        const payload = validate(await response.json());
        if (!cancelled) setState({ data: payload, loading: false, error: null });
      } catch {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: errorMessage,
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [data, enabled, errorMessage, url, validate]);

  return state;
}
