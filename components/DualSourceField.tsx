"use client";

import React from "react";
import { Check, Sparkles, Library } from "lucide-react";
import DebouncedInput from "@/components/ui/debounced-input";

interface DualSourceFieldProps {
  /** The AI-predicted value (editable). */
  value: string;
  onChange: (value: string | number) => void;
  /** The library default value for the same attribute. */
  libValue?: string;
  /** Which source is currently active for export. */
  activeSource: "ai" | "library";
  onSelectSource: (src: "ai" | "library") => void;
  /** Render the editable value in a monospaced style (used for codes). */
  mono?: boolean;
  placeholder?: string;
}

/**
 * A compact comparison cell that shows the AI prediction and the library
 * default side by side. When the two agree it collapses to a single field with
 * a subtle "match" tag; when they differ it surfaces an AI / Library segmented
 * toggle that picks which value feeds the export. The toggle drives the shared
 * `codeSource`, so Code and Omschrijving stay in sync.
 */
export const DualSourceField: React.FC<DualSourceFieldProps> = ({
  value,
  onChange,
  libValue = "",
  activeSource,
  onSelectSource,
  mono = false,
  placeholder,
}) => {
  const lib = (libValue || "").trim();
  const ai = (value || "").trim();
  const hasLib = lib.length > 0;
  const match = hasLib && ai.toLowerCase() === lib.toLowerCase();

  const inputBase = `w-full rounded-md px-2.5 py-1.5 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors duration-150 ${
    mono ? "font-mono tracking-tight" : ""
  }`;

  // No library candidate — render the plain editable input (unchanged behaviour).
  if (!hasLib) {
    return (
      <DebouncedInput
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputBase} bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200`}
        title={value}
      />
    );
  }

  return (
    <div
      className={`rounded-xl border p-2 transition-colors ${
        match
          ? "border-emerald-300/70 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/10"
          : "border-amber-300/70 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10"
      }`}
    >
      {match ? (
        <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <Check className="h-3 w-3" /> AI = Library
        </div>
      ) : (
        <div className="mb-1.5 inline-flex rounded-lg bg-white/80 dark:bg-gray-900/60 p-0.5 ring-1 ring-gray-200 dark:ring-gray-700">
          <button
            type="button"
            onClick={() => onSelectSource("ai")}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              activeSource === "ai"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-blue-600"
            }`}
            title="Use the AI prediction for export"
          >
            <Sparkles className="h-3 w-3" /> AI
          </button>
          <button
            type="button"
            onClick={() => onSelectSource("library")}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              activeSource === "library"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-amber-600"
            }`}
            title="Use the library default for export"
          >
            <Library className="h-3 w-3" /> Lib
          </button>
        </div>
      )}

      {/* AI value — always editable. Emphasised when AI is the active source. */}
      <DebouncedInput
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputBase} text-gray-800 dark:text-gray-200 ${
          match
            ? "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800"
            : activeSource === "ai"
            ? "bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700 ring-1 ring-blue-200/60"
            : "bg-gray-50/70 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-75"
        }`}
        title={value}
      />

      {/* Library value — shown only when it differs; click to make it active. */}
      {!match && (
        <button
          type="button"
          onClick={() => onSelectSource("library")}
          title={lib}
          className={`mt-1 flex w-full items-center gap-1 truncate rounded-md border px-2 py-1 text-left text-[11px] transition-colors ${
            mono ? "font-mono tracking-tight" : ""
          } ${
            activeSource === "library"
              ? "border-amber-400 bg-amber-100 font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
              : "border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-amber-300 hover:text-amber-600"
          }`}
        >
          <Library className="h-3 w-3 shrink-0 opacity-70" />
          <span className="truncate">{lib}</span>
        </button>
      )}
    </div>
  );
};

export default DualSourceField;
