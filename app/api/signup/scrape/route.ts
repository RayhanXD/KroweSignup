import { NextResponse } from "next/server";

const SCRAPE_REMOVED_ERROR =
  "Website onboarding scrape has been removed. Continue with manual onboarding.";

export async function GET() {
  return NextResponse.json({ error: SCRAPE_REMOVED_ERROR }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: SCRAPE_REMOVED_ERROR }, { status: 410 });
}

export async function PUT() {
  return NextResponse.json({ error: SCRAPE_REMOVED_ERROR }, { status: 410 });
}
