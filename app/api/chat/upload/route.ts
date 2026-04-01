import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename to avoid collisions
    const uniqueId = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `${uniqueId}-${file.name.replace(/\s+/g, "_")}`;
    
    const uploadDir = join(process.cwd(), "public", "uploads");
    
    // Ensure dir exists (double check)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const path = join(uploadDir, filename);
    await writeFile(path, buffer);

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ 
      url: fileUrl,
      name: file.name
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
