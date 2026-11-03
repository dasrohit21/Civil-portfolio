"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";

type V3 = readonly [number, number, number];

const point = new THREE.Vector3();

/** Shown only while it and everything it sits in are visible. */
function shown(o: THREE.Object3D | null) {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/**
 * HTML pinned to a point in the scene and centred on it, over the canvas: drei's <Html center>,
 * except that its React root is unmounted after the commit. Unmounting it during the commit, as
 * drei does, makes React warn of a race every time a label goes away.
 */
export function Label({ position, zIndex, children }: { position: V3; zIndex: number; children: ReactNode }) {
  const gl = useThree((s) => s.gl);
  const connected = useThree((s) => s.events.connected as HTMLElement | null | undefined);
  const group = useRef<THREE.Group>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const root = useRef<Root | null>(null);

  useLayoutEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;top:0;left:0;z-index:${zIndex};display:none;`;
    const r = createRoot(el);
    (connected ?? (gl.domElement.parentNode as HTMLElement | null))?.appendChild(el);
    box.current = el;
    root.current = r;
    return () => {
      box.current = null;
      root.current = null;
      el.remove();
      setTimeout(() => r.unmount());
    };
  }, [gl, connected, zIndex]);

  useLayoutEffect(() => {
    root.current?.render(<div style={{ transform: "translate(-50%, -50%)" }}>{children}</div>);
  });

  useFrame(({ camera, size }) => {
    const g = group.current;
    if (!g || !box.current) return;
    g.updateWorldMatrix(true, false);
    point.setFromMatrixPosition(g.matrixWorld).project(camera);
    // Behind the camera, a projected point lands in front of it again, mirrored.
    if (!shown(g) || point.z > 1) {
      box.current.style.display = "none";
      return;
    }
    box.current.style.display = "block";
    box.current.style.transform = `translate3d(${((point.x + 1) / 2) * size.width}px,${((1 - point.y) / 2) * size.height}px,0)`;
  });

  return <group ref={group} position={position as [number, number, number]} />;
}
