import { useEffect } from "react";

/** Calls handler when a pointer press lands outside ref, or Escape is pressed. */
export function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return;
    const onPointer = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(e); };
    const onKey = (e) => { if (e.key === "Escape") handler(e); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, handler, active]);
}