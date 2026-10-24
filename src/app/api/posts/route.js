import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function getPostsFromDisk() {
  const filePath = path.join(process.cwd(), "public", "data", "posts.json");
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  }
  return [];
}

export async function GET() {
  try {
    const posts = getPostsFromDisk();
    return NextResponse.json(posts, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal membaca data postingan.", details: err.message },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(
      { success: true, message: "Postingan diterima oleh API.", data: body },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Payload tidak valid.", details: err.message },
      { status: 400 },
    );
  }
}
