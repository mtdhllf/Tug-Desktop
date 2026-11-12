import type { TaskView } from "./backend";

export type BulkAction = "pause" | "resume" | "remove";
export interface BulkFailure {
  task: TaskView;
  message: string;
}
export interface BulkResult {
  action: BulkAction;
  succeeded: number;
  failures: BulkFailure[];
}

/** Keep per-task results so a partial failure cannot be reported as success. */
export async function runBulkAction(
  action: BulkAction,
  targets: TaskView[],
  operation: (task: TaskView) => Promise<unknown>,
): Promise<BulkResult> {
  const result: BulkResult = { action, succeeded: 0, failures: [] };
  for (const task of targets) {
    try {
      await operation(task);
      result.succeeded++;
    } catch (cause) {
      result.failures.push({ task, message: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  return result;
}

export function overviewPriority(task: TaskView): number {
  if (task.state === "downloading" || task.state === "fetching_metadata") return 0;
  if (task.state === "queued") return 1;
  if (task.state === "failed") return 2;
  return 3;
}
