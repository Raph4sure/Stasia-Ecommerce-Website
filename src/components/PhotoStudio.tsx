// "use client";

// import React, { useState } from "react";
// import { removeBackground } from "@imgly/background-removal";
// import JSZip from "jszip";
// import { saveAs } from "file-saver";
// import {
//     Download,
//     Sparkles,
//     Image as ImageIcon,
//     Loader2,
//     Palette,
// } from "lucide-react";

// const COLOR_PRESETS = [
//     { name: "Pure White", hex: "#ffffff" },
//     { name: "Soft Cream", hex: "#fdfbf7" },
//     { name: "Warm Beige", hex: "#f5f0eb" },
//     { name: "Light Gray", hex: "#f3f4f6" },
//     { name: "Pastel Pink", hex: "#fce7f3" },
//     { name: "Black", hex: "#000000" },
//     { name: "Transparent", hex: "transparent" },
// ];

// /**
//  * Takes a transparent PNG blob, paints it onto a solid color background
//  * (unless the color is "transparent"), and re-encodes it as WebP.
//  * All of this happens on the <canvas> element, entirely in the browser —
//  * no network request, no server round trip, no data usage beyond the
//  * one-time background-removal model download.
//  */
// function compositeAndEncode(
//     transparentBlob: Blob,
//     backgroundColor: string,
//     quality = 0.8
// ): Promise<string> {
//     return new Promise((resolve, reject) => {
//         const img = new Image();
//         const url = URL.createObjectURL(transparentBlob);

//         img.onload = () => {
//             const canvas = document.createElement("canvas");
//             canvas.width = img.width;
//             canvas.height = img.height;
//             const ctx = canvas.getContext("2d");

//             if (!ctx) {
//                 URL.revokeObjectURL(url);
//                 reject(new Error("Could not get canvas context"));
//                 return;
//             }

//             // Paint the background color first (skip entirely for "transparent"
//             // so the alpha channel is preserved in the final WebP).
//             if (backgroundColor && backgroundColor !== "transparent") {
//                 ctx.fillStyle = backgroundColor;
//                 ctx.fillRect(0, 0, canvas.width, canvas.height);
//             }

//             // Draw the subject on top of the background.
//             ctx.drawImage(img, 0, 0);
//             URL.revokeObjectURL(url);

//             // Encode as WebP directly from the canvas. All major modern
//             // browsers (Chrome, Edge, Firefox, Safari 14+) support this.
//             canvas.toBlob(
//                 (webpBlob) => {
//                     if (!webpBlob) {
//                         reject(new Error("WebP encoding failed"));
//                         return;
//                     }
//                     const reader = new FileReader();
//                     reader.onload = () => resolve(reader.result as string);
//                     reader.onerror = reject;
//                     reader.readAsDataURL(webpBlob);
//                 },
//                 "image/webp",
//                 quality
//             );
//         };

//         img.onerror = () => {
//             URL.revokeObjectURL(url);
//             reject(new Error("Failed to load image for compositing"));
//         };

//         img.src = url;
//     });
// }

// export default function PhotoStudio() {
//     const [selectedColor, setSelectedColor] = useState("#ffffff");
//     const [customColor, setCustomColor] = useState("#ffffff");
//     const [processing, setProcessing] = useState(false);
//     const [statusText, setStatusText] = useState("");
//     const [processedImages, setProcessedImages] = useState<string[]>([]);

//     const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//         const files = e.target.files;
//         if (!files || files.length === 0) return;

//         setProcessing(true);
//         setProcessedImages([]);
//         const results: string[] = [];
//         const activeColor =
//             selectedColor === "custom" ? customColor : selectedColor;

//         try {
//             const fileList = Array.from(files);

//             for (let i = 0; i < fileList.length; i++) {
//                 const file = fileList[i];
//                 setStatusText(
//                     `Removing background from photo ${i + 1} of ${
//                         fileList.length
//                     }...`
//                 );

//                 // 1. Remove background locally in the browser (ML model, no network call per image)
//                 const transparentBlob = await removeBackground(file, {
//                     model: "isnet_quint8",
//                 });

//                 setStatusText(
//                     `Applying background & compressing photo ${i + 1}...`
//                 );

//                 // 2. Composite the chosen color + encode to WebP — also fully local,
//                 //    via <canvas>. No fetch, no upload, no download.
//                 const finalImage = await compositeAndEncode(
//                     transparentBlob,
//                     activeColor,
//                     0.8
//                 );

//                 results.push(finalImage);
//             }

//             setProcessedImages(results);
//         } catch (err: any) {
//             console.error(err);
//             alert("Error processing images. Please try again.");
//         } finally {
//             setProcessing(false);
//             setStatusText("");
//         }
//     };

//     const handleDownloadZip = async () => {
//         const zip = new JSZip();
//         processedImages.forEach((base64, index) => {
//             const data = base64.replace(/^data:image\/\w+;base64,/, "");
//             zip.file(`product_photo_${index + 1}.webp`, data, { base64: true });
//         });

//         const content = await zip.generateAsync({ type: "blob" });
//         saveAs(content, "processed_catalog_photos.zip");
//     };

//     const activeColor =
//         selectedColor === "custom" ? customColor : selectedColor;

//     return (
//         <div className="max-w-4xl mx-auto p-6 space-y-8">
//             {/* Header */}
//             <div className="space-y-1">
//                 <h1 className="text-2xl font-semibold flex items-center gap-2">
//                     <Sparkles className="w-6 h-6 text-amber-500" />
//                     Product Photo Studio
//                 </h1>
//                 <p className="text-sm text-stone-500">
//                     Upload photos, choose a backdrop color, and download
//                     ready-to-use compressed WebP images. Everything runs in your
//                     browser — no images are uploaded to a server.
//                 </p>
//             </div>

//             {/* Color Selection Palette */}
//             <div className="space-y-3">
//                 <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
//                     <Palette className="w-4 h-4" />
//                     Select Background Color
//                 </div>

//                 <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
//                     {COLOR_PRESETS.map((preset) => (
//                         <button
//                             key={preset.hex}
//                             type="button"
//                             onClick={() => setSelectedColor(preset.hex)}
//                             className={`p-2 rounded-lg text-[10px] font-medium border text-center flex flex-col items-center gap-1.5 transition-all ${
//                                 selectedColor === preset.hex
//                                     ? "ring-2 ring-amber-500 border-amber-500 bg-white"
//                                     : "border-stone-200 bg-stone-100/50 hover:bg-white"
//                             }`}
//                         >
//                             <span
//                                 className="w-6 h-6 rounded-full border border-stone-300"
//                                 style={{
//                                     backgroundColor:
//                                         preset.hex === "transparent"
//                                             ? "transparent"
//                                             : preset.hex,
//                                     backgroundImage:
//                                         preset.hex === "transparent"
//                                             ? "repeating-conic-gradient(#e5e5e5 0% 25%, white 0% 50%) 0% 0% / 8px 8px"
//                                             : undefined,
//                                 }}
//                             />
//                             {preset.name}
//                         </button>
//                     ))}

//                     {/* Custom Color Picker Option */}
//                     <button
//                         type="button"
//                         onClick={() => setSelectedColor("custom")}
//                         className={`relative p-2 rounded-lg text-[10px] font-medium border text-center flex flex-col items-center gap-1.5 transition-all ${
//                             selectedColor === "custom"
//                                 ? "ring-2 ring-amber-500 border-amber-500 bg-white"
//                                 : "border-stone-200 bg-stone-100/50 hover:bg-white"
//                         }`}
//                     >
//                         <span
//                             className="w-6 h-6 rounded-full border border-stone-300"
//                             style={{ backgroundColor: customColor }}
//                         />
//                         <input
//                             type="color"
//                             value={customColor}
//                             onChange={(e) => {
//                                 setCustomColor(e.target.value);
//                                 setSelectedColor("custom");
//                             }}
//                             className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
//                         />
//                         Custom
//                     </button>
//                 </div>

//                 <div className="text-xs text-stone-400">
//                     Active color:{" "}
//                     <span className="font-mono">{activeColor}</span>
//                 </div>
//             </div>

//             {/* Upload Zone */}
//             <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center space-y-3">
//                 <ImageIcon className="w-8 h-8 mx-auto text-stone-400" />
//                 <p className="text-sm text-stone-600">
//                     Select product photos from your device
//                 </p>
//                 <p className="text-xs text-stone-400">
//                     Supports PNG, JPG, or WebP format
//                 </p>

//                 <label className="inline-block px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-amber-600 transition-colors">
//                     Choose Photos
//                     <input
//                         type="file"
//                         accept="image/png, image/jpeg, image/webp"
//                         multiple
//                         onChange={handleBulkUpload}
//                         className="hidden"
//                         disabled={processing}
//                     />
//                 </label>
//             </div>

//             {/* Processing State Indicator */}
//             {processing && (
//                 <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
//                     <Loader2 className="w-4 h-4 animate-spin" />
//                     {statusText}
//                 </div>
//             )}

//             {/* Output Grid & Bulk Download */}
//             {processedImages.length > 0 && (
//                 <div className="space-y-4">
//                     <div className="flex items-center justify-between">
//                         <h2 className="text-sm font-medium text-stone-700">
//                             Processed Images ({processedImages.length})
//                         </h2>
//                         <button
//                             type="button"
//                             onClick={handleDownloadZip}
//                             className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800"
//                         >
//                             <Download className="w-3.5 h-3.5" />
//                             Download All (.ZIP)
//                         </button>
//                     </div>

//                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//                         {processedImages.map((img, idx) => (
//                             <div key={idx} className="space-y-1.5">
//                                 <img
//                                     src={img}
//                                     alt={`Processed ${idx + 1}`}
//                                     className="w-full aspect-square object-contain rounded-lg border border-stone-200 bg-stone-50"
//                                 />
//                                 <a
//                                     href={img}
//                                     download={`product_photo_${idx + 1}.webp`}
//                                     className="block text-center text-[11px] text-stone-500 hover:text-stone-800 underline"
//                                 >
//                                     Download Single
//                                 </a>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }








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
    Minimize2,
    Eraser,
    Settings,
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

type Mode = "remove-bg" | "compress-only";

/**
 * Compresses an image file to WebP format using canvas — no background removal.
 * Optionally resizes if the image exceeds maxDimension.
 */
function compressImage(
    file: File,
    quality: number,
    maxDimension: number = 0
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            let { width, height } = img;

            // Optionally resize if maxDimension is set
            if (maxDimension > 0) {
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error("Could not get canvas context"));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);

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
            reject(new Error("Failed to load image for compression"));
        };

        img.src = url;
    });
}

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

export default function App() {
    const [mode, setMode] = useState<Mode>("remove-bg");
    const [selectedColor, setSelectedColor] = useState("#ffffff");
    const [customColor, setCustomColor] = useState("#ffffff");
    const [quality, setQuality] = useState(0.8);
    const [processing, setProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [processedImages, setProcessedImages] = useState<string[]>([]);
    const [originalSizes, setOriginalSizes] = useState<number[]>([]);
    const [processedSizes, setProcessedSizes] = useState<number[]>([]);

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setProcessing(true);
        setProcessedImages([]);
        setOriginalSizes([]);
        setProcessedSizes([]);
        const results: string[] = [];
        const origSizes: number[] = [];
        const procSizes: number[] = [];
        const activeColor =
            selectedColor === "custom" ? customColor : selectedColor;

        try {
            const fileList = Array.from(files);

            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                origSizes.push(file.size);

                if (mode === "remove-bg") {
                    setStatusText(
                        `Removing background from photo ${i + 1} of ${
                            fileList.length
                        }...`
                    );

                    // 1. Remove background locally in the browser
                    const transparentBlob = await removeBackground(file, {
                        model: "isnet_quint8",
                    });

                    setStatusText(
                        `Applying background & compressing photo ${i + 1}...`
                    );

                    // 2. Composite the chosen color + encode to WebP
                    const finalImage = await compositeAndEncode(
                        transparentBlob,
                        activeColor,
                        quality
                    );

                    // Calculate processed size from base64
                    const base64Data = finalImage.replace(
                        /^data:image\/\w+;base64,/,
                        ""
                    );
                    procSizes.push(Math.round((base64Data.length * 3) / 4));
                    results.push(finalImage);
                } else {
                    // Compress-only mode
                    setStatusText(
                        `Compressing photo ${i + 1} of ${fileList.length}...`
                    );

                    const compressedImage = await compressImage(file, quality);

                    // Calculate processed size from base64
                    const base64Data = compressedImage.replace(
                        /^data:image\/\w+;base64,/,
                        ""
                    );
                    procSizes.push(Math.round((base64Data.length * 3) / 4));
                    results.push(compressedImage);
                }
            }

            setProcessedImages(results);
            setOriginalSizes(origSizes);
            setProcessedSizes(procSizes);
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

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

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

            {/* Mode Toggle */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                    <Settings className="w-4 h-4" />
                    Select Mode
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setMode("remove-bg")}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            mode === "remove-bg"
                                ? "border-amber-500 bg-amber-50 shadow-sm"
                                : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Eraser
                                className={`w-5 h-5 ${
                                    mode === "remove-bg"
                                        ? "text-amber-600"
                                        : "text-stone-400"
                                }`}
                            />
                            <span
                                className={`text-sm font-semibold ${
                                    mode === "remove-bg"
                                        ? "text-amber-800"
                                        : "text-stone-700"
                                }`}
                            >
                                Remove Background
                            </span>
                        </div>
                        <p className="text-xs text-stone-500">
                            AI-powered background removal with color replacement
                        </p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("compress-only")}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            mode === "compress-only"
                                ? "border-emerald-500 bg-emerald-50 shadow-sm"
                                : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Minimize2
                                className={`w-5 h-5 ${
                                    mode === "compress-only"
                                        ? "text-emerald-600"
                                        : "text-stone-400"
                                }`}
                            />
                            <span
                                className={`text-sm font-semibold ${
                                    mode === "compress-only"
                                        ? "text-emerald-800"
                                        : "text-stone-700"
                                }`}
                            >
                                Compress Only
                            </span>
                        </div>
                        <p className="text-xs text-stone-500">
                            Reduce file size without changing the image content
                        </p>
                    </button>
                </div>
            </div>

            {/* Quality Slider */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                        <Minimize2 className="w-4 h-4" />
                        Compression Quality
                    </label>
                    <span className="text-sm font-mono text-stone-500">
                        {Math.round(quality * 100)}%
                    </span>
                </div>
                <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-xs text-stone-400">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                </div>
            </div>

            {/* Color Selection Palette — only shown in remove-bg mode */}
            {mode === "remove-bg" && (
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
            )}

            {/* Upload Zone */}
            <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center space-y-3">
                <ImageIcon className="w-8 h-8 mx-auto text-stone-400" />
                <p className="text-sm text-stone-600">
                    {mode === "remove-bg"
                        ? "Select product photos from your device"
                        : "Select images to compress"}
                </p>
                <p className="text-xs text-stone-400">
                    Supports PNG, JPG, or WebP format
                </p>

                <label
                    className={`inline-block px-4 py-2 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                        mode === "remove-bg"
                            ? "bg-amber-500 hover:bg-amber-600"
                            : "bg-emerald-500 hover:bg-emerald-600"
                    }`}
                >
                    {mode === "remove-bg"
                        ? "Choose Photos"
                        : "Choose Images to Compress"}
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
                            {mode === "remove-bg"
                                ? "Processed Images"
                                : "Compressed Images"}{" "}
                            ({processedImages.length})
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

                    {/* Summary Stats */}
                    {originalSizes.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                            <div className="text-center">
                                <div className="text-xs text-stone-500">
                                    Original
                                </div>
                                <div className="text-sm font-semibold text-stone-700">
                                    {formatSize(
                                        originalSizes.reduce((a, b) => a + b, 0)
                                    )}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-stone-500">
                                    {mode === "remove-bg"
                                        ? "Processed"
                                        : "Compressed"}
                                </div>
                                <div className="text-sm font-semibold text-stone-700">
                                    {formatSize(
                                        processedSizes.reduce(
                                            (a, b) => a + b,
                                            0
                                        )
                                    )}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-stone-500">
                                    Saved
                                </div>
                                <div className="text-sm font-semibold text-emerald-600">
                                    {(() => {
                                        const origTotal = originalSizes.reduce(
                                            (a, b) => a + b,
                                            0
                                        );
                                        const procTotal = processedSizes.reduce(
                                            (a, b) => a + b,
                                            0
                                        );
                                        const saved = origTotal - procTotal;
                                        const pct =
                                            origTotal > 0
                                                ? Math.round(
                                                      (saved / origTotal) * 100
                                                  )
                                                : 0;
                                        return saved > 0
                                            ? `${formatSize(saved)} (${pct}%)`
                                            : `+${formatSize(Math.abs(saved))}`;
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {processedImages.map((img, idx) => (
                            <div key={idx} className="space-y-1.5">
                                <img
                                    src={img}
                                    alt={`Processed ${idx + 1}`}
                                    className="w-full aspect-square object-contain rounded-lg border border-stone-200 bg-stone-50"
                                />
                                <div className="text-[10px] text-stone-400 text-center">
                                    {originalSizes[idx] && (
                                        <>
                                            {formatSize(originalSizes[idx])} →{" "}
                                            <span className="text-emerald-600 font-medium">
                                                {formatSize(
                                                    processedSizes[idx]
                                                )}
                                            </span>
                                        </>
                                    )}
                                </div>
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
