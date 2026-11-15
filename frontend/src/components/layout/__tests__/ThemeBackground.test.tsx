import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ThemeBackground } from "../ThemeBackground";

describe("ThemeBackground", () => {
  it("renders background wrapper without throwing", () => {
    const { container } = render(<ThemeBackground />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("aria-hidden", "true");
  });

  it("renders both light and dark mode sunflower background images with blur", () => {
    const { container } = render(<ThemeBackground />);
    const images = container.querySelectorAll("img");
    expect(images.length).toBe(2);

    const [lightImg, darkImg] = images;
    expect(lightImg).toBeInTheDocument();
    expect(darkImg).toBeInTheDocument();

    // Verify blur filter classes applied
    expect(lightImg?.className).toContain("blur-xl");
    expect(darkImg?.className).toContain("blur-xl");

    // Verify scale to prevent blur edge-fringing
    expect(lightImg?.className).toContain("scale-110");
    expect(darkImg?.className).toContain("scale-110");

    // Verify light mode opacity transition classes
    expect(lightImg?.className).toContain("dark:opacity-0");

    // Verify dark mode opacity transition classes
    expect(darkImg?.className).toContain("dark:opacity-85");
  });
});
