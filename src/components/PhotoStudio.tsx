"use client";

import React, { useState } from "react";
import { removeBackground } from "@imgly/background-removal";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
    Download,
    Sparkles,
    Image as ImageIcon,
    Loader2,
    Palette,
} from "lucide-react";

const COLOR_PRESETS = [
    { name: "Pure White", hex: "#ffffff" },
    { name: "Soft Cream", hex: "#fdfbf7" },
    { name: "Warm Beige", hex: "#f5f0eb" },
    { name: "Light Gray", hex: "#f3f4f6" },
    { name: "Pastel Pink", hex: "#fce7f3" },
    { name: "Black", hex: "#000000" },
    { name: "Transparent", hex: "transparent" },
];

/**
 * Takes a transparent PNG blob, paints it onto a solid color background
 * (unless the color is "transparent"), and re-encodes it as WebP.
 * All of this happens on the <canvas> element, entirely in the browser —
 * no network request, no server round trip, no data usage beyond the
 * one-time background-removal model download.
 */
function compositeAndEncode(
    transparentBlob: Blob,
    backgroundColor: string,
    quality = 0.8
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(transparentBlob);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error("Could not get canvas context"));
                return;
            }

            // Paint the background color first (skip entirely for "transparent"
            // so the alpha channel is preserved in the final WebP).
            if (backgroundColor && backgroundColor !== "transparent") {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Draw the subject on top of the background.
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            // Encode as WebP directly from the canvas. All major modern
            // browsers (Chrome, Edge, Firefox, Safari 14+) support this.
            canvas.toBlob(
                (webpBlob) => {
                    if (!webpBlob) {
                        reject(new Error("WebP encoding failed"));
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(webpBlob);
                },
                "image/webp",
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image for compositing"));
        };

        img.src = url;
    });
}

export default function PhotoStudio() {
    const [selectedColor, setSelectedColor] = useState("#ffffff");
    const [customColor, setCustomColor] = useState("#ffffff");
    const [processing, setProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [processedImages, setProcessedImages] = useState<string[]>([]);

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setProcessing(true);
        setProcessedImages([]);
        const results: string[] = [];
        const activeColor =
            selectedColor === "custom" ? customColor : selectedColor;

        try {
            const fileList = Array.from(files);

            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                setStatusText(
                    `Removing background from photo ${i + 1} of ${
                        fileList.length
                    }...`
                );

                // 1. Remove background locally in the browser (ML model, no network call per image)
                const transparentBlob = await removeBackground(file, {
                    model: "isnet_quint8",
                });

                setStatusText(
                    `Applying background & compressing photo ${i + 1}...`
                );

                // 2. Composite the chosen color + encode to WebP — also fully local,
                //    via <canvas>. No fetch, no upload, no download.
                const finalImage = await compositeAndEncode(
                    transparentBlob,
                    activeColor,
                    0.8
                );

                results.push(finalImage);
            }

            setProcessedImages(results);
        } catch (err: any) {
            console.error(err);
            alert("Error processing images. Please try again.");
        } finally {
            setProcessing(false);
            setStatusText("");
        }
    };

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        processedImages.forEach((base64, index) => {
            const data = base64.replace(/^data:image\/\w+;base64,/, "");
            zip.file(`product_photo_${index + 1}.webp`, data, { base64: true });
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "processed_catalog_photos.zip");
    };

    const activeColor =
        selectedColor === "custom" ? customColor : selectedColor;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                    Product Photo Studio
                </h1>
                <p className="text-sm text-stone-500">
                    Upload photos, choose a backdrop color, and download
                    ready-to-use compressed WebP images. Everything runs in your
                    browser — no images are uploaded to a server.
                </p>
            </div>

            {/* Color Selection Palette */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                    <Palette className="w-4 h-4" />
                    Select Background Color
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                    {COLOR_PRESETS.map((preset) => (
                        <button
                            key={preset.hex}
                            type="button"
                            onClick={() => setSelectedColor(preset.hex)}
                            className={`p-2 rounded-lg text-[10px] font-medium border text-center flex flex-col items-center gap-1.5 transition-all ${
                                selectedColor === preset.hex
                                    ? "ring-2 ring-amber-500 border-amber-500 bg-white"
                                    : "border-stone-200 bg-stone-100/50 hover:bg-white"
                            }`}
                        >
                            <span
                                className="w-6 h-6 rounded-full border border-stone-300"
                                style={{
                                    backgroundColor:
                                        preset.hex === "transparent"
                                            ? "transparent"
                                            : preset.hex,
                                    backgroundImage:
                                        preset.hex === "transparent"
                                            ? "repeating-conic-gradient(#e5e5e5 0% 25%, white 0% 50%) 0% 0% / 8px 8px"
                                            : undefined,
                                }}
                            />
                            {preset.name}
                        </button>
                    ))}

                    {/* Custom Color Picker Option */}
                    <button
                        type="button"
                        onClick={() => setSelectedColor("custom")}
                        className={`relative p-2 rounded-lg text-[10px] font-medium border text-center flex flex-col items-center gap-1.5 transition-all ${
                            selectedColor === "custom"
                                ? "ring-2 ring-amber-500 border-amber-500 bg-white"
                                : "border-stone-200 bg-stone-100/50 hover:bg-white"
                        }`}
                    >
                        <span
                            className="w-6 h-6 rounded-full border border-stone-300"
                            style={{ backgroundColor: customColor }}
                        />
                        <input
                            type="color"
                            value={customColor}
                            onChange={(e) => {
                                setCustomColor(e.target.value);
                                setSelectedColor("custom");
                            }}
                            className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                        />
                        Custom
                    </button>
                </div>

                <div className="text-xs text-stone-400">
                    Active color:{" "}
                    <span className="font-mono">{activeColor}</span>
                </div>
            </div>

            {/* Upload Zone */}
            <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center space-y-3">
                <ImageIcon className="w-8 h-8 mx-auto text-stone-400" />
                <p className="text-sm text-stone-600">
                    Select product photos from your device
                </p>
                <p className="text-xs text-stone-400">
                    Supports PNG, JPG, or WebP format
                </p>

                <label className="inline-block px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-amber-600 transition-colors">
                    Choose Photos
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        multiple
                        onChange={handleBulkUpload}
                        className="hidden"
                        disabled={processing}
                    />
                </label>
            </div>

            {/* Processing State Indicator */}
            {processing && (
                <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {statusText}
                </div>
            )}

            {/* Output Grid & Bulk Download */}
            {processedImages.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-stone-700">
                            Processed Images ({processedImages.length})
                        </h2>
                        <button
                            type="button"
                            onClick={handleDownloadZip}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download All (.ZIP)
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {processedImages.map((img, idx) => (
                            <div key={idx} className="space-y-1.5">
                                <img
                                    src={img}
                                    alt={`Processed ${idx + 1}`}
                                    className="w-full aspect-square object-contain rounded-lg border border-stone-200 bg-stone-50"
                                />
                                <a
                                    href={img}
                                    download={`product_photo_${idx + 1}.webp`}
                                    className="block text-center text-[11px] text-stone-500 hover:text-stone-800 underline"
                                >
                                    Download Single
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
