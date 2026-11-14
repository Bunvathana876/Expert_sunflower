import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SunflowerIcon, SUNFLOWER_ICONS } from "../SunflowerIcon";

describe("SunflowerIcon component", () => {
  it("renders with default size 24 and decorative aria-hidden", () => {
    const { container } = render(<SunflowerIcon name="brand" />);
    const img = container.querySelector("img");

    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("width", "24");
    expect(img).toHaveAttribute("height", "24");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(img?.style.objectFit).toBe("contain");
  });

  it("applies custom size and dimensions correctly", () => {
    const { container } = render(
      <SunflowerIcon name="diagnosis" size={48} className="custom-icon" />,
    );
    const img = container.querySelector("img");

    expect(img).toHaveAttribute("width", "48");
    expect(img).toHaveAttribute("height", "48");
    expect(img).toHaveClass("custom-icon");
  });

  it("renders accessible informative alt text when provided", () => {
    render(<SunflowerIcon name="history" alt="Diagnosis History" />);
    const img = screen.getByAltText("Diagnosis History");

    expect(img).toBeInTheDocument();
    expect(img).not.toHaveAttribute("aria-hidden");
  });

  it("correctly resolves all icon mappings", () => {
    const iconNames = [
      "brand",
      "diagnosis",
      "disease-library",
      "diseases",
      "plant-anatomy",
      "anatomy",
      "history",
      "ai-assistant",
      "assistant",
    ] as const;

    for (const name of iconNames) {
      const { container } = render(<SunflowerIcon name={name} />);
      const img = container.querySelector("img");
      expect(img).toHaveAttribute("src", SUNFLOWER_ICONS[name]);
    }
  });
});
