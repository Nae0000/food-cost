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

      <!-- Currency -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">💱 ${t('set_currency')}</div></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:20px">
          ${curs.map(([code, c]) => `
            <button class="cur-btn ${_settings.currency === code ? ' cur-active' : ''}"
              onclick="selectCurrency('${code}')" id="cur-${code}">
              <span style="font-size:20px;font-weight:800;color:var(--primary)">${c.symbol}</span>
              <span style="font-size:13px">${c.name}</span>
            </button>`).join('')}
        </div>
        <div class="form-group" style="max-width:300px">
          <label class="form-label">${t('set_currency_rate')} <strong id="curSymbol">${CURRENCIES[_settings.currency]?.symbol || '¥'}</strong></label>
          <input class="form-input" id="customRateInput" type="number" step="0.0001"
            value="${_settings.customRate ?? CURRENCIES[_settings.currency]?.rate ?? 1}"
            placeholder="${CURRENCIES[_settings.currency]?.rate ?? 1}" />
          <div class="form-hint">ปล่อยว่างเพื่อใช้อัตราเริ่มต้น / Leave blank to use default rate</div>
        </div>
      </div>

      <!-- Preview -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><div class="card-title">👁️ ${t('set_preview')}</div></div>
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          ${[10, 120, 500, 1250, 9999].map(v => `
            <div style="text-align:center">
              <div style="font-size:11px;color:var(--text-faint)">฿${v}</div>
              <div style="font-size:20px;font-weight:700;color:var(--primary)">${formatPrice(v)}</div>
            </div>`).join('')}
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
}
