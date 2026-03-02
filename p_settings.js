// ===================================================
// p_settings.js — Settings page (language + currency + Google Drive)
// ===================================================

function renderSettings(container) {
  const langs = [
    { code: 'th', flag: '🇹🇭', label: 'ภาษาไทย' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'ja', flag: '🇯🇵', label: '日本語' },
  ];

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

      <!-- Currency -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">💵 ${t('set_currency') || 'สกุลเงิน'}</div></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${Object.keys(CURRENCIES).map(c => `
            <button class="lang-btn cur-btn ${_settings.currency === c ? ' lang-active cur-active' : ''}"
              onclick="selectCurrency('${c}')" id="cur-${c}">
              <span style="font-size:24px">${CURRENCIES[c].symbol}</span>
              <span>${CURRENCIES[c].name}</span>
            </button>`).join('')}
        </div>
      </div>

      <!-- Google Account & Drive Sync -->
      <div class="card" style="margin-bottom:20px; border-color:#4285f4">
        <div class="card-header">
          <div class="card-title" style="display:flex;align-items:center;gap:8px">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            ${t('set_gdrive')}
          </div>
        </div>
        ${GDrive.isLoggedIn() ? `
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding:12px;background:var(--bg);border-radius:var(--r-md)">
            ${GDrive._userInfo?.picture ? `<img src="${GDrive._userInfo.picture}" style="width:40px;height:40px;border-radius:50%;border:2px solid #4285f4" alt="avatar">` : '<span style="font-size:36px">👤</span>'}
            <div>
              <div style="font-weight:700;font-size:15px">${GDrive._userInfo?.name || ''}</div>
              <div style="font-size:12px;color:var(--text-muted)">${GDrive._userInfo?.email || ''}</div>
            </div>
            <button class="btn btn-sm btn-ghost" style="margin-left:auto;border-color:var(--danger);color:var(--danger)" onclick="GDrive.logout()">
              ${t('btn_glogout')}
            </button>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="GDrive.uploadBackup()" style="background:#4285f4;border-color:#4285f4">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              ${t('btn_gbackup')}
            </button>
            <button class="btn btn-secondary" onclick="GDrive.downloadBackup()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 16 12 21 17 16"/><line x1="12" y1="21" x2="12" y2="9"/></svg>
              ${t('btn_grestore')}
            </button>
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--text-muted)">
            📁 ไฟล์ถูกบันทึกใน Google Drive ของคุณ: <strong>foodcost_backup.json</strong>
          </div>
        ` : `
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${t('set_gdrive_desc')}</div>
          <button id="googleLoginBtn" onclick="GDrive.login()"
            style="display:inline-flex;align-items:center;gap:10px;padding:10px 20px;border:1px solid #ddd;border-radius:8px;background:white;cursor:pointer;font-size:14px;font-weight:600;color:#3c4043;box-shadow:0 1px 3px rgba(0,0,0,0.12);transition:box-shadow 0.2s"
            onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.2)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.12)'">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            ${t('btn_glogin')}
          </button>
        `}
      </div>

      <!-- Data & Backup -->
      <div class="card" style="margin-bottom:20px; border-color:var(--primary)">
        <div class="card-header"><div class="card-title">💾 ${t('settings_data')}</div></div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${t('settings_data_desc')}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="DataSync.exportCSV()">${t('btn_export_csv')}</button>
          <button class="btn btn-secondary" onclick="DataSync.exportJSON()">${t('btn_backup_json')}</button>
          <button class="btn btn-secondary" style="border-color:var(--primary);color:var(--primary)" onclick="document.getElementById('importFile').click()">⬇️ ${t('btn_restore_json')}</button>
          <input type="file" id="importFile" accept=".json" style="display:none" onchange="handleImportFile(event)" />
        </div>
        <hr style="margin:24px 0; border:none; border-top:1px solid var(--border-light)">
        <div style="font-weight:700; color:var(--danger); margin-bottom:8px">⚠️ ล้างข้อมูลระบบ (Reset Data)</div>
        <div style="font-size:13px; color:var(--text-muted); margin-bottom:14px">การกระทำนี้จะลบข้อมูลวัตถุดิบ เมนู สูตรอาหาร และประวัติทั้งหมดของคุณทิ้งอย่างถาวร <strong>และไม่สามารถกู้คืนได้</strong></div>
        <button class="btn btn-secondary" style="border-color:var(--danger); color:var(--danger); background:rgba(239,68,68,0.05)" onclick="if(confirm('🚨 คำเตือนขั้นเด็ดขาด: ยืนยันว่าจะลบข้อมูลทั้งหมด? ข้อมูลจะไม่สามารถกู้คืนได้')) { DB.reset(); if(typeof SEED !== 'undefined') SEED.run(); Toast.show('รีเซ็ตข้อมูลแล้ว'); if(typeof Router !== 'undefined') Router.render(); }">
          🗑️ ล้างข้อมูลทั้งหมด
        </button>
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
    const apiVal = document.getElementById('geminiApiInput')?.value;
    if (apiVal) _settings.geminiApiKey = apiVal.trim();
    else _settings.geminiApiKey = '';
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
    reader.onload = (ev) => { DataSync.importJSON(ev.target.result); };
    reader.readAsText(file);
  };
}
