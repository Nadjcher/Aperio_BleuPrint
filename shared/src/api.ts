/** Enveloppes de réponse communes à l'API. */

export interface ApiError {
  error: {
    code: string;
    message: string;
    /** Détails de validation éventuels (champ -> message). */
    details?: Record<string, string>;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Project {
  id: string;
  name: string;
  /** Dépôt suivi, ex. "owner/repo". */
  repo?: string;
  createdAt: string;
}
