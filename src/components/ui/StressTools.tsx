"use client";

import { profile } from "@/content/profile";
import { stressTestById, stressTests } from "@/content/tests";
import { useStore } from "@/lib/store";

/** "Try to break it": four tests, the stress legend while one runs, and the verdict after. */
export function StressTools() {
  const visible = useStore((s) => s.phase === "built" && !s.panelOpen && !s.touring);
  const running = stressTestById(useStore((s) => s.test));
  const result = stressTestById(useStore((s) => s.result));
  if (!visible) return null;

  return (
    <section className="stress" aria-label="Try to break it" aria-live="polite">
      {result ? (
        <div className="stress-result">
          <p className="stress-held">Held. ✓</p>
          <p className="stress-text">{result.result}</p>
          <div className="stress-actions">
            <button type="button" className="btn-primary" onClick={() => useStore.getState().open(result.hotspot)}>
              See how →
            </button>
            <button type="button" className="btn-quiet" onClick={() => useStore.getState().clearResult()}>
              Try another
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="stress-title">Try to break it.</p>
          <p className="stress-sign">— {profile.name.split(" ")[0]}</p>
          {running ? (
            <>
              <p className="stress-text">{running.running}</p>
              <div className="stress-legend" aria-hidden="true">
                <span>Low</span>
                <span className="stress-bar" />
                <span>High stress</span>
              </div>
            </>
          ) : (
            <div className="stress-buttons">
              {stressTests.map((t) => (
                <button key={t.id} type="button" onClick={() => useStore.getState().runTest(t.id)}>
                  <span aria-hidden="true">{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
