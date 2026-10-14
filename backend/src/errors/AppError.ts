/**
 * Erreur applicative portant un code et un statut HTTP.
 *
 * Module neutre : il ne dépend d'aucune couche (ni HTTP, ni DB), ce qui permet
 * aux services et agents de le lever sans dépendre du middleware. Le mapping
 * vers une réponse HTTP est fait par `middleware/errorHandler`.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
