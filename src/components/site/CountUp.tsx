"use client";
import { useEffect, useRef } from "react";
export default function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - start) / 1100, 1);
        element.textContent = Math.round(value * (1 - Math.pow(1 - progress, 3))).toLocaleString();
        if (progress < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }, { threshold: .6 });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <span aria-label={value.toLocaleString()}><span ref={ref} aria-hidden="true">{value.toLocaleString()}</span></span>;
}

