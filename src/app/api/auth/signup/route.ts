import { NextResponse } from "next/server";
import { signUp, signIn, createSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const { user, error } = await signUp(email, password);
    if (error || !user) {
      return NextResponse.json({ error: error || "Sign up failed" }, { status: 400 });
    }

    // Sign in immediately after sign up to get a token
    const signInResult = await signIn(email, password);
    if (signInResult.error || !signInResult.token) {
      return NextResponse.json({ error: "Account created but sign in failed" }, { status: 500 });
    }

    await createSessionCookie(signInResult.token);

    return NextResponse.json({
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("[Auth Signup] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
