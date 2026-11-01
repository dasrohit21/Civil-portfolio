/**
 * One scroll, one step. Wheel events that keep arriving with no pause longer than `pause` ms
 * are one gesture (a trackpad keeps sending them while it coasts), and each gesture steps once.
 * Feed it every wheel event; it answers 1 (forward), -1 (back) or 0 (nothing new).
 */
export function wheelSteps(pause = 220, min = 4) {
  let lastAt = -Infinity;
  let fired = false;
  return (e: WheelEvent): -1 | 0 | 1 => {
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (e.timeStamp - lastAt > pause) fired = false;
    lastAt = e.timeStamp;
    if (fired || Math.abs(delta) < min) return 0;
    fired = true;
    return delta > 0 ? 1 : -1;
  };
}
