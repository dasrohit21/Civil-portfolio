"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { profile } from "@/content/profile";
import type { Live, WeatherKind } from "@/content/types";
import { wheelSteps } from "@/lib/gestures";
import { restorePlace } from "@/lib/place";
import { clocks, useStore, type PlaceChoice } from "@/lib/store";
import { T } from "@/components/building/model";
import { TitleBlock } from "@/components/sketch/TitleBlock";
import { BrickWall } from "@/components/ui/BrickWall";
import { IdentityCard } from "@/components/ui/IdentityCard";
import { LiveCard } from "@/components/ui/LiveCard";
import { LiveWall } from "@/components/ui/LiveWall";
import { ScaleBar } from "@/components/ui/ScaleBar";
import { Panel } from "@/components/ui/Panel";
import { Stamp } from "@/components/ui/Stamp";
import { StressTools } from "@/components/ui/StressTools";
import { TourCard } from "@/components/ui/TourCard";

const Scene = dynamic(() => import("@/components/building/Scene"), { ssr: false });

let webglCache: boolean | undefined;
function hasWebGL() {
  if (webglCache === undefined) {
    try {
      const c = document.createElement("canvas");
      webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}
const noSubscribe = () => () => {};

const KINDS: WeatherKind[] = ["clear", "cloudy", "overcast", "fog", "rain", "storm", "snow"];

/**
 * The weather for the sky: where the visitor is (from their network, or exactly if they shared
 * it) or Soni's Jamshedpur. `?weather=rain` (or storm, fog, snow, overcast, cloudy, clear)
 * previews a kind of weather over the real reading, to see how the site looks in it.
 */
async function loadLive(place: PlaceChoice, coords: { lat: number; lon: number } | null): Promise<Live | null> {
  const query = place === "home" ? "?place=home" : place === "exact" && coords ? `?lat=${coords.lat}&lon=${coords.lon}` : "";
  const live: Live | null = await fetch(`/api/sky${query}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const preview = new URLSearchParams(window.location.search).get("weather") as WeatherKind | null;
  if (!preview || !KINDS.includes(preview)) return live;
  const base: Live = live ?? {
    place: { name: "Jamshedpur", country: "India", lat: 22.8, lon: 86.18, tz: "Asia/Kolkata" },
    source: "home",
    tempC: 24,
    weather: "",
    kind: "clear",
    intensity: 0,
    isDay: true,
    solarKw: 2.4,
    solarPeakKw: 4.8,
    sunrise: "05:50 AM",
    sunset: "05:06 PM",
    moon: null,
    cloud: 10,
    windKph: 8,
  };
  const falling = preview === "rain" || preview === "storm" || preview === "snow";
  const cloud = { clear: 5, cloudy: 55, overcast: 95, fog: 70, rain: 90, storm: 100, snow: 90 }[preview];
  return { ...base, kind: preview, weather: `${preview[0].toUpperCase()}${preview.slice(1)} (preview)`, intensity: falling ? 0.8 : 0, cloud };
}

/** Elements that scroll by themselves, so scrolling them never moves through the building. */
const scrollsItself = (t: EventTarget | null) => (t as Element | null)?.closest?.(".panel, .parts-list");

/** One step forward or back: finish the drawing, build, or walk the building. */
function step(dir: 1 | -1) {
  const s = useStore.getState();
  if (s.phase === "sketch") {
    if (!s.sketchDone) s.finishSketch();
    else if (dir === 1) s.build();
    return;
  }
  if (s.phase !== "built" || s.panelOpen || s.wallOpen || s.test) return;
  if (s.touring) s.stepTour(dir);
  else if (dir === 1) s.startTour();
}

export function Experience() {
  const router = useRouter();
  const phase = useStore((s) => s.phase);
  const wallConfigured = useStore((s) => s.wallConfigured);
  const place = useStore((s) => s.place);
  const coords = useStore((s) => s.coords);
  const panelOpen = useStore((s) => s.panelOpen || s.wallOpen);
  const dark = useStore((s) => s.dark);
  const webgl = useSyncExternalStore(noSubscribe, hasWebGL, () => null);

  // Arriving (or coming back from /resume, which keeps this page mounted but hidden).
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowPower = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 2;
    const s = useStore.getState();
    s.setEnv({ reducedMotion, lowPower });
    if (s.phase === "printing" || s.phase === "printed") {
      clocks.build = T.end;
      s.rebuilt();
    }
    if (!hasWebGL()) s.rebuilt();
    restorePlace();
  }, []);

  // Live data: the weather for the sky (refreshed every 10 minutes, and when the visitor picks
  // another place) and the visitors' wall.
  useEffect(() => {
    let alive = true;
    const refresh = () => void loadLive(place, coords).then((live) => alive && useStore.getState().setLive(live));
    refresh();
    const timer = window.setInterval(refresh, 10 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [place, coords]);

  useEffect(() => {
    let alive = true;
    fetch("/api/bricks")
      .then((r) => r.json())
      .then((wall) => alive && typeof wall?.configured === "boolean" && useStore.getState().setWall(wall))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // The building has folded back into paper: open the drawings.
  useEffect(() => {
    if (phase === "printed") router.push("/resume");
  }, [phase, router]);

  // Keyboard: Enter builds, arrows walk, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      const onControl = ["BUTTON", "A", "INPUT"].includes((e.target as HTMLElement)?.tagName);
      if (e.key === "Escape") {
        if (s.panelOpen) s.close();
        else if (s.wallOpen) s.closeWall();
        else if (s.touring) s.stopTour();
      } else if (e.key === "Enter" && s.phase === "sketch" && !onControl) step(1);
      else if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) step(1);
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scroll and swipe: one gesture, one step.
  useEffect(() => {
    const steps = wheelSteps();
    let startX = 0;
    let startY: number | null = null;
    const onWheel = (e: WheelEvent) => {
      if (scrollsItself(e.target) || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dir = steps(e);
      if (dir) step(dir);
    };
    const onStart = (e: TouchEvent) => {
      startY = scrollsItself(e.target) ? null : e.touches[0].clientY;
      startX = e.touches[0].clientX;
    };
    const onEnd = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = startY - e.changedTouches[0].clientY;
      const dx = startX - e.changedTouches[0].clientX;
      startY = null;
      if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx)) step(dy > 0 ? 1 : -1);
      else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx > 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  const built = phase === "built";
  return (
    <main className="experience" data-phase={phase} data-panel={panelOpen ? "open" : "closed"} data-sky={dark ? "night" : "day"}>
      <div className="canvas-wrap">{webgl ? <Scene /> : null}</div>

      <header className="topbar">
        <span className="topbar-name">{built ? profile.name : ""}</span>
        {built ? (
          <button type="button" className="btn-quiet" onClick={() => useStore.getState().print()}>
            Print drawings
          </button>
        ) : (
          <Link href="/resume" className="btn-quiet">
            Print drawings
          </Link>
        )}
      </header>

      {webgl === false ? <p className="no-webgl">This browser can&apos;t show the 3D model, so here is the short version.</p> : null}
      <TitleBlock />
      {/* Wide screens: the live sky at the top of the left column, who she is at the bottom */}
      <div className="left-stack">
        <LiveCard />
        <IdentityCard />
      </div>
      <TourCard />
      <StressTools />
      <ScaleBar />
      <Panel />
      <BrickWall />
      {wallConfigured ? <LiveWall /> : null}
      <Stamp />
    </main>
  );
}
