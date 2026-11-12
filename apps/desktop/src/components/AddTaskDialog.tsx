import { useEffect, useState, type FormEvent } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useI18n } from "../i18n";
import { addTask, type TaskView } from "../lib/backend";
import { CloseIcon, FileIcon, FolderIcon } from "./icons";

interface AddTaskDialogProps {
  visible: boolean;
  defaultDir: string;
  defaultConnections: number;
  initialUrl?: string | null;
  onClose: () => void;
  onAdded: (task: TaskView) => void;
}

export function AddTaskDialog({
  visible,
  defaultDir,
  defaultConnections,
  initialUrl,
  onClose,
  onAdded,
}: AddTaskDialogProps) {
  const { t, pick } = useI18n();
  const [url, setUrl] = useState("");
  const [saveDir, setSaveDir] = useState(defaultDir);
  const [fileName, setFileName] = useState("");
  const [connections, setConnections] = useState(defaultConnections);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setUrl(initialUrl ?? "");
    setSaveDir(defaultDir);
    setFileName("");
    setConnections(defaultConnections);
    setBusy(false);
    setError(null);
  }, [visible, initialUrl, defaultDir, defaultConnections]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  async function pickDirectory() {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        defaultPath: saveDir || undefined,
      });
      if (typeof selected === "string") setSaveDir(selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function pickTorrent() {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "BitTorrent", extensions: ["torrent"] }],
      });
      if (typeof selected === "string") {
        setUrl(selected);
        setFileName("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const trimmedUrl = url.trim();
  const isTorrent = /^magnet:/i.test(trimmedUrl) || /\.torrent(\?.*)?$/i.test(trimmedUrl);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^https?:\/\//i.test(trimmedUrl) && !isTorrent) {
      setError(t("add.invalidUrl"));
      return;
    }
    if (!isTorrent && (!Number.isFinite(connections) || connections < 1 || connections > 32)) {
      setError(t("add.invalidConnections"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const task = await addTask({
        url: trimmedUrl,
        saveDir: saveDir.trim() || null,
        fileName: isTorrent ? null : fileName.trim() || null,
        connections: isTorrent ? null : connections,
      });
      onAdded(task);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
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
      <div className="modal add-modal" role="dialog" aria-modal="true" aria-labelledby="add-task-title">
        <div className="modal-head">
          <div>
            <div className="modal-kicker">NEW TASK / 02</div>
            <h2 id="add-task-title">{t("add.title")}</h2>
            <p>{t("add.subtitle")}</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("add.cancel")}>
            <CloseIcon size={14} />
          </button>
        </div>

        <form id="add-task-form" className="add-layout" onSubmit={submit}>
          <div className="add-main">
            <div className="seg add-tabs">
              <button type="button" className="active">{pick("链接 / URL", "LINK / URL")}</button>
              <button type="button" onClick={pickTorrent}>{pick("种子 / TORRENT", "TORRENT")}</button>
            </div>

            <label className="field">
              <span>{t("add.url")}</span>
              <input
                type="text"
                value={url}
                onChange={(event) => setUrl(event.currentTarget.value)}
                placeholder={t("add.urlPlaceholder")}
                autoFocus
                spellCheck={false}
              />
              <div className="hint">{pick("支持 HTTP/HTTPS、magnet:?xt=...，也可直接选择 .torrent。", "Supports HTTP/HTTPS, magnet:?xt=..., or pick a .torrent file directly.")}</div>
            </label>

            <div className="field-row">
              <label className="field">
                <span>{t("add.saveDir")}</span>
                <div className="input-with-button">
                  <input value={saveDir} onChange={(event) => setSaveDir(event.currentTarget.value)} spellCheck={false} />
                  <button type="button" className="btn btn-sm" onClick={pickDirectory}><FolderIcon size={12} /> {t("add.browse")}</button>
                </div>
              </label>
              <label className="field">
                <span>{t("add.fileName")}</span>
                <input value={fileName} onChange={(event) => setFileName(event.currentTarget.value)} placeholder={t("add.fileNamePlaceholder")} spellCheck={false} disabled={isTorrent} />
              </label>
            </div>

            {isTorrent ? (
              <div className="form-note"><FileIcon size={13} /> {t("add.torrentHint")}</div>
            ) : (
              <div className="field-row">
                <label className="field">
                  <span>{t("add.connections")}</span>
                  <div className="input-unit">
                    <input type="number" min={1} max={32} value={connections} onChange={(event) => setConnections(Number(event.currentTarget.value))} />
                    <span>CONN</span>
                  </div>
                </label>
                <div className="form-note vertical">{pick("高级选项（代理、Header、Cookie、SHA-256）将在 M4 开放。", "Advanced options (proxy, headers, cookies, SHA-256) arrive in M4.")}</div>
              </div>
            )}

            {error && <div className="form-error">{error}</div>}
          </div>

          <aside className="add-side">
            <div className="tip">
              <div className="tip-kicker">BT / MAGNET</div>
              <p>{pick("磁力与种子任务会先获取元数据，然后自动开始下载；文件选择可在任务详情中调整。", "Magnet and torrent tasks fetch metadata first, then start downloading automatically; file selection can be adjusted in the task details.")}</p>
            </div>
            <div className="summary">
              <div className="summary-row"><span>{pick("类型", "Type")}</span><b>{isTorrent ? "BitTorrent" : "HTTP"}</b></div>
              <div className="summary-row"><span>{pick("连接数", "Connections")}</span><b>{isTorrent ? pick("自动", "Auto") : connections}</b></div>
              <div className="summary-row"><span>{pick("保存到", "Save to")}</span><b title={saveDir}>{saveDir || "—"}</b></div>
              <div className="summary-row"><span>{pick("校验", "Verification")}</span><b>{pick("完成后可选", "Optional after completion")}</b></div>
            </div>
            <div className="tip">
              <div className="tip-kicker">DROP ZONE</div>
              <p>{pick("也可以把 .torrent、磁力或链接拖进主窗口，直接加入队列。", "You can also drag a .torrent, magnet link, or URL into the main window to add it to the queue.")}</p>
            </div>
          </aside>
        </form>

        <div className="modal-foot">
          <span className="mono faint">{pick("ESC 取消 · ENTER 开始", "ESC CANCEL · ENTER START")}</span>
          <span className="toolbar-spacer" />
          <button type="button" className="btn" onClick={onClose}>{t("add.cancel")}</button>
          <button type="submit" form="add-task-form" className="btn btn-primary" disabled={busy}>
            {busy ? t("add.starting") : t("add.start")}
          </button>
        </div>
      </div>
    </div>
  );
}
