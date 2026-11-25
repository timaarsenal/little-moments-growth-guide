import { LIBRARY } from "./library";
import type { PlanItem } from "./types";

export const CITIES = {
  astana: { lat: 51.1694, lon: 71.4491 },
  almaty: { lat: 43.2389, lon: 76.8897 },
  shymkent: { lat: 42.3417, lon: 69.5901 },
  karaganda: { lat: 49.8047, lon: 73.1094 },
  aktobe: { lat: 50.2839, lon: 57.167 },
  atyrau: { lat: 47.0945, lon: 51.9238 },
  pavlodar: { lat: 52.2873, lon: 76.9674 },
  oskemen: { lat: 49.9483, lon: 82.6275 },
  kostanay: { lat: 53.2198, lon: 63.6354 },
  taraz: { lat: 42.9, lon: 71.3667 },
  semey: { lat: 50.4111, lon: 80.2275 },
  aktau: { lat: 43.6481, lon: 51.1722 },
  kyzylorda: { lat: 44.8488, lon: 65.4823 },
  petropavl: { lat: 54.8753, lon: 69.1628 },
  turkistan: { lat: 43.2973, lon: 68.2518 },
} as const;
export type CityKey = keyof typeof CITIES;
export const DEFAULT_CITY: CityKey = "astana";
export const isCity = (v: unknown): v is CityKey => typeof v === "string" && v in CITIES;

/** Outdoor play moves home below this temperature (°C)… */
export const COLD_LIMIT = -15;
/** …or above this one. */
export const HOT_LIMIT = 32;
/** WMO weather codes for heavy rain / thunderstorms and for heavy snow / blizzards. */
const HEAVY_RAIN = new Set([65, 67, 82, 95, 96, 99]);
const HEAVY_SNOW = new Set([75, 86]);

export interface DayWeather {
  now: number;
  min: number;
  max: number;
  code: number;
}
export type WeatherReason = "cold" | "hot" | "rain" | "snow";

export function weatherReason(w: DayWeather): WeatherReason | null {
  if (w.min < COLD_LIMIT) return "cold";
  if (w.max > HOT_LIMIT) return "hot";
  if (HEAVY_SNOW.has(w.code)) return "snow";
  if (HEAVY_RAIN.has(w.code)) return "rain";
  return null;
}

/** Temperature shown in the note: the coldest point on a cold day, the hottest on a hot one. */
export function formatTemp(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)} °C`;
}

const HOME_GAME = LIBRARY.find((a) => a.id === "gm-02");

/** In bad weather every outdoor activity becomes an active game at home (same slot, key and time). */
export function applyWeather(items: PlanItem[], reason: WeatherReason | null): PlanItem[] {
  if (!reason || !HOME_GAME) return items;
  return items.map((item) =>
    item.outdoor
      ? {
          ...item,
          outdoor: false,
          movedIndoors: true,
          category: "gross_motor",
          duration_min: Math.min(item.duration_min, HOME_GAME.duration_min),
          ru: HOME_GAME.ru,
          kz: HOME_GAME.kz,
        }
      : item,
  );
}

export async function fetchWeather(city: CityKey): Promise<DayWeather> {
  const { lat, lon } = CITIES[city];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_min,temperature_2m_max,weather_code&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const j = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number };
    daily: { temperature_2m_min: number[]; temperature_2m_max: number[]; weather_code: number[] };
  };
  return {
    now: j.current.temperature_2m,
    min: j.daily.temperature_2m_min[0] ?? j.current.temperature_2m,
    max: j.daily.temperature_2m_max[0] ?? j.current.temperature_2m,
    code: Math.max(j.current.weather_code, j.daily.weather_code[0] ?? 0),
  };
}
