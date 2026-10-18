"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function GsapMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const navTargets = gsap.utils.toArray<HTMLElement>("[data-gsap='nav']");
      if (navTargets.length) {
        gsap.from(navTargets, {
          y: -18,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out"
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-gsap='fade-up']").forEach((element) => {
        gsap.from(element, {
          y: 34,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          clearProps: "opacity,transform",
          scrollTrigger: {
            trigger: element,
            start: "top 88%",
            once: true
          }
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-gsap='scale-in']").forEach((element) => {
        gsap.from(element, {
          scale: 0.96,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          clearProps: "opacity,transform",
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
            once: true
          }
        });
      });

      const floatTargets = gsap.utils.toArray<HTMLElement>("[data-gsap='float']");
      if (floatTargets.length) {
        gsap.to(floatTargets, {
          y: -10,
          duration: 3.6,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.18
        });
      }
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [pathname]);

  return null;
}
