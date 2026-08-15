// Attached to request.user by JwtStrategy.validate.
// userId is the INTERNAL database id — all query scoping uses it, never the raw sub.
export interface AuthUser {
  userId: string;
  sub: string;
  email: string;
}
