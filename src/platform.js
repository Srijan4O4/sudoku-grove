export class Platform {
  constructor(sdk = globalThis.ytgame, storage) {
    this.sdk = sdk; this.hosted = !!sdk?.IN_PLAYABLES_ENV; this.storage = storage;
    if (!this.hosted && storage === undefined) { try { this.storage = globalThis.localStorage; } catch { this.storage = null; } }
    this.loaded = false; this.audio = false; this.pending = null; this.saving = false; this.paused = false;
    this.onStatus = () => {}; this.status = 'Preparing save…';
  }
  statusChanged(text) { this.status = text; this.onStatus(text); }
  firstFrame() { if (this.hosted) this.sdk.game.firstFrameReady(); }
  async load() {
    try {
      let raw;
      if (this.hosted) {
        this.audio = this.sdk.system.isAudioEnabled();
        this.sdk.system.onAudioEnabledChange(enabled => { this.audio = enabled; });
        // Locale comes exclusively from the host in Playables. English is the current supported language.
        this.language = await this.sdk.system.getLanguage().catch(() => 'en');
        raw = await this.sdk.game.loadData();
      } else { if (!this.storage) throw new Error('Storage unavailable'); raw = this.storage.getItem('sudoku-grove-v1'); }
      this.loaded = true; this.statusChanged(this.hosted ? 'Cloud save ready' : 'Saved on this device');
      try { return raw ? JSON.parse(raw) : null; } catch { this.statusChanged('Save unreadable · starting fresh'); return null; }
    } catch {
      this.statusChanged('Save unavailable · retry in Help'); return null;
    }
  }
  ready() { if (this.hosted) this.sdk.game.gameReady(); }
  bindPause(pause, resume) {
    if (!this.hosted) return;
    this.sdk.system.onPause(() => { pause(); this.paused = true; });
    this.sdk.system.onResume(() => { this.paused = false; resume(); this.flush(); });
  }
  save(data) {
    this.pending = JSON.stringify(data);
    if (!this.loaded) { this.statusChanged('Progress not saved · retry in Help'); return; }
    if (!this.paused) void this.flush();
  }
  async flush() {
    if (this.saving || !this.loaded || this.pending === null || this.paused) return;
    const payload = this.pending; this.pending = null; this.saving = true;
    try {
      if (this.hosted) await this.sdk.game.saveData(payload);
      else this.storage?.setItem('sudoku-grove-v1', payload);
      this.statusChanged(this.hosted ? 'Progress saved to YouTube' : 'Saved on this device');
    } catch { this.pending ??= payload; this.statusChanged('Save failed · retry in Help'); }
    finally { this.saving = false; }
    // A failed write waits for the next move or explicit retry; never spin on errors.
    if (this.pending !== null && this.pending !== payload && !this.paused) void this.flush();
  }
  async sendScore(value) {
    if (!this.hosted || this.paused) return;
    try { await this.sdk.engagement.sendScore({ value }); } catch { /* Best is retained in cloud data and retried at next boot. */ }
  }
}
