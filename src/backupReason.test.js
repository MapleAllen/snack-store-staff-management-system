import { describe, expect, it } from "vitest";
import { BACKUP_REASONS, BACKUP_REASON_LABELS, BACKUP_TYPE, STORAGE_KEY, validateBackupPayload } from "../shared/backup-format.js";
import { createInitialWorkspace } from "./payrollData.js";

describe("backup reason constants", () => {
  it("defines the five allowed backup reasons", () => {
    expect(BACKUP_REASONS.DAILY_STARTUP).toBe("daily-startup");
    expect(BACKUP_REASONS.BEFORE_RESTORE).toBe("before-restore");
    expect(BACKUP_REASONS.MONTH_CLOSE).toBe("month-close");
    expect(BACKUP_REASONS.BEFORE_DEMO_RESET).toBe("before-demo-reset");
    expect(BACKUP_REASONS.MANUAL).toBe("manual");
  });

  it("provides a label for every reason", () => {
    for (const reason of Object.values(BACKUP_REASONS)) {
      expect(typeof BACKUP_REASON_LABELS[reason]).toBe("string");
    }
  });

  it("validates a workspace payload with before-demo-reset reason", () => {
    const payload = {
      type: BACKUP_TYPE,
      storageKey: STORAGE_KEY,
      version: "2.0.0",
      reason: BACKUP_REASONS.BEFORE_DEMO_RESET,
      data: createInitialWorkspace(),
    };
    const validated = validateBackupPayload(payload);
    expect(validated.reason).toBe(BACKUP_REASONS.BEFORE_DEMO_RESET);
  });
});
