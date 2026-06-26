"use client";

import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";

type Preset = {
  name: string;
  vialMg: number;
  bacMl: number;
  doseMcg: number;
  color?: string;
};

type DoseUnit = "mcg" | "mg";
const THEME_COLOR = "#A79B8E";
const THEME_COLOR_LIGHT = "#F3EFEA";
const THEME_COLOR_BORDER = "#D8D1C8";
const THEME_COLOR_TEXT = "#7C6F63";

const presets: Preset[] = [
  { name: "Custom", vialMg: 0, bacMl: 0, doseMcg: 0 },

  { name: "Retatrutide 10mg", vialMg: 10, bacMl: 1, doseMcg: 1000 },
  { name: "Retatrutide 15mg", vialMg: 15, bacMl: 1.5, doseMcg: 1000 },
  { name: "Retatrutide 20mg", vialMg: 20, bacMl: 2, doseMcg: 2000 },
  { name: "Retatrutide 30mg", vialMg: 30, bacMl: 3, doseMcg: 2000 },

  { name: "Tirzepatide 15mg", vialMg: 15, bacMl: 1.5, doseMcg: 2500 },
  { name: "Tirzepatide 30mg", vialMg: 30, bacMl: 3, doseMcg: 5000 },
  { name: "Tirzepatide 60mg", vialMg: 60, bacMl: 3, doseMcg: 5000 },

  { name: "GHK-CU 100mg", vialMg: 100, bacMl: 3, doseMcg: 2000 },
  { name: "NAD+ 1000mg", vialMg: 1000, bacMl: 5, doseMcg: 50000 },
  { name: "Glutathione 1200mg", vialMg: 1200, bacMl: 5, doseMcg: 200000 },
  { name: "BPC157 / TB500 20mg", vialMg: 20, bacMl: 2, doseMcg: 2000 },
  { name: "MOTS-c 40mg", vialMg: 40, bacMl: 2, doseMcg: 5000 },
];

const vialQuickPicks = [10, 15, 50];
const bacQuickPicks = [1, 2, 3];
const doseQuickPicks: Record<DoseUnit, number[]> = {
  mg: [1, 1.5, 2],
  mcg: [100, 250, 500],
};

// ── Small inline icons ──────────────────────────────────────────────────────
function SyringeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
      <path d="m18 2 4 4" /><path d="m17 7 3-3" />
      <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
      <path d="m9 11 4 4" /><path d="m5 19-3 3" /><path d="m14 4 6 6" />
    </svg>
  );
}
function VialIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
      <path d="M9 2h6" /><path d="M12 2v3" />
      <path d="M8 6h8l-1 12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
      <path d="M8 12h8" />
    </svg>
  );
}
function WaterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
      <path d="M12 2c0 0-7 8.5-7 13a7 7 0 0 0 14 0c0-4.5-7-13-7-13z" />
    </svg>
  );
}
function DoseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
    </svg>
  );
}

function toNumber(value: string) {
  if (value === "") return 0;
  return Number(value);
}

function getPresetColor() {
  return THEME_COLOR;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

export default function PeptideCalculatorPage() {
  const [selectedPreset, setSelectedPreset] = useState("Custom");
  const [vialMg, setVialMg] = useState(5);
  const [bacMl, setBacMl] = useState(1);
  const [doseMcg, setDoseMcg] = useState(1);
  const [syringeMl, setSyringeMl] = useState(1);
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("mg");
  const [customVial, setCustomVial] = useState("");
  const [customBac, setCustomBac] = useState("");
  const [customDose, setCustomDose] = useState("");
  const [liquidColor, setLiquidColor] = useState(THEME_COLOR);

  // Convert displayed dose value to mcg for calculation
  const doseMcgInternal = doseUnit === "mg" ? doseMcg * 1000 : doseMcg;

  const concentrationMcgPerMl = vialMg > 0 && bacMl > 0 ? (vialMg * 1000) / bacMl : 0;
  const doseMl = concentrationMcgPerMl > 0 ? doseMcgInternal / concentrationMcgPerMl : 0;
  const units = doseMl * 100;
  const maxUnits = syringeMl * 100;
  const percent = Math.min((units / maxUnits) * 100, 100);

  // Shared syringe scale math. Keeps liquid, ticks, and labels on the same line.
  const tubeX = 10;
  const tubeWidth = 740;
  const scaleX = 20;
  const scaleWidth = 720;
  const liquidEndX = scaleX + (percent / 100) * scaleWidth;
  const liquidClipWidth = Math.max(0, liquidEndX - tubeX);

  // "Pull to" as a whole number
  const pullToUnits = Math.round(units);
  const desiredDoseDisplay = doseUnit === "mg" ? doseMcg.toFixed(2) : Math.round(doseMcg).toString();

  function applyPreset(name: string) {
    setSelectedPreset(name);
    const preset = presets.find((item) => item.name === name);
    if (!preset) return;

    const presetDoseMg = preset.doseMcg / 1000;

    setVialMg(preset.vialMg);
    setBacMl(preset.bacMl);
    setDoseMcg(presetDoseMg);
    setDoseUnit("mg");

    // If the preset value is not one of the visible quick-pick buttons,
    // show it in the Other box so the full preset is readable/editable.
    setCustomVial(vialQuickPicks.includes(preset.vialMg) ? "" : formatNumber(preset.vialMg));
    setCustomBac(bacQuickPicks.includes(preset.bacMl) ? "" : formatNumber(preset.bacMl));
    setCustomDose(doseQuickPicks.mg.includes(presetDoseMg) ? "" : formatNumber(presetDoseMg));

    setLiquidColor(THEME_COLOR);
  }

  function keepPresetColor() {
    setLiquidColor(THEME_COLOR);
  }

  function pickVial(val: number) {
    setVialMg(val);
    setCustomVial("");
    keepPresetColor();
  }

  function pickBac(val: number) {
    setBacMl(val);
    setCustomBac("");
    keepPresetColor();
  }

  function pickDose(val: number) {
    setDoseMcg(val);
    setCustomDose("");
    keepPresetColor();
  }

  function changeDoseUnit(nextUnit: DoseUnit) {
    if (nextUnit === doseUnit) return;

    const doseInMcg = doseUnit === "mg" ? doseMcg * 1000 : doseMcg;
    const nextDoseValue = nextUnit === "mg" ? doseInMcg / 1000 : doseInMcg;

    setDoseUnit(nextUnit);
    setDoseMcg(nextDoseValue);
    setCustomDose(doseQuickPicks[nextUnit].includes(nextDoseValue) ? "" : formatNumber(nextDoseValue));
  }

  // Shared style for quick-pick buttons
  const qpActive = "border-[#CFC6BC] bg-[#F3EFEA] text-[#7C6F63]";
  const qpInactive = "border-gray-200 bg-white text-gray-600";

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <SiteHeader />

      <main className="px-5 py-6">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6">

            <h1 className="text-3xl font-bold">Peptide Dose Calculator</h1>
            <p className="mt-2 text-sm text-gray-500">
              Select vial strength, BAC water, dose, and syringe size to calculate syringe units.
            </p>
          </div>

          <div className="space-y-5">

            {/* ── Visual Syringe ── */}
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Visual Syringe</h2>

                </div>
                <span className="rounded-full border-[#E6E0D8] px-3 py-1 text-xs font-semibold text-[#7C6F63]">
                  {syringeMl} mL / {maxUnits} units
                </span>
              </div>

              <div className="w-full">
                <svg viewBox="0 0 760 300" className="pointer-events-none w-full">
                  <defs>
                    <linearGradient id="liquidGradClean" x1="0" x2="1">
                      <stop offset="0" stopColor={liquidColor} />
                      <stop offset="0.55" stopColor={liquidColor} stopOpacity="0.7" />
                      <stop offset="1" stopColor={liquidColor} />
                    </linearGradient>
                    <linearGradient id="glassGradClean" x1="0" x2="1">
                      <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                      <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.2" />
                      <stop offset="1" stopColor="#ffffff" stopOpacity="0.45" />
                    </linearGradient>
                    <clipPath id="liquidClipClean">
                      <rect x={tubeX} y="70" width={liquidClipWidth} height="130" rx="24" />
                    </clipPath>
                    <style>{`
                    @keyframes bubbleFloat {
                      0% { transform: translateY(22px); opacity: 0; }
                      20% { opacity: .45; }
                      80% { opacity: .45; }
                      100% { transform: translateY(-65px); opacity: 0; }
                    }
                    @keyframes liquidWave {
                      0% { transform: translateX(0px); }
                      50% { transform: translateX(18px); }
                      100% { transform: translateX(0px); }
                    }
                    @keyframes shimmerMove {
                      0% { transform: translateX(-120px); opacity: 0; }
                      25% { opacity: .18; }
                      65% { opacity: .12; }
                      100% { transform: translateX(520px); opacity: 0; }
                    }
                    .dose-bubble { animation: bubbleFloat 4.5s linear infinite; }
                    .dose-wave   { animation: liquidWave 5s ease-in-out infinite; }
                    .dose-shimmer{ animation: shimmerMove 6.5s ease-in-out infinite; }
                  `}</style>
                  </defs>

                  {/* Outer glass tube — full width */}
                  <g filter="drop-shadow(0 18px 26px rgba(15,23,42,.12))">
                    <rect x="0" y="40" width="760" height="200" rx="34" fill="#ffffff" />
                    <rect x="0" y="40" width="760" height="200" rx="34" fill="url(#glassGradClean)" />
                    <rect x="0" y="40" width="760" height="200" rx="34" fill="none" stroke="#d7dde6" strokeWidth="4" />
                    <rect x={tubeX} y="70" width={tubeWidth} height="130" rx="24" fill="#f8fafc" stroke="#d7dde6" strokeWidth="2" />
                  </g>

                  {/* Liquid */}
                  <g clipPath="url(#liquidClipClean)">
                    <rect x={tubeX} y="70" width={tubeWidth} height="130" rx="24" fill="url(#liquidGradClean)" opacity="0.96" />
                    <path className="dose-wave"
                      d="M10,100 C90,82 170,112 250,96 C330,80 410,114 490,98 C570,82 650,110 730,96 L750,70 L10,70 Z"
                      fill="#ffffff" opacity="0.12" />
                    <rect className="dose-shimmer" x="20" y="70" width="130" height="130" rx="24" fill="#ffffff" opacity="0.14" />
                    {percent > 3 && (
                      <>
                        <circle className="dose-bubble" cx="150" cy="168" r="6" fill="white" opacity=".35" />
                        <circle className="dose-bubble" cx="280" cy="155" r="4" fill="white" opacity=".35" style={{ animationDelay: "-1s" }} />
                        <circle className="dose-bubble" cx="400" cy="172" r="7" fill="white" opacity=".3" style={{ animationDelay: "-2s" }} />
                        <circle className="dose-bubble" cx="520" cy="160" r="5" fill="white" opacity=".35" style={{ animationDelay: "-3s" }} />
                        <circle className="dose-bubble" cx="630" cy="168" r="6" fill="white" opacity=".3" style={{ animationDelay: "-1.5s" }} />
                        <circle className="dose-bubble" cx="710" cy="155" r="4" fill="white" opacity=".4" style={{ animationDelay: "-2.5s" }} />
                      </>
                    )}
                  </g>

                  {/* Scale marks and numbers inside the tube */}
                  <g opacity="0.95">
                    {Array.from({ length: 31 }).map((_, index) => {
                      const x = scaleX + (index / 30) * scaleWidth;
                      const isMajor = index % 5 === 0;
                      return (
                        <line
                          key={index}
                          x1={x}
                          y1="74"
                          x2={x}
                          y2={isMajor ? 118 : 98}
                          stroke="#334155"
                          strokeWidth={isMajor ? 2 : 1.15}
                          opacity={isMajor ? 0.72 : 0.38}
                        />
                      );
                    })}
                    {Array.from({
                      length: syringeMl === 1 ? 11 : syringeMl === 0.5 ? 11 : 7,
                    }).map((_, index) => {
                      const step = syringeMl === 1 ? 10 : syringeMl === 0.5 ? 5 : 5;
                      const label = index * step;
                      const maxLabel = syringeMl === 1 ? 100 : syringeMl === 0.5 ? 50 : 30;
                      if (label > maxLabel) return null;
                      // Match labels to the same scale used by the liquid fill.
                      // Only clamp edge labels so 0 and max stay visually inside the tube.
                      const rawX = scaleX + (label / maxLabel) * scaleWidth;
                      const x = Math.min(Math.max(rawX, 30), 730);
                      return (
                        <text
                          key={label}
                          x={x}
                          y="142"
                          fontSize="15"
                          fontWeight="500"
                          fill="#1f2937"
                          textAnchor="middle"
                        >
                          {label}
                        </text>
                      );
                    })}
                  </g>
                </svg>
              </div>

              {/* Results under syringe — "Pull to" as whole number */}
              <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-2xl border border-[#E6E0D8] bg-[#F8F5F1]">
                <div className="border-r border-[#E6E0D8] p-3 text-center">
                  <p className="text-xs text-[#7C6F63]">Pull to</p>
                  <p className="text-xl font-bold text-[#7C6F63]">{pullToUnits}</p>
                  <p className="text-xs font-semibold text-[#7C6F63]">units</p>
                </div>
                <div className="border-r border-[#E6E0D8] p-3 text-center">
                  <p className="text-xs text-[#7C6F63]">Dose Vol</p>
                  <p className="text-xl font-bold text-[#7C6F63]">{doseMl.toFixed(3)}</p>
                  <p className="text-xs font-semibold text-[#7C6F63]">mL</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-xs text-[#7C6F63]">Desired Dose</p>
                  <p className="text-xl font-bold text-[#7C6F63]">{desiredDoseDisplay}</p>
                  <p className="text-xs font-semibold text-[#7C6F63]">{doseUnit}</p>
                </div>
              </div>

              {/* Preset dropdown — moved inside syringe card */}
              <div className="mt-4">
                <select
                  value={selectedPreset}
                  onChange={(e) => applyPreset(e.target.value)}
                  onBlur={(e) => applyPreset(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold"
                >
                  {presets.map((preset) => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* ── Calculator ── */}
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Calculator</h2>

              <div className="space-y-5">

                {/* Syringe Size */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                    <SyringeIcon /> Syringe Size
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[0.3, 0.5, 1].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSyringeMl(size)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold ${syringeMl === size ? qpActive : qpInactive
                          }`}
                      >
                        {size}mL
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vial Strength */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                    <VialIcon /> Peptide Vial Strength
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {vialQuickPicks.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => pickVial(v)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold ${vialMg === v && customVial === "" ? qpActive : qpInactive
                          }`}
                      >
                        {v}mg
                      </button>
                    ))}
                    <input
                      type="number"
                      placeholder="Other"
                      value={customVial}
                      inputMode="decimal"
                      onChange={(e) => {
                        setCustomVial(e.target.value);
                        setVialMg(toNumber(e.target.value));
                        keepPresetColor();
                      }}
                      className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold placeholder-gray-300"
                    />
                    <span className="self-center text-sm font-semibold text-gray-400">mg</span>
                  </div>
                </div>

                {/* BAC Water */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                    <WaterIcon /> BAC Water Added
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {bacQuickPicks.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => pickBac(v)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold ${bacMl === v && customBac === "" ? qpActive : qpInactive
                          }`}
                      >
                        {v}mL
                      </button>
                    ))}
                    <input
                      type="number"
                      placeholder="Other"
                      value={customBac}
                      inputMode="decimal"
                      onChange={(e) => {
                        setCustomBac(e.target.value);
                        setBacMl(toNumber(e.target.value));
                        keepPresetColor();
                      }}
                      className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold placeholder-gray-300"
                    />
                    <span className="self-center text-sm font-semibold text-gray-400">mL</span>
                  </div>
                </div>

                {/* Desired Dose */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                      <DoseIcon /> Desired Dose
                    </p>
                    <select
                      value={doseUnit}
                      onChange={(e) => changeDoseUnit(e.target.value as DoseUnit)}
                      className="rounded-xl border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-600"
                    >
                      <option value="mg">mg</option>
                      <option value="mcg">mcg</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doseQuickPicks[doseUnit].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => pickDose(v)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold ${doseMcg === v && customDose === "" ? qpActive : qpInactive
                          }`}
                      >
                        {v}{doseUnit}
                      </button>
                    ))}
                    <input
                      type="number"
                      placeholder="Other"
                      value={customDose}
                      inputMode="decimal"
                      onChange={(e) => {
                        setCustomDose(e.target.value);
                        setDoseMcg(toNumber(e.target.value));
                        keepPresetColor();
                      }}
                      className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold placeholder-gray-300"
                    />
                    <span className="self-center text-sm font-semibold text-gray-400">{doseUnit}</span>
                  </div>
                </div>

              </div>
            </section>

            {/* ── Result ── unchanged from original */}
            <section className="rounded-3xl bg-black p-5 text-white shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Result</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-gray-300">Pull to</p>
                  <p className="text-3xl font-bold">{pullToUnits}</p>
                  <p className="text-sm text-gray-300">units</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-gray-300">Dose volume</p>
                  <p className="text-3xl font-bold">{doseMl.toFixed(3)}</p>
                  <p className="text-sm text-gray-300">mL</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-gray-300">Concentration</p>
                  <p className="text-xl font-bold">{concentrationMcgPerMl.toFixed(0)}</p>
                  <p className="text-sm text-gray-300">mcg / mL</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-gray-300">Syringe</p>
                  <p className="text-xl font-bold">{syringeMl} mL</p>
                  <p className="text-sm text-gray-300">{maxUnits} units max</p>
                </div>
              </div>

              {units > maxUnits && (
                <p className="mt-4 rounded-2xl bg-red-500/20 p-3 text-sm text-red-100">
                  This dose exceeds the selected syringe size. Choose a larger syringe or adjust dose.
                </p>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}