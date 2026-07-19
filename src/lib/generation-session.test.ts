import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  areRequiredFinalStepsCompleted,
  canDismissGenerationSession,
  deriveGenerationSessionPhase,
  isGenerationSessionVisible,
  isProcessingGenerationSession,
  isTerminalGenerationSuccess,
  preserveGenerationSnapshot,
  shouldIgnoreStaleGenerationSession,
} from "./generation-session";

type Payload = {
  workflow_status: string | null;
  generation_status: string | null;
  steps: Array<{ key: string; label: string; status: string }>;
};

function payload(overrides: Partial<Payload> = {}): Payload {
  return {
    workflow_status: null,
    generation_status: null,
    steps: [],
    ...overrides,
  };
}

describe("generation session lifecycle", () => {
  it("does not treat webhook completion alone as terminal success", () => {
    const webhookOnly = payload({
      workflow_status: "completed",
      generation_status: "COMPLETED",
      steps: [
        { key: "dropbox_docx", label: "DOCX", status: "completed" },
        { key: "invoice_saved", label: "Saved", status: "pending" },
      ],
    });

    assert.equal(isTerminalGenerationSuccess(webhookOnly), false);
    assert.equal(deriveGenerationSessionPhase({ previous: "running", payload: webhookOnly }), "finalizing");
  });

  it("requires register_saved and invoice_saved completed for terminal success", () => {
    const almost = payload({
      workflow_status: "completed",
      generation_status: "COMPLETED",
      steps: [
        { key: "register_saved", label: "Register", status: "completed" },
        { key: "invoice_saved", label: "Saved", status: "running" },
      ],
    });
    assert.equal(areRequiredFinalStepsCompleted(almost.steps), false);
    assert.equal(isTerminalGenerationSuccess(almost), false);

    const done = payload({
      workflow_status: "completed",
      generation_status: "COMPLETED",
      steps: [
        { key: "register_saved", label: "Register", status: "completed" },
        { key: "invoice_saved", label: "Saved", status: "completed" },
      ],
    });
    assert.equal(isTerminalGenerationSuccess(done), true);
    assert.equal(deriveGenerationSessionPhase({ previous: "finalizing", payload: done }), "succeeded");
  });

  it("preserves last valid snapshot on transient polling failure", () => {
    const previous = payload({
      generation_status: "VALIDATING",
      steps: [{ key: "received", label: "Received", status: "completed" }],
    });
    assert.deepEqual(preserveGenerationSnapshot(previous, null), previous);
    assert.deepEqual(preserveGenerationSnapshot(previous, undefined), previous);
  });

  it("keeps completed workflow visible (not idle)", () => {
    assert.equal(isGenerationSessionVisible("succeeded"), true);
    assert.equal(isGenerationSessionVisible("failed"), true);
    assert.equal(isGenerationSessionVisible("finalizing"), true);
    assert.equal(isGenerationSessionVisible("idle"), false);
    assert.equal(canDismissGenerationSession("succeeded"), true);
    assert.equal(canDismissGenerationSession("running"), false);
  });

  it("blocks dismiss while processing so downloads cannot close the session", () => {
    assert.equal(isProcessingGenerationSession("running"), true);
    assert.equal(isProcessingGenerationSession("finalizing"), true);
    assert.equal(canDismissGenerationSession("running"), false);
    assert.equal(canDismissGenerationSession("finalizing"), false);
    assert.equal(canDismissGenerationSession("succeeded"), true);
  });

  it("ignores stale polling responses from older sessions", () => {
    assert.equal(shouldIgnoreStaleGenerationSession("inv-1:2", "inv-1:1"), true);
    assert.equal(shouldIgnoreStaleGenerationSession("inv-1:2", "inv-1:2"), false);
  });

  it("stays finalizing when webhook resolves before final polling result", () => {
    const webhook = payload({
      workflow_status: "completed",
      generation_status: "COMPLETED",
      steps: [
        { key: "dropbox_docx", label: "DOCX", status: "completed" },
        { key: "register_saved", label: "Register", status: "pending" },
        { key: "invoice_saved", label: "Saved", status: "pending" },
      ],
    });
    assert.equal(
      deriveGenerationSessionPhase({ previous: "running", payload: webhook }),
      "finalizing"
    );
  });
});
