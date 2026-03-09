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
      <!-- Account Info -->
      <div class="card" style="margin-bottom:16px; border-color:var(--border)">
        <div class="card-header"><div class="card-title">👤 บัญชีผู้ใช้ (Account)</div></div>
        <div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--bg);border-radius:var(--r-md);border:1px solid var(--border)">
          ${firebase.auth().currentUser?.photoURL ? `<img src="${firebase.auth().currentUser.photoURL}" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--border-light)" alt="avatar">` : '<div style="width:40px;height:40px;border-radius:50%;background:var(--border-light);display:flex;align-items:center;justify-content:center;font-size:20px">👤</div>'}
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px;color:var(--text)">${firebase.auth().currentUser?.displayName || 'ผู้ใช้งานระบบ'}</div>
            <div style="font-size:13px;color:var(--text-muted)">${firebase.auth().currentUser?.email || 'ยังไม่ได้เข้าสู่ระบบ'}</div>
          </div>
          <button class="btn btn-sm btn-ghost" style="border-color:var(--danger);color:var(--danger)" onclick="handleLogout()">
            🚪 ออกจากระบบ
          </button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:16px; margin-bottom:24px; align-items:start;">
        
        <!-- Language -->
        <div class="card" style="margin-bottom:0; height:100%">
          <div class="card-header"><div class="card-title">🌐 ${t('set_lang')}</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${langs.map(l => `
              <button class="lang-btn ${_settings.lang === l.code ? ' lang-active' : ''}"
                onclick="selectLang('${l.code}')" id="lang-${l.code}" style="padding:8px 12px; min-width:80px">
                <span style="font-size:20px">${l.flag}</span>
                <span style="font-size:12px">${l.label}</span>
              </button>`).join('')}
          </div>
        </div>

        <!-- Currency -->
        <div class="card" style="margin-bottom:0; height:100%">
          <div class="card-header"><div class="card-title">💵 ${t('set_currency') || 'สกุลเงิน'}</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${Object.keys(CURRENCIES).map(c => `
              <button class="lang-btn cur-btn ${_settings.currency === c ? ' lang-active cur-active' : ''}"
                onclick="selectCurrency('${c}')" id="cur-${c}" style="padding:8px 12px; min-width:80px">
                <span style="font-size:20px">${CURRENCIES[c].symbol}</span>
                <span style="font-size:12px">${CURRENCIES[c].name}</span>
              </button>`).join('')}
          </div>
        </div>

        <!-- Calculation Method -->
        <div class="card" style="margin-bottom:0; height:100%">
          <div class="card-header"><div class="card-title">🧮 ${t('set_calc_method') || 'วิธีการคำนวณกำไร'}</div></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="lang-btn calc-btn ${_settings.calcMethod !== 'markup' ? 'lang-active cur-active' : ''}"
              onclick="selectCalcMethod('margin')" id="calc-margin" style="width:100%;text-align:left;padding:8px 12px"
              title="Margin: ((ราคาขาย - ต้นทุน) / ราคาขาย) × 100">
              <div style="font-weight:bold;font-size:13px">${t('set_calc_margin') || 'Margin'}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">((ราคาขาย-ทุน) / ราคาขาย) × 100</div>
            </button>
            <button class="lang-btn calc-btn ${_settings.calcMethod === 'markup' ? 'lang-active cur-active' : ''}"
              onclick="selectCalcMethod('markup')" id="calc-markup" style="width:100%;text-align:left;padding:8px 12px"
              title="Markup: (ต้นทุน / ราคาขาย) × 100">
              <div style="font-weight:bold;font-size:13px">${t('set_calc_markup') || 'Markup'}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">(ต้นทุน / ราคาขาย) × 100</div>
            </button>
          </div>
        </div>

        <!-- Tax Rates -->
        <div class="card" style="margin-bottom:0; height:100%">
          <div class="card-header"><div class="card-title">🧾 ${t('set_tax') || 'ตั้งค่าภาษี'}</div></div>
          <div style="display:flex;gap:12px;flex-direction:column">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" style="font-weight:600;font-size:12px">${t('set_tax_takeout') || 'ภาษี Take Out (%)'}</label>
              <div style="display:flex;align-items:center;">
                <input type="number" class="form-input" id="taxTakeOut" value="${_settings.taxTakeOut !== undefined ? _settings.taxTakeOut : 8}" step="0.1" min="0" style="text-align:right;height:32px" />
                <div style="padding-left:8px;font-size:13px">%</div>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" style="font-weight:600;font-size:12px">${t('set_tax_dinein') || 'ภาษี Dine In (%)'}</label>
              <div style="display:flex;align-items:center;">
                <input type="number" class="form-input" id="taxDineIn" value="${_settings.taxDineIn !== undefined ? _settings.taxDineIn : 10}" step="0.1" min="0" style="text-align:right;height:32px" />
                <div style="padding-left:8px;font-size:13px">%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Google Account & Drive Sync -->
        <div class="card" style="margin-bottom:0; height:100%; border-color:#4285f4">
          <div class="card-header" style="margin-bottom:12px">
            <div class="card-title" style="display:flex;align-items:center;gap:8px;font-size:14px">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              ${t('set_gdrive')}
            </div>
          </div>
          ${GDrive.isLoggedIn() ? `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:8px 12px;background:var(--bg);border-radius:var(--r-md)">
              ${GDrive._userInfo?.picture ? `<img src="${GDrive._userInfo.picture}" style="width:32px;height:32px;border-radius:50%;border:2px solid #4285f4" alt="avatar">` : '<span style="font-size:24px">👤</span>'}
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${GDrive._userInfo?.name || ''}</div>
                <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${GDrive._userInfo?.email || ''}</div>
              </div>
              <button class="btn btn-sm btn-ghost" style="border-color:var(--danger);color:var(--danger);padding:4px 8px" onclick="GDrive.logout()">
                ${t('btn_glogout')}
              </button>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm btn-primary" onclick="GDrive.uploadBackup()" style="background:#4285f4;border-color:#4285f4;flex:1;padding:6px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                ${t('btn_gbackup')}
              </button>
              <button class="btn btn-sm btn-secondary" onclick="GDrive.downloadBackup()" style="flex:1;padding:6px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 16 12 21 17 16"/><line x1="12" y1="21" x2="12" y2="9"/></svg>
                ${t('btn_grestore')}
              </button>
            </div>
          ` : `
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${t('set_gdrive_desc')}</div>
            <button id="googleLoginBtn" onclick="GDrive.login()"
              style="width:100%;display:flex;justify-content:center;align-items:center;gap:8px;padding:8px 16px;border:1px solid #ddd;border-radius:8px;background:white;cursor:pointer;font-size:13px;font-weight:600;color:#3c4043;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:background 0.2s">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              ${t('btn_glogin')}
            </button>
          `}
        </div>

        <!-- Features -->
        <div class="card" style="margin-bottom:0; height:100%">
          <div class="card-header"><div class="card-title">${t('set_features')}</div></div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--bg);border-radius:var(--r-md);border:1px solid var(--border)">
            <div>
              <div style="font-weight:600;font-size:13px">${t('set_tutorial')}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${t('set_tutorial_desc')}</div>
            </div>
            <label class="toggle-switch" style="transform:scale(0.85);margin-right:-8px">
              <input type="checkbox" id="tutorialModeToggle" ${_settings.tutorialMode ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Gemini Settings -->
        <div class="card" style="margin-bottom:0; height:100%">
          <div class="card-header"><div class="card-title">🤖 Gemini AI</div></div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label" style="font-weight:600;font-size:12px">API Key (แสกนใบเสร็จ)</label>
            <input type="password" class="form-input" id="geminiApiInput" value="${_settings.geminiApiKey || ''}" placeholder="AIzaSy..." style="height:32px;font-size:13px" />
          </div>
        </div>

        <!-- Data & Backup -->
        <div class="card" style="margin-bottom:0; height:100%; border-color:var(--primary)">
          <div class="card-header" style="margin-bottom:12px"><div class="card-title">💾 ${t('settings_data')}</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm btn-secondary" style="flex:1;min-width:80px;padding:4px" onclick="DataSync.exportCSV()">📋 CSV</button>
            <button class="btn btn-sm btn-secondary" style="flex:1;min-width:80px;padding:4px" onclick="DataSync.exportJSON()">📤 ทำสำรอง</button>
            <button class="btn btn-sm btn-secondary" style="border-color:var(--primary);color:var(--primary);flex:1;min-width:80px;padding:4px" onclick="document.getElementById('importFile').click()">📥 นำเข้า</button>
            <input type="file" id="importFile" accept=".json" style="display:none" onchange="handleImportFile(event)" />
          </div>
          <hr style="margin:12px 0; border:none; border-top:1px solid var(--border-light)">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="font-size:12px; color:var(--text-muted);">ลบสูตร/ราคาเริ่มใหม่</div>
            <button class="btn btn-sm btn-secondary" style="border-color:var(--danger); color:var(--danger); background:rgba(239,68,68,0.05); padding:4px 8px" onclick="if(confirm('🚨 ยืนยันว่าจะลบข้อมูลทั้งหมด? ข้อมูลจะไม่สามารถกู้คืนได้')) { DB.reset(); if(typeof SEED !== 'undefined') SEED.run(); Toast.show('รีเซ็ตข้อมูลแล้ว'); if(typeof Router !== 'undefined') Router.render(); }">
              🗑️ ล้างข้อมูล
            </button>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:center;margin-bottom:32px">
        <button class="btn btn-primary" onclick="saveSettingsPage()" style="min-width:180px;padding:12px 24px;font-size:16px;box-shadow:0 4px 12px rgba(var(--primary-rgb),0.3)">
          💾 ${t('btn_save')}
        </button>
      </div>`;
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

  window.selectCalcMethod = (method) => {
    _settings.calcMethod = method;
    document.querySelectorAll('.calc-btn').forEach(b => {
      b.classList.remove('cur-active');
      b.classList.remove('lang-active');
    });
    document.getElementById('calc-' + method)?.classList.add('cur-active');
    document.getElementById('calc-' + method)?.classList.add('lang-active');
  };

  window.saveSettingsPage = () => {
    const rateVal = document.getElementById('customRateInput')?.value;
    _settings.customRate = rateVal && !isNaN(parseFloat(rateVal)) ? parseFloat(rateVal) : null;
    const apiVal = document.getElementById('geminiApiInput')?.value;
    if (apiVal) _settings.geminiApiKey = apiVal.trim();
    else _settings.geminiApiKey = '';

    const taxTakeOutVal = document.getElementById('taxTakeOut')?.value;
    _settings.taxTakeOut = taxTakeOutVal && !isNaN(parseFloat(taxTakeOutVal)) ? parseFloat(taxTakeOutVal) : 8;

    const taxDineInVal = document.getElementById('taxDineIn')?.value;
    _settings.taxDineIn = taxDineInVal && !isNaN(parseFloat(taxDineInVal)) ? parseFloat(taxDineInVal) : 10;

    const tutToggle = document.getElementById('tutorialModeToggle');
    if (tutToggle) {
      _settings.tutorialMode = tutToggle.checked;
    }

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
