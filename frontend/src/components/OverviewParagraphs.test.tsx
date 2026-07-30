import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OverviewParagraphs, { overviewParagraphs } from "./OverviewParagraphs";

describe("overviewParagraphs", () => {
  it("splits on newlines and drops empty segments", () => {
    expect(overviewParagraphs("One.\n\nTwo.\nThree.")).toEqual(["One.", "Two.", "Three."]);
  });

  it("returns a single paragraph when there are no newlines", () => {
    expect(overviewParagraphs("Just one block.")).toEqual(["Just one block."]);
  });
});

describe("OverviewParagraphs", () => {
  it("renders each segment as a paragraph", () => {
    const { container } = render(
      <OverviewParagraphs overview={"First paragraph.\nSecond paragraph."} />,
    );
    const paragraphs = container.querySelectorAll("p.overview-text");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent("First paragraph.");
    expect(paragraphs[1]).toHaveTextContent("Second paragraph.");
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
  });
});
