export const OPERATION_TYPES = new Set([
  "store-created", "store-renamed", "store-archived", "store-restored",
  "salary-adjusted", "employee-resigned", "employee-restored", "rule-updated",
  "employee-transferred", "payroll-closed", "payroll-unlocked",
  "payout-created", "payout-row-updated",
]);

// Operation events intentionally carry only stable IDs, store scope and dates.
// This keeps the payroll audit trail useful without copying free-form notes,
// payout amounts, or employee personal information into a second store.
export function appendOperationLog(workspace, event) {
  return { ...workspace, operationLog: [event, ...(workspace.operationLog ?? [])] };
}
