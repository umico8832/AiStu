import type { ReactNode } from "react";

export interface KaleidoscopeMarkProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  children?: ReactNode;
}
/**
 * Small, dependency-free brand mark used to make the prism metaphor visible
 * without introducing image assets. The facets are decorative only; any
 * optional label is exposed to assistive technology as a single image.
 */
export function KaleidoscopeMark({
  size = "md",
  label,
  className = "",
  children,
}: KaleidoscopeMarkProps) {
  return (
    <span
      className={`kaleidoscope-mark kaleidoscope-mark--${size} ${className}`.trim()}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="kaleidoscope-mark__facet kaleidoscope-mark__facet--one" />
      <span className="kaleidoscope-mark__facet kaleidoscope-mark__facet--two" />
      <span className="kaleidoscope-mark__facet kaleidoscope-mark__facet--three" />
      <span className="kaleidoscope-mark__facet kaleidoscope-mark__facet--four" />
      <span className="kaleidoscope-mark__facet kaleidoscope-mark__facet--five" />
      <span className="kaleidoscope-mark__core" />
      {children}
    </span>
  );
}
