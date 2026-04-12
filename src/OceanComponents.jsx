const OCEAN_COLORS = { openness: "#00C4A8", conscientiousness: "#6B4FFF", extraversion: "#F55D2C", agreeableness: "#FFB800", neuroticism: "#FF3CAC" };

const OCEAN_LABELS = {
  openness:          { low: "Routine lover",     high: "Idea explorer" },
  conscientiousness: { low: "Spontaneous",       high: "Highly structured" },
  extraversion:      { low: "Solo focused",      high: "People energized" },
  agreeableness:     { low: "Direct and firm",   high: "Harmony seeker" },
  neuroticism:       { low: "Emotionally steady", high: "Highly sensitive" },
};

const OCEAN_ORDER = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];

const OCEAN_SHORT = {
  openness: "Open",
  conscientiousness: "C'ness",
  extraversion: "Extravert",
  agreeableness: "Agreeable",
  neuroticism: "Neuro",
};

export function OceanRadarChart({ ocean, size = 220 }) {
  if (!ocean) return null;
  // 340x340 viewBox with generous label padding around the pentagon
  const vb = 340;
  const cx = 170;
  const cy = 170;
  const r = 80; // polygon radius — keeps pentagon same visual size
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2;

  const pointAt = (i, pct) => {
    const a = startAngle + i * angleStep;
    return { x: cx + r * (pct / 100) * Math.cos(a), y: cy + r * (pct / 100) * Math.sin(a) };
  };

  const gridRings = [25, 50, 75, 100];
  const traits = OCEAN_ORDER;
  const dataPoints = traits.map((t, i) => pointAt(i, ocean[t] || 0));
  const polygon = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
      <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} style={{ maxWidth: "100%" }}>
        {/* Grid rings */}
        {gridRings.map(pct => {
          const pts = traits.map((_, i) => pointAt(i, pct));
          return <polygon key={pct} points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />;
        })}
        {/* Axis lines */}
        {traits.map((_, i) => {
          const end = pointAt(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />;
        })}
        {/* Data polygon */}
        <polygon points={polygon} fill="rgba(0,196,168,0.12)" stroke="#00C4A8" strokeWidth="2" />
        {/* Data dots */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={OCEAN_COLORS[traits[i]]} />
        ))}
        {/* Labels — pushed well beyond pentagon edge with full trait names */}
        {traits.map((t, i) => {
          const label = pointAt(i, 140);
          const anchor = label.x < cx - 4 ? "end" : label.x > cx + 4 ? "start" : "middle";
          const dy = label.y < cy - 4 ? -6 : label.y > cy + 4 ? 16 : 5;
          return (
            <text key={t} x={label.x} y={label.y + dy} textAnchor={anchor}
              style={{ fontSize: 11, fill: OCEAN_COLORS[t], fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
              {OCEAN_SHORT[t]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function OceanTraitBars({ ocean, animated }) {
  if (!ocean) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {OCEAN_ORDER.map((trait, i) => {
        const score = ocean[trait] || 0;
        const color = OCEAN_COLORS[trait];
        const labels = OCEAN_LABELS[trait];
        return (
          <div key={trait} style={animated ? { animation: `revealFadeIn 0.5s ease both ${i * 0.08}s` } : {}}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, textTransform: "capitalize", color: "#0A0A0A", fontWeight: 500 }}>{trait}</span>
              <span style={{ fontSize: 13, color, fontWeight: 700 }}>{score}</span>
            </div>
            <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${score}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 6, transition: "width 1.2s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "#9B9B9B" }}>{labels.low}</span>
              <span style={{ fontSize: 10, color: "#9B9B9B" }}>{labels.high}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { OCEAN_COLORS, OCEAN_LABELS, OCEAN_ORDER };
