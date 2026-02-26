// ===================================================
// p_menus.js — Menu page (i18n + formatPrice + Tax)
// ===================================================

function renderMenus(container) {
  let filterCatId = 0, search = '';
  // State for bulk selection
  const selectedMenus = new Set();

  window.toggleSelectMenu = (id, checked) => {
    if (checked) selectedMenus.add(id);
    else selectedMenus.delete(id);
    const toolbar = document.getElementById('menuBulkToolbar');
    if (toolbar) toolbar.style.display = selectedMenus.size > 0 ? 'flex' : 'none';
    const countEl = document.getElementById('menuSelectedCount');
    if (countEl) countEl.textContent = `${selectedMenus.size} ${t('cat_menus')}`;
    const btn = document.getElementById('menuBulkBtn');
    if (btn) btn.querySelector('span').textContent = `${t('menu_bulk_cat')} (${selectedMenus.size})`;
    const delBtn = document.getElementById('menuBulkDelBtn');
    if (delBtn) delBtn.querySelector('span').textContent = `ลบที่เลือก (${selectedMenus.size})`;

    // Update visual
    const row = document.getElementById('mcard-' + id);
    if (row) {
      if (checked) row.classList.add('selected-row'); else row.classList.remove('selected-row');
    }
  };

  window.menuSelectAll = (checked) => {
    const menus = DB.getAll('menus');
    let mList = menus;
    if (filterCatId) mList = mList.filter(m => m.categoryId === filterCatId);
    if (search) mList = mList.filter(m => m.name.includes(search));

    mList.forEach(m => {
      toggleSelectMenu(m.id, checked);
      const cb = document.getElementById('mcb-' + m.id);
      if (cb) cb.checked = checked;
    });
  };

  function draw() {
    const cats = DB.getAll('categories');
    let menus = DB.getAll('menus');
    const viewMode = localStorage.getItem('fc_view_mode_menus') || 'grid';

    if (filterCatId) menus = menus.filter(m => m.categoryId === filterCatId);
    if (search) menus = menus.filter(m => m.name.includes(search));

    const gridEl = document.getElementById('menuGrid');
    gridEl.className = viewMode === 'grid' ? 'grid-3' : 'list-container';

    gridEl.innerHTML = menus.map(m => {
      const cat = cats.find(c => c.id === m.categoryId);
      const cost = DB.menuCost(m.id);
      const gp = m.sellingPrice ? (((m.sellingPrice - cost) / m.sellingPrice) * 100).toFixed(1) : null;
      const gpColor = gp ? (gp >= 60 ? 'var(--success)' : gp >= 40 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-muted)';

      if (viewMode === 'list') {
        return `<div class="menu-list-row ${selectedMenus.has(m.id) ? 'selected-row' : ''}" id="mcard-${m.id}" style="position:relative; padding-left:45px">
          <div style="position:absolute;left:14px;top:50%;transform:translateY(-50%)">
             <input type="checkbox" class="form-checkbox" id="mcb-${m.id}" ${selectedMenus.has(m.id) ? 'checked' : ''} onchange="toggleSelectMenu(${m.id},this.checked)" />
          </div>
          <div class="menu-list-details">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <div style="font-size:16px;font-weight:700">${m.name}</div>
              ${cat ? `<span class="badge badge-cat" style="background:${cat.color}22;color:${cat.color};padding:2px 8px;font-size:11px">${cat.icon} ${cat.name}</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--text-muted)">${m.description || t('menu_no_desc')}</div>
            <button class="btn btn-ghost btn-sm mt-2" onclick="Router.navigate('recipes');setTimeout(()=>setRecipeMenu(${m.id}),80)" style="padding:4px 8px;font-size:11px">
              ${t('menu_view_recipe')}
            </button>
          </div>
          <div class="menu-list-stats">
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--text-faint)">${t('menu_cost')}</div>
              <div style="font-size:18px;font-weight:800;color:var(--primary)">${formatPrice(cost)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--text-faint)">${t('menu_selling')}</div>
              <div style="font-weight:600">${m.sellingPrice ? formatPrice(m.sellingPrice) : (cost > 0 ? `<span style="color:var(--warning);font-size:11px;font-weight:500">${t('suggested_price')} ${formatPrice(cost / 0.3)}</span>` : '-')}</div>
              ${gp ? `<div style="font-size:12px;color:${gpColor};font-weight:700">${t('gp_label')} ${gp}%</div>` : ''}
            </div>
            ${m.sellingPrice ? `<div style="text-align:right">
              <div style="font-size:11px;color:var(--text-muted)">Tax 8%: <b style="color:var(--text)">${formatPrice(m.sellingPrice * 1.08)}</b></div>
              <div style="font-size:11px;color:var(--text-muted)">10%: <b style="color:var(--text)">${formatPrice(m.sellingPrice * 1.10)}</b></div>
            </div>` : ''}
          </div>
          <div class="menu-list-actions">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="duplicateMenu(${m.id})" title="คัดลอก" style="color:var(--accent)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="btn btn-icon btn-ghost btn-sm" onclick="openMenuModal(${m.id})" title="${t('btn_edit')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger)" onclick="deleteMenu(${m.id})" title="${t('btn_delete')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>`;
      }

      return `<div class="card ${selectedMenus.has(m.id) ? 'selected-row' : ''}" id="mcard-${m.id}" style="position:relative; transition: all 0.2s;" onmouseenter="this.style.transform='translateY(-3px)'" onmouseleave="this.style.transform=''">
        <div style="position:absolute;top:14px;left:14px;z-index:10">
           <input type="checkbox" class="form-checkbox" id="mcb-${m.id}" ${selectedMenus.has(m.id) ? 'checked' : ''} onchange="toggleSelectMenu(${m.id},this.checked)" />
        </div>
        <div style="position:absolute;top:12px;right:12px;display:flex;gap:6px">
          <button class="btn btn-icon btn-ghost btn-sm" onclick="duplicateMenu(${m.id})" title="คัดลอก" style="color:var(--accent)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost btn-sm" onclick="openMenuModal(${m.id})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger)" onclick="deleteMenu(${m.id})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
        ${cat ? `<span class="badge badge-cat" style="background:${cat.color}22;color:${cat.color};margin-bottom:8px">${cat.icon} ${cat.name}</span>` : ''}
        <div style="font-size:18px;font-weight:700;margin-bottom:4px">${m.name}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${m.description || t('menu_no_desc')}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid var(--border);padding-top:12px">
          <div>
            <div style="font-size:11px;color:var(--text-faint)">${t('menu_cost')}</div>
            <div style="font-size:22px;font-weight:800;color:var(--primary)">${formatPrice(cost)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text-faint)">${t('menu_selling')}</div>
            <div style="font-weight:600">${m.sellingPrice ? formatPrice(m.sellingPrice) : (cost > 0 ? `<span style="color:var(--warning);font-size:11px;font-weight:500">${t('suggested_price')} ${formatPrice(cost / 0.3)}</span>` : '-')}</div>
            ${gp ? `<div style="font-size:12px;color:${gpColor};font-weight:700">${t('gp_label')} ${gp}%</div>` : ''}
            ${m.sellingPrice ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">Tax 8%: <b style="color:var(--text)">${formatPrice(m.sellingPrice * 1.08)}</b> | 10%: <b style="color:var(--text)">${formatPrice(m.sellingPrice * 1.10)}</b></div>` : ''}
          </div>
        </div>
        <button class="btn btn-ghost btn-sm w-full mt-4" onclick="Router.navigate('recipes');setTimeout(()=>setRecipeMenu(${m.id}),80)">
          ${t('menu_view_recipe')}
        </button>
      </div>`;
    }).join('') || `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🍽️</div><div class="empty-title">${t('menu_empty')}</div>
      <button class="btn btn-primary" onclick="openMenuModal()">${t('menu_add_first')}</button>
    </div>`;
  }

  const cats = DB.getAll('categories');
  const viewMode = localStorage.getItem('fc_view_mode_menus') || 'grid';

  const viewToggleHtml = `
    <div id="menuBulkToolbar" style="display:${selectedMenus.size > 0 ? 'flex' : 'none'}; align-items:center; gap:8px; margin-right:12px;">
      <span style="font-size:12px;color:var(--text-muted);white-space:nowrap" id="menuSelectedCount">${selectedMenus.size} ${t('cat_menus')}</span>
      <button class="btn btn-primary btn-sm" id="menuBulkBtn" onclick="bulkChangeCat()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h10M7 12h10M7 17h6"/><circle cx="19" cy="17" r="3"/><path d="M17 17h.01"/></svg>
        <span>${t('menu_bulk_cat')} (${selectedMenus.size})</span>
      </button>
      <button class="btn btn-sm" id="menuBulkDelBtn" style="border-color:var(--danger);color:var(--danger)" onclick="bulkDeleteMenu()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        <span>ลบที่เลือก (${selectedMenus.size})</span>
      </button>
    </div>
    <div class="view-toggle">
      <button class="view-btn ${viewMode === 'grid' ? 'active' : ''}" onclick="toggleViewMode('menus', 'grid')" title="${t('view_grid')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </button>
      <button class="view-btn ${viewMode === 'list' ? 'active' : ''}" onclick="toggleViewMode('menus', 'list')" title="${t('view_list')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
    </div>
  `;

  container.innerHTML = `
    <div class="page-header" style="align-items:flex-start">
      <div style="flex:1"><div class="page-title">🍜 ${t('menu_title')}</div><div class="page-subtitle">${t('menu_sub')}</div></div>
      <div style="display:flex;gap:12px;align-items:center">
        ${viewToggleHtml}
        <button class="btn btn-ghost" onclick="importAirregiCSV()" title="${t('menu_import_airregi')}" style="padding:6px 12px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="btn btn-primary" onclick="openMenuModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${t('menu_add')}
        </button>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;align-items:center;gap:8px;margin-right:8px;background:var(--bg);padding:6px 10px;border-radius:var(--r-md)">
        <input type="checkbox" class="form-checkbox" onchange="menuSelectAll(this.checked)" title="Select All" />
      </div>
      <div class="filter-tabs" style="margin-bottom:0">
        <button class="filter-tab active" onclick="menuFilterCat(0,this)">${t('menu_all')}</button>
        ${cats.map(c => `<button class="filter-tab" onclick="menuFilterCat(${c.id},this)">${c.icon} ${c.name}</button>`).join('')}
      </div>
      <div class="search-wrap" style="max-width:240px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" placeholder="${t('menu_search')}" oninput="menuSearch(this.value)" />
      </div>
    </div>
    <div id="menuGrid" class="${viewMode === 'grid' ? 'grid-3' : 'list-container'}"></div>`;

  window.menuFilterCat = (cid, btn) => { filterCatId = cid; search = ''; selectedMenus.clear(); document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); draw(); };
  window.menuSearch = (v) => { search = v; draw(); };

  window.bulkChangeCat = () => {
    if (selectedMenus.size === 0) return;
    const cats = DB.getAll('categories');
    Modal.open({
      title: t('menu_bulk_cat_title').replace('{n}', selectedMenus.size),
      body: `<div class="form-group"><label class="form-label">${t('menu_category')}</label>
             <select class="form-select" id="bulkCatSelect">
             <option value="">${t('menu_cat_select')}</option>
             ${cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
             </select></div>`,
      onConfirm: () => {
        const val = document.getElementById('bulkCatSelect').value;
        if (!val) { Toast.show(t('cat_name_required'), 'error'); return; }
        const catId = parseInt(val);
        if (isNaN(catId)) { Toast.show(t('cat_name_required'), 'error'); return; }

        let updateCount = 0;
        selectedMenus.forEach(id => {
          DB.update('menus', id, { categoryId: catId });
          updateCount++;
        });

        selectedMenus.clear();
        Modal.close();
        Toast.show(t('menu_bulk_cat_ok').replace('{n}', updateCount), 'success');
        Router.render();
      }
    });
  };

  window.bulkDeleteMenu = () => {
    if (selectedMenus.size === 0) return;
    if (confirm(`คุณต้องการลบเมนูที่เลือกทั้งหมด ${selectedMenus.size} รายการ พร้อมสูตรอาหารใช่ไหม?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      let delCount = 0;
      const allRecipes = DB.getAll('recipes');

      selectedMenus.forEach(id => {
        // Drop associated recipes first
        const recipes = allRecipes.filter(r => r.menuId === id);
        recipes.forEach(r => DB.delete('recipes', r.id));
        // Drop menu
        DB.delete('menus', id);
        delCount++;
      });

      selectedMenus.clear();
      Toast.show(`ลบสำเร็จ ${delCount} รายการ`, 'success');
      Router.render();
    }
  };

  draw();
}

window.openMenuModal = function (id = null) {
  const m = id ? DB.getById('menus', id) : null;
  const cats = DB.getAll('categories');
  const cost = m ? DB.menuCost(m.id) : 0;

  function calcPreview() {
    const sp = parseFloat(document.getElementById('mPrice')?.value) || 0;
    const el = document.getElementById('mTaxPreview');
    if (el) {
      let html = '';
      if (sp > 0) {
        const gp = (((sp - cost) / sp) * 100).toFixed(1);
        html += `${t('gp_label')} <strong style="color:var(--success)">${gp}%</strong> &nbsp;|&nbsp; Tax 8%: <strong style="color:var(--text)">${formatPrice(sp * 1.08)}</strong> &nbsp;|&nbsp; 10%: <strong style="color:var(--text)">${formatPrice(sp * 1.10)}</strong><br>`;
      }
      if (cost > 0) {
        html += `<span style="color:var(--warning);font-size:12px">${t('suggested_price')} <strong>${formatPrice(cost / 0.3)}</strong></span>`;
      }
      el.innerHTML = html;
    }
  }

  Modal.open({
    title: m ? `✏️ ${t('menu_edit')}` : `➕ ${t('menu_add')}`,
    body: `<div class="form-group"><label class="form-label">${t('menu_name')} <span>*</span></label>
      <input class="form-input" id="mName" value="${m?.name || ''}" placeholder="เช่น ผัดกะเพราหมูสับ" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">${t('menu_category')}</label>
          <select class="form-select" id="mCat"><option value="">${t('menu_cat_select')}</option>
          ${cats.map(c => `<option value="${c.id}" ${m?.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">${t('menu_selling_price')}</label>
          <input class="form-input" id="mPrice" type="number" value="${m?.sellingPrice || ''}" placeholder="0" oninput="calcMenuPreview()" />
          <div id="mTaxPreview" style="font-size:11px;color:var(--text-muted);margin-top:4px;text-align:right"></div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">${t('menu_description')}</label>
        <textarea class="form-textarea" id="mDesc">${m?.description || ''}</textarea></div>`,
    onConfirm() {
      const name = document.getElementById('mName').value.trim();
      if (!name) { Toast.show(t('menu_name_req'), 'error'); return; }
      const data = {
        name, categoryId: parseInt(document.getElementById('mCat').value) || null,
        sellingPrice: parseFloat(document.getElementById('mPrice').value) || null,
        description: document.getElementById('mDesc').value.trim()
      };
      if (id) DB.update('menus', id, data); else DB.insert('menus', data);
      Modal.close(); Toast.show(id ? t('menu_updated') : t('menu_saved')); Router.render();
    }
  });

  window.calcMenuPreview = calcPreview;
  setTimeout(calcPreview, 50);
};

window.deleteMenu = function (id) {
  const recipes = DB.getAll('recipes').filter(r => r.menuId === id);
  if (recipes.length > 0) { if (!confirm(t('menu_delete_confirm').replace('{n}', recipes.length))) return; recipes.forEach(r => DB.delete('recipes', r.id)); }
  DB.delete('menus', id); Toast.show(t('menu_deleted'), 'info'); Router.render();
};

window.duplicateMenu = function (id) {
  const src = DB.getById('menus', id);
  if (!src) return;
  const newMenu = DB.insert('menus', {
    name: src.name + ' (copy)',
    categoryId: src.categoryId,
    sellingPrice: src.sellingPrice,
    description: src.description || ''
  });
  // Copy recipe items too
  const recipes = DB.getAll('recipes').filter(r => r.menuId === id);
  recipes.forEach(r => DB.insert('recipes', { menuId: newMenu.id, ingredientId: r.ingredientId, quantity: r.quantity }));
  Toast.show('คัดลอกเมนู "' + src.name + '" แล้ว (รวมสูตรด้วย)', 'success');
  Router.render();
};

window.importAirregiCSV = function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';

  // A helper function to parse a CSV row, handling quotes
  const parseCSVRow = (text) => {
    let result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      let char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            cur += '"'; i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(cur);
          cur = '';
        } else {
          cur += char;
        }
      }
    }
    result.push(cur);
    return result;
  };

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Toast.show('กำลังอ่านไฟล์ CSV...', 'info');

    try {
      const buffer = await file.arrayBuffer();
      // Try to read as Shift_JIS, if that fails, try UTF-8
      let text = '';
      try {
        text = new TextDecoder('shift_jis', { fatal: true }).decode(buffer);
      } catch (e) {
        text = new TextDecoder('utf-8').decode(buffer);
      }

      const rows = text.split(/\r?\n/);
      if (rows.length < 2) {
        Toast.show('ไม่พบข้อมูลในไฟล์ CSV (พบ ' + rows.length + ' แถว)', 'error');
        return;
      }

      let updatedCount = 0;
      let addedCount = 0;
      let skippedCount = 0;
      const menus = DB.getAll('menus');

      let airregiCat = DB.getAll('categories').find(c => c.name === 'Airregi Import');
      if (!airregiCat) {
        DB.insert('categories', { name: 'Airregi Import', icon: '📥', color: '#f59e0b' });
        airregiCat = DB.getAll('categories').find(c => c.name === 'Airregi Import');
      }

      const headers = parseCSVRow(rows[0]);
      // Attempt to auto-detect columns if standard indexes fail
      let nameColIdx = 4;  // E
      let priceColIdx = 14; // O

      // Fallbacks just in case the format changed slightly
      const headNameIdx = headers.findIndex(h => h && h.includes('商品名'));
      const headPriceIdx = headers.findIndex(h => h && h.includes('価格') && !h.includes('税'));
      if (headNameIdx >= 0) nameColIdx = headNameIdx;
      if (headPriceIdx >= 0) priceColIdx = headPriceIdx;

      for (let i = 1; i < rows.length; i++) {
        const rowText = rows[i].trim();
        if (!rowText) continue;

        const cols = parseCSVRow(rowText);

        if (cols.length > Math.max(nameColIdx, priceColIdx)) {
          let name = cols[nameColIdx].trim();
          let priceStr = cols[priceColIdx].trim();
          let price = parseFloat(priceStr);

          if (name && name !== '商品名' && !isNaN(price)) {
            const existing = menus.find(m => m.name === name);
            if (existing) {
              DB.update('menus', existing.id, { sellingPrice: price });
              updatedCount++;
            } else {
              DB.insert('menus', { name, categoryId: airregiCat.id, sellingPrice: price, description: '' });
              addedCount++;
            }
          } else {
            skippedCount++;
          }
        }
      }

      if (updatedCount === 0 && addedCount === 0) {
        Toast.show(`ไม่พบเมนูที่นำเข้าได้ (ข้ามข้อมูลที่อ่านไม่ได้ ${skippedCount} รายการ, ตรวจสอบคอลัมน์)`, 'warning', 5000);
      } else {
        Toast.show(t('menu_import_success').replace('{u}', updatedCount).replace('{i}', addedCount));
      }

      Router.render();

    } catch (err) {
      Toast.show(t('menu_import_err'), 'error');
      console.error('Airregi CSV Error:', err);
    }
  };

  // ensure input triggers in all environments
  document.body.appendChild(input);
  input.style.display = 'none';
  input.click();
  setTimeout(() => input.remove(), 1000);
};
