import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GrowthBadge } from "./GrowthBadge";

describe("GrowthBadge", () => {
  it("formats positive, negative, and flat growth values", () => {
    render(
      <>
        <GrowthBadge absolute={12_000} percent={0.12} />
        <GrowthBadge absolute={-3_000} percent={-0.03} />
        <GrowthBadge absolute={0} percent={0} />
      </>,
    );

    expect(screen.getByText("+12,000 (+12%)")).toBeInTheDocument();
    expect(screen.getByText("-3,000 (-3%)")).toBeInTheDocument();
    expect(screen.getByText("+0 (0%)")).toBeInTheDocument();
  });
});
