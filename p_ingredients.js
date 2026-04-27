// ===================================================
// p_ingredients.js — Ingredients page (with bulk purchase + i18n)
// ===================================================

// Standard unit lists
const RECIPE_UNITS = ['กก.', 'กรัม', 'ลิตร', 'มล.', 'กำ', 'ช้อนโต๊ะ', 'ช้อนชา', 'ชิ้น', 'ขวด', 'กล่อง', 'แพ็ค', 'ถุง'];
const BUY_UNITS = ['กก.', 'กรัม', 'ลิตร', 'มล.', 'กำ', 'ขวด', 'กล่อง', 'แพ็ค', 'ถุง', 'ชิ้น', 'โหล'];

// --- Inline edit re-render suppression ---
let _ingInlineEditing = false;
let _ingRenderPending = false;

function renderIngredients(container) {
  let filterGroup = 'ทั้งหมด', search = '';
  // Load dynamic groups
  let customGroups = DB.getAll('ingGroups') || [];
  if (customGroups.length === 0) {
    customGroups = [
      { id: 'temp1', name: 'เนื้อสัตว์', bg: '#ef444422', color: '#ef4444', emoji: '🥩' },
      { id: 'temp2', name: 'ผัก/สมุนไพร', bg: '#22c55e22', color: '#22c55e', emoji: '🥬' },
      { id: 'temp3', name: 'เครื่องปรุง', bg: '#f59e0b22', color: '#f59e0b', emoji: '🧄' },
      { id: 'temp4', name: 'ของแห้ง', bg: '#8b5cf622', color: '#8b5cf6', emoji: '🌾' },
      { id: 'temp5', name: 'อื่นๆ', bg: '#64748b22', color: '#64748b', emoji: '📦' }
    ];
  }
  const GROUPS_LIST = [t('ing_group_all') || 'ทั้งหมด', ...customGroups.map(g => g.name)];

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
    // Suppress re-render if user is inline-editing
    if (_ingInlineEditing) { _ingRenderPending = true; return; }

    // Refresh groups in case they changed
    customGroups = DB.getAll('ingGroups') || [];
    if (customGroups.length === 0) {
      customGroups = [
        { id: 'temp1', name: 'เนื้อสัตว์', bg: '#ef444422', color: '#ef4444', emoji: '🥩' },
        { id: 'temp2', name: 'ผัก/สมุนไพร', bg: '#22c55e22', color: '#22c55e', emoji: '🥬' },
        { id: 'temp3', name: 'เครื่องปรุง', bg: '#f59e0b22', color: '#f59e0b', emoji: '🧄' },
        { id: 'temp4', name: 'ของแห้ง', bg: '#8b5cf622', color: '#8b5cf6', emoji: '🌾' },
        { id: 'temp5', name: 'อื่นๆ', bg: '#64748b22', color: '#64748b', emoji: '📦' }
      ];
    }
    // Rebuild color map
    customGroups.forEach(g => {
      GROUP_COLORS[g.name] = { bg: g.bg || (g.color + '22'), color: g.color || '#64748b', emoji: g.emoji || '📦' };
    });

    let ings = DB.getAll('ingredients');
    const allLabel = t('ing_group_all') || 'ทั้งหมด';
    if (filterGroup !== 'ทั้งหมด' && filterGroup !== allLabel) ings = ings.filter(i => i.group === filterGroup);
    if (search) ings = ings.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.group || '').toLowerCase().includes(search.toLowerCase()));

    // Update count
    const countEl = document.getElementById('ingCount');
    if (countEl) countEl.textContent = t('ing_items').replace('{n}', ings.length);

    const body = document.getElementById('ingCardBody');
    if (!body) return;

    if (!ings.length && !search && (filterGroup === 'ทั้งหมด' || filterGroup === allLabel)) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">${t('ing_empty_state_title')}</div>
          <div style="color:var(--text-muted);font-size:13px;max-width:300px;margin:8px auto;line-height:1.5;">
            ${t('ing_empty_state_desc')}
          </div>
        </div>`;
      return;
    }

    let html = `
      <div style="overflow-x:auto; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md);">
      <table style="width:100%; border-collapse:collapse; min-width:900px; font-size:14px; text-align:left;">
        <thead>
          <tr style="border-bottom:1px solid var(--border); background:var(--bg);">
            <th style="padding:12px; width:40px; text-align:center;">
              <input type="checkbox" id="selectAllCb" onchange="toggleSelectAll(this.checked)" style="accent-color:var(--primary);cursor:pointer;width:15px;height:15px" />
            </th>
            <th style="padding:12px 8px; width:23%;">${t('ing_tb_name')}</th>
            <th style="padding:12px 8px; width:11%;">${t('ing_tb_cat')}</th>
            <th style="padding:12px 8px; width:21%;">${t('ing_tb_qty')}</th>
            <th style="padding:12px 8px; width:11%;">${t('ing_tb_price')}</th>
            <th style="padding:12px 8px; width:13%;">${t('ing_tb_avg')}</th>
            <th style="padding:12px 8px; width:13%; color:var(--warning);">${t('ing_tb_price_wtax')} <span style="font-size:10px;opacity:0.7">(+${_settings.consumptionTax || 8}%)</span></th>
            <th style="padding:12px 8px; width:8%; text-align:center;">⋮</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (ings.length === 0) {
      html += `<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--text-faint);">${t('ing_empty')}</td></tr>`;
    }

    ings.forEach(ing => {
      const price = DB.effectivePrice(ing);
      const priceWithTax = DB.effectivePriceWithTax(ing);
      const ctaxRate = _settings.consumptionTax || 8;
      const isSelected = selectedIds.has(ing.id);
      const gc = GROUP_COLORS[ing.group] || { bg: '#33415522', color: '#64748b', emoji: '🧂' };
      
      const modeIndicator = ing.priceMode === 'webhook' ? '🟣' : ing.priceMode === 'sub_recipe' ? '🧪' : ing.priceMode === 'custom' ? '🎯' : '';
      const taxBadge = ing.includeConsumptionTax ? `<span style="font-size:9px;background:#f59e0b22;color:#d97706;border:1px solid #f59e0b44;border-radius:3px;padding:1px 4px;margin-left:4px;font-weight:700;" title="${t('ing_include_tax')}">税</span>` : '';

      // Escape name for safe HTML attribute
      const escapedName = (ing.name || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      
      html += `
        <tr data-ing-id="${ing.id}" style="border-bottom:1px solid var(--border-light); background:${isSelected ? 'rgba(14,165,233,0.05)' : 'transparent'}; transition:background 0.2s;">
          <td style="padding:12px; text-align:center;">
            <input type="checkbox" class="ing-select-cb" value="${ing.id}" ${isSelected ? 'checked' : ''} onchange="toggleSelectIng(${ing.id})" style="accent-color:var(--primary);cursor:pointer;width:15px;height:15px" />
          </td>
          <td style="padding:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px;">${gc.emoji}</span>
              <input type="text" class="inline-input" value="${escapedName}"
                onfocus="_ingInlineEditing=true"
                onblur="setTimeout(()=>{_ingInlineEditing=false;if(_ingRenderPending){_ingRenderPending=false;}},300)"
                onchange="inlineEditIng(${ing.id}, 'name', this.value)"
                style="width:100%; font-weight:600;"/>
              ${modeIndicator ? `<span style="font-size:12px;" title="${ing.priceMode}">${modeIndicator}</span>` : ''}
              ${taxBadge}
            </div>
            ${ing.note ? `<div style="font-size:11px;color:var(--text-faint);margin-top:2px;margin-left:24px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;" title="${ing.note.replace(/"/g, '&quot;')}">📝 ${ing.note}</div>` : ''}
          </td>
          <td style="padding:8px;">
            <select class="inline-select" onchange="inlineEditIng(${ing.id}, 'group', this.value)" style="color:${gc.color};">
              ${customGroups.map(g => `<option value="${g.name}" ${ing.group === g.name ? 'selected' : ''}>${g.name}</option>`).join('')}
              ${!customGroups.find(g=>g.name===ing.group) ? `<option value="${ing.group || 'อื่นๆ'}" selected>${ing.group || 'อื่นๆ'}</option>` : ''}
            </select>
          </td>
          <td style="padding:8px;">
            <div style="display:flex; align-items:center; gap:4px; max-width:200px;">
              <input type="number" class="inline-input" value="${ing.buyQty || 1}"
                onfocus="_ingInlineEditing=true"
                onblur="setTimeout(()=>{_ingInlineEditing=false;if(_ingRenderPending){_ingRenderPending=false;}},300)"
                onchange="inlineEditIng(${ing.id}, 'buyQty', this.value)"
                style="width:55px; text-align:right;" step="0.01" min="0.001"/>
              <select class="inline-select" onchange="inlineEditIng(${ing.id}, 'buyUnit', this.value)" style="width:70px;">
                ${BUY_UNITS.map(u => `<option value="${u}" ${ing.buyUnit === u ? 'selected' : ''}>${u}</option>`).join('')}
              </select>
              <span style="color:var(--text-faint);font-size:12px;">→</span>
              <select class="inline-select" onchange="inlineEditIng(${ing.id}, 'recipeUnit', this.value)" style="width:70px; color:var(--text-muted);">
                ${RECIPE_UNITS.map(u => `<option value="${u}" ${(ing.recipeUnit || ing.buyUnit) === u ? 'selected' : ''}>${u}</option>`).join('')}
              </select>
            </div>
            ${ing.convFactor && ing.convFactor !== 1 ? `<div style="font-size:10px;color:var(--primary);margin-top:2px;">×${ing.convFactor}</div>` : ''}
          </td>
          <td style="padding:8px;">
            <input type="number" class="inline-input" value="${ing.buyPrice || 0}"
              onfocus="_ingInlineEditing=true"
              onblur="setTimeout(()=>{_ingInlineEditing=false;if(_ingRenderPending){_ingRenderPending=false;}},300)"
              onchange="inlineEditIng(${ing.id}, 'buyPrice', this.value)"
              style="width:85px; text-align:right; font-weight:600;" step="0.01" min="0"/>
          </td>
          <td class="ing-avg-price" style="padding:12px 8px; font-weight:700; color:var(--primary);">
            ${formatPrice(price)}<span style="font-size:11px; color:var(--text-muted); font-weight:400;"> /${ing.recipeUnit || ing.buyUnit}</span>
          </td>
          <td class="ing-avg-price-wtax" style="padding:12px 8px; font-weight:700; color:${ing.includeConsumptionTax ? 'var(--warning)' : 'var(--text-faint)'};">
            ${formatPrice(price * (1 + ctaxRate / 100))}<span style="font-size:11px; color:var(--text-muted); font-weight:400;"> /${ing.recipeUnit || ing.buyUnit}</span>
            ${ing.includeConsumptionTax ? `<div style="font-size:10px;color:var(--warning);font-weight:600">✅ ${t('ing_include_tax')}</div>` : ''}
          </td>
          <td style="padding:12px 8px; text-align:center; position:relative;">
            <button class="btn btn-icon btn-ghost btn-sm" onclick="toggleIngMenu(event, ${ing.id})" style="color:var(--text-muted);">
              ⋮
            </button>
            <div id="ingMenu-${ing.id}" class="ing-context-menu" style="display:none;">
              <div class="menu-item" onclick="openIngredientModal(${ing.id})">${t('ing_adv_settings')}</div>
              ${ing.priceMode === 'sub_recipe' ? `<div class="menu-item" onclick="openSubRecipeModal(${ing.id})">${t('ing_edit_sub')}</div>` : `<div class="menu-item" onclick="setPriceMode(${ing.id}, 'sub_recipe')">${t('ing_convert_sub')}</div>`}
              <div class="menu-item" onclick="toggleIngTax(${ing.id})">${ing.includeConsumptionTax ? t('ing_tax_toggle_on') : t('ing_tax_toggle_off')}</div>
              <div class="menu-item" onclick="duplicateIngredient(${ing.id})">${t('ing_copy')}</div>
              <div class="menu-item" style="color:var(--danger);" onclick="deleteIngredient(${ing.id})">${t('ing_del')}</div>
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    body.innerHTML = html;

    const isAllSelected = ings.length > 0 && ings.every(i => selectedIds.has(i.id));
    const selectAllCb = document.getElementById('selectAllCb');
    if (selectAllCb) selectAllCb.checked = isAllSelected;

    const bulkBtn = document.getElementById('bulkDeleteBtn');
    if (bulkBtn) {
      if (selectedIds.size > 0) {
        bulkBtn.style.display = 'inline-flex';
        bulkBtn.innerHTML = `<span>${t('ing_del_selected')} (${selectedIds.size})</span>`;
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
      </div>
    </div>

    <!-- Smart Quick-Add Bar -->
    <div style="background:linear-gradient(135deg,rgba(14,165,233,0.1),rgba(14,165,233,0.02)); border:1px solid var(--primary); border-radius:var(--r-md); padding:12px; margin-bottom:16px;">
      <div style="font-size:12px; color:var(--primary); font-weight:600; margin-bottom:6px;">${t('ing_qa_title')}</div>
      <div style="display:flex; gap:8px;">
        <input type="text" id="quickAddInput" class="form-input" placeholder="${t('ing_qa_placeholder')}" style="flex:1; border-color:var(--primary);" onkeydown="if(event.key==='Enter') window.processQuickAdd(this.value)" />
        <button class="btn btn-primary" onclick="window.processQuickAdd(document.getElementById('quickAddInput').value)">Enter</button>
      </div>
      <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">${t('ing_qa_hint')}</div>
    </div>

    <!-- Category filter tabs -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div class="filter-tabs" style="margin-bottom:0; flex:1; overflow-x:auto;">
        ${GROUPS_LIST.map((g, i) => `<button class="filter-tab${g === filterGroup || (i===0 && filterGroup==='ทั้งหมด') ? ' active' : ''}" onclick="ingFilterGroup('${i===0 ? 'ทั้งหมด' : g}',this)">${g}</button>`).join('')}
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost btn-sm" style="white-space:nowrap; color:var(--text-muted);" onclick="openManageGroupsModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> 
          ${t('sys_manage_groups')}
        </button>
        <button class="btn btn-ghost btn-sm" style="white-space:nowrap; color:var(--primary);" onclick="openIngredientModal()">
          ${t('ing_adv_settings')}
        </button>
      </div>
    </div>

    <!-- Search -->
    <div style="margin-bottom:12px;">
      <div class="search-wrap" style="width:100%">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" id="ingSearch" placeholder="${t('ing_search')}" oninput="ingSearch(this.value)" />
      </div>
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

  // ========== INLINE EDIT — Edit ingredient fields directly in the table ==========
  window.inlineEditIng = (id, field, value) => {
    const ing = DB.getById('ingredients', id);
    if (!ing) return;

    // Suppress re-render while saving
    _ingInlineEditing = true;

    // Build update data
    const update = {};
    if (field === 'name') {
      if (!value.trim()) { _ingInlineEditing = false; return; }
      update.name = value.trim();
    } else if (field === 'group') {
      update.group = value;
    } else if (field === 'buyQty') {
      const q = parseFloat(value);
      if (isNaN(q) || q <= 0) { _ingInlineEditing = false; return; }
      update.buyQty = q;
    } else if (field === 'buyUnit') {
      update.buyUnit = value;
      // Auto-set recipe unit and conversion factor
      if (value === 'กก.' && ing.recipeUnit !== 'กก.') {
        update.recipeUnit = 'กรัม';
        update.convFactor = 1000;
      } else if (value === 'ลิตร' && ing.recipeUnit !== 'ลิตร') {
        update.recipeUnit = 'มล.';
        update.convFactor = 1000;
      }
    } else if (field === 'recipeUnit') {
      update.recipeUnit = value;
    } else if (field === 'buyPrice') {
      const p = parseFloat(value);
      if (isNaN(p) || p < 0) { _ingInlineEditing = false; return; }
      update.buyPrice = p;
    } else {
      update[field] = value;
    }

    // Calculate new effective price for history
    const merged = { ...ing, ...update };
    const newBuyPrice = Number(merged.buyPrice) || 0;
    const newBuyQty = Number(merged.buyQty) || 1;
    const newConvFactor = Number(merged.convFactor) || 1;
    const newPrice = newBuyPrice > 0 && newBuyQty > 0 ? newBuyPrice / (newBuyQty * newConvFactor) : 0;
    const oldPrice = DB.effectivePrice(ing);

    // Save to DB
    DB.update('ingredients', id, update);

    // Record price history if price changed significantly
    if (newPrice > 0 && Math.abs(newPrice - oldPrice) > 0.0001) {
      DB.recordPriceHistory(id, newPrice, 'Inline Edit');
    }

    // Update the avg price cells in-place (no full re-render)
    const updatedIng = DB.getById('ingredients', id);
    if (updatedIng) {
      const ctaxRate = _settings.consumptionTax || 8;
      const ep = DB.effectivePrice(updatedIng);
      const priceCell = document.querySelector(`tr[data-ing-id="${id}"] .ing-avg-price`);
      if (priceCell) {
        priceCell.innerHTML = `${formatPrice(ep)}<span style="font-size:11px; color:var(--text-muted); font-weight:400;"> /${updatedIng.recipeUnit || updatedIng.buyUnit}</span>`;
      }
      const priceTaxCell = document.querySelector(`tr[data-ing-id="${id}"] .ing-avg-price-wtax`);
      if (priceTaxCell) {
        priceTaxCell.innerHTML = `${formatPrice(ep * (1 + ctaxRate / 100))}<span style="font-size:11px; color:var(--text-muted); font-weight:400;"> /${updatedIng.recipeUnit || updatedIng.buyUnit}</span>${updatedIng.includeConsumptionTax ? `<div style="font-size:10px;color:var(--warning);font-weight:600">✅ ${t('ing_include_tax')}</div>` : ''}`;
      }
    }

    // Visual save feedback on the row
    const row = document.querySelector(`tr[data-ing-id="${id}"]`);
    if (row) {
      row.classList.add('inline-saved-flash');
      setTimeout(() => row.classList.remove('inline-saved-flash'), 800);
    }

    // Release re-render lock after a short delay
    setTimeout(() => {
      _ingInlineEditing = false;
      if (_ingRenderPending) {
        _ingRenderPending = false;
        draw();
      }
    }, 500);
  };

  // ========== CONTEXT MENU — Toggle the ⋮ dropdown menu ==========
  window.toggleIngMenu = (event, id) => {
    event.stopPropagation();
    // Close all other menus first
    document.querySelectorAll('.ing-context-menu').forEach(m => {
      if (m.id !== `ingMenu-${id}`) m.style.display = 'none';
    });
    const menu = document.getElementById(`ingMenu-${id}`);
    if (!menu) return;
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

    // Close menu when clicking outside
    const closeHandler = (e) => {
      if (!menu.contains(e.target) && e.target !== event.target) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeHandler);
      }
    };
    if (menu.style.display === 'block') {
      setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }
  };

  // ========== QUICK ADD — Parse text to create ingredient fast ==========
  window.processQuickAdd = (text) => {
    if (!text || !text.trim()) return;
    const input = text.trim();

    // Parse format: "name qty unit price" or just "name"
    // Examples: "หมูสับ 1 กก. 120" or "หมูสับ" or "กุ้งขาว 1กก. 200"
    let name = input, buyQty = 1, buyUnit = 'กก.', buyPrice = 0;
    let group = customGroups.length > 0 ? customGroups[customGroups.length - 1].name : 'อื่นๆ';

    // Try to extract price (last number in string)
    const priceMatch = input.match(/\s+(\d+\.?\d*)\s*$/);
    let remaining = input;
    if (priceMatch) {
      buyPrice = parseFloat(priceMatch[1]);
      remaining = input.substring(0, priceMatch.index).trim();
    }

    // Try to extract quantity and unit
    const qtyUnitMatch = remaining.match(/\s+(\d+\.?\d*)\s*(กก\.|กรัม|ลิตร|มล\.|กำ|ขวด|กล่อง|แพ็ค|ถุง|ชิ้น|โหล)/);
    if (qtyUnitMatch) {
      buyQty = parseFloat(qtyUnitMatch[1]);
      buyUnit = qtyUnitMatch[2];
      name = remaining.substring(0, qtyUnitMatch.index).trim();
    } else {
      // Try just a unit without space  e.g. "หมูสับ 1กก."
      const qtyUnitMatch2 = remaining.match(/\s+(\d+\.?\d*)(กก\.|กรัม|ลิตร|มล\.|กำ|ขวด|กล่อง|แพ็ค|ถุง|ชิ้น|โหล)/);
      if (qtyUnitMatch2) {
        buyQty = parseFloat(qtyUnitMatch2[1]);
        buyUnit = qtyUnitMatch2[2];
        name = remaining.substring(0, qtyUnitMatch2.index).trim();
      } else {
        name = remaining;
      }
    }

    if (!name) { Toast.show(t('ing_name_req') || 'กรุณาใส่ชื่อวัตถุดิบ', 'error'); return; }

    // Auto-detect group from name
    const groupMap = [
      { keys: ['หมู', 'ไก่', 'เนื้อ', 'วัว', 'กุ้ง', 'ปลา', 'หมึก', 'หอย', 'ปู', 'ทะเล', 'เป็ด', 'ปีก', 'สะโพก', 'สันคอ', 'สันนอก'], group: 'เนื้อสัตว์' },
      { keys: ['ผัก', 'ใบ', 'ต้น', 'หัว', 'สมุนไพร', 'กะเพรา', 'โหระพา', 'ตะไคร้', 'มะกรูด', 'ข่า', 'ขิง', 'พริก', 'มะนาว', 'มะเขือ', 'กะหล่ำ', 'แตง', 'ถั่ว', 'เห็ด'], group: 'ผัก/สมุนไพร' },
      { keys: ['น้ำปลา', 'ซีอิ๊ว', 'ซอส', 'น้ำตาล', 'เกลือ', 'พริกไทย', 'ผงชูรส', 'กะทิ', 'น้ำมัน', 'เครื่องปรุง'], group: 'เครื่องปรุง' },
      { keys: ['ข้าว', 'เส้น', 'แป้ง', 'วุ้น', 'พริกแกง', 'มาม่า', 'เกี๊ยว', 'ของแห้ง'], group: 'ของแห้ง' }
    ];
    for (const gm of groupMap) {
      if (gm.keys.some(k => name.includes(k))) {
        // Find the matching group in customGroups
        const matchedGroup = customGroups.find(g => g.name === gm.group);
        if (matchedGroup) { group = matchedGroup.name; break; }
      }
    }

    // Set default recipe unit and conversion
    let recipeUnit = buyUnit;
    let convFactor = 1;
    if (buyUnit === 'กก.') { recipeUnit = 'กรัม'; convFactor = 1000; }
    else if (buyUnit === 'ลิตร') { recipeUnit = 'มล.'; convFactor = 1000; }

    const data = {
      name, group, buyUnit, buyQty, buyPrice,
      recipeUnit, convFactor,
      basePrice: 0, priceMode: 'manual',
      customPrice: null, webhookPrice: null, lastUpdated: null
    };

    const inserted = DB.insert('ingredients', data);
    const effectiveP = buyPrice > 0 && buyQty > 0 ? buyPrice / (buyQty * convFactor) : 0;
    if (effectiveP > 0 && inserted) DB.recordPriceHistory(inserted.id, effectiveP, 'Quick Add');

    // Clear input
    const inp = document.getElementById('quickAddInput');
    if (inp) { inp.value = ''; inp.focus(); }

    Toast.show(`✅ เพิ่ม "${name}" สำเร็จ${buyPrice > 0 ? ` (${formatPrice(effectiveP)}/${recipeUnit})` : ''}`, 'success');
    draw();
  };


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
      title: t('sys_manage_groups_title'),
      body: `
        <div style="margin-bottom:16px; display:flex; gap:8px;">
          <input type="text" id="newGroupName" class="form-input" placeholder="${t('sys_manage_groups_new')}" style="flex:1;" oninput="autoSuggestGroupEmoji(this.value)" />
          <input type="text" id="newGroupEmoji" class="form-input" placeholder="${t('sys_manage_groups_emoji')}" style="width:100px; text-align:center;" />
          <input type="color" id="newGroupColor" class="form-input" value="#0ea5e9" style="width:40px; padding:2px; height:40px; cursor:pointer;" />
        </div>
        <button class="btn btn-primary" style="width:100%; margin-bottom:16px;" onclick="addIngGroup()">${t('sys_manage_groups_add')}</button>
        <div id="manageGroupsList" style="max-height:250px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--r-md); background:var(--bg);">
          ${renderGroupRows()}
        </div>
      `,
      footerHtml: `<button class="btn btn-secondary" onclick="Modal.close(); Router.render();">${t('sys_close')}</button>`,
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

// Toggle consumption tax inclusion per ingredient
window.toggleIngTax = function(id) {
  const ing = DB.getById('ingredients', id);
  if (!ing) return;
  const newVal = !ing.includeConsumptionTax;
  DB.update('ingredients', id, { includeConsumptionTax: newVal });
  const rate = _settings.consumptionTax || 8;
  Toast.show(newVal ? `✅ รวมภาษีการบริโภค ${rate}% ในต้นทุนแล้ว` : `⬜ ยกเว้นภาษีการบริโภคจากต้นทุนแล้ว`, newVal ? 'success' : 'info');
  Router.render();
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
            <div class="form-hint" id="totalYieldHint" style="color:var(--primary); font-weight:600; margin-top:6px;"></div>
            <div class="form-hint" style="margin-top:4px;">* นี่คืออัตราส่วนต่อ 1 หน่วยซื้อ (เช่น 1 กก. = 1000 กรัม เสมอ)</div>
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
      <div id="ingPricePreview" style="background:linear-gradient(135deg,var(--primary)22,var(--accent)22);border:1px solid var(--primary);border-radius:var(--r-md);padding:12px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-size:13px;color:var(--text-muted)">${t('ing_price_notax')}</div>
          <div style="font-size:20px;font-weight:800;color:var(--primary)" id="ingPriceVal">...</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid var(--border-light)">
          <div style="font-size:12px;color:var(--warning)">${t('ing_price_wtax')} (+${_settings.consumptionTax || 8}% 消費税)</div>
          <div style="font-size:16px;font-weight:700;color:var(--warning)" id="ingPriceValTax">...</div>
        </div>
      </div>

      <!-- Consumption Tax Toggle -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:${ing?.includeConsumptionTax ? '#f59e0b11' : 'var(--bg)'};border:1px solid ${ing?.includeConsumptionTax ? '#f59e0b66' : 'var(--border)'};border-radius:var(--r-md);margin-bottom:16px">
        <div>
          <div style="font-size:13px;font-weight:600">${t('ing_include_tax')}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">ใช้ราคารวมภาษีการบริโภคในการคำนวณต้นทุนเมนู</div>
        </div>
        <label class="toggle-switch" style="transform:scale(0.85);margin-right:-8px">
          <input type="checkbox" id="ingIncludeTax" ${ing?.includeConsumptionTax ? 'checked' : ''} onchange="window.updateIngPreview()">
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="form-group">
        <label class="form-label">รายละเอียด / Note (ตัวเลือก)</label>
        <textarea class="form-input" id="ingNote" rows="2" placeholder="เช่น ชื่อซัพพลายเออร์, เบอร์ติดต่อ, หรือหมายเหตุอื่นๆ">${ing?.note || ''}</textarea>
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
      const includeTaxEl = document.getElementById('ingIncludeTax');
      const noteEl = document.getElementById('ingNote');
      const data = {
        name,
        group: document.getElementById('ingGroup').value,
        buyUnit: document.getElementById('ingBuyUnit').value,
        buyQty, buyPrice,
        recipeUnit: document.getElementById('ingRecipeUnit').value,
        convFactor,
        customPrice,
        note: noteEl ? noteEl.value.trim() : '',
        basePrice: 0,
        priceMode: customPrice !== null ? 'custom' : (id ? (DB.getById('ingredients', id)?.priceMode || 'manual') : 'manual'),
        includeConsumptionTax: includeTaxEl ? includeTaxEl.checked : false,
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
    const ctaxRate = _settings.consumptionTax || 8;
    const includeTax = document.getElementById('ingIncludeTax')?.checked || false;
    const priceWithTax = pricePerUnit * (1 + ctaxRate / 100);

    // Update preview panel color based on tax toggle
    const preview = document.getElementById('ingPricePreview');
    if (preview) {
      preview.style.borderColor = includeTax ? '#f59e0b' : 'var(--primary)';
    }

    // Total Yield Calculation
    const totalYieldHint = document.getElementById('totalYieldHint');
    if (totalYieldHint) {
      if (cf > 1 || bq > 1) {
        totalYieldHint.innerHTML = `ปริมาณใช้ได้ทั้งหมด: <strong>${(bq * cf).toLocaleString()}</strong> ${rUnit}`;
      } else {
        totalYieldHint.innerHTML = '';
      }
    }

    const el = document.getElementById('ingPriceVal');
    if (el) el.textContent = `${formatPrice(pricePerUnit)} / ${rUnit}`;
    const elTax = document.getElementById('ingPriceValTax');
    if (elTax) elTax.textContent = `${formatPrice(priceWithTax)} / ${rUnit}`;
  };

  // Trigger initial price preview after modal DOM is ready
  setTimeout(() => {
    window.updateIngPreview();
    if (!id && _settings.tutorialMode) {
      setTimeout(() => {
        Tutorial.start([
          { target: '#ingName', title: '1. ชื่อวัตถุดิบ', text: 'ใส่ชื่อของวัตถุดิบ เช่น หมูสับ, กะหล่ำปลี', position: 'bottom' },
          { target: '#ingBuyQty', title: '2. ปริมาณที่ซื้อ', text: 'ใส่จำนวนที่ซื้อมาตามบิล เช่น ซื้อมา 1 กิโลกรัม ให้ใส่ 1', position: 'bottom' },
          { target: '#ingBuyUnit', title: '3. หน่วยที่ซื้อ', text: 'เลือกหน่วยตามบิล เช่น กก.', position: 'bottom' },
          { target: '#ingBuyPrice', title: '4. ราคาที่ซื้อมา', text: 'ใส่ราคาที่จ่ายไปทั้งหมดสำหรับวัตถุดิบก้อนนี้', position: 'bottom' },
          { target: '#ingRecipeUnit', title: '5. หน่วยที่ใช้ในสูตร', text: 'เลือกหน่วยที่จะตอนทำสูตรอาหาร เช่น กรัม', position: 'top' },
          { target: '#ingConvFactor', title: '6. สัดส่วนแปลงหน่วย', text: 'ระบบจะช่วยแปลงให้ เช่น 1 กก. = 1000 กรัม', position: 'top' },
          { target: '#ingPricePreview', title: '7. สรุปต้นทุนจริง', text: 'นี่คือต้นทุนต่อ 1 หน่วยทำสูตร ที่ระบบคำนวณให้คุณอัตโนมัติ!', position: 'top' }
        ]);
      }, 300);
    }
  }, 80);
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
