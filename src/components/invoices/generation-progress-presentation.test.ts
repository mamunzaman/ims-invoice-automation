import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generationModalPaperSx,
  generationTimelineGeometry,
  generationTimelineGridTemplate,
  getGenerationStepVisualState,
  getRunningSpinnerSx,
  resolveGenerationInvoiceContext,
  shouldRenderTimelineConnector,
} from "./generation-progress-presentation";

describe("generation progress presentation", () => {
  it("resolves invoice number and customer name for the context panel", () => {
    assert.deepEqual(
      resolveGenerationInvoiceContext("2026-0113", "The Top Floor Public Relations Ltd."),
      {
        invoiceNumber: "2026-0113",
        customerName: "The Top Floor Public Relations Ltd.",
      }
    );
  });

  it("uses strict marker-column geometry for every row", () => {
    assert.equal(generationTimelineGeometry.markerColumnWidth, 40);
    assert.equal(generationTimelineGeometry.markerSize, 34);
    assert.equal(generationTimelineGeometry.columnGap, 14);
    assert.equal(generationTimelineGeometry.rowMinHeight, 58);
    assert.equal(generationTimelineGridTemplate, "40px minmax(0, 1fr)");
  });

  it("omits connector after the last step", () => {
    assert.equal(shouldRenderTimelineConnector(false), true);
    assert.equal(shouldRenderTimelineConnector(true), false);
  });

  it("maps completed / running / pending / failed marker variants", () => {
    assert.equal(getGenerationStepVisualState("completed"), "completed");
    assert.equal(getGenerationStepVisualState("running"), "running");
    assert.equal(getGenerationStepVisualState("pending"), "pending");
    assert.equal(getGenerationStepVisualState("failed"), "failed");
  });

  it("uses infinite CSS keyframe animation when reduced motion is off", () => {
    const sx = getRunningSpinnerSx(false);
    assert.match(String(sx.animation), /800ms linear infinite/);
    assert.notEqual(sx.animation, "none");
    assert.equal(sx.width, 34);
    assert.equal(sx.height, 34);
  });

  it("uses static spinner styles under reduced motion (never determinate CircularProgress)", () => {
    const sx = getRunningSpinnerSx(true);
    assert.equal(sx.animation, "none");
    assert.equal(sx.borderTopColor, "#3f8f00");
  });

  it("keeps a fully opaque modal surface", () => {
    assert.equal(generationModalPaperSx.opacity, 1);
    assert.equal(generationModalPaperSx.backdropFilter, "none");
  });
});
