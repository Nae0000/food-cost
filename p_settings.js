// ===================================================
// p_settings.js — Settings page (language + currency)
// ===================================================

function renderSettings(container) {
  const langs = [
    { code: 'th', flag: '🇹🇭', label: 'ภาษาไทย' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'ja', flag: '🇯🇵', label: '日本語' },
  ];
  const curs = Object.entries(CURRENCIES);

  function draw() {
    document.getElementById('settingsContent').innerHTML = `
      <!-- Language -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">🌐 ${t('set_lang')}</div></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${langs.map(l => `
            <button class="lang-btn ${_settings.lang === l.code ? ' lang-active' : ''}"
              onclick="selectLang('${l.code}')" id="lang-${l.code}">
              <span style="font-size:24px">${l.flag}</span>
              <span>${l.label}</span>
            </button>`).join('')}
        </div>
      </div>

      <!-- Currency locked to JPY -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">💴 สกุลเงิน</div></div>
        <div style="display:flex;align-items:center;gap:16px;padding:8px 0">
          <span style="font-size:32px;font-weight:800;color:var(--primary)">¥</span>
          <div>
            <div style="font-weight:600;font-size:15px">日本円 (JPY)</div>
            <div style="font-size:12px;color:var(--text-muted)">ระบบใช้เงินเยนเป็นหลัก</div>
          </div>
        </div>
      </div>

      <!-- Data & Backup -->
      <div class="card" style="margin-bottom:20px; border-color:var(--primary)">
        <div class="card-header"><div class="card-title">💾 ${t('settings_data')}</div></div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${t('settings_data_desc')}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="DataSync.exportCSV()">${t('btn_export_csv')}</button>
          <button class="btn btn-secondary" onclick="DataSync.exportJSON()">${t('btn_backup_json')}</button>
          <button class="btn btn-secondary" style="border-color:var(--danger);color:var(--danger)" onclick="document.getElementById('importFile').click()">${t('btn_restore_json')}</button>
          <input type="file" id="importFile" accept=".json" style="display:none" onchange="handleImportFile(event)" />
        </div>
      </div>

      <button class="btn btn-primary" onclick="saveSettingsPage()" style="min-width:140px">
        💾 ${t('btn_save')}
      </button>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">⚙️ ${t('set_title')}</div><div class="page-subtitle">${t('set_sub')}</div></div>
    </div>
    <div id="settingsContent"></div>`;

  draw();

  window.selectLang = (code) => {
    _settings.lang = code;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('lang-active'));
    document.getElementById('lang-' + code)?.classList.add('lang-active');
    draw(); applyI18n();
    // re-render page title
    document.querySelector('.page-title').textContent = '⚙️ ' + t('set_title');
    document.querySelector('.page-subtitle').textContent = t('set_sub');
  };

  window.selectCurrency = (code) => {
    _settings.currency = code;
    document.querySelectorAll('.cur-btn').forEach(b => b.classList.remove('cur-active'));
    document.getElementById('cur-' + code)?.classList.add('cur-active');
    _settings.customRate = null;
    draw();
  };

  window.saveSettingsPage = () => {
    const rateVal = document.getElementById('customRateInput')?.value;
    _settings.customRate = rateVal && !isNaN(parseFloat(rateVal)) ? parseFloat(rateVal) : null;
    saveSettings(_settings);
    Toast.show(t('set_saved'));
    applyI18n();
    draw();
  };

  window.handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm(t('restore_confirm'))) { e.target.value = ''; return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      DataSync.importJSON(ev.target.result);
    };
    reader.readAsText(file);
  };
}
