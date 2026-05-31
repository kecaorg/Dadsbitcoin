import { useState, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import monkeyBg from "../imports/C1694E09-CD0C-4C37-A0D8-5261A4A53467.png";

const BTC_AMOUNT = 1.45;
const MOCK_BTC_PRICE = 67842;

type Range = "1H" | "1D" | "1W" | "1M" | "6M" | "1Y" | "ALL";
type Metric = "myBtc" | "oneBtc" | "myValue";

interface RangeConfig {
  label: string;
  points: number;
  intervalMs: number;
  tickInterval: number;
  formatDate: (d: Date) => string;
  volatility: number;
  drift: number;
}

const RANGE_CONFIG: Record<Range, RangeConfig> = {
  "1H": {
    label: "1 Hour",
    points: 60,
    intervalMs: 60 * 1000,
    tickInterval: 9,
    formatDate: (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    volatility: 0.002,
    drift: 0.0001,
  },
  "1D": {
    label: "1 Day",
    points: 48,
    intervalMs: 30 * 60 * 1000,
    tickInterval: 7,
    formatDate: (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    volatility: 0.005,
    drift: 0.0003,
  },
  "1W": {
    label: "1 Week",
    points: 42,
    intervalMs: 4 * 60 * 60 * 1000,
    tickInterval: 5,
    formatDate: (d) => d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric" }),
    volatility: 0.012,
    drift: 0.001,
  },
  "1M": {
    label: "1 Month",
    points: 30,
    intervalMs: 24 * 60 * 60 * 1000,
    tickInterval: 4,
    formatDate: (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volatility: 0.022,
    drift: 0.002,
  },
  "6M": {
    label: "6 Months",
    points: 26,
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    tickInterval: 4,
    formatDate: (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volatility: 0.06,
    drift: 0.008,
  },
  "1Y": {
    label: "1 Year",
    points: 52,
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    tickInterval: 7,
    formatDate: (d) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    volatility: 0.09,
    drift: 0.012,
  },
  ALL: {
    label: "All Time",
    points: 48,
    intervalMs: 30 * 24 * 60 * 60 * 1000,
    tickInterval: 6,
    formatDate: (d) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    volatility: 0.18,
    drift: 0.04,
  },
};

const METRIC_CONFIG: Record<Metric, { label: string; dataKey: string; color: string; isBtc: boolean }> = {
  myBtc:   { label: "My BTC",   dataKey: "btc",   color: "#00f5d4", isBtc: true  },
  oneBtc:  { label: "1 BTC",    dataKey: "price", color: "#f5c518", isBtc: false },
  myValue: { label: "My Value", dataKey: "value", color: "#c084fc", isBtc: false },
};

function generateData(range: Range, currentPrice: number) {
  const cfg = RANGE_CONFIG[range];
  const now = Date.now();
  const data = [];
  let price = range === "ALL" ? currentPrice * 0.003 : currentPrice * (1 - cfg.volatility * cfg.points * 0.3);
  price = Math.max(price, 100);

  for (let i = cfg.points - 1; i >= 0; i--) {
    const ts = now - i * cfg.intervalMs;
    const date = new Date(ts);
    price = price * (1 + (Math.random() - (0.5 - cfg.drift)) * cfg.volatility);
    price = Math.max(price, 1);
    data.push({
      date: cfg.formatDate(date),
      price: Math.round(price),
      value: Math.round(price * BTC_AMOUNT),
      btc: BTC_AMOUNT,
    });
  }
  data[data.length - 1].price = currentPrice;
  data[data.length - 1].value = Math.round(currentPrice * BTC_AMOUNT);
  data[data.length - 1].btc = BTC_AMOUNT;
  return data;
}

const RANGES: Range[] = ["1H", "1D", "1W", "1M", "6M", "1Y", "ALL"];

const dropdownStyle = (color: string): React.CSSProperties => ({
  background: "rgba(0,0,0,0.75)",
  border: `1.5px solid ${color}`,
  borderRadius: 8,
  color,
  fontSize: 12,
  fontWeight: 700,
  padding: "5px 28px 5px 12px",
  cursor: "pointer",
  boxShadow: `0 0 10px ${color}55`,
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
  outline: "none",
});

export default function App() {
  const [btcPrice, setBtcPrice] = useState(MOCK_BTC_PRICE);
  const [priceChange, setPriceChange] = useState(2.34);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeRange, setActiveRange] = useState<Range>("1M");
  const [activeMetric, setActiveMetric] = useState<Metric>("myValue");

  const [rangeData, setRangeData] = useState<Record<Range, ReturnType<typeof generateData>>>(() => {
    const d = {} as Record<Range, ReturnType<typeof generateData>>;
    RANGES.forEach((r) => { d[r] = generateData(r, MOCK_BTC_PRICE); });
    return d;
  });

  const chartData = useMemo(() => rangeData[activeRange], [rangeData, activeRange]);

  const refreshPrice = useCallback(() => {
    const delta = (Math.random() - 0.49) * 200;
    setBtcPrice((prev) => {
      const next = Math.round(prev + delta);
      setRangeData((old) => {
        const updated = { ...old };
        RANGES.forEach((r) => {
          const arr = [...old[r]];
          arr[arr.length - 1] = { ...arr[arr.length - 1], price: next, value: Math.round(next * BTC_AMOUNT), btc: BTC_AMOUNT };
          updated[r] = arr;
        });
        return updated;
      });
      const pct = ((next - MOCK_BTC_PRICE) / MOCK_BTC_PRICE) * 100;
      setPriceChange(parseFloat(pct.toFixed(2)));
      return next;
    });
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const id = setInterval(refreshPrice, 8000);
    return () => clearInterval(id);
  }, [refreshPrice]);

  const handleRangeChange = (r: Range) => {
    setActiveRange(r);
    setRangeData((old) => ({ ...old, [r]: generateData(r, btcPrice) }));
  };

  const portfolioValue = (btcPrice * BTC_AMOUNT).toLocaleString("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  });

  const btcPriceFormatted = btcPrice.toLocaleString("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  });

  const isPositive = priceChange >= 0;
  const mc = METRIC_CONFIG[activeMetric];

  const yFormatter = (v: number) => {
    if (mc.isBtc) return `${v} ₿`;
    return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value;
    const formatted = mc.isBtc ? `${val} BTC` : `$${val?.toLocaleString()}`;
    return (
      <div className="rounded-lg px-3 py-2 border" style={{ background: "rgba(0,0,0,0.85)", borderColor: mc.color, boxShadow: `0 0 12px ${mc.color}aa` }}>
        <p style={{ color: mc.color, fontSize: 12 }}>{label}</p>
        <p style={{ color: "#ffffff", fontSize: 14, fontWeight: 700 }}>{formatted}</p>
      </div>
    );
  };

  return (
    <div className="size-full min-h-screen relative overflow-auto flex flex-col items-center justify-center p-4">
      <div className="fixed inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${monkeyBg})` }} />
      <div className="fixed inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(10,0,30,0.80) 60%, rgba(0,0,0,0.70) 100%)" }} />

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="text-center">
          <h1
            className="tracking-widest uppercase"
            style={{ fontSize: 32, fontWeight: 900, color: "#f5c518", textShadow: "0 0 24px #f5c518, 0 0 48px #f5a50088", letterSpacing: "0.18em" }}
          >
            🎷 Dad's Bitcoin 🎷
          </h1>
          <p style={{ color: "#00f5d4", fontSize: 13, opacity: 0.8, marginTop: 2 }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-4 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)", border: "1.5px solid #00f5d4", boxShadow: "0 0 18px #00f5d466" }}>
            <span style={{ color: "#00f5d4", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>My BTC</span>
            <span style={{ color: "#ffffff", fontSize: 26, fontWeight: 800, marginTop: 4 }}>{BTC_AMOUNT} BTC</span>
          </div>

          <div className="rounded-xl p-4 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)", border: "1.5px solid #f5c518", boxShadow: "0 0 18px #f5c51866" }}>
            <span style={{ color: "#f5c518", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>1 BTC</span>
            <span style={{ color: "#ffffff", fontSize: 22, fontWeight: 800, marginTop: 4 }}>{btcPriceFormatted}</span>
            <span style={{ color: isPositive ? "#4ade80" : "#f87171", fontSize: 12, marginTop: 2, fontWeight: 600 }}>
              {isPositive ? "▲" : "▼"} {Math.abs(priceChange)}%
            </span>
          </div>

          <div className="rounded-xl p-4 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)", border: "1.5px solid #c084fc", boxShadow: "0 0 18px #c084fc66" }}>
            <span style={{ color: "#c084fc", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>My Value</span>
            <span style={{ color: "#ffffff", fontSize: 20, fontWeight: 800, marginTop: 4 }}>{portfolioValue}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-xl p-5"
          style={{ background: "rgba(0,0,0,0.72)", border: "1.5px solid #00f5d455", boxShadow: "0 0 32px #00f5d422" }}>
          <div className="flex items-center justify-between mb-4">
            <span style={{ color: "#00f5d4", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {mc.label}
            </span>
            <div className="flex items-center gap-2">
              {/* Metric dropdown */}
              <select
                value={activeMetric}
                onChange={(e) => setActiveMetric(e.target.value as Metric)}
                style={dropdownStyle("#c084fc")}
              >
                {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
                  <option key={m} value={m} style={{ background: "#0a0015", color: "#ffffff" }}>
                    {METRIC_CONFIG[m].label}
                  </option>
                ))}
              </select>

              {/* Range dropdown */}
              <select
                value={activeRange}
                onChange={(e) => handleRangeChange(e.target.value as Range)}
                style={dropdownStyle("#00f5d4")}
              >
                {RANGES.map((r) => (
                  <option key={r} value={r} style={{ background: "#0a0015", color: "#ffffff" }}>
                    {RANGE_CONFIG[r].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={mc.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={mc.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#aaaaaa", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={RANGE_CONFIG[activeRange].tickInterval}
              />
              <YAxis
                tickFormatter={yFormatter}
                tick={{ fill: "#aaaaaa", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={mc.dataKey}
                stroke={mc.color}
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={false}
                isAnimationActive={true}
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="flex justify-center mt-2">
            <span style={{ color: mc.color, fontSize: 11 }}>● {mc.label}</span>
          </div>
        </div>

        <p className="text-center" style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
          Prices simulated for display · Updates every 8s · 🎷 Stay cool, Dad
        </p>
      </div>
    </div>
  );
}
