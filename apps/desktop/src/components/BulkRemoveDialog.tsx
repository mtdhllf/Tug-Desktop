import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { TaskView } from "../lib/backend";
import { formatBytes } from "../lib/format";
import { FileIcon, TrashIcon } from "./icons";

interface BulkRemoveDialogProps {
  tasks: TaskView[];
  onClose: () => void;
  onConfirm: (deleteFiles: boolean) => Promise<void>;
}

/** 多选删除确认。与单任务删除一致，只有确认后才真正删除。 */
export function BulkRemoveDialog({ tasks, onClose, onConfirm }: BulkRemoveDialogProps) {
  const { t, pick } = useI18n();
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  useEffect(() => {
    setDeleteFiles(false);
    setBusy(false);
  }, [tasks]);

  async function confirm() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await onConfirm(deleteFiles);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  const total = tasks.reduce((sum, task) => sum + (task.total ?? task.downloaded), 0);
  const preview = tasks.slice(0, 4);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal remove-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h2>{t("tasks.bulk.removeTitle")}</h2>
          </div>
          <button type="button" className="icon-btn" disabled={busy} onClick={onClose} aria-label={t("add.cancel")}>×</button>
        </div>
        <div className="modal-body">
          <div className="warning-strip">{t("tasks.bulk.removeHint")}</div>
          <div className="remove-file">
            <span className="file-chip"><FileIcon size={16} /></span>
            <div>
              <b>{t("tasks.bulk.removeMessage", { count: tasks.length })}</b>
              <span>{preview.map((task) => task.name).join(pick("、", ", "))}{tasks.length > preview.length ? pick(` 等 ${tasks.length} 个任务`, ` and ${tasks.length - preview.length} more`) : ""} · {formatBytes(total)}</span>
            </div>
          </div>
          <label className="check-row remove-check">
            <input type="checkbox" disabled={busy} checked={deleteFiles} onChange={(event) => setDeleteFiles(event.currentTarget.checked)} />
            <span><b>{t("task.deleteFiles")}</b><em>{pick("文件也会从磁盘删除，无法撤销。", "Also remove files from disk. This cannot be undone.")}</em></span>
          </label>
        </div>
        <div className="modal-foot">
          <span className="mono faint">{pick("只删除任务不会删除磁盘文件", "Deleting the tasks will not delete files on disk")}</span>
          <span className="toolbar-spacer" />
          <button type="button" className="btn" disabled={busy} onClick={onClose}>{t("add.cancel")}</button>
          <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
            <TrashIcon size={13} /> {t("task.confirmRemove")}
          </button>
        </div>
      </div>
    </div>
  );
}
