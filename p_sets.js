// ===================================================
// p_sets.js — Set Menu page (เมนูเซต)
// A Set bundles multiple existing menus with its own selling price
// ===================================================

function renderSets(container) {
  function draw() {
    const sets = DB.getAll('sets');
    const menus = DB.getAll('menus');
    const cats = DB.getAll('categories');
    const viewMode = localStorage.getItem('fc_view_mode_sets') || 'grid';

    const gridEl = document.getElementById('setsGrid');
    gridEl.className = viewMode === 'grid' ? 'grid-3' : 'list-container';

    gridEl.innerHTML = sets.length === 0
      ? `<div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🍱</div>
          <div class="empty-title">${t('set_menu_empty')}</div>
          <div class="empty-desc">${t('set_menu_empty_desc')}</div>
          <button class="btn btn-primary" onclick="openSetModal()">${t('set_menu_add')}</button>
        </div>`
      : sets.map(s => {
        const setMenus = (s.menuIds || []).map(id => menus.find(m => m.id === id)).filter(Boolean);
        const cost = setMenus.reduce((sum, m) => sum + DB.menuCost(m.id), 0);
        const gp = s.sellingPrice ? (_settings.calcMethod === 'markup' ? (s.sellingPrice > 0 ? ((cost / s.sellingPrice) * 100).toFixed(1) : 0) : (((s.sellingPrice - cost) / s.sellingPrice) * 100).toFixed(1)) : null;
        let gpColor = 'var(--text-muted)';
        if (gp) {
          if (_settings.calcMethod === 'markup') {
            gpColor = gp <= 40 ? 'var(--success)' : gp <= 60 ? 'var(--warning)' : 'var(--danger)';
          } else {
            gpColor = gp >= 60 ? 'var(--success)' : gp >= 40 ? 'var(--warning)' : 'var(--danger)';
          }
        }
        const gpLabel = _settings.calcMethod === 'markup' ? 'Cost' : 'Margin';

        if (viewMode === 'list') {
          return `<div class="menu-list-row" style="align-items:flex-start">
            <div style="font-size:32px;line-height:1">🍱</div>
            <div class="menu-list-details">
              <div style="font-size:16px;font-weight:700;margin-bottom:4px">${s.name}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${s.description || t('menu_no_desc')}</div>
              <div class="set-items-wrap" id="set-items-${s.id}" style="margin-bottom:0;max-width:400px">
                <div class="set-items-header" onclick="toggleSetItems(${s.id})" style="padding:6px 10px">
                  <span>📋 ${t('set_menu_contents')} (${setMenus.length} ${t('set_menu_items')})</span>
                  <svg class="set-toggle-icon" id="set-icon-${s.id}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div class="set-items-body" id="set-body-${s.id}" style="display:none;padding:4px 10px">
                  ${setMenus.map(m => {
            const mCost = DB.menuCost(m.id);
            const cat = cats.find(c => c.id === m.categoryId);
            return `<div class="set-item-row" style="padding:4px 0">
                      <div style="display:flex;align-items:center;gap:6px">
                        ${cat ? `<span style="font-size:12px">${cat.icon}</span>` : ''}
                        <span style="font-weight:500">${m.name}</span>
                      </div>
                      <span style="color:var(--primary);font-weight:600">${formatPrice(mCost)}</span>
                    </div>`;
          }).join('') || `<div class="text-muted" style="padding:4px 0;font-size:12px">${t('set_menu_no_items')}</div>`}
                </div>
              </div>
            </div>
            <div class="menu-list-stats">
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-faint)">${t('menu_cost')}</div>
                <div style="font-size:18px;font-weight:800;color:var(--primary)">${formatPrice(cost)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-faint)">${t('menu_selling')}</div>
                <div style="font-weight:600">${s.sellingPrice ? formatPrice(s.sellingPrice) : '-'}</div>
                ${gp ? `<div style="font-size:12px;color:${gpColor};font-weight:700">${gpLabel} ${gp}%</div>` : ''}
              </div>
              ${s.sellingPrice ? `<div style="text-align:right">
                <div style="font-size:11px;color:var(--text-muted)">Tax ${_settings.taxTakeOut}%: <b style="color:var(--text)">${formatPrice(s.sellingPrice * (1 + _settings.taxTakeOut / 100))}</b></div>
                <div style="font-size:11px;color:var(--text-muted)">${_settings.taxDineIn}%: <b style="color:var(--text)">${formatPrice(s.sellingPrice * (1 + _settings.taxDineIn / 100))}</b></div>
              </div>` : ''}
            </div>
            <div class="menu-list-actions">
              <button class="btn btn-icon btn-ghost btn-sm" onclick="openSetModal(${s.id})" title="${t('btn_edit')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger)" onclick="deleteSet(${s.id})" title="${t('btn_delete')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
          </div>`;
        }

        return `
          <div class="set-card card" style="position:relative">
            <div style="position:absolute;top:12px;right:12px;display:flex;gap:6px">
              <button class="btn btn-icon btn-ghost btn-sm" onclick="openSetModal(${s.id})" title="${t('btn_edit')}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger)" onclick="deleteSet(${s.id})">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <span style="font-size:28px">🍱</span>
              <div>
                <div style="font-size:18px;font-weight:700">${s.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">${s.description || t('menu_no_desc')}</div>
              </div>
            </div>
            <!-- Included menus list (collapsible) -->
            <div class="set-items-wrap" id="set-items-${s.id}">
              <div class="set-items-header" onclick="toggleSetItems(${s.id})">
                <span>📋 ${t('set_menu_contents')} (${setMenus.length} ${t('set_menu_items')})</span>
                <svg class="set-toggle-icon" id="set-icon-${s.id}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div class="set-items-body" id="set-body-${s.id}" style="display:none">
                ${setMenus.map(m => {
          const mCost = DB.menuCost(m.id);
          const cat = cats.find(c => c.id === m.categoryId);
          return `<div class="set-item-row">
                    <div style="display:flex;align-items:center;gap:8px">
                      ${cat ? `<span style="font-size:14px">${cat.icon}</span>` : ''}
                      <span style="font-weight:500">${m.name}</span>
                    </div>
                    <span style="color:var(--primary);font-weight:600">${formatPrice(mCost)}</span>
                  </div>`;
        }).join('') || `<div class="text-muted" style="padding:8px 0;font-size:13px">${t('set_menu_no_items')}</div>`}
              </div>
            </div>
            <!-- Cost summary -->
            <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid var(--border);padding-top:12px;margin-top:12px">
              <div>
                <div style="font-size:11px;color:var(--text-faint)">${t('menu_cost')}</div>
                <div style="font-size:22px;font-weight:800;color:var(--primary)">${formatPrice(cost)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--text-faint)">${t('menu_selling')}</div>
                <div style="font-weight:600">${s.sellingPrice ? formatPrice(s.sellingPrice) : '-'}</div>
                ${gp ? `<div style="font-size:12px;color:${gpColor};font-weight:700">${gpLabel} ${gp}%</div>` : ''}
                ${s.sellingPrice ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">Tax ${_settings.taxTakeOut}%: <b style="color:var(--text)">${formatPrice(s.sellingPrice * (1 + _settings.taxTakeOut / 100))}</b> | ${_settings.taxDineIn}%: <b style="color:var(--text)">${formatPrice(s.sellingPrice * (1 + _settings.taxDineIn / 100))}</b></div>` : ''}
              </div>
            </div>
          </div>`;
      }).join('');
  }

  const viewMode = localStorage.getItem('fc_view_mode_sets') || 'grid';
  const viewToggleHtml = `
    <div class="view-toggle">
      <button class="view-btn ${viewMode === 'grid' ? 'active' : ''}" onclick="toggleViewMode('sets', 'grid')" title="${t('view_grid')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </button>
      <button class="view-btn ${viewMode === 'list' ? 'active' : ''}" onclick="toggleViewMode('sets', 'list')" title="${t('view_list')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
    </div>
  `;

  container.innerHTML = `
    <div class="page-header" style="align-items:flex-start">
      <div style="flex:1">
        <div class="page-title">🍱 ${t('set_menu_title')}</div>
        <div class="page-subtitle">${t('set_menu_sub')}</div>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        ${viewToggleHtml}
        <button class="btn btn-primary" onclick="openSetModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${t('set_menu_add')}
        </button>
      </div>
    </div>
    <!-- How it works banner -->
    <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,var(--primary-glow),transparent)">
      <div style="display:flex;align-items:flex-start;gap:16px">
        <span style="font-size:32px">💡</span>
        <div>
          <div style="font-weight:700;margin-bottom:4px">${t('set_menu_how_title')}</div>
          <div style="font-size:13px;color:var(--text-muted)">${t('set_menu_how_desc')}</div>
        </div>
      </div>
    </div>
    <div id="setsGrid" class="${viewMode === 'grid' ? 'grid-3' : 'list-container'}"></div>`;

  window.toggleSetItems = (id) => {
    const body = document.getElementById(`set-body-${id}`);
    const icon = document.getElementById(`set-icon-${id}`);
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    icon.style.transform = isOpen ? '' : 'rotate(180deg)';
  };

  draw();
}

window.openSetModal = function (id = null) {
  const s = id ? DB.getById('sets', id) : null;
  const menus = DB.getAll('menus');
  const cats = DB.getAll('categories');
  const linkedIds = s?.menuIds || [];
  const cost = linkedIds.reduce((sum, mid) => {
    const m = DB.getById('menus', mid);
    return sum + (m ? DB.menuCost(m.id) : 0);
  }, 0);

  function calcPreview() {
    const checked = [...document.querySelectorAll('#setMenuCheckboxes input[type=checkbox]:checked')];
    const c = checked.reduce((sum, cb) => {
      const m = DB.getById('menus', parseInt(cb.value));
      return sum + (m ? DB.menuCost(m.id) : 0);
    }, 0);
    const sp = parseFloat(document.getElementById('setPrice')?.value) || 0;
    const gp = sp > 0 ? (_settings.calcMethod === 'markup' ? (sp > 0 ? ((c / sp) * 100).toFixed(1) : 0) : (((sp - c) / sp) * 100).toFixed(1)) : '-';
    let gpColor = 'var(--success)';
    if (gp !== '-') {
      if (_settings.calcMethod === 'markup') {
        gpColor = gp <= 40 ? 'var(--success)' : gp <= 60 ? 'var(--warning)' : 'var(--danger)';
      } else {
        gpColor = gp >= 60 ? 'var(--success)' : gp >= 40 ? 'var(--warning)' : 'var(--danger)';
      }
    }
    const gpLabel = _settings.calcMethod === 'markup' ? 'Cost' : 'Margin';

    // Tax string for 8% and 10%
    const taxHtml = sp > 0
      ? ` &nbsp;|&nbsp; Tax ${_settings.taxTakeOut}%: <strong style="color:var(--text)">${formatPrice(sp * (1 + _settings.taxTakeOut / 100))}</strong> &nbsp;|&nbsp; ${_settings.taxDineIn}%: <strong style="color:var(--text)">${formatPrice(sp * (1 + _settings.taxDineIn / 100))}</strong>`
      : '';

    const suggestHtml = c > 0 ? `<br><span style="color:var(--warning);font-size:12px;margin-top:4px;display:inline-block">${_settings.calcMethod === 'markup' ? t('suggested_price_markup') : t('suggested_price')} <strong>${formatPrice(c / 0.3)}</strong></span>` : '';

    const el = document.getElementById('setPreview');
    if (el) el.innerHTML = `${t('menu_cost')}: <strong style="color:var(--primary)">${formatPrice(c)}</strong> &nbsp;|&nbsp; ${gpLabel}: <strong style="color:${gpColor}">${gp !== '-' ? gp + '%' : '-'}</strong>${taxHtml}${suggestHtml}`;
  }

  Modal.open({
    title: s ? `✏️ ${t('set_menu_edit')}` : `➕ ${t('set_menu_add')}`,
    body: `
      <div class="form-group">
        <label class="form-label">${t('set_menu_name')} <span>*</span></label>
        <input class="form-input" id="setName" value="${s?.name || ''}" placeholder="${t('set_menu_name_ph')}" />
      </div>
      <div class="form-group">
        <label class="form-label">${t('menu_description')}</label>
        <input class="form-input" id="setDesc" value="${s?.description || ''}" placeholder="${t('set_menu_desc_ph')}" />
      </div>
      <div class="form-group">
        <label class="form-label">${t('menu_selling_price')}</label>
        <input class="form-input" id="setPrice" type="number" value="${s?.sellingPrice || ''}" placeholder="0" oninput="calcSetPreview()" />
      </div>
      <div class="form-group">
        <label class="form-label">📋 ${t('set_menu_select_menus')} <span>*</span></label>
        <div class="search-wrap" style="margin-bottom:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" id="setMenuSearch" placeholder="${t('menu_search')}" oninput="filterSetMenus(this.value)" style="font-size:13px" />
        </div>
        <div id="setMenuCheckboxes" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:220px;overflow-y:auto;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);padding:12px">
          ${menus.map(m => {
      const cat = cats.find(c => c.id === m.categoryId);
      const mCost = DB.menuCost(m.id);
      const nameNorm = m.name.toLowerCase();
      return `<label data-menu-name="${nameNorm}" style="display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;padding:6px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--bg-card)">
              <input type="checkbox" value="${m.id}" ${linkedIds.includes(m.id) ? 'checked' : ''} style="accent-color:var(--primary);margin-top:2px;flex-shrink:0" onchange="calcSetPreview()" />
              <div>
                <div style="font-weight:600">${cat ? cat.icon + ' ' : ''}${m.name}</div>
                <div style="color:var(--primary);font-size:12px">${formatPrice(mCost)}</div>
              </div>
            </label>`;
    }).join('')}
          ${menus.length === 0 ? `<div style="color:var(--text-muted);font-size:13px;grid-column:1/-1">${t('menu_empty')}</div>` : ''}
          <div id="setMenuNoResult" style="display:none;color:var(--text-muted);font-size:13px;grid-column:1/-1;padding:8px 0;text-align:center">🔍 ${t('menu_empty')}</div>
        </div>
      </div>
      <div id="setPreview" style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);padding:10px;font-size:13px;text-align:center"></div>`,
    onConfirm() {
      const name = document.getElementById('setName').value.trim();
      if (!name) { Toast.show(t('cat_name_required'), 'error'); return; }
      const menuIds = [...document.querySelectorAll('#setMenuCheckboxes input[type=checkbox]:checked')].map(cb => parseInt(cb.value));
      if (menuIds.length === 0) { Toast.show(t('set_menu_select_req'), 'error'); return; }
      const data = {
        name, description: document.getElementById('setDesc').value.trim(),
        sellingPrice: parseFloat(document.getElementById('setPrice').value) || null,
        menuIds,
      };
      if (id) DB.update('sets', id, data); else DB.insert('sets', data);
      Modal.close(); Toast.show(id ? t('set_menu_updated') : t('set_menu_saved')); Router.render();
    }
  });

  window.calcSetPreview = calcPreview;
  window.filterSetMenus = (q) => {
    const query = q.toLowerCase().trim();
    const labels = document.querySelectorAll('#setMenuCheckboxes label[data-menu-name]');
    let visibleCount = 0;
    labels.forEach(label => {
      const name = label.getAttribute('data-menu-name') || '';
      const match = !query || name.includes(query);
      label.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    const noResult = document.getElementById('setMenuNoResult');
    if (noResult) noResult.style.display = visibleCount === 0 && labels.length > 0 ? 'block' : 'none';
  };
  setTimeout(calcPreview, 50);
};

window.deleteSet = function (id) {
  if (confirm(t('set_menu_delete_confirm'))) {
    DB.delete('sets', id); Toast.show(t('set_menu_deleted'), 'info'); Router.render();
  }
};
