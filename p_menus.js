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
              <div style="font-size:16px;font-weight:700">${m.menuType === 'set' ? '🍱 ' : ''}${m.name}</div>
              ${cat ? `<span class="badge badge-cat" style="background:${cat.color}22;color:${cat.color};padding:2px 8px;font-size:11px">${cat.icon} ${cat.name}</span>` : ''}
              ${m.menuType === 'set' ? `<span class="badge" style="background:#7c3aed22;color:#7c3aed;padding:2px 6px;font-size:10px">SET</span>` : ''}
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
        ${m.menuType === 'set' ? `<span class="badge" style="background:#7c3aed22;color:#7c3aed;margin-bottom:8px;margin-left:4px">🍱 SET</span>` : ''}
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
        const recipes = allRecipes.filter(r => r.menuId === id);
        recipes.forEach(r => DB.delete('recipes', r.id));
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
  const ings = DB.getAll('ingredients');
  let cost = m ? DB.menuCost(m.id) : 0;

  function calcPreview() {
    cost = m ? DB.menuCost(m.id) : 0;
    const sp = parseFloat(document.getElementById('mPrice')?.value) || 0;
    const el = document.getElementById('mTaxPreview');
    if (el) {
      let html = '';
      if (sp > 0) {
        const gp = (((sp - cost) / sp) * 100).toFixed(1);
        const gpColor = gp >= 60 ? 'var(--success)' : gp >= 40 ? 'var(--warning)' : 'var(--danger)';
        html += `${t('gp_label')} <strong style="color:${gpColor}">${gp}%</strong> &nbsp;|&nbsp; Tax 8%: <strong style="color:var(--text)">${formatPrice(sp * 1.08)}</strong> &nbsp;|&nbsp; 10%: <strong style="color:var(--text)">${formatPrice(sp * 1.10)}</strong><br>`;
      }
      if (cost > 0) {
        html += `<span style="color:var(--warning);font-size:12px">${t('suggested_price')} <strong>${formatPrice(cost / 0.3)}</strong></span>`;
      }
      el.innerHTML = html;
    }
    const costEl = document.getElementById('mRecipeCostVal');
    if (costEl) costEl.textContent = formatPrice(cost);
  }

  function drawRecipeRows() {
    if (!m) return;
    const recipes = DB.getAll('recipes').filter(r => r.menuId === m.id);
    cost = DB.menuCost(m.id);
    const tbody = document.getElementById('mRecipeBody');
    if (!tbody) return;
    tbody.innerHTML = recipes.map(r => {
      const ing = DB.getById('ingredients', r.ingredientId);
      if (!ing) return '';
      const price = DB.effectivePrice(ing);
      const line = price * r.quantity;
      const pct = cost > 0 ? ((line / cost) * 100).toFixed(1) : 0;
      return `<div class="m-recipe-row">
        <div class="m-recipe-name"><strong>${ing.name}</strong><small class="text-muted">${ing.group || ''}</small></div>
        <div class="m-recipe-detail">
          <span class="m-recipe-qty" onclick="mEditQty(${r.id},'${ing.name.replace(/'/g, "\\'")}',${r.quantity})" title="กดเพื่อแก้ไข" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px">${r.quantity}</span>
          <span class="m-recipe-unit">${ing.recipeUnit || ing.buyUnit}</span>
        </div>
        <div class="m-recipe-cost"><strong style="color:var(--primary)">${formatPrice(line)}</strong><small style="color:var(--text-faint)">${pct}%</small></div>
        <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger);flex-shrink:0;min-height:32px;min-width:32px;padding:4px" onclick="mDelRecipe(${r.id})" title="ลบ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>`;
    }).join('') || `<div style="text-align:center;padding:16px;color:var(--text-faint);font-size:13px">ยังไม่มีวัตถุดิบในสูตร</div>`;
    const costEl = document.getElementById('mRecipeCostVal');
    if (costEl) costEl.textContent = formatPrice(cost);
    calcPreview();
  }

  // Sub-menu management for SET type
  let _subMenus = m ? (m.subMenus || []).map(sm => ({ ...sm })) : [];

  function calcSetCost() {
    const allMenus = DB.getAll('menus');
    let total = 0;
    for (const sm of _subMenus) {
      const menu = allMenus.find(x => x.id === sm.menuId);
      if (menu) total += DB.menuCost(menu.id) * Number(sm.portion || 1);
    }
    return Math.round(total * 10000) / 10000;
  }

  function drawSubMenuRows() {
    const allMenus = DB.getAll('menus');
    const allCats = DB.getAll('categories');
    const body = document.getElementById('mSubMenuBody');
    if (!body) return;
    const setCost = calcSetCost();
    body.innerHTML = _subMenus.map((sm, idx) => {
      const menu = allMenus.find(x => x.id === sm.menuId);
      if (!menu) return '';
      const cat = allCats.find(c => c.id === menu.categoryId);
      const baseCost = DB.menuCost(menu.id);
      const lineCost = baseCost * Number(sm.portion || 1);
      const pct = setCost > 0 ? ((lineCost / setCost) * 100).toFixed(1) : 0;
      return `<div class="m-recipe-row">
        <div class="m-recipe-name"><strong>${cat ? cat.icon + ' ' : ''}${menu.name}</strong><small class="text-muted">ต้นทุนเต็ม: ${formatPrice(baseCost)}</small></div>
        <div class="m-recipe-detail" style="min-width:90px">
          <input type="number" class="inline-input" value="${sm.portion}" step="0.1" min="0.1" max="10" style="width:55px;font-size:13px;text-align:center;padding:4px;min-height:30px" onchange="mSetPortion(${idx},this.value)" title="โพชั่น" />
          <span class="m-recipe-unit">โพชั่น</span>
        </div>
        <div class="m-recipe-cost"><strong style="color:var(--primary)">${formatPrice(lineCost)}</strong><small style="color:var(--text-faint)">${pct}%</small></div>
        <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger);flex-shrink:0;min-height:32px;min-width:32px;padding:4px" onclick="mDelSubMenu(${idx})" title="ลบ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>`;
    }).join('') || `<div style="text-align:center;padding:16px;color:var(--text-faint);font-size:13px">ยังไม่มีเมนูย่อยในเซต</div>`;
    const costEl = document.getElementById('mSubMenuCostVal');
    if (costEl) costEl.textContent = formatPrice(setCost);
    calcSetPreview();
  }

  function calcSetPreview() {
    const setCost = calcSetCost();
    const sp = parseFloat(document.getElementById('mPrice')?.value) || 0;
    const el = document.getElementById('mTaxPreview');
    if (el) {
      let html = '';
      if (sp > 0) {
        const gp = (((sp - setCost) / sp) * 100).toFixed(1);
        const gpColor = gp >= 60 ? 'var(--success)' : gp >= 40 ? 'var(--warning)' : 'var(--danger)';
        html += `${t('gp_label')} <strong style="color:${gpColor}">${gp}%</strong> &nbsp;|&nbsp; Tax 8%: <strong style="color:var(--text)">${formatPrice(sp * 1.08)}</strong> &nbsp;|&nbsp; 10%: <strong style="color:var(--text)">${formatPrice(sp * 1.10)}</strong><br>`;
      }
      if (setCost > 0) {
        html += `<span style="color:var(--warning);font-size:12px">${t('suggested_price')} <strong>${formatPrice(setCost / 0.3)}</strong></span>`;
      }
      el.innerHTML = html;
    }
    const costEl = document.getElementById('mSubMenuCostVal');
    if (costEl) costEl.textContent = formatPrice(setCost);
  }

  const currentType = m?.menuType || 'single';

  // Recipe section (single type) — also shown for new menus as placeholder
  const recipeHtml = m ? `
    <div id="mRecipeSection" style="margin-top:4px;margin-bottom:16px;${currentType === 'set' ? 'display:none' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-weight:700;font-size:14px;color:var(--accent);display:flex;align-items:center;gap:6px">
          📋 สูตรอาหาร
          <span style="background:var(--primary);color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:var(--r-full)">${t('rec_total_cost')}: <span id="mRecipeCostVal">${formatPrice(cost)}</span></span>
        </div>
      </div>
      <div id="mRecipeBody" style="max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg)"></div>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:flex-end">
        <div style="flex:1;position:relative" id="mIngContainer">
          <input type="text" class="form-input" id="mAddIngSearch" placeholder="+ เพิ่มวัตถุดิบ..." autocomplete="off" style="font-size:13px;min-height:40px" onfocus="mShowIngDD()" oninput="mFilterIngDD()" />
          <input type="hidden" id="mAddIngId" value="" />
          <div id="mIngDD" style="display:none;position:absolute;left:0;right:0;top:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);max-height:180px;overflow-y:auto;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.6)">
            ${ings.map(i => `<div class="dropdown-item" data-id="${i.id}" data-name="${i.name.toLowerCase()}" onclick="mSelectIng(${i.id},'${i.name.replace(/'/g, "\\'")}')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-light);font-size:13px">
              <div style="font-weight:600">${i.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${i.group || ''} · ${i.recipeUnit || i.buyUnit}</div>
            </div>`).join('')}
          </div>
        </div>
        <input class="form-input" id="mAddQty" type="number" placeholder="จำนวน" step="0.001" min="0" style="width:80px;font-size:13px;min-height:40px" />
        <button class="btn btn-primary btn-sm" onclick="mAddRecipeItem()" style="min-height:40px;padding:0 14px;white-space:nowrap">+ เพิ่ม</button>
      </div>
    </div>` : `
    <div id="mRecipeSection" style="margin-top:4px;margin-bottom:16px;${currentType === 'set' ? 'display:none' : ''}">
      <div style="font-weight:700;font-size:14px;color:var(--accent);margin-bottom:8px">📋 สูตรอาหาร</div>
      <div style="padding:14px 16px;border:1px dashed var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--text-muted);font-size:13px;text-align:center;line-height:1.8">
        กด <strong style="color:var(--primary)">"💾 บันทึก &amp; เพิ่มสูตร"</strong> เพื่อบันทึกเมนูแล้วเพิ่มวัตถุดิบในสูตรได้ทันที
      </div>
    </div>`;

  // Sub-menu section (set type) — also shown for new menus
  const allMenusForSet = DB.getAll('menus').filter(x => !m || x.id !== m.id);
  const subMenuHtml = `
    <div id="mSubMenuSection" style="margin-top:4px;margin-bottom:16px;${currentType === 'single' ? 'display:none' : ''}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-weight:700;font-size:14px;color:#7c3aed;display:flex;align-items:center;gap:6px">
          🍱 เมนูย่อยในเซต
          <span style="background:#7c3aed;color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:var(--r-full)">${t('rec_total_cost')}: <span id="mSubMenuCostVal">${formatPrice(calcSetCost())}</span></span>
        </div>
      </div>
      <div id="mSubMenuBody" style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg)"></div>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:flex-end">
        <div style="flex:1;position:relative" id="mSubMenuContainer">
          <input type="text" class="form-input" id="mAddSubMenuSearch" placeholder="+ เพิ่มเมนูย่อย..." autocomplete="off" style="font-size:13px;min-height:40px" onfocus="mShowSubMenuDD()" oninput="mFilterSubMenuDD()" />
          <input type="hidden" id="mAddSubMenuId" value="" />
          <div id="mSubMenuDD" style="display:none;position:absolute;left:0;right:0;top:100%;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);max-height:180px;overflow-y:auto;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.6)">
            ${allMenusForSet.map(x => {
    const cat = cats.find(c => c.id === x.categoryId);
    const xCost = DB.menuCost(x.id);
    return `<div class="dropdown-item" data-id="${x.id}" data-name="${x.name.toLowerCase()}" onclick="mSelectSubMenu(${x.id},'${x.name.replace(/'/g, "\\'")}')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-light);font-size:13px">
                <div style="font-weight:600">${cat ? cat.icon + ' ' : ''}${x.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">ต้นทุน: ${formatPrice(xCost)}</div>
              </div>`;
  }).join('')}
          </div>
        </div>
        <input class="form-input" id="mAddSubMenuPortion" type="number" placeholder="โพชั่น" step="0.1" min="0.1" value="1" style="width:80px;font-size:13px;min-height:40px" />
        <button class="btn btn-sm" style="min-height:40px;padding:0 14px;white-space:nowrap;background:#7c3aed;color:white;border-color:#7c3aed" onclick="mAddSubMenuItem()">+ เพิ่ม</button>
      </div>
    </div>`;

  const typeToggleHtml = `
    <div class="form-group" style="margin-bottom:12px">
      <label class="form-label">ประเภทเมนู</label>
      <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden">
        <button type="button" id="mTypeBtn_single" class="btn btn-sm" style="flex:1;border:none;border-radius:0;min-height:38px;font-weight:600;${currentType === 'single' ? 'background:var(--primary);color:white' : 'background:var(--bg);color:var(--text-muted)'}" onclick="mSwitchType('single')">🍜 เมนูปกติ</button>
        <button type="button" id="mTypeBtn_set" class="btn btn-sm" style="flex:1;border:none;border-radius:0;border-left:1px solid var(--border);min-height:38px;font-weight:600;${currentType === 'set' ? 'background:#7c3aed;color:white' : 'background:var(--bg);color:var(--text-muted)'}" onclick="mSwitchType('set')">🍱 เมนูเซต</button>
      </div>
    </div>`;

  Modal.open({
    title: m ? `✏️ ${t('menu_edit')}` : `➕ ${t('menu_add')}`,
    body: `<div class="form-group"><label class="form-label">${t('menu_name')} <span>*</span></label>
      <input class="form-input" id="mName" value="${m?.name || ''}" placeholder="เช่น ผัดกะเพราหมูสับ / เซต A" /></div>
      ${typeToggleHtml}
      <div class="form-row">
        <div class="form-group"><label class="form-label">${t('menu_category')}</label>
          <select class="form-select" id="mCat"><option value="">${t('menu_cat_select')}</option>
          ${cats.map(c => `<option value="${c.id}" ${m?.categoryId === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">${t('menu_selling_price')}</label>
          <input class="form-input" id="mPrice" type="number" value="${m?.sellingPrice || ''}" placeholder="0" oninput="calcMenuPreview()" />
          <div id="mTaxPreview" style="font-size:11px;color:var(--text-muted);margin-top:4px;text-align:right"></div>
        </div>
      </div>
      ${recipeHtml}
      ${subMenuHtml}
      <input type="hidden" id="mMenuType" value="${currentType}" />
      <div class="form-group"><label class="form-label">${t('menu_description')}</label>
        <textarea class="form-textarea" id="mDesc">${m?.description || ''}</textarea></div>`,
    footerHtml: m
      ? `<button class="btn btn-secondary" onclick="Modal.close()">${t('btn_cancel')}</button>
         <button class="btn btn-primary" id="modalConfirmBtn">${t('btn_save')}</button>`
      : `<button class="btn btn-secondary" onclick="Modal.close()">${t('btn_cancel')}</button>
         <button class="btn btn-primary" id="modalConfirmBtn">💾 บันทึก &amp; เพิ่มสูตร →</button>`,
    onConfirm() {
      const name = document.getElementById('mName').value.trim();
      if (!name) { Toast.show(t('menu_name_req'), 'error'); return; }
      const menuType = document.getElementById('mMenuType').value;
      const data = {
        name, categoryId: parseInt(document.getElementById('mCat').value) || null,
        sellingPrice: parseFloat(document.getElementById('mPrice').value) || null,
        description: document.getElementById('mDesc').value.trim(),
        menuType: menuType,
        subMenus: menuType === 'set' ? _subMenus : (m?.subMenus || [])
      };
      if (id) {
        DB.update('menus', id, data);
        Modal.close(); Toast.show(t('menu_updated')); Router.render();
      } else {
        // For new menus: save first, then reopen with recipe section unlocked
        const newMenu = DB.insert('menus', data);
        Modal.close();
        Toast.show(t('menu_saved'));
        // Reopen immediately with the new id so user can add recipes
        setTimeout(() => openMenuModal(newMenu.id), 80);
      }
    }
  });

  // Type switching
  window.mSwitchType = function (type) {
    document.getElementById('mMenuType').value = type;
    const singleBtn = document.getElementById('mTypeBtn_single');
    const setBtn = document.getElementById('mTypeBtn_set');
    if (singleBtn) singleBtn.style.cssText = `flex:1;border:none;border-radius:0;min-height:38px;font-weight:600;${type === 'single' ? 'background:var(--primary);color:white' : 'background:var(--bg);color:var(--text-muted)'}`;
    if (setBtn) setBtn.style.cssText = `flex:1;border:none;border-radius:0;border-left:1px solid var(--border);min-height:38px;font-weight:600;${type === 'set' ? 'background:#7c3aed;color:white' : 'background:var(--bg);color:var(--text-muted)'}`;
    const recSec = document.getElementById('mRecipeSection');
    const subSec = document.getElementById('mSubMenuSection');
    if (recSec) recSec.style.display = type === 'single' ? '' : 'none';
    if (subSec) subSec.style.display = type === 'set' ? '' : 'none';
    if (type === 'set') calcSetPreview(); else calcPreview();
  };

  window.calcMenuPreview = function () {
    const type = document.getElementById('mMenuType')?.value || 'single';
    if (type === 'set') calcSetPreview(); else calcPreview();
  };
  setTimeout(() => window.calcMenuPreview(), 50);

  // Inline recipe/sub-menu editing functions
  if (m) {
    if (currentType !== 'set') setTimeout(drawRecipeRows, 80);
    if (currentType === 'set') setTimeout(drawSubMenuRows, 80);

    window.mShowIngDD = function () { const dd = document.getElementById('mIngDD'); if (dd) { dd.style.display = 'block'; mFilterIngDD(); } };
    window.mFilterIngDD = function () {
      const term = (document.getElementById('mAddIngSearch')?.value || '').toLowerCase();
      document.querySelectorAll('#mIngDD .dropdown-item').forEach(el => { el.style.display = el.dataset.name.includes(term) ? 'block' : 'none'; });
    };
    window.mSelectIng = function (ingId, name) {
      document.getElementById('mAddIngId').value = ingId;
      document.getElementById('mAddIngSearch').value = name;
      document.getElementById('mIngDD').style.display = 'none';
      document.getElementById('mAddQty').focus();
    };
    window.mAddRecipeItem = function () {
      const ingId = parseInt(document.getElementById('mAddIngId').value);
      const qty = parseFloat(document.getElementById('mAddQty').value);
      if (!ingId) { Toast.show(t('rec_ing_req'), 'error'); return; }
      if (!qty || qty <= 0) { Toast.show(t('rec_qty_req'), 'error'); return; }
      if (DB.getAll('recipes').some(r => r.menuId === m.id && r.ingredientId === ingId)) { Toast.show(t('rec_duplicate'), 'warning'); return; }
      DB.insert('recipes', { menuId: m.id, ingredientId: ingId, quantity: qty });
      Toast.show(t('rec_added'));
      document.getElementById('mAddIngSearch').value = ''; document.getElementById('mAddIngId').value = ''; document.getElementById('mAddQty').value = '';
      drawRecipeRows();
    };
    window.mEditQty = function (recipeId, name, currentQty) {
      const val = prompt(`${t('rec_edit_qty')} "${name}":`, currentQty);
      if (val !== null && !isNaN(parseFloat(val)) && parseFloat(val) > 0) { DB.update('recipes', recipeId, { quantity: parseFloat(val) }); Toast.show(t('rec_qty_updated')); drawRecipeRows(); }
    };
    window.mDelRecipe = function (recipeId) { DB.delete('recipes', recipeId); Toast.show(t('rec_deleted'), 'info'); drawRecipeRows(); };

    // Sub-menu functions (set type)
    window.mShowSubMenuDD = function () { const dd = document.getElementById('mSubMenuDD'); if (dd) { dd.style.display = 'block'; mFilterSubMenuDD(); } };
    window.mFilterSubMenuDD = function () {
      const term = (document.getElementById('mAddSubMenuSearch')?.value || '').toLowerCase();
      document.querySelectorAll('#mSubMenuDD .dropdown-item').forEach(el => { el.style.display = el.dataset.name.includes(term) ? 'block' : 'none'; });
    };
    window.mSelectSubMenu = function (menuId, name) {
      document.getElementById('mAddSubMenuId').value = menuId;
      document.getElementById('mAddSubMenuSearch').value = name;
      document.getElementById('mSubMenuDD').style.display = 'none';
      document.getElementById('mAddSubMenuPortion').focus();
    };
    window.mAddSubMenuItem = function () {
      const menuId = parseInt(document.getElementById('mAddSubMenuId').value);
      const portion = parseFloat(document.getElementById('mAddSubMenuPortion').value) || 1;
      if (!menuId) { Toast.show('กรุณาเลือกเมนูก่อน', 'error'); return; }
      if (_subMenus.some(sm => sm.menuId === menuId)) { Toast.show('เมนูนี้ถูกเพิ่มแล้ว', 'warning'); return; }
      _subMenus.push({ menuId, portion });
      Toast.show('เพิ่มเมนูย่อยแล้ว');
      document.getElementById('mAddSubMenuSearch').value = ''; document.getElementById('mAddSubMenuId').value = ''; document.getElementById('mAddSubMenuPortion').value = '1';
      drawSubMenuRows();
    };
    window.mSetPortion = function (idx, val) {
      const portion = parseFloat(val);
      if (portion > 0 && idx >= 0 && idx < _subMenus.length) { _subMenus[idx].portion = portion; drawSubMenuRows(); }
    };
    window.mDelSubMenu = function (idx) {
      if (idx >= 0 && idx < _subMenus.length) { _subMenus.splice(idx, 1); Toast.show('ลบเมนูย่อยแล้ว', 'info'); drawSubMenuRows(); }
    };

    // Close dropdowns on outside click
    setTimeout(() => {
      document.getElementById('modalBody')?.addEventListener('click', (e) => {
        const c1 = document.getElementById('mIngContainer');
        if (c1 && !c1.contains(e.target)) { const dd = document.getElementById('mIngDD'); if (dd) dd.style.display = 'none'; }
        const c2 = document.getElementById('mSubMenuContainer');
        if (c2 && !c2.contains(e.target)) { const dd = document.getElementById('mSubMenuDD'); if (dd) dd.style.display = 'none'; }
      });
    }, 100);
  }
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
    description: src.description || '',
    menuType: src.menuType || 'single',
    subMenus: src.subMenus ? src.subMenus.map(sm => ({ ...sm })) : []
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
