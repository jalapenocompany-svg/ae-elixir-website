"use client";

import { useEffect, useMemo, useState } from "react";
import "./medication-level.css";

type PeptideKey =
  | "retatrutide"
  | "ghkcu"
  | "motsc"
  | "nad"
  | "bpc_tb"
  | "tesamorelin"
  | "cjc_ipa"
  | "pt141"
  | "semax"
  | "selank"
  | "ara290"
  | "dsip"
  | "glutathione";

type DoseEntry = {
  id: string;
  peptide: PeptideKey;
  doseMg: number;
  date: string;
  time: string;
  site: string;
};

const PEPTIDES: Record<
  PeptideKey,
  {
    name: string;
    color: string;
    halfLifeHours: number;
  }
> = {
  retatrutide: { name: "Retatrutide", color: "#7b6ef6", halfLifeHours: 144 },
  ghkcu: { name: "GHK-Cu", color: "#3d9be9", halfLifeHours: 8 },
  motsc: { name: "MOTSc", color: "#f59e0b", halfLifeHours: 6 },
  nad: { name: "NAD+", color: "#f5a6c8", halfLifeHours: 4 },
  bpc_tb: { name: "BPC-157 / TB-500", color: "#4caf73", halfLifeHours: 24 },
  tesamorelin: { name: "Tesamorelin", color: "#eab308", halfLifeHours: 0.6 },
  cjc_ipa: { name: "CJC1295 / Ipamorelin", color: "#ef6f6c", halfLifeHours: 30 },
  pt141: { name: "PT-141", color: "#a78bfa", halfLifeHours: 2.7 },
  semax: { name: "Semax", color: "#f8b4d9", halfLifeHours: 1 },
  selank: { name: "Selank", color: "#f8b4d9", halfLifeHours: 1 },
  ara290: { name: "ARA-290", color: "#f87171", halfLifeHours: 0.35 },
  dsip: { name: "DSIP", color: "#2dd4bf", halfLifeHours: 1 },
  glutathione: { name: "Glutathione", color: "#d9a900", halfLifeHours: 2 },
};

const rangeOptions = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentTime() {
  return new Date().toTimeString().slice(0, 5);
}

function doseDateTime(entry: DoseEntry) {
  return new Date(`${entry.date}T${entry.time || "00:00"}`);
}

function estimateRemaining(entry: DoseEntry, at: Date) {
  const peptide = PEPTIDES[entry.peptide];
  const doseTime = doseDateTime(entry);
  const hoursSinceDose = (at.getTime() - doseTime.getTime()) / 36e5;

  if (hoursSinceDose < 0) return 0;

  return entry.doseMg * Math.pow(0.5, hoursSinceDose / peptide.halfLifeHours);
}

function formatDateTime(entry?: DoseEntry) {
  if (!entry) return "No dose logged yet";

  const dt = doseDateTime(entry);
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MedicationLevelClient({ seller }: { seller: string }) {
  const storageKey = `pepmistry-medication-level-${seller}`;

  const [selectedPeptide, setSelectedPeptide] = useState<PeptideKey>("retatrutide");
  const [doseMg, setDoseMg] = useState("2");
  const [doseDate, setDoseDate] = useState(getTodayDate());
  const [doseTime, setDoseTime] = useState(getCurrentTime());
  const [site, setSite] = useState("Stomach - Upper Right");
  const [rangeDays, setRangeDays] = useState(90);
  const [entries, setEntries] = useState<DoseEntry[]>([]);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch {
        setEntries([]);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, storageKey]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => entry.peptide === selectedPeptide);
  }, [entries, selectedPeptide]);

  const latestDose = useMemo(() => {
    return [...filteredEntries].sort(
      (a, b) => doseDateTime(b).getTime() - doseDateTime(a).getTime()
    )[0];
  }, [filteredEntries]);

  const currentLevel = useMemo(() => {
    const now = new Date();
    return filteredEntries.reduce((sum, entry) => sum + estimateRemaining(entry, now), 0);
  }, [filteredEntries]);

  const chartData = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - Math.floor(rangeDays * 0.75));

    const end = new Date(now);
    end.setDate(now.getDate() + Math.floor(rangeDays * 0.25));

    const points = 80;

    return Array.from({ length: points }, (_, index) => {
      const t = new Date(
        start.getTime() + ((end.getTime() - start.getTime()) * index) / (points - 1)
      );

      const level = filteredEntries.reduce(
        (sum, entry) => sum + estimateRemaining(entry, t),
        0
      );

      return {
        date: t,
        level,
        isFuture: t > now,
      };
    });
  }, [filteredEntries, rangeDays]);

  const selected = PEPTIDES[selectedPeptide];

  function addDose() {
    const parsedDose = Number(doseMg);

    if (!parsedDose || parsedDose <= 0) return;

    const newEntry: DoseEntry = {
      id: crypto.randomUUID(),
      peptide: selectedPeptide,
      doseMg: parsedDose,
      date: doseDate,
      time: doseTime,
      site,
    };

    setEntries((current) => [newEntry, ...current]);
  }

  function deleteEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <main className="medPage">
      <div className="medHeader">
        <div>
          <p className="eyebrow">Peptide tracker</p>
          <h1>Medication Level</h1>
        </div>

        <button className="iconButton" onClick={() => setShowInfo(true)} aria-label="Info">
          ⓘ
        </button>
      </div>

      <section className="chartCard">
        <div className="chartTop">
          <div className="chartTitle">
            <span className="syringeIcon">▰</span>
            <div>
              <h2>{selected.name}</h2>
              <p>Estimated active level</p>
            </div>
          </div>

          <div className="rangePills">
            {rangeOptions.map((option) => (
              <button
                key={option.label}
                className={rangeDays === option.days ? "active" : ""}
                onClick={() => setRangeDays(option.days)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <MedicationChart data={chartData} color={selected.color} currentLevel={currentLevel} />

        <div className="levelBadge">
          <strong>{currentLevel.toFixed(3)}mg</strong>
          <span>Today, {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
        </div>
      </section>

      <section className="formCard">
        <div className="field">
          <label>Peptide</label>
          <select
            value={selectedPeptide}
            onChange={(e) => setSelectedPeptide(e.target.value as PeptideKey)}
          >
            {Object.entries(PEPTIDES).map(([key, peptide]) => (
              <option key={key} value={key}>
                {peptide.name}
              </option>
            ))}
          </select>
        </div>

        <div className="fieldRow">
          <div className="field">
            <label>Dose mg</label>
            <input value={doseMg} onChange={(e) => setDoseMg(e.target.value)} inputMode="decimal" />
          </div>

          <div className="field">
            <label>Site</label>
            <input value={site} onChange={(e) => setSite(e.target.value)} />
          </div>
        </div>

        <div className="fieldRow">
          <div className="field">
            <label>Date</label>
            <input type="date" value={doseDate} onChange={(e) => setDoseDate(e.target.value)} />
          </div>

          <div className="field">
            <label>Time</label>
            <input type="time" value={doseTime} onChange={(e) => setDoseTime(e.target.value)} />
          </div>
        </div>

        <button className="primaryButton" onClick={addDose}>
          Log dose
        </button>
      </section>

      <section className="quickGrid">
        <div className="smallCard">
          <p>Last dose</p>
          <h3>{latestDose ? `${latestDose.doseMg} mg` : "—"}</h3>
          <span>{formatDateTime(latestDose)}</span>
        </div>

        <div className="smallCard">
          <p>Half-life</p>
          <h3>{selected.halfLifeHours}h</h3>
          <span>Used for estimate curve</span>
        </div>

        <div className="smallCard">
          <p>Injection</p>
          <h3>{latestDose?.site?.split("-")[0] || "—"}</h3>
          <span>{latestDose?.site?.split("-")[1] || "No site logged"}</span>
        </div>

        <div className="smallCard ringCard">
          <p>Current</p>
          <div className="ring" style={{ borderColor: selected.color }}>
            {currentLevel.toFixed(2)}mg
          </div>
        </div>
      </section>

      <section className="historyCard">
        <h2>Dose history</h2>

        {filteredEntries.length === 0 ? (
          <p className="emptyText">No doses logged for {selected.name} yet.</p>
        ) : (
          <div className="historyList">
            {filteredEntries.map((entry) => (
              <div className="historyItem" key={entry.id}>
                <div>
                  <strong>{entry.doseMg} mg</strong>
                  <span>{formatDateTime(entry)}</span>
                </div>

                <button onClick={() => deleteEntry(entry.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showInfo && (
        <div className="modalOverlay">
          <div className="infoModal">
            <div className="modalTitle">
              <span>▰</span>
              <h2>Medication Level Estimates</h2>
            </div>

            <p>
              These medication level graphs are estimates using peptide half-life, dose amount,
              and dosing time. They are not exact blood concentration readings.
            </p>

            <h3>How estimates are calculated</h3>
            <p>
              The chart adds each logged dose and applies half-life decay over time. Individual
              response can vary based on metabolism, body weight, hydration, injection timing,
              health conditions, and other personal factors.
            </p>

            <p className="disclaimer">
              This tool is for educational tracking and visualization only. It is not medical
              advice. Always consult a qualified healthcare professional for personalized guidance.
            </p>

            <button className="closeButton" onClick={() => setShowInfo(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function MedicationChart({
  data,
  color,
}: {
  data: { date: Date; level: number; isFuture: boolean }[];
  color: string;
  currentLevel: number;
}) {
  const width = 720;
  const height = 300;
  const padding = 28;
  const max = Math.max(...data.map((d) => d.level), 1);

  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - (d.level / max) * (height - padding * 2);
    return { x, y, ...d };
  });

  const nowIndex = points.findIndex((p) => p.isFuture);
  const solidPoints = nowIndex > 0 ? points.slice(0, nowIndex + 1) : points;
  const futurePoints = nowIndex > 0 ? points.slice(nowIndex) : [];

  const solidPath = solidPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const futurePath = futurePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const areaPath = `${solidPath} L ${solidPoints[solidPoints.length - 1]?.x || padding} ${
    height - padding
  } L ${padding} ${height - padding} Z`;

  const currentPoint = solidPoints[solidPoints.length - 1];

  return (
    <div className="chartWrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="chartSvg">
        <defs>
          <linearGradient id="medFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.42" />
            <stop offset="100%" stopColor={color} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {[0.2, 0.4, 0.6, 0.8].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={height * line}
            y2={height * line}
            className="gridLine"
          />
        ))}

        <path d={areaPath} fill="url(#medFill)" />
        <path d={solidPath} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />

        {futurePath && (
          <path
            d={futurePath}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="10 12"
            opacity="0.9"
          />
        )}

        {currentPoint && (
          <>
            <line
              x1={currentPoint.x}
              x2={currentPoint.x}
              y1={padding}
              y2={height - padding}
              className="todayLine"
            />
            <circle cx={currentPoint.x} cy={currentPoint.y} r="8" fill={color} />
          </>
        )}
      </svg>
    </div>
  );
}