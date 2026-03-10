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
          wrapper: "border border-cyan-100 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
          active: "bg-gradient-to-r from-[#0056D2] to-cyan-500 shadow-lg shadow-cyan-200/70",
          activeText: "text-white",
          idleText: "text-slate-500 hover:text-slate-900",
        }
      : {
          wrapper: "border border-slate-200 bg-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
          active: "bg-white shadow-md",
          activeText: "text-[#0056D2]",
          idleText: "text-slate-500 hover:text-slate-800",
        };

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-1.5 text-[10px] tracking-[0.12em]"
      : "px-3 py-1.5 text-[11px] tracking-wide";

  return (
    <div
      className={`${
        layout === "fill" ? "flex w-full" : "inline-flex"
      } overflow-hidden rounded-full p-1 ${tones.wrapper} ${className}`.trim()}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            whileHover={{ y: -1, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className={`relative ${layout === "fill" ? "min-w-0 flex-1" : ""} cursor-pointer select-none whitespace-nowrap rounded-full font-black uppercase outline-none transition-all duration-300 ${sizeClasses} ${
              active ? "hover:brightness-105" : "hover:-translate-y-0.5 hover:shadow-sm"
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
