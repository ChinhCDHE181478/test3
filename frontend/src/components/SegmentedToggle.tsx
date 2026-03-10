"use client";

import { motion } from "framer-motion";

type SegmentedToggleOption = {
  value: string;
  label: string;
};

type SegmentedToggleProps = {
  options: SegmentedToggleOption[];
  value: string;
  onChange: (value: string) => void;
  groupId: string;
  tone?: "default" | "brand";
  layout?: "fit" | "fill";
  size?: "sm" | "md";
  className?: string;
};

export default function SegmentedToggle({
  options,
  value,
  onChange,
  groupId,
  tone = "default",
  layout = "fit",
  size = "md",
  className = "",
}: SegmentedToggleProps) {
  const tones =
    tone === "brand"
      ? {
          wrapper: "border border-cyan-100 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
          active:
            "bg-gradient-to-r from-[#0056D2] to-cyan-500 shadow-md shadow-cyan-200/60 ring-2 ring-white/90",
          activeText: "text-white",
          idleText: "text-slate-500 hover:text-slate-900",
        }
      : {
          wrapper: "border border-slate-200 bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
          active: "bg-white shadow-sm ring-1 ring-white/90",
          activeText: "text-[#0056D2]",
          idleText: "text-slate-500 hover:text-slate-800",
        };

  const sizeClasses =
    size === "sm"
      ? "min-h-8 px-2.5 py-1.5 text-[10px] tracking-[0.12em]"
      : "min-h-9 px-3 py-1.5 text-[11px] tracking-wide";

  return (
    <div
      className={`${
        layout === "fill" ? "flex w-full" : "inline-flex"
      } items-center gap-1 rounded-full p-1.5 ${tones.wrapper} ${className}`.trim()}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className={`relative inline-flex items-center justify-center ${layout === "fill" ? "min-w-0 flex-1" : ""} cursor-pointer select-none whitespace-nowrap rounded-full font-black uppercase outline-none transition-all duration-300 ${sizeClasses} ${
              active ? "hover:brightness-105" : "hover:shadow-sm"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`segmented-toggle-thumb-${groupId}`}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={`absolute inset-0 rounded-full ${tones.active}`}
              />
            )}
            {!active && (
              <span className="absolute inset-0 rounded-full bg-white/0 opacity-0 transition-opacity duration-300 hover:opacity-100" />
            )}
            <span className={`relative z-10 ${active ? tones.activeText : tones.idleText}`}>{option.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
