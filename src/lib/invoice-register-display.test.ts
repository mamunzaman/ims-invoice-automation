import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDetailPendingSteps,
  finalizeDetailStepsForCompletedInvoice,
  resolveDetailStepsFromStored,
  resolveInvoiceRegisterDisplay,
  yearlyRegisterExcelBackupPath,
  yearlyRegisterSheetName,
} from "@/lib/invoice-generation-steps";

describe("resolveInvoiceRegisterDisplay", () => {
  it("returns pending when steps are missing", () => {
    assert.equal(resolveInvoiceRegisterDisplay(null).status, "pending");
    assert.equal(resolveInvoiceRegisterDisplay([]).status, "pending");
  });

  it("returns recorded only when register_saved is completed", () => {
    const result = resolveInvoiceRegisterDisplay([
      {
        key: "register_saved",
        label: "Yearly invoice register saved",
        status: "completed",
        completed_at: "2026-07-18T10:00:00.000Z",
      },
    ]);
    assert.equal(result.status, "recorded");
    assert.equal(result.completedAt, "2026-07-18T10:00:00.000Z");
  });

  it("returns failed when register_saved failed", () => {
    assert.equal(
      resolveInvoiceRegisterDisplay([
        { key: "register_saved", label: "Register", status: "failed" },
      ]).status,
      "failed"
    );
  });

  it("does not treat general invoice completion as recorded", () => {
    assert.equal(
      resolveInvoiceRegisterDisplay([
        { key: "invoice_saved", label: "Saved", status: "completed" },
        { key: "completed", label: "Done", status: "completed" },
      ]).status,
      "pending"
    );
  });
});

describe("detail timeline register_saved", () => {
  it("includes register_saved before completed", () => {
    const keys = createDetailPendingSteps().map((step) => step.key);
    const registerIndex = keys.indexOf("register_saved");
    const completedIndex = keys.indexOf("completed");
    assert.ok(registerIndex >= 0);
    assert.ok(completedIndex > registerIndex);
  });

  it("does not synthesize register_saved completion from workflowComplete", () => {
    const steps = resolveDetailStepsFromStored(
      [
        { key: "received", label: "Received", status: "completed" },
        { key: "invoice_saved", label: "Saved", status: "completed" },
      ],
      { workflowComplete: true }
    );
    const register = steps.find((step) => step.key === "register_saved");
    assert.ok(register);
    assert.equal(register.status, "pending");
    const completed = steps.find((step) => step.key === "completed");
    assert.equal(completed?.status, "completed");
  });

  it("keeps persisted register_saved completed status", () => {
    const steps = finalizeDetailStepsForCompletedInvoice(
      createDetailPendingSteps().map((step) =>
        step.key === "register_saved"
          ? { ...step, status: "completed" as const, completed_at: "2026-07-18T12:00:00.000Z" }
          : step
      )
    );
    const register = steps.find((step) => step.key === "register_saved");
    assert.equal(register?.status, "completed");
    assert.equal(register?.completed_at, "2026-07-18T12:00:00.000Z");
  });
});

describe("yearly register naming", () => {
  it("builds sheet name and backup path", () => {
    assert.equal(yearlyRegisterSheetName(2026), "IMS Invoice_Register_2026");
    assert.equal(
      yearlyRegisterExcelBackupPath(2026),
      "/ItConsultingMamun/Rechnungen/Register/2026/IMS_Invoice_Register_2026.xlsx"
    );
  });
});
