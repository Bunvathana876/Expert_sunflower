import type React from "react";
import type { ImgHTMLAttributes } from "react";

import brandImg from "@/assets/icons/sunflower-studio/brand.png";
import diagnosisImg from "@/assets/icons/sunflower-studio/diagnosis.png";
import diseaseLibraryImg from "@/assets/icons/sunflower-studio/disease-library.png";
import plantAnatomyImg from "@/assets/icons/sunflower-studio/plant-anatomy.png";
import historyImg from "@/assets/icons/sunflower-studio/history.png";
import aiAssistantImg from "@/assets/icons/sunflower-studio/ai-assistant.png";

export const SUNFLOWER_ICONS = {
  brand: brandImg,
  diagnosis: diagnosisImg,
  "disease-library": diseaseLibraryImg,
  diseases: diseaseLibraryImg,
  "plant-anatomy": plantAnatomyImg,
  anatomy: plantAnatomyImg,
  history: historyImg,
  "ai-assistant": aiAssistantImg,
  assistant: aiAssistantImg,
} as const;

export type SunflowerIconName = keyof typeof SUNFLOWER_ICONS;

export interface SunflowerIconProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** The icon name from the Sunflower Studio icon pack */
  name: SunflowerIconName;
  /** Uniform dimension applied to width & height in pixels (or CSS unit if string) */
  size?: number | string;
}

/**
 * Reusable React component for Sunflower Studio branded icons.
 * Features consistent sizing, object-contain preservation, responsive classes,
 * and built-in accessibility handling (decorative by default with alt="").
 */
export function SunflowerIcon({
  name,
  size = 24,
  width,
  height,
  alt = "",
  className = "",
  style,
  loading = "lazy",
  draggable = false,
  "aria-hidden": ariaHidden,
  ...restProps
}: SunflowerIconProps): React.JSX.Element {
  const iconSrc = SUNFLOWER_ICONS[name];
  const resolvedWidth = width ?? size;
  const resolvedHeight = height ?? size;
  const isDecorative = alt === "";
  const resolvedAriaHidden = ariaHidden ?? (isDecorative ? true : undefined);

  return (
    <img
      src={iconSrc}
      alt={alt}
      width={resolvedWidth}
      height={resolvedHeight}
      loading={loading}
      draggable={draggable}
      aria-hidden={resolvedAriaHidden}
      className={`inline-block shrink-0 select-none ${className}`}
      style={{
        objectFit: "contain",
        ...style,
      }}
      {...restProps}
    />
  );
}
