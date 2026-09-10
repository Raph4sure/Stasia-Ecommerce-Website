import React from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

interface ActionDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "warning" | "danger";
    onCancel: () => void;
    onConfirm?: () => void;
}

export const ActionDialog: React.FC<ActionDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = "OK",
    tone = "warning",
    onCancel,
    onConfirm,
}) => {
    if (!isOpen) return null;

    const isDanger = tone === "danger";

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900">
                <div className="flex items-start gap-3">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isDanger
                                ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                        }`}
                    >
                        {isDanger ? (
                            <AlertTriangle className="h-5 w-5" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                            {title}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                            {message}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Close dialog"
                        className="rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    {onConfirm && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onConfirm || onCancel}
                        className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition ${
                            isDanger
                                ? "bg-rose-600 hover:bg-rose-500"
                                : "bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
