// ===================================================
// p_ingredients.js — Ingredients page (with bulk purchase + i18n)
// ===================================================

// Standard unit lists
const RECIPE_UNITS = ['กก.', 'กรัม', 'ลิตร', 'มล.', 'กำ', 'ช้อนโต๊ะ', 'ช้อนชา', 'ชิ้น', 'ขวด', 'กล่อง', 'แพ็ค', 'ถุง'];
const BUY_UNITS = ['กก.', 'กรัม', 'ลิตร', 'มล.', 'กำ', 'ขวด', 'กล่อง', 'แพ็ค', 'ถุง', 'ชิ้น', 'โหล'];

function renderIngredients(container) {
  let filterGroup = 'ทั้งหมด', search = '';
  const GROUPS_LIST = ['ทั้งหมด', 'เนื้อสัตว์', 'ผัก/สมุนไพร', 'เครื่องปรุง', 'ของแห้ง', 'อื่นๆ'];
  let selectedIds = new Set();

  function badge(ing) {
    if (ing.priceMode === 'sub_recipe') return `<span class="badge" style="background:#7c3aed22;color:#7c3aed">🧪 Sub-Recipe</span>`;
    if (ing.priceMode === 'webhook') return `<span class="badge badge-webhook">🔗 Webhook</span>`;
    if (ing.priceMode === 'custom') return `<span class="badge badge-custom">🎯 Custom</span>`;
    return `<span class="badge badge-manual">✏️ Manual</span>`;
  }

  function draw() {
    let ings = DB.getAll('ingredients');
    if (filterGroup !== 'ทั้งหมด') ings = ings.filter(i => i.group === filterGroup);
    if (search) ings = ings.filter(i => i.name.includes(search) || (i.group || '').includes(search));

    document.getElementById('ingTableBody').innerHTML = ings.map(ing => {
      const price = DB.effectivePrice(ing);
      const buyInfo = ing.priceMode === 'sub_recipe'
        ? `<small style="color:#7c3aed;font-size:11px">🧪 ${t('sub_recipe')} → ${formatPrice(price)}/${ing.subYieldUnit || ing.recipeUnit || ing.buyUnit}</small>`
        : (ing.buyQty && ing.buyPrice)
          ? `<small style="color:var(--text-faint);font-size:11px">ซื้อ ${ing.buyQty}${ing.buyUnit} ฿${ing.buyPrice} → ฿${price.toFixed(4)}/${ing.recipeUnit || ing.buyUnit}</small>`
          : '';
      return `<tr class="${selectedIds.has(ing.id) ? 'selected-row' : ''}">
        <td style="width:40px;text-align:center">
          <input type="checkbox" class="ing-select-cb" value="${ing.id}" ${selectedIds.has(ing.id) ? 'checked' : ''} onchange="toggleSelectIng(${ing.id})" style="accent-color:var(--primary);cursor:pointer;width:16px;height:16px" />
        </td>
        <td>
          <strong>${ing.name}</strong>
          ${buyInfo}
        </td>
        <td><span class="text-muted" style="font-size:12px">${ing.group || '-'}</span></td>
        <td>${ing.recipeUnit || ing.buyUnit || '-'}</td>
        <td>${badge(ing)}</td>
        <td>
          <span style="font-weight:700;color:var(--primary)">${formatPrice(price)}</span>
          <span style="font-size:11px;color:var(--text-faint)">/${ing.recipeUnit || ing.buyUnit}</span>
        </td>
        <td>
          <div class="td-actions">
            <div class="price-mode-btns">
              <button class="price-mode-btn ${ing.priceMode === 'manual' ? 'active' : ''}" onclick="setPriceMode(${ing.id},'manual')">Manual</button>
              <button class="price-mode-btn ${ing.priceMode === 'custom' ? 'active' : ''}" onclick="setPriceMode(${ing.id},'custom')">Custom</button>
              <button class="price-mode-btn ${ing.priceMode === 'webhook' ? 'active' : ''}" onclick="setPriceMode(${ing.id},'webhook')">Webhook</button>
              <button class="price-mode-btn ${ing.priceMode === 'sub_recipe' ? 'active' : ''}" style="${ing.priceMode === 'sub_recipe' ? 'background:#7c3aed;color:white;border-color:#7c3aed' : ''}" onclick="setPriceMode(${ing.id},'sub_recipe')">🧪</button>
            </div>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="duplicateIngredient(${ing.id})" title="คัดลอก" style="color:var(--accent)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="openIngredientModal(${ing.id})" title="${t('btn_edit')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger)" onclick="deleteIngredient(${ing.id})" title="${t('btn_delete')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🧂</div><div class="empty-title">${t('ing_empty')}</div></div></td></tr>`;

    // Update toolbar 
    const isAllSelected = ings.length > 0 && selectedIds.size === ings.length;
    document.getElementById('selectAllCb').checked = isAllSelected;

    const bulkBtn = document.getElementById('bulkDeleteBtn');
    if (selectedIds.size > 0) {
      bulkBtn.style.display = 'inline-flex';
      bulkBtn.innerHTML = `<span>${t('btn_delete_selected')} (${selectedIds.size})</span>`;
    } else {
      bulkBtn.style.display = 'none';
    }
  }

  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">🧂 ${t('ing_title')}</div><div class="page-subtitle">${t('ing_sub')}</div></div>
      <button class="btn btn-primary" onclick="openIngredientModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ${t('ing_add')}
      </button>
    </div>
    <div class="filter-tabs">
      ${GROUPS_LIST.map(g => `<button class="filter-tab${g === 'ทั้งหมด' ? ' active' : ''}" onclick="ingFilterGroup('${g}',this)">${g}</button>`).join('')}
    </div>
    <div class="table-wrap">
      <div class="table-toolbar">
        <div class="search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="search-input" id="ingSearch" placeholder="${t('ing_search')}" oninput="ingSearch(this.value)" />
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <button id="bulkDeleteBtn" class="btn btn-sm" style="display:none;background:var(--danger);color:white;border:none" onclick="deleteSelectedIngredients()"></button>
          <div style="font-size:12px;color:var(--text-muted)">${t('ing_mode_info')}</div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th style="width:40px;text-align:center"><input type="checkbox" id="selectAllCb" onchange="toggleSelectAll(this.checked)" style="accent-color:var(--primary);cursor:pointer;width:16px;height:16px" /></th>
          <th>${t('ing_col_name')}</th><th>${t('ing_col_group')}</th><th>${t('ing_col_unit')}</th>
          <th>${t('ing_col_mode')}</th><th>${t('ing_col_price')}</th><th>${t('ing_col_actions')}</th>
        </tr></thead>
        <tbody id="ingTableBody"></tbody>
      </table>
    </div>`;

  window.ingFilterGroup = (g, btn) => {
    filterGroup = g;
    selectedIds.clear();
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); draw();
  };
  window.ingSearch = (v) => { search = v; draw(); };

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
  const groups = ['เนื้อสัตว์', 'ผัก/สมุนไพร', 'เครื่องปรุง', 'ของแห้ง', 'อื่นๆ'];

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
            <select class="form-select" id="ingBuyUnit" onchange="updateIngPreview()">
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
      if (id) DB.update('ingredients', id, data);
      else DB.insert('ingredients', { ...data, webhookPrice: null, lastUpdated: null });
      Modal.close(); Toast.show(id ? t('ing_updated') : t('ing_saved')); Router.render();
    }
  });

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
