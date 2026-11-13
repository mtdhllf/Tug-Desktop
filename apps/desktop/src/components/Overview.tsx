import { useMemo, useState, type FormEvent } from "react";
import { useI18n } from "../i18n";
import type { AppInfo, Settings, TaskView } from "../lib/backend";
import { formatBytes } from "../lib/format";
import { overviewPriority } from "../lib/bulkActions";
import type { NavCounts, View } from "./Sidebar";
import { TaskRow } from "./TaskRow";
import {
  ArrowRightIcon,
  DownloadIcon,
  HardDriveIcon,
  WifiIcon,
} from "./icons";

interface OverviewProps {
  tasks: TaskView[];
  counts: NavCounts;
  settings: Settings;
  info: AppInfo | null;
  onQuickAdd: (url: string) => void;
  onNew: () => void;
  onNavigate: (view: View) => void;
  onPause: (id: number) => void;
  onPauseAll: () => void;
  busy: boolean;
  onResume: (id: number) => void;
  onRemove: (task: TaskView) => void;
  onDetails: (task: TaskView) => void;
  onOpen: (task: TaskView) => void;
  onReveal: (task: TaskView) => void;
}


export function Overview({
  tasks,
  counts,
  settings,
  info,
  onQuickAdd,
  onNew,
  onNavigate,
  onPause,
  onPauseAll,
  busy,
  onResume,
  onRemove,
  onDetails,
  onOpen,
  onReveal,
}: OverviewProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");

  const active = useMemo(
    () => tasks.filter((task) => task.state !== "completed" && task.state !== "seeding")
      .sort((a, b) => overviewPriority(a) - overviewPriority(b) || b.createdAt - a.createdAt || b.id - a.id),
    [tasks],
  );
  const recent = useMemo(
    () => tasks.filter((task) => task.state === "completed" || task.state === "seeding")
      .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id).slice(0, 5),
    [tasks],
  );
  const totalSpeed = tasks.reduce((sum, task) => sum + task.speedBps, 0);
  const uploadSpeed = tasks.reduce((sum, task) => sum + task.uploadSpeedBps, 0);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = url.trim();
    if (!value) return;
    onQuickAdd(value);
    setUrl("");
  }

  return (
    <div className="overview">
      <section className="card hero">
        <h1>{t("overview.heroLead")}</h1>
        <p>{t("overview.heroDesc")}</p>
        <form className="quick-add" onSubmit={submit}>
          <span className="quick-prefix">URL</span>
          <input
            aria-label={t("add.url")}
            value={url}
            onChange={(event) => setUrl(event.currentTarget.value)}
            placeholder={t("overview.quickPlaceholder")}
            spellCheck={false}
          />
          <button type="submit">{t("overview.quickStart")}</button>
        </form>
        <div className="hero-stats">
          <div><span>{t("overview.stat.active")}</span><strong>{counts.active} <small>{t("overview.unit.tasks", { count: counts.active })}</small></strong></div>
          <div><span>{t("overview.stat.done")}</span><strong>{counts.completed} <small>{t("overview.unit.tasks", { count: counts.completed })}</small></strong></div>
          <div><span>{t("diag.downloadDir")}</span><strong className="path-value" title={info?.downloadDir ?? settings.downloadDir}>{settings.downloadDir}</strong></div>
        </div>
      </section>

      <section className="card telemetry">
        <div className="card-head"><h2>{t("overview.stat.speed")}</h2><span className="spacer" /></div>
        <div className="telemetry-main">
          <div className="telemetry-speed">{formatBytes(totalSpeed)}<small>/s</small></div>
        </div>
        <div className="telemetry-foot"><span>{t("overview.stat.upload")} <b>{formatBytes(uploadSpeed)}/s</b></span></div>
      </section>

      <section className="card active-list">
        <div className="card-head">
          <h2>{t("overview.active")}</h2>
          <span className="kicker">/ {active.length}</span>
          <span className="spacer" />
          <button type="button" className="chip" disabled={busy || !active.some((task) => ["downloading", "fetching_metadata"].includes(task.state))} onClick={onPauseAll}>{t("overview.pauseAll")}</button>
          <button type="button" className="chip" onClick={() => onNavigate("active")}>{t("overview.viewAll")} <ArrowRightIcon size={11} /></button>
        </div>
        {active.length === 0 ? (
          <div className="overview-empty">
            <span className="overview-empty-icon"><DownloadIcon size={20} /></span>
            <b>{t("overview.emptyTitle")}</b>
            <span>{t("overview.emptyHint")}</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={onNew}>{t("toolbar.new")}</button>
          </div>
        ) : (
          active.slice(0, 3).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onPause={onPause}
              onResume={onResume}
              onRemove={onRemove}
              onDetails={onDetails}
              onOpen={onOpen}
              onReveal={onReveal}
            />
          ))
        )}
        <button type="button" className="drop-zone" onClick={onNew}>
          <span className="drop-plus"><DownloadIcon size={16} /></span>
          <span><b>{t("overview.dropTitle")}</b><em>{t("overview.dropHint")}</em></span>
        </button>
      </section>

      <aside className="overview-side">
        <section className="card mini-card">
          <div className="card-head"><h2>{t("overview.recent")}</h2><span className="kicker">/ {counts.completed}</span><span className="spacer" /><button type="button" className="link-btn" onClick={() => onNavigate("completed")}>{t("overview.viewAll")}</button></div>
          {recent.length === 0 ? <div className="inline-empty compact">{t("overview.recentEmpty")}</div> : recent.map((task) => (
            <div className="mini-line" key={task.id}>
              <span className="mini-check">✓</span>
              <span className="mini-name" title={task.name}>{task.name}</span>
              <span className="mini-value">{formatBytes(task.total ?? task.downloaded)}</span>
            </div>
          ))}
        </section>

        <section className="card mini-card network">
          <div className="card-head"><h2>{t("overview.network")}</h2><span className="spacer" /><HardDriveIcon size={14} /></div>
          <div className="kv-line"><span><WifiIcon size={13} /> {t("overview.dht")}</span><b className={settings.btDht ? "ok" : "muted"}>{settings.btDht ? t("overview.connected") : t("overview.disconnected")}</b></div>
          <div className="kv-line"><span>{t("overview.port")}</span><b>{settings.btListenPort ?? t("common.random")}</b></div>
          <div className="kv-line"><span>{t("overview.upnp")}</span><b className={settings.btUpnp ? "ok" : "muted"}>{settings.btUpnp ? t("overview.mapped") : "—"}</b></div>
          <div className="kv-line"><span>{t("overview.limit")}</span><b>{settings.globalDownloadLimitKib ? `${Number((settings.globalDownloadLimitKib / 1024).toFixed(2))} MB/s` : t("overview.unlimited")}</b></div>
        </section>
      </aside>
    </div>
  );
}
