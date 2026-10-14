import { useCallback, useEffect, useState } from "react";
import { toErrorMessage } from "../api/client";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: (d: T | null) => void;
}

/**
 * Exécute une fonction asynchrone et expose { data, loading, error, reload }.
 * Centralise le motif chargement/erreur jusque-là recopié dans chaque page.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Dépendances dynamiques transmises par l'appelant : on désactive la règle
     exhaustive-deps pour ce bloc (comportement voulu d'un hook générique). */
  /* eslint-disable react-hooks/exhaustive-deps */
  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, deps);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, reload: run, setData };
}
