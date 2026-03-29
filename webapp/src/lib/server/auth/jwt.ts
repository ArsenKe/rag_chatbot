import { jwtVerify, SignJWT } from 'jose';

const encoder = new TextEncoder();

type Role = 'admin' | 'manager' | 'driver';

export interface JwtPayloadShape {
  sub: string;
  role: Role;
  email?: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is missing');
  }
  return encoder.encode(secret);
}

export async function signAuthToken(payload: JwtPayloadShape): Promise<string> {
  return await new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<JwtPayloadShape | null> {
  try {
    const verified = await jwtVerify(token, getSecret());
    const role = verified.payload.role as Role | undefined;
    if (!verified.payload.sub || !role) {
      return null;
    }

    return {
      sub: verified.payload.sub,
      role,
      email: verified.payload.email as string | undefined
    };
  } catch {
    return null;
  }
}
