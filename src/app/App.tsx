import { useState, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import monkeyBg from "../imports/C1694E09-CD0C-4C37-A0D8-5261A4A53467.png";

const DEFAULT_BTC_AMOUNT = Number(import.meta.env.VITE_DAD_BTC_AMOUNT ?? "0.042079");
const MOCK_BTC_PRICE = 67842;

const COINGECKO_API = "https://api.coingecko.com/api/v3";

type Range = "1H" | "1D" | "1W" | "1M" | "6M" | "1Y" | "ALL";
type Metric = "dadBtc" | "oneBtc" | "dadValue";

interface ChartPoint {
  date: string;
  timestamp: number;
  price: number;
  value: number;
  btc: number;
}

interface RangeConfig {
  label: string;
  days: string;
  points: number;
  tickInterval: number;
  formatDate: (d: Date) => string;
  volatility: number;
  drift: number;
}

const RANGE_CONFIG: Record<Range, RangeConfig> = {
  "1H": {
    label: "1 Hour",
    days: "1",
    points: 12,
    tickInterval: 1,
    formatDate: (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    volatility: 0.002,
    drift: 0.0001,
  },
  "1D": {
    label: "1 Day",
    days: "1",
    points: 48,
    tickInterval: 7,
    formatDate: (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    volatility: 0.005,
    drift: 0.0003,
  },
  "1W": {
    label: "1 Week",
    days: "7",
    points: 42,
    tickInterval: 5,
    formatDate: (d) => d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric" }),
    volatility: 0.012,
    drift: 0.001,
  },
  "1M": {
    label: "1 Month",
    days: "30",
    points: 30,
    tickInterval: 4,
    formatDate: (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volatility: 0.022,
    drift: 0.002,
  },
  "6M": {
    label: "6 Months",
    days: "180",
    points: 26,
    tickInterval: 4,
    formatDate: (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volatility: 0.06,
    drift: 0.008,
  },
  "1Y": {
    label: "1 Year",
    days: "365",
    points: 52,
    tickInterval: 7,
    formatDate: (d) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    volatility: 0.09,
    drift: 0.012,
  },
  ALL: {
    label: "All Time",
    days: "max",
    points: 72,
    tickInterval: 9,
    formatDate: (d) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    volatility: 0.18,
    drift: 0.04,
  },
};

const METRIC_CONFIG: Record<Metric, { label: string; dataKey: keyof ChartPoint; color: string; isBtc: boolean }> = {
  dadBtc: { label: "Dad's BTC", dataKey: "btc", color: "#00f5d4", isBtc: true },
  oneBtc: { label: "1 BTC", dataKey: "price", color: "#f5c518", isBtc: false },
  dadValue: { label: "Dad's Value", dataKey: "value", color: "#c084fc", isBtc: false },
};

const RANGES: Range[] = ["1H", "1D", "1W", "1M", "6M", "1Y", "ALL"];

function currency(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  });
}

function downsample<T>(items: T[], targetLength: number) {
  if (items.length <= targetLength) return items;
  const step = (items.length - 1) / (targetLength - 1);
  return Array.from({ length: targetLength }, (_, index) => items[Math.round(index * step)]);
}

function makeChartPoints(prices: Array<[number, number]>, range: Range, btcAmount: number): ChartPoint[] {
  const cfg = RANGE_CONFIG[range];
  const sampled = downsample(prices, cfg.points);
  return sampled.map(([timestamp, price]) => ({
    timestamp,
    date: cfg.formatDate(new Date(timestamp)),
    price: Math.round(price),
    value: Math.round(price * btcAmount),
    btc: btcAmount,
  }));
}

function generateFallbackData(range: Range, currentPrice: number, btcAmount: number): ChartPoint[] {
  const cfg = RANGE_CONFIG[range];
  const now = Date.now();
  const intervalMs = range === "ALL"
    ? 30 * 24 * 60 * 60 * 1000
    : range === "1Y" || range === "6M"
      ? 7 * 24 * 60 * 60 * 1000
      : range === "1M"
        ? 24 * 60 * 60 * 1000
        : range === "1W"
          ? 4 * 60 * 60 * 1000
          : range === "1D"
            ? 30 * 60 * 1000
            : 5 * 60 * 1000;

  let price = range === "ALL" ? currentPrice * 0.003 : currentPrice * (1 - cfg.volatility * cfg.points * 0.3);
  price = Math.max(price, 100);

  const data: ChartPoint[] = [];
  for (let i = cfg.points - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    price = price * (1 + (Math.random() - (0.5 - cfg.drift)) * cfg.volatility);
    price = Math.max(price, 1);
    data.push({
      timestamp,
      date: cfg.formatDate(new Date(timestamp)),
      price: Math.round(price),
      value: Math.round(price * btcAmount),
      btc: btcAmount,
    });
  }

  data[data.length - 1].price = currentPrice;
  data[data.length - 1].value = Math.round(currentPrice * btcAmount);
  data[data.length - 1].btc = btcAmount;
  return data;
}

async function fetchCurrentBitcoinPrice() {
  const response = await fetch(`${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`CoinGecko price request failed: ${response.status}`);
  const json = await response.json();
  const price = Number(json?.bitcoin?.usd);
  const change = Number(json?.bitcoin?.usd_24h_change ?? 0);
  if (!Number.isFinite(price)) throw new Error("CoinGecko response did not include a USD BTC price");
  return { price: Math.round(price), change: Number(change.toFixed(2)) };
}

async function fetchBitcoinHistory(range: Range, btcAmount: number) {
  const cfg = RANGE_CONFIG[range];
  const response = await fetch(`${COINGECKO_API}/coins/bitcoin/market_chart?vs_currency=usd&days=${cfg.days}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`CoinGecko history request failed: ${response.status}`);
  const json = await response.json();
  const prices = Array.isArray(json?.prices) ? json.prices : [];
  if (!prices.length) throw new Error("CoinGecko response did not include price history");

  const now = Date.now();
  const filtered = range === "1H" ? prices.filter(([timestamp]: [number, number]) => timestamp >= now - 60 * 60 * 1000) : prices;
  return makeChartPoints(filtered.length ? filtered : prices, range, btcAmount);
}

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
  const [btcAmount] = useState(DEFAULT_BTC_AMOUNT);
  const [btcPrice, setBtcPrice] = useState(MOCK_BTC_PRICE);
  const [priceChange, setPriceChange] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeRange, setActiveRange] = useState<Range>("1M");
  const [activeMetric, setActiveMetric] = useState<Metric>("dadValue");
  const [isUsingLiveData, setIsUsingLiveData] = useState(false);
  const [statusText, setStatusText] = useState("Loading live Bitcoin price…");

  const [rangeData, setRangeData] = useState<Record<Range, ChartPoint[]>>(() => {
    const initial = {} as Record<Range, ChartPoint[]>;
    RANGES.forEach((range) => {
      initial[range] = generateFallbackData(range, MOCK_BTC_PRICE, btcAmount);
    });
    return initial;
  });

  const chartData = useMemo(() => rangeData[activeRange], [rangeData, activeRange]);

  const refreshPrice = useCallback(async () => {
    try {
      const { price, change } = await fetchCurrentBitcoinPrice();
      setBtcPrice(price);
      setPriceChange(change);
      setLastUpdated(new Date());
      setIsUsingLiveData(true);
      setStatusText("Live price from CoinGecko");
      setRangeData((old) => {
        const updated = { ...old };
        RANGES.forEach((range) => {
          const arr = [...old[range]];
          arr[arr.length - 1] = {
            ...arr[arr.length - 1],
            price,
            value: Math.round(price * btcAmount),
            btc: btcAmount,
          };
          updated[range] = arr;
        });
        return updated;
      });
    } catch (error) {
      console.warn(error);
      setIsUsingLiveData(false);
      setStatusText("Live price temporarily unavailable · showing fallback display");
    }
  }, [btcAmount]);

  const refreshHistory = useCallback(async (range: Range) => {
    try {
      const history = await fetchBitcoinHistory(range, btcAmount);
      setRangeData((old) => ({ ...old, [range]: history }));
      setIsUsingLiveData(true);
      setStatusText("Live chart from CoinGecko");
    } catch (error) {
      console.warn(error);
      setRangeData((old) => ({ ...old, [range]: generateFallbackData(range, btcPrice, btcAmount) }));
      setIsUsingLiveData(false);
      setStatusText("Live chart temporarily unavailable · showing fallback display");
    }
  }, [btcAmount, btcPrice]);

  useEffect(() => {
    refreshPrice();
    refreshHistory(activeRange);
    const id = window.setInterval(refreshPrice, 60_000);
    return () => window.clearInterval(id);
  }, [activeRange, refreshHistory, refreshPrice]);

  const handleRangeChange = (range: Range) => {
    setActiveRange(range);
    refreshHistory(range);
  };

  const portfolioValue = currency(btcPrice * btcAmount, 2);
  const btcPriceFormatted = currency(btcPrice);
  const isPositive = priceChange >= 0;
  const mc = METRIC_CONFIG[activeMetric];

  const yFormatter = (value: number) => {
    if (mc.isBtc) return `${value} ₿`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`;
    return value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const value = payload[0]?.value;
    const formatted = mc.isBtc ? `${value} BTC` : currency(Number(value), 0);
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
        <div className="text-center">
          <h1
            className="tracking-widest uppercase"
            style={{ fontSize: 32, fontWeight: 900, color: "#f5c518", textShadow: "0 0 24px #f5c518, 0 0 48px #f5a50088", letterSpacing: "0.18em" }}
          >
            🎷 Dad's Bitcoin 🎷
          </h1>
          <p style={{ color: "#00f5d4", fontSize: 13, opacity: 0.85, marginTop: 2 }}>
            Last updated: {lastUpdated.toLocaleTimeString()} · {isUsingLiveData ? "Live" : "Fallback"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-4 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)", border: "1.5px solid #00f5d4", boxShadow: "0 0 18px #00f5d466" }}>
            <span style={{ color: "#00f5d4", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>Dad's BTC</span>
            <span style={{ color: "#ffffff", fontSize: 26, fontWeight: 800, marginTop: 4 }}>{btcAmount.toLocaleString()} BTC</span>
          </div>

          <div className="rounded-xl p-4 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)", border: "1.5px solid #f5c518", boxShadow: "0 0 18px #f5c51866" }}>
            <span style={{ color: "#f5c518", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>1 BTC</span>
            <span style={{ color: "#ffffff", fontSize: 22, fontWeight: 800, marginTop: 4 }}>{btcPriceFormatted}</span>
            <span style={{ color: isPositive ? "#4ade80" : "#f87171", fontSize: 12, marginTop: 2, fontWeight: 600 }}>
              {isPositive ? "▲" : "▼"} {Math.abs(priceChange)}% 24h
            </span>
          </div>

          <div className="rounded-xl p-4 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)", border: "1.5px solid #c084fc", boxShadow: "0 0 18px #c084fc66" }}>
            <span style={{ color: "#c084fc", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>Dad's Value</span>
            <span style={{ color: "#ffffff", fontSize: 20, fontWeight: 800, marginTop: 4 }}>{portfolioValue}</span>
          </div>
        </div>

        <div className="rounded-xl p-5"
          style={{ background: "rgba(0,0,0,0.72)", border: "1.5px solid #00f5d455", boxShadow: "0 0 32px #00f5d422" }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span style={{ color: "#00f5d4", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {mc.label}
            </span>
            <div className="flex items-center gap-2">
              <select
                aria-label="Chart metric"
                value={activeMetric}
                onChange={(e) => setActiveMetric(e.target.value as Metric)}
                style={dropdownStyle("#c084fc")}
              >
                {(Object.keys(METRIC_CONFIG) as Metric[]).map((metric) => (
                  <option key={metric} value={metric} style={{ background: "#0a0015", color: "#ffffff" }}>
                    {METRIC_CONFIG[metric].label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Chart range"
                value={activeRange}
                onChange={(e) => handleRangeChange(e.target.value as Range)}
                style={dropdownStyle("#00f5d4")}
              >
                {RANGES.map((range) => (
                  <option key={range} value={range} style={{ background: "#0a0015", color: "#ffffff" }}>
                    {RANGE_CONFIG[range].label}
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

      </div>
    </div>
  );
}
