import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import "@testing-library/jest-dom/vitest";

import { BrandMark } from "../../src/components/BrandMark";

describe("BrandMark", () => {
  it("is announced as an image when it has a title", () => {
    render(<BrandMark title="InfraObserver" />);

    expect(
      screen.getByRole("img", { name: "InfraObserver" }),
    ).toBeInTheDocument();
  });

  it("is hidden from assistive technology when decorative", () => {
    const { container } = render(<BrandMark />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("uses the requested size", () => {
    const { container } = render(<BrandMark size={48} />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "48");
    expect(svg).toHaveAttribute("height", "48");
  });
});
