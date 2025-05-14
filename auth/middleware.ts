import jwt from 'jsonwebtoken';

export type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  iat: number;
  exp: number;
};

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}

export const requireRole =
  (roles: string[]) =>
  async ({ headers }: { headers: { authorization: string } }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Missing or invalid Authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!roles.includes(decoded.role)) {
      throw new Error("Access denied: Insufficient role.");
    }

    return decoded; // return user info
  };
