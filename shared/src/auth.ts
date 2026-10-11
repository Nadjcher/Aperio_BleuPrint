/** Modèle d'authentification et d'autorisation (RBAC). */

export type Role = "admin" | "manager" | "viewer";

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

/** Charge utile du JWT d'accès. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
