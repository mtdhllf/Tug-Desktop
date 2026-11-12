import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import type { TaskView } from "../lib/backend";
import { formatBytes, percentOf } from "../lib/format";
import { FileIcon, TrashIcon } from "./icons";

interface RemoveTaskDialogProps {
  task: TaskView;
  onClose: () => void;
  onConfirm: (task: TaskView, deleteFiles: boolean) => Promise<void>;
}

export function RemoveTaskDialog({ task, onClose, onConfirm }: RemoveTaskDialogProps) {
  const { t, pick } = useI18n();
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const percent = percentOf(task);

  useEffect(() => {
    setDeleteFiles(false);
    setBusy(false);
  }, [task.id]);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm(task, deleteFiles);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal remove-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h2>{t("task.removeTitle")}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("add.cancel")}>×</button>
        </div>
        <div className="modal-body">
          <div className="warning-strip">{pick("删除后将无法在此继续任务。默认保留已下载的文件。", "The task can no longer be resumed here. Downloaded files are kept by default.")}</div>
          <div className="remove-file">
            <span className="file-chip bt"><FileIcon size={16} /></span>
            <div>
              <b>{task.name}</b>
              <span>{formatBytes(task.downloaded)} / {task.total ? formatBytes(task.total) : "?"} · {percent === null ? "--" : `${percent.toFixed(1)}%`} · {task.kind === "torrent" ? "BT" : "HTTP"}</span>
            </div>
          </div>
          <label className="check-row remove-check">
            <input type="checkbox" checked={deleteFiles} onChange={(event) => setDeleteFiles(event.currentTarget.checked)} />
            <span><b>{t("task.deleteFiles")}</b><em>{pick("文件也会从磁盘删除，无法撤销。", "Also remove the files from disk. This cannot be undone.")}</em></span>
          </label>
        </div>
        <div className="modal-foot">
          <span className="mono faint">{pick("只删除任务不会删除磁盘文件", "Deleting the task will not delete files on disk")}</span>
          <span className="toolbar-spacer" />
          <button type="button" className="btn" onClick={onClose}>{t("add.cancel")}</button>
          <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
            <TrashIcon size={13} /> {t("task.confirmRemove")}
          </button>
        </div>
      </div>
    </div>
  );
}
