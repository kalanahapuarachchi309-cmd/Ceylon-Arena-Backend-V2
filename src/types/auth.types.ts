import type { UserRole } from "../constants";

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  email: string;
}
