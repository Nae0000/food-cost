// ===================================================
// p_ingredients.js — Ingredients page (with bulk purchase + i18n)
// ===================================================

// Standard unit lists
const RECIPE_UNITS = ['กก.', 'กรัม', 'ลิตร', 'มล.', 'กำ', 'ช้อนโต๊ะ', 'ช้อนชา', 'ชิ้น', 'ขวด', 'กล่อง', 'แพ็ค', 'ถุง'];
const BUY_UNITS = ['กก.', 'กรัม', 'ลิตร', 'มล.', 'กำ', 'ขวด', 'กล่อง', 'แพ็ค', 'ถุง', 'ชิ้น', 'โหล'];

function renderIngredients(container) {
  let filterGroup = 'ทั้งหมด', search = '';
  // Load dynamic groups
  let customGroups = DB.getAll('ingGroups');
  if (customGroups.length === 0) {
    customGroups = [
      { id: 'temp1', name: 'เนื้อสัตว์', bg: '#ef444422', color: '#ef4444', emoji: '🥩' },
      { id: 'temp2', name: 'ผัก/สมุนไพร', bg: '#22c55e22', color: '#22c55e', emoji: '🥬' },
      { id: 'temp3', name: 'เครื่องปรุง', bg: '#f59e0b22', color: '#f59e0b', emoji: '🧄' },
      { id: 'temp4', name: 'ของแห้ง', bg: '#8b5cf622', color: '#8b5cf6', emoji: '🌾' },
      { id: 'temp5', name: 'อื่นๆ', bg: '#64748b22', color: '#64748b', emoji: '📦' }
    ];
  }
  const GROUPS_LIST = ['ทั้งหมด', ...customGroups.map(g => g.name)];

  let selectedIds = new Set();

  function badge(ing) {
    if (ing.priceMode === 'sub_recipe') return `<span class="badge" style="background:#7c3aed22;color:#7c3aed">🧪 Sub-Recipe</span>`;
    if (ing.priceMode === 'webhook') return `<span class="badge badge-webhook">🔗 Webhook</span>`;
    if (ing.priceMode === 'custom') return `<span class="badge badge-custom">🎯 Custom</span>`;
    return `<span class="badge badge-manual">✏️ Manual</span>`;
  }

  // ---- Group color map dynamic ----
  const GROUP_COLORS = {};
  customGroups.forEach(g => {
    GROUP_COLORS[g.name] = { bg: g.bg || (g.color + '22'), color: g.color || '#64748b', emoji: g.emoji || '📦' };
  });

  function draw() {
    let ings = DB.getAll('ingredients');
    if (filterGroup !== 'ทั้งหมด') ings = ings.filter(i => i.group === filterGroup);
    if (search) ings = ings.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.group || '').includes(search));

    // Update count
    const countEl = document.getElementById('ingCount');
    if (countEl) countEl.textContent = ings.length + ' รายการ';

    const body = document.getElementById('ingCardBody');
    if (!body) return;

    if (!ings.length) {
      body.innerHTML = `<div class="empty-state"><div class="empty-icon">🧂</div><div class="empty-title">${t('ing_empty')}</div></div>`;
      return;
    }

    body.innerHTML = ings.map(ing => {
      const price = DB.effectivePrice(ing);
      const gc = GROUP_COLORS[ing.group] || { bg: '#33415522', color: '#64748b', emoji: '🧂' };
      const modeColor = ing.priceMode === 'webhook' ? '#8b5cf6' : ing.priceMode === 'custom' ? '#22c55e' : ing.priceMode === 'sub_recipe' ? '#7c3aed' : '#f59e0b';
      const modeLabel = ing.priceMode === 'webhook' ? '🔗 Webhook' : ing.priceMode === 'custom' ? '🎯 Custom' : ing.priceMode === 'sub_recipe' ? '🧪 Sub-Recipe' : '✏️ Manual';
      const buyInfo = ing.priceMode === 'sub_recipe'
        ? `<span style="color:#7c3aed;font-size:11px">🧪 → ${formatPrice(price)}/${ing.subYieldUnit || ing.recipeUnit || ing.buyUnit}</span>`
        : (ing.buyQty && ing.buyPrice)
          ? `<span style="color:var(--text-faint);font-size:11px">ซื้อ ${ing.buyQty}${ing.buyUnit} ${formatPrice(ing.buyPrice)} → ${formatPrice(price)}/${ing.recipeUnit || ing.buyUnit}</span>`
          : '';
      const isSelected = selectedIds.has(ing.id);

      // Suggested min price
      const suggestHtml = price > 0
        ? `<span style="font-size:10px;color:var(--text-faint);margin-top:2px">💡 ขายขั้นต่ำ ${formatPrice(price / 0.3)}</span>`
        : '';

      return `<div class="ing-card${isSelected ? ' ing-card--selected' : ''}" onclick="ingCardClick(event,${ing.id})">
        <div class="ing-card__left">
          <input type="checkbox" class="ing-select-cb" value="${ing.id}" ${isSelected ? 'checked' : ''} onchange="toggleSelectIng(${ing.id})" style="accent-color:var(--primary);cursor:pointer;width:16px;height:16px;flex-shrink:0" onclick="event.stopPropagation()" />
          <div class="ing-card__avatar" style="background:${gc.bg};color:${gc.color}">${gc.emoji}</div>
          <div class="ing-card__info">
            <div class="ing-card__name">${ing.name}</div>
            <div class="ing-card__meta">
              <span class="ing-card__group" style="background:${gc.bg};color:${gc.color}">${ing.group || 'อื่นๆ'}</span>
              <span class="ing-card__mode" style="background:${modeColor}22;color:${modeColor}">${modeLabel}</span>
              <span style="color:var(--text-faint);font-size:11px">${ing.recipeUnit || ing.buyUnit || ''}</span>
            </div>
            ${buyInfo ? `<div style="margin-top:3px">${buyInfo}</div>` : ''}
          </div>
        </div>
        <div class="ing-card__right">
          <div class="ing-card__price">${formatPrice(price)}<span class="ing-card__unit">/${ing.recipeUnit || ing.buyUnit}</span></div>
          ${suggestHtml}
          <div class="ing-card__actions">
            <button class="ing-action-btn" onclick="event.stopPropagation();duplicateIngredient(${ing.id})" title="คัดลอก" style="color:var(--accent)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="ing-action-btn" onclick="event.stopPropagation();openIngredientModal(${ing.id})" title="แก้ไข" style="color:var(--primary)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="ing-action-btn" onclick="event.stopPropagation();deleteIngredient(${ing.id})" title="ลบ" style="color:var(--danger)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');

    const bulkBtn = document.getElementById('bulkDeleteBtn');
    const isAllSelected = ings.length > 0 && ings.every(i => selectedIds.has(i.id));
    const selectAllCb = document.getElementById('selectAllCb');
    if (selectAllCb) selectAllCb.checked = isAllSelected;
    if (bulkBtn) {
      if (selectedIds.size > 0) {
        bulkBtn.style.display = 'inline-flex';
        bulkBtn.innerHTML = `<span>🗑 ลบที่เลือก (${selectedIds.size})</span>`;
      } else {
        bulkBtn.style.display = 'none';
      }
    }
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">🧂 ${t('ing_title')}</div>
        <div class="page-subtitle">${t('ing_sub')}</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <span id="ingCount" style="font-size:13px;color:var(--text-muted)"></span>
        <button id="bulkDeleteBtn" class="btn btn-sm" style="display:none;background:var(--danger);color:white;border:none" onclick="deleteSelectedIngredients()"></button>
        <button class="btn btn-primary" onclick="openIngredientModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${t('ing_add')}
        </button>
      </div>
    </div>

    <!-- Category filter tabs -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div class="filter-tabs" style="margin-bottom:0; flex:1; overflow-x:auto;">
        ${GROUPS_LIST.map(g => `<button class="filter-tab${g === filterGroup ? ' active' : ''}" onclick="ingFilterGroup('${g}',this)">${g}</button>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-left:12px; white-space:nowrap; color:var(--text-muted);" onclick="openManageGroupsModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> 
        จัดการหมวดหมู่
      </button>
    </div>

    <!-- Search + select-all bar -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div class="search-wrap" style="flex:1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" id="ingSearch" placeholder="${t('ing_search')}" oninput="ingSearch(this.value)" />
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-muted);cursor:pointer;white-space:nowrap">
        <input type="checkbox" id="selectAllCb" onchange="toggleSelectAll(this.checked)" style="accent-color:var(--primary);cursor:pointer;width:15px;height:15px" />
        เลือกทั้งหมด
      </label>
    </div>

    <!-- Cards -->
    <div id="ingCardBody" style="display:flex;flex-direction:column;gap:10px"></div>`;


  window.ingFilterGroup = (g, btn) => {
    filterGroup = g;
    selectedIds.clear();
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); draw();
  };
  window.ingSearch = (v) => { search = v; draw(); };
  window.ingCardClick = (e, id) => { openIngredientModal(id); };


  window.toggleSelectIng = (id) => {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    draw();
  };

  window.toggleSelectAll = (isChecked) => {
    let ings = DB.getAll('ingredients');
    if (filterGroup !== 'ทั้งหมด') ings = ings.filter(i => i.group === filterGroup);
    if (search) ings = ings.filter(i => i.name.includes(search) || (i.group || '').includes(search));

    if (isChecked) {
      ings.forEach(i => selectedIds.add(i.id));
    } else {
      selectedIds.clear();
    }
    draw();
  };

  window.deleteSelectedIngredients = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('bulk_delete_confirm').replace('{n}', selectedIds.size))) return;

    const recipes = DB.getAll('recipes');
    let deletedCount = 0;
    let skippedCount = 0;

    for (let id of selectedIds) {
      if (recipes.some(r => r.ingredientId === id)) {
        skippedCount++;
      } else {
        DB.delete('ingredients', id);
        deletedCount++;
      }
    }

    selectedIds.clear();
    draw();

    if (skippedCount > 0) {
      Toast.show(t('bulk_delete_skip').replace('{n}', skippedCount), 'warning');
    }
    if (deletedCount > 0) {
      setTimeout(() => Toast.show(t('bulk_delete_success').replace('{n}', deletedCount), 'success'), skippedCount > 0 ? 3000 : 0);
    }
  };

  // Manage Groups logic
  window.openManageGroupsModal = () => {
    // If DB has no groups, seed them first so we can edit
    let dGroups = DB.getAll('ingGroups');
    if (dGroups.length === 0) {
      const defs = [
        { name: 'เนื้อสัตว์', bg: '#ef444422', color: '#ef4444', emoji: '🥩' },
        { name: 'ผัก/สมุนไพร', bg: '#22c55e22', color: '#22c55e', emoji: '🥬' },
        { name: 'เครื่องปรุง', bg: '#f59e0b22', color: '#f59e0b', emoji: '🧄' },
        { name: 'ของแห้ง', bg: '#8b5cf622', color: '#8b5cf6', emoji: '🌾' },
        { name: 'อื่นๆ', bg: '#64748b22', color: '#64748b', emoji: '📦' }
      ];
      defs.forEach(g => DB.insert('ingGroups', g));
      dGroups = DB.getAll('ingGroups');
    }

    const renderGroupRows = () => {
      const gList = DB.getAll('ingGroups');
      return gList.map(g => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:8px; border-bottom:1px solid var(--border-light);">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="background:${g.bg || (g.color + '22')}; color:${g.color}; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px;">${g.emoji || '📦'}</div>
            <div style="font-weight:600;">${g.name}</div>
          </div>
          <button class="btn btn-icon btn-sm" style="color:var(--danger); background:transparent; border:none;" onclick="deleteIngGroup(${g.id}, '${g.name}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      `).join('');
    };

    Modal.open({
      title: '📁 จัดการหมวดหมู่วัตถุดิบ',
      body: `
        <div style="margin-bottom:16px; display:flex; gap:8px;">
          <input type="text" id="newGroupName" class="form-input" placeholder="ชื่อหมวดหมู่ใหม่..." style="flex:1;" oninput="autoSuggestGroupEmoji(this.value)" />
          <input type="text" id="newGroupEmoji" class="form-input" placeholder="อีโมจิ (เช่น 🥩)" style="width:100px; text-align:center;" />
          <input type="color" id="newGroupColor" class="form-input" value="#0ea5e9" style="width:40px; padding:2px; height:40px; cursor:pointer;" />
        </div>
        <button class="btn btn-primary" style="width:100%; margin-bottom:16px;" onclick="addIngGroup()">+ เพิ่มหมวดหมู่</button>
        <div id="manageGroupsList" style="max-height:250px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--r-md); background:var(--bg);">
          ${renderGroupRows()}
        </div>
      `,
      footerHtml: `<button class="btn btn-secondary" onclick="Modal.close(); Router.render();">ปิด</button>`,
      onConfirm: () => { Modal.close(); Router.render(); }
    });

    window.autoSuggestGroupEmoji = (name) => {
      const mapping = {
        'เนื้อสัตว์': { e: '🥩', c: '#ef4444' },
        'หมู': { e: '🐷', c: '#f472b6' },
        'ไก่': { e: '🍗', c: '#fb923c' },
        'วัว': { e: '🥩', c: '#ef4444' },
        'เนื้อวัว': { e: '🥩', c: '#ef4444' },
        'ปลา': { e: '🐟', c: '#3b82f6' },
        'อาหารทะเล': { e: '🦐', c: '#0ea5e9' },
        'กุ้ง': { e: '🦐', c: '#f87171' },
        'ผัก': { e: '🥬', c: '#22c55e' },
        'สมุนไพร': { e: '🌿', c: '#16a34a' },
        'ผลไม้': { e: '🍎', c: '#f43f5e' },
        'เครื่องปรุง': { e: '🧄', c: '#f59e0b' },
        'ซอส': { e: '🥫', c: '#d97706' },
        'ของแห้ง': { e: '🌾', c: '#8b5cf6' },
        'แป้ง': { e: '🥟', c: '#d8b4fe' },
        'เส้น': { e: '🍜', c: '#eab308' },
        'น้ำ': { e: '💧', c: '#0ea5e9' },
        'เครื่องดื่ม': { e: '🍹', c: '#06b6d4' },
        'นม': { e: '🥛', c: '#93c5fd' },
        'ไข่': { e: '🥚', c: '#facc15' },
        'อื่นๆ': { e: '📦', c: '#64748b' }
      };

      const em = document.getElementById('newGroupEmoji');
      const co = document.getElementById('newGroupColor');

      // Don't overwrite if user already typed an emoji
      if (em.dataset.userModified === 'true') return;

      for (const [key, val] of Object.entries(mapping)) {
        if (name.includes(key)) {
          if (em) em.value = val.e;
          if (co) co.value = val.c;
          return;
        }
      }
    };

    // Track if user manually edits emoji so we don't overwrite
    setTimeout(() => {
      const em = document.getElementById('newGroupEmoji');
      if (em) em.addEventListener('input', () => { em.dataset.userModified = 'true'; });
    }, 100);

    window.addIngGroup = () => {
      const name = document.getElementById('newGroupName').value.trim();
      const emoji = document.getElementById('newGroupEmoji').value.trim() || '📦';
      const color = document.getElementById('newGroupColor').value || '#0ea5e9';
      if (!name) { Toast.show('กรุณาใส่ชื่อหมวดหมู่', 'error'); return; }

      const exists = DB.getAll('ingGroups').some(g => g.name.toLowerCase() === name.toLowerCase());
      if (exists) { Toast.show('มีชื่อหมวดหมู่นี้อยู่แล้ว', 'error'); return; }

      // Also support converting hex down to a lighter background tone for bg
      const bg = color + '22';

      DB.insert('ingGroups', { name, emoji, color, bg });
      document.getElementById('newGroupName').value = '';
      document.getElementById('newGroupEmoji').value = '';

      const listEl = document.getElementById('manageGroupsList');
      if (listEl) listEl.innerHTML = renderGroupRows();
    };

    window.deleteIngGroup = (id, checkName) => {
      // Check if ingredients use this group
      const inUse = DB.getAll('ingredients').some(i => i.group === checkName);
      if (inUse) {
        Toast.show('ไม่สามารถลบได้ มีวัตถุดิบอยู่ในหมวดหมู่นี้', 'error');
        return;
      }
      if (confirm('ยืนยันชารลบหมวดหมู่ "' + checkName + '" ?')) {
        DB.delete('ingGroups', id);
        const listEl = document.getElementById('manageGroupsList');
        if (listEl) listEl.innerHTML = renderGroupRows();
      }
    };
  };

  draw();
}

window.setPriceMode = function (id, mode) {
  if (mode === 'sub_recipe') {
    DB.update('ingredients', id, { priceMode: mode });
    openSubRecipeModal(id);
    return;
  }
  DB.update('ingredients', id, { priceMode: mode });
  if (mode === 'custom') {
    const ing = DB.getById('ingredients', id);
    const cur = ing?.customPrice ?? DB.effectivePrice(ing);
    const val = prompt(`${t('ing_custom_prompt')} "${ing?.name}" (${t('set_currency')} ${formatPrice(1).replace(/[\d.,]/g, '').trim()}):`, cur);
    if (val !== null && !isNaN(parseFloat(val))) DB.update('ingredients', id, { customPrice: parseFloat(val) });
  }
  Toast.show(t('ing_mode_updated')); Router.render();
};

window.openIngredientModal = function (id = null) {
  const ing = id ? DB.getById('ingredients', id) : null;

  // Seed default groups if none exist
  let dGroups = DB.getAll('ingGroups');
  if (dGroups.length === 0) {
    const defs = [
      { name: 'เนื้อสัตว์', bg: '#ef444422', color: '#ef4444', emoji: '🥩' },
      { name: 'ผัก/สมุนไพร', bg: '#22c55e22', color: '#22c55e', emoji: '🥬' },
      { name: 'เครื่องปรุง', bg: '#f59e0b22', color: '#f59e0b', emoji: '🧄' },
      { name: 'ของแห้ง', bg: '#8b5cf622', color: '#8b5cf6', emoji: '🌾' },
      { name: 'อื่นๆ', bg: '#64748b22', color: '#64748b', emoji: '📦' }
    ];
    defs.forEach(g => DB.insert('ingGroups', g));
    dGroups = DB.getAll('ingGroups');
  }

  const groups = dGroups.map(g => g.name);

  function unitOpts(list, selected) {
    return list.map(u => `<option value="${u}" ${selected === u ? 'selected' : ''}>${u}</option>`).join('');
  }

  // Calculate price preview
  const previewPrice = ing ? DB.effectivePrice(ing) : 0;

  Modal.open({
    title: ing ? `✏️ ${t('ing_edit_modal')}` : `➕ ${t('ing_add_modal')}`,
    body: `
      <div class="form-group">
        <label class="form-label">${t('ing_name')} <span>*</span></label>
        <input class="form-input" id="ingName" value="${ing?.name || ''}" placeholder="เช่น หมูสับ, กุ้งขาว" />
      </div>
      <div class="form-group">
        <label class="form-label">${t('ing_group')}</label>
        <select class="form-select" id="ingGroup">
          ${groups.map(g => `<option value="${g}" ${ing?.group === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
      </div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);padding:16px;margin-bottom:16px">
        <div style="font-weight:600;margin-bottom:12px;color:var(--primary)">${t('ing_buy_section')}</div>
        <div class="form-row">
          <div class="form-group mb-0">
            <label class="form-label">${t('ing_buy_qty')} <span>*</span></label>
            <input class="form-input" id="ingBuyQty" type="number" step="0.001" min="0"
              value="${ing?.buyQty || 1}" placeholder="1" oninput="updateIngPreview()" />
          </div>
          <div class="form-group mb-0">
            <label class="form-label">${t('ing_unit')} (ซื้อ)</label>
            <select class="form-select" id="ingBuyUnit" onchange="window.handleBuyUnitChange()">
              ${unitOpts(BUY_UNITS, ing?.buyUnit || 'กก.')}
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:12px;margin-bottom:0">
          <label class="form-label">${t('ing_buy_price')} <span>*</span></label>
          <input class="form-input" id="ingBuyPrice" type="number" step="0.01" min="0"
            value="${ing?.buyPrice || ''}" placeholder="เช่น 600" oninput="updateIngPreview()" />
        </div>
      </div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);padding:16px;margin-bottom:16px">
        <div style="font-weight:600;margin-bottom:12px;color:var(--accent)">${t('ing_use_section')}</div>
        <div class="form-row">
          <div class="form-group mb-0">
            <label class="form-label">${t('ing_recipe_unit')}</label>
            <select class="form-select" id="ingRecipeUnit" onchange="updateIngPreview()">
              ${unitOpts(RECIPE_UNITS, ing?.recipeUnit || ing?.buyUnit || 'กก.')}
            </select>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">${t('ing_conversion')}</label>
            <input class="form-input" id="ingConvFactor" type="number" step="0.001" min="0.001"
              value="${ing?.convFactor || 1}" placeholder="1" oninput="updateIngPreview()" />
            <div class="form-hint">${t('ing_conversion_hint')}</div>
          </div>
        </div>
      </div>

      <!-- Sub-recipe button (only when editing) -->
      ${id ? `<div style="margin-bottom:16px">
        <button type="button" class="btn btn-sm" style="width:100%;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:white;border:none;padding:10px;border-radius:var(--r-md);font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px" onclick="Modal.close();setTimeout(()=>openSubRecipeModal(${id}),80)">
          🧪 <span>เปิด / แก้ไข สูตรย่อย</span>
        </button>
        <div class="form-hint" style="text-align:center">กดเพื่อกำหนดส่วนประกอบของวัตถุดิบผสม (Compound ingredient)</div>
      </div>` : ''}

      <!-- Auto-calculated price preview -->
      <div id="ingPricePreview" style="background:linear-gradient(135deg,var(--primary)22,var(--accent)22);border:1px solid var(--primary);border-radius:var(--r-md);padding:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:13px;color:var(--text-muted)">${t('ing_price_per_unit')}</div>
        <div style="font-size:20px;font-weight:800;color:var(--primary)" id="ingPriceVal">...</div>
      </div>

      <div class="form-group">
        <label class="form-label">${t('ing_custom_price')} — Override</label>
        <input class="form-input" id="ingCustom" type="number" step="0.01"
          value="${ing?.customPrice != null ? ing.customPrice : ''}" placeholder="เว้นว่างถ้าไม่ต้องการ" />
        <div class="form-hint">${t('ing_custom_hint')}</div>
      </div>`,
    onConfirm() {
      const name = document.getElementById('ingName').value.trim();
      if (!name) { Toast.show(t('ing_name_req'), 'error'); return; }
      const buyQty = parseFloat(document.getElementById('ingBuyQty').value) || 1;
      const buyPrice = parseFloat(document.getElementById('ingBuyPrice').value) || 0;
      const convFactor = parseFloat(document.getElementById('ingConvFactor').value) || 1;
      const customVal = document.getElementById('ingCustom').value;
      const customPrice = customVal !== '' ? parseFloat(customVal) : null;
      const data = {
        name,
        group: document.getElementById('ingGroup').value,
        buyUnit: document.getElementById('ingBuyUnit').value,
        buyQty, buyPrice,
        recipeUnit: document.getElementById('ingRecipeUnit').value,
        convFactor,
        customPrice,
        basePrice: 0,
        priceMode: customPrice !== null ? 'custom' : (id ? (DB.getById('ingredients', id)?.priceMode || 'manual') : 'manual'),
      };
      // Record price history when price changes
      const newPrice = customPrice !== null ? customPrice : (buyPrice > 0 && buyQty > 0 ? buyPrice / (buyQty * convFactor) : 0);
      if (id) {
        const oldPrice = DB.effectivePrice(DB.getById('ingredients', id));
        DB.update('ingredients', id, data);
        if (newPrice > 0 && Math.abs(newPrice - oldPrice) > 0.0001) {
          DB.recordPriceHistory(id, newPrice, 'Edit');
        }
      } else {
        const inserted = DB.insert('ingredients', { ...data, webhookPrice: null, lastUpdated: null });
        if (newPrice > 0) DB.recordPriceHistory(inserted.id, newPrice, 'New');
      }
      Modal.close(); Toast.show(id ? t('ing_updated') : t('ing_saved')); Router.render();
    }
  });

  // Auto-set conversion depending on buy unit
  window.handleBuyUnitChange = () => {
    const buyUnit = document.getElementById('ingBuyUnit')?.value;
    const rUnitEl = document.getElementById('ingRecipeUnit');
    const convEl = document.getElementById('ingConvFactor');
    if (buyUnit === 'กก.') {
      if (rUnitEl) rUnitEl.value = 'กรัม';
      if (convEl) convEl.value = 1000;
    } else if (buyUnit === 'ลิตร') {
      if (rUnitEl) rUnitEl.value = 'มล.';
      if (convEl) convEl.value = 1000;
    } else {
      if (rUnitEl) rUnitEl.value = buyUnit;
      if (convEl) convEl.value = 1;
    }
    window.updateIngPreview();
  };

  // Live preview calculation — must be defined BEFORE the setTimeout below
  window.updateIngPreview = () => {
    const bq = parseFloat(document.getElementById('ingBuyQty')?.value) || 1;
    const bp = parseFloat(document.getElementById('ingBuyPrice')?.value) || 0;
    const cf = parseFloat(document.getElementById('ingConvFactor')?.value) || 1;
    const rUnit = document.getElementById('ingRecipeUnit')?.value || '';
    const pricePerUnit = bp > 0 ? bp / (bq * cf) : 0;
    const el = document.getElementById('ingPriceVal');
    if (el) el.textContent = `${formatPrice(pricePerUnit)} / ${rUnit}`;
  };

  // Trigger initial price preview after modal DOM is ready
  setTimeout(window.updateIngPreview, 80);
};

window.deleteIngredient = function (id) {
  if (DB.getAll('recipes').some(r => r.ingredientId === id)) { Toast.show(t('ing_delete_warn'), 'warning'); return; }
  if (confirm(t('ing_delete_confirm'))) { DB.delete('ingredients', id); Toast.show(t('cat_deleted'), 'info'); Router.render(); }
};

window.duplicateIngredient = function (id) {
  const src = DB.getById('ingredients', id);
  if (!src) return;
  const copy = {
    ...src, name: src.name + ' (copy)', id: undefined, createdAt: undefined, updatedAt: undefined,
    priceMode: src.priceMode === 'sub_recipe' ? 'manual' : src.priceMode,
    webhookPrice: null, lastUpdated: null
  };
  DB.insert('ingredients', copy);
  Toast.show('คัดลอกวัตถุดิบ "' + src.name + '" แล้ว', 'success');
  Router.render();
};
