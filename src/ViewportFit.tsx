import { useLayoutEffect, useRef, type ReactNode } from "react";

/** Fit a complete panel to the available desktop area; remeasure after content changes. */
export function ViewportFit({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const outer = frame.current!;
    const inner = content.current!;
    let pending = 0;
    const measure = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        if (!matchMedia("(min-width: 701px)").matches) {
          inner.style.removeProperty("transform");
          return;
        }
        const height = Math.max(inner.offsetHeight, inner.scrollHeight);
        const width = Math.max(inner.offsetWidth, inner.scrollWidth);
        const scale = Math.min(1, outer.clientHeight / Math.max(1, height), outer.clientWidth / Math.max(1, width));
        inner.style.transform = `scale(${scale})`;
      });
    };
    const resize = new ResizeObserver(measure);
    resize.observe(outer);
    resize.observe(inner);
    window.addEventListener("resize", measure);
    measure();
    return () => { cancelAnimationFrame(pending); resize.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  return <div className="viewport-fit" ref={frame}><div className="viewport-fit-content" ref={content}>{children}</div></div>;
}
