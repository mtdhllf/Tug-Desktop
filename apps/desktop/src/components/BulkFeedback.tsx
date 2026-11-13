import { useI18n } from "../i18n";
import type { BulkResult } from "../lib/bulkActions";

interface Props {
  result: BulkResult;
  busy: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}

export function BulkFeedback({ result, busy, onRetry, onDismiss }: Props) {
  const { t } = useI18n();
  return (
    <section className={`bulk-feedback ${result.failures.length ? "has-failures" : ""}`} aria-label={t("bulk.results")}>
      <div className="bulk-feedback-head">
        <span role="status">{`${t(`bulk.result.${result.action}`, { count: result.succeeded })}${result.failures.length ? ` · ${t("bulk.result.failed", { count: result.failures.length })}` : ""}`}</span>
        <span className="spacer" />
        {result.failures.length > 0 && <button type="button" className="btn btn-sm" disabled={busy} onClick={onRetry}>{result.action === "remove" ? t("bulk.reviewRemoval") : t("bulk.retryFailed")}</button>}
        <button type="button" className="icon-btn" disabled={busy} onClick={onDismiss} aria-label={t("bulk.dismiss")}>×</button>
      </div>
      {result.failures.length > 0 && <details>
        <summary>{t("bulk.failureDetails")}</summary>
        <ul>{result.failures.map(({ task, message }) => <li key={task.id}><strong>{task.name}</strong><span>{message}</span></li>)}</ul>
      </details>}
    </section>
  );
}
