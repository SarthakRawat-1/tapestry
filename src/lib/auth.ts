/**
 * Simple email/password auth with JWT sessions stored in httpOnly cookies.
 * Users are stored in MongoDB. No third-party auth providers.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getDb } from "./mongodb";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "change-me-in-production") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set to a secure value in production");
    }
    return "dev-only-insecure-secret";
  }
  return secret;
}

const SESSION_COOKIE = "session_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export interface AuthUser {
  id: string;
  email: string;
  createdAt: Date;
}

interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// ---------------------------------------------------------------------------
// Sign Up
// ---------------------------------------------------------------------------

export async function signUp(
  email: string,
  password: string
): Promise<{ user?: AuthUser; error?: string }> {
  const db = await getDb();
  const users = db.collection("users");

  // Check if user already exists
  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();
  const userId = crypto.randomUUID();

  await users.insertOne({
    _id: userId as any,
    email: email.toLowerCase(),
    password: hashedPassword,
    subscriptionTier: "free",
    subscriptionStatus: "active",
    createdAt: now,
    updatedAt: now,
  });

  // Initialize rate limits
  await db.collection("userRateLimits").insertOne({
    userId,
    usageCount: 0,
    resetDate: now.toISOString().split("T")[0],
    tier: "free",
    lastRequestAt: null,
  });

  const user: AuthUser = { id: userId, email: email.toLowerCase(), createdAt: now };
  return { user };
}

// ---------------------------------------------------------------------------
// Sign In
// ---------------------------------------------------------------------------

export async function signIn(
  email: string,
  password: string
): Promise<{ user?: AuthUser; token?: string; error?: string }> {
  const db = await getDb();
  const users = db.collection("users");

  const doc = await users.findOne({ email: email.toLowerCase() });
  if (!doc) {
    return { error: "Invalid email or password" };
  }

  const valid = await bcrypt.compare(password, doc.password as string);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  const user: AuthUser = {
    id: String(doc._id),
    email: doc.email as string,
    createdAt: doc.createdAt as Date,
  };

  const token = jwt.sign(
    { userId: user.id, email: user.email } as JWTPayload,
    getJwtSecret(),
    { expiresIn: SESSION_MAX_AGE }
  );

  return { user, token };
}

// ---------------------------------------------------------------------------
// Session helpers (server-side)
// ---------------------------------------------------------------------------

export async function createSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return {
      id: payload.userId,
      email: payload.email,
      createdAt: new Date(((payload.iat ?? 0) * 1000) || Date.now()),
    };
  } catch {
    return null;
  }
}

/**
 * Verify a JWT token string (used by middleware).
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}
