import { useEffect, useState, type FormEvent } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useI18n, SUPPORTED_LOCALES, type Locale } from "../i18n";
import type { MessageKey } from "../i18n/zh-CN";
import { updateSettings, type AppInfo, type Settings } from "../lib/backend";
import { CheckIcon, ChevronDownIcon, FolderIcon, PaletteIcon, ShieldIcon } from "./icons";

export type SettingsTab = "download" | "network" | "bt" | "appearance" | "notify" | "about";

interface SettingsPageProps {
  settings: Settings;
  info: AppInfo | null;
  tab: SettingsTab;
  onTab: (tab: SettingsTab) => void;
  onSaved: (settings: Settings) => void;
}

const TABS: { id: SettingsTab; label: MessageKey; num: string }[] = [
  { id: "download", label: "settings.tab.download", num: "01" },
  { id: "network", label: "settings.tab.network", num: "02" },
  { id: "bt", label: "settings.tab.bt", num: "03" },
  { id: "appearance", label: "settings.tab.appearance", num: "04" },
  { id: "notify", label: "settings.tab.notify", num: "05" },
  { id: "about", label: "settings.tab.about", num: "06" },
];

function num(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 内部仍以 KiB/s 存储；界面统一显示 MB/s。 */
function kibToMb(value: number | null): number | null {
  if (value === null) return null;
  return Number((value / 1024).toFixed(2));
}

function mbToKib(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, Math.round(value * 1024));
}

export function SettingsPage({ settings, info, tab, onTab, onSaved }: SettingsPageProps) {
  const { t, locale, setLocale } = useI18n();
  const [draft, setDraft] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(settings);
    setError(null);
    setSaved(false);
  }, [settings]);

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function pickDirectory() {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        defaultPath: draft.downloadDir || undefined,
      });
      if (typeof selected === "string") patch("downloadDir", selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      draft.connectionsPerTask < 1 ||
      draft.connectionsPerTask > 32 ||
      draft.maxConcurrentTasks < 1 ||
      draft.maxConcurrentTasks > 16 ||
      (draft.btListenPort !== null && (draft.btListenPort < 1 || draft.btListenPort > 65535))
    ) {
      setError(t("settings.invalid"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 手动代理已下线，保存时清掉旧值，统一走系统代理开关。
      const savedSettings = await updateSettings({ ...draft, proxy: null });
      setDraft(savedSettings);
      onSaved(savedSettings);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const editable = tab !== "about";
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <div className="settings-page">


      <form className="settings-layout" onSubmit={save}>
        <nav className="subnav">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`subnav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => onTab(item.id)}
            >
              <span>{t(item.label)}</span>
              {tab === item.id && <ChevronDownIcon size={11} />}
            </button>
          ))}
        </nav>

        <div className="settings-form">
          {tab === "download" && (
            <>
              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.location")}</h3></div>
                <div className="form-card-body">
                  <label className="field"><span>{t("settings.downloadDir")}</span>
                    <div className="input-with-button">
                      <input value={draft.downloadDir} onChange={(e) => patch("downloadDir", e.currentTarget.value)} spellCheck={false} />
                      <button type="button" className="btn btn-sm" onClick={pickDirectory}><FolderIcon size={12} /> {t("add.browse")}</button>
                    </div>
                  </label>
                  <div className="form-note">{t("settings.locationHint")}</div>
                </div>
              </section>

              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.connections")}</h3></div>
                <div className="form-card-body">
                  <div className="field-row">
                    <label className="field"><span>{t("settings.connections")}</span>
                      <div className="input-unit"><input type="number" min={1} max={32} value={draft.connectionsPerTask} onChange={(e) => patch("connectionsPerTask", Number(e.currentTarget.value))} /><span>{t("add.connectionsUnit")}</span></div>
                    </label>
                    <label className="field"><span>{t("settings.concurrent")}</span>
                      <div className="input-unit"><input type="number" min={1} max={16} value={draft.maxConcurrentTasks} onChange={(e) => patch("maxConcurrentTasks", Number(e.currentTarget.value))} /><span>{t("overview.unit.tasks")}</span></div>
                    </label>
                  </div>
                  <div className="form-note">{t("settings.networkLocationHint")}</div>
                </div>
              </section>
            </>
          )}

          {tab === "network" && (
            <>
              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.network")}</h3></div>
                <div className="form-card-body">
                  <label className="check-row">
                    <input type="checkbox" checked={draft.useSystemProxy} onChange={(e) => patch("useSystemProxy", e.currentTarget.checked)} />
                    <span><b>{t("settings.useSystemProxy")}</b><em>{t("settings.useSystemProxyHint")}</em></span>
                  </label>
                  <label className="field"><span>{t("settings.globalLimit")}</span>
                    <div className="input-unit">
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={kibToMb(draft.globalDownloadLimitKib) ?? ""}
                        onChange={(e) => patch("globalDownloadLimitKib", mbToKib(num(e.currentTarget.value)))}
                        placeholder={t("settings.noLimit")}
                      />
                      <span>MB/s</span>
                    </div>
                    <div className="hint">{t("settings.globalLimitHint")}</div>
                  </label>
                  <div className="form-note">{t("settings.networkApplyHint")}</div>
                </div>
              </section>
            </>
          )}

          {tab === "bt" && (
            <>
              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.bt")}</h3></div>
                <div className="form-card-body">
                  <label className="check-row"><input type="checkbox" checked={draft.btDht} onChange={(e) => patch("btDht", e.currentTarget.checked)} /><span><b>{t("settings.btDht")}</b><em>{t("settings.btDhtHint")}</em></span></label>
                  <div className="field-row">
                    <label className="field"><span>{t("settings.btPort")}</span>
                      <div className="input-unit"><input type="number" min={1} max={65535} value={draft.btListenPort ?? ""} onChange={(e) => patch("btListenPort", num(e.currentTarget.value))} placeholder={t("common.random")} /></div>
                    </label>
                    <label className="field"><span>{t("settings.btUpload")}</span>
                      <div className="input-unit">
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={kibToMb(draft.btUploadLimitKib) ?? ""}
                          onChange={(e) => patch("btUploadLimitKib", mbToKib(num(e.currentTarget.value)))}
                          placeholder={t("settings.noLimit")}
                        />
                        <span>MB/s</span>
                      </div>
                      <div className="hint">{t("settings.btUploadHint")}</div>
                    </label>
                  </div>
                  <label className="check-row"><input type="checkbox" checked={draft.btUpnp} onChange={(e) => patch("btUpnp", e.currentTarget.checked)} /><span><b>{t("settings.btUpnp")}</b><em>{t("settings.btUpnpHint")}</em></span></label>
                  <div className="form-note">{t("settings.btRestartHint")}</div>
                </div>
              </section>

              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.seed")}</h3></div>
                <div className="form-card-body">
                  <label className="check-row"><input type="checkbox" checked={draft.btSeedAfterComplete} onChange={(e) => patch("btSeedAfterComplete", e.currentTarget.checked)} /><span><b>{t("settings.btSeedAfter")}</b><em>{t("settings.btSeedAfterHint")}</em></span></label>
                </div>
              </section>
            </>
          )}

          {tab === "appearance" && (
            <>
              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.appearance")}</h3></div>
                <div className="form-card-body">
                  <div className="theme-options">
                    {(["system", "light", "dark"] as const).map((theme) => (
                      <button key={theme} type="button" className={`theme-option ${draft.theme === theme ? "active" : ""}`} onClick={() => patch("theme", theme)}>
                        <span className={`theme-swatch ${theme}`} />
                        {t(`settings.theme.${theme}` as MessageKey)}
                      </button>
                    ))}
                  </div>
                  <label className="field language-field">
                    <span>{t("settings.language")}</span>
                    <select value={locale} onChange={event => setLocale(event.currentTarget.value as Locale)}>
                      {SUPPORTED_LOCALES.map(item => <option key={item.code} value={item.code} lang={item.code}>{item.name}</option>)}
                    </select>
                    <span className="hint">{t("settings.languageHint")}</span>
                  </label>
                </div>
              </section>
            </>
          )}

          {tab === "notify" && (
            <>
              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.notify")}</h3></div>
                <div className="form-card-body">
                  <div className="check-list">
                    <div className="check-row static"><PaletteIcon size={16} /><span><b>{t("settings.downloadNotification")}</b><em>{t("settings.downloadNotificationHint")}</em></span><span className="pill">{t("overview.connected")}</span></div>
                    <label className="check-row"><input type="checkbox" checked={draft.clipboardWatch} onChange={(e) => patch("clipboardWatch", e.currentTarget.checked)} /><span><b>{t("settings.clipboard")}</b><em>{t("settings.clipboardHint")}</em></span></label>
                  </div>
                </div>
              </section>
              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.tray")}</h3></div>
                <div className="form-card-body">
                  <label className="check-row"><input type="checkbox" checked={draft.closeToTray} onChange={(e) => patch("closeToTray", e.currentTarget.checked)} /><span><b>{t("settings.closeToTray")}</b><em>{t("settings.closeToTrayHint")}</em></span></label>
                  <div className="form-note"><ShieldIcon size={13} /> {t("settings.desktopHint")}</div>
                </div>
              </section>
            </>
          )}

          {tab === "about" && (
            <>
              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.about")}</h3></div>
                <div className="form-card-body">
                  <div className="about-grid">
                    <div><span>{t("settings.about.version")}</span><b>{info?.version ?? "1.0.0"}</b></div>
                    <div><span>{t("settings.about.platform")}</span><b>{info?.platform ?? "Windows"}</b></div>
                  </div>
                  <div className="form-note">{t("settings.platformHint")}</div>
                </div>
              </section>
              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.paths")}</h3></div>
                <div className="form-card-body">
                  <div className="path-row"><span>{t("settings.about.config")}</span><code>{info?.configDir ?? "%APPDATA%\\Tug"}</code></div>
                  <div className="path-row"><span>{t("settings.about.data")}</span><code>{info?.dataDir ?? "%LOCALAPPDATA%\\Tug"}</code></div>
                  <div className="path-row"><span>{t("settings.about.logs")}</span><code>{info?.configDir ? `${info.configDir}\\logs` : "%LOCALAPPDATA%\\Tug\\logs"}</code></div>
                </div>
              </section>
              <section className="form-card">
                <div className="form-card-head"><h3>{t("settings.section.diagnostics")}</h3></div>
                <div className="form-card-body">
                  <div className="status-row"><span>{t("diag.backend")}</span><b className="ok"><CheckIcon size={12} /> {t("diag.connected")}</b></div>
                </div>
              </section>
            </>
          )}

          {error && <div className="form-error">{error}</div>}

          {editable && (
            <div className="savebar">
              <span className="savebar-status">{saved ? t("settings.saved") : dirty ? t("settings.unsaved") : t("settings.upToDate")}</span>
              <span className="toolbar-spacer" />
              <button type="button" className="btn" onClick={() => setDraft(settings)}>{t("settings.reset")}</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("settings.saving") : t("settings.save")}</button>
            </div>
          )}
        </div>

        <aside className="settings-side">
          <div className="info-card">
            <h3>{t("settings.preview")}</h3>
            <div className="info-row"><span>DHT</span><b>{draft.btDht ? t("overview.connected") : t("overview.disconnected")}</b></div>
            <div className="info-row"><span>{t("settings.btPort")}</span><b>{draft.btListenPort ?? t("common.random")}</b></div>
            <div className="info-row"><span>{t("settings.saveLocation")}</span><b title={draft.downloadDir}>{draft.downloadDir || "—"}</b></div>
            <div className="info-note">{t("settings.applyHint")}</div>
          </div>
        </aside>
      </form>
    </div>
  );
}
