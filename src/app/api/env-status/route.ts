import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const geminiKeyPresent = !!process.env.GEMINI_API_KEY;
    const googleMapsKeyPresent = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    return NextResponse.json(
      {
        geminiKeyPresent,
        googleMapsKeyPresent,
      },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to read env status" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
