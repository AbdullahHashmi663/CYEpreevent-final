"use client";

import { useEffect, type RefObject } from "react";

export function useSiteMotion(rootRef: RefObject<HTMLDivElement | null>, pathname: string) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | null = null;
    let frame = 0;
    const elements = [...root.querySelectorAll<HTMLElement>("[data-reveal], .conference-feature, .explore-section-heading, .person-card, .contest-card, .three-step-grid article, .partner-grid article")];
    const setup = () => {
      observer?.disconnect();
      root.removeAttribute("data-motion-ready");
      if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
      root.setAttribute("data-motion-ready", "true");
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.06, rootMargin: "0px 0px -24px 0px" });
      elements.forEach((element, index) => {
        element.setAttribute("data-reveal", "");
        element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 75}ms`);
        observer?.observe(element);
      });
    };
    let maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    let scrolled: boolean | undefined;
    const updateScroll = () => {
      frame = 0;
      const y = window.scrollY;
      const nextScrolled = y > 24;
      if (scrolled !== nextScrolled) { root.classList.toggle("has-scrolled", nextScrolled); scrolled = nextScrolled; }
      root.style.setProperty("--scroll-progress", String(maxScroll > 0 ? y / maxScroll : 0));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(updateScroll); };
    const measure = () => { maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight); onScroll(); };
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    setup();
    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    reducedMotion.addEventListener("change", setup);
    return () => {
      observer?.disconnect();
      resize.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      reducedMotion.removeEventListener("change", setup);
      root.removeAttribute("data-motion-ready");
    };
  }, [rootRef, pathname]);
}
