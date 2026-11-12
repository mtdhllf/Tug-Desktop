import { useI18n } from "../i18n";
import type { BulkResult } from "../lib/bulkActions";

interface Props {
  result: BulkResult;
  busy: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

export function BulkFeedback({ result, busy, onRetry, onDismiss }: Props) {
  const { pick } = useI18n();
  const verb = result.action === "pause" ? pick("暂停", "paused")
    : result.action === "resume" ? pick("恢复下载", "resumed") : pick("删除", "deleted");
  return (
    <section className={`bulk-feedback ${result.failures.length ? "has-failures" : ""}`} aria-label={pick("批量操作结果", "Batch results")}>
      <div className="bulk-feedback-head">
        <span role="status">{pick(
          `${result.succeeded} 个任务已${verb}${result.failures.length ? `，${result.failures.length} 个未能完成操作` : ""}`,
          `${result.succeeded} ${result.succeeded === 1 ? "task" : "tasks"} ${verb}${result.failures.length ? `; ${result.failures.length} could not be processed` : ""}`,
        )}</span>
        <span className="spacer" />
        {result.failures.length > 0 && <button type="button" className="btn btn-sm" disabled={busy} onClick={onRetry}>{result.action === "remove" ? pick("重新确认删除", "Review deletion") : pick("重试失败项", "Retry failed tasks")}</button>}
        <button type="button" className="icon-btn" disabled={busy} onClick={onDismiss} aria-label={pick("关闭操作结果", "Dismiss results")}>×</button>
      </div>
      {result.failures.length > 0 && <details>
        <summary>{pick("查看未完成的任务与原因", "View failed tasks and reasons")}</summary>
        <ul>{result.failures.map(({ task, message }) => <li key={task.id}><strong>{task.name}</strong><span>{message}</span></li>)}</ul>
      </details>}
    </section>
  );
}
