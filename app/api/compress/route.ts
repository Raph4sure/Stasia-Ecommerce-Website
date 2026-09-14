// app/api/compress/route.ts
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
    try {
        const { imageBase64, backgroundColor } = await req.json();

        if (!imageBase64) {
            return NextResponse.json(
                { success: false, error: "No image provided" },
                { status: 400 }
            );
        }

        // Strip the "data:image/png;base64," prefix and get raw bytes.
        // The incoming image is the transparent PNG produced by @imgly/background-removal.
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const inputBuffer = Buffer.from(base64Data, "base64");

        let pipeline = sharp(inputBuffer);

        if (backgroundColor && backgroundColor !== "transparent") {
            // Flatten the transparent PNG onto a solid color background.
            // sharp's flatten() accepts hex color strings directly.
            pipeline = pipeline.flatten({ background: backgroundColor });
        }

        // Re-encode as compressed WebP. Quality 80 is a good size/quality tradeoff
        // for product catalog photos; adjust to taste.
        const outputBuffer = await pipeline.webp({ quality: 80 }).toBuffer();

        const outputBase64 = `data:image/webp;base64,${outputBuffer.toString(
            "base64"
        )}`;

        return NextResponse.json({ success: true, image: outputBase64 });
    } catch (err: any) {
        console.error("Compression error:", err);
        return NextResponse.json(
            { success: false, error: err.message || "Processing failed" },
            { status: 500 }
        );
    }
}
