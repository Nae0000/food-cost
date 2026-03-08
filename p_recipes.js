// ===================================================
// p_recipes.js — Recipe builder (i18n + formatPrice)
// ===================================================

let _recipeMenuId = null;
let _drawRowsFn = null; // reference kept for partial updates
window.setRecipeMenu = function (id) {
  _recipeMenuId = id;
  Router.render();
};

function renderRecipes(container) {
  const menus = DB.getAll('menus'), cats = DB.getAll('categories'), ings = DB.getAll('ingredients');

  function drawRows() {
    if (!_recipeMenuId) {
      document.getElementById('recipeSummary').innerHTML = '';
      document.getElementById('recipeRows').innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">${t('rec_select_first')}</div></div>`;
      return;
    }
    const recipes = DB.getAll('recipes').filter(r => r.menuId === _recipeMenuId);
    const menu = DB.getById('menus', _recipeMenuId);
    const cost = DB.menuCost(_recipeMenuId);
    const gp = menu?.sellingPrice ? (_settings.calcMethod === 'markup' ? (menu.sellingPrice > 0 ? ((cost / menu.sellingPrice) * 100).toFixed(1) : 0) : (((menu.sellingPrice - cost) / menu.sellingPrice) * 100).toFixed(1)) : null;
    const gpLabel = _settings.calcMethod === 'markup' ? 'Cost' : 'Margin';
    document.getElementById('recipeSummary').innerHTML = `
      <div class="cost-summary">
        <div>
          <div class="cost-summary-label">${t('rec_total_cost')}</div>
          <div class="cost-summary-value">${formatPrice(cost)}</div>
          ${gp ? `<div class="cost-summary-margin">${t('rec_selling')} ${formatPrice(menu.sellingPrice)} &nbsp;|&nbsp; ${gpLabel} ${gp}%</div>` : ''}
        </div>
        <span style="font-size:56px;opacity:0.25">🍳</span>
      </div>`;
    document.getElementById('recipeRows').innerHTML = `
      <div class="recipe-table-wrap">
        <table>
          <thead><tr>
            <th>${t('rec_ingredient')}</th><th>${t('rec_unit')}</th><th>${t('rec_qty')}</th>
            <th>${t('rec_price_unit')}</th><th>${t('rec_cost')}</th><th></th>
          </tr></thead>
          <tbody>
            ${recipes.map(r => {
      const ing = DB.getById('ingredients', r.ingredientId);
      if (!ing) return '';
      const price = DB.effectivePrice(ing);
      const line = price * r.quantity;
      const pct = cost > 0 ? ((line / cost) * 100).toFixed(1) : 0;
      return `<tr>
                <td data-label="${t('rec_ingredient')}"><strong>${ing.name}</strong><br><small class="text-muted">${ing.group || ''}</small></td>
                <td data-label="${t('rec_unit')}">${ing.recipeUnit || ing.buyUnit}</td>
                <td data-label="${t('rec_qty')}" style="font-weight:600">${r.quantity}</td>
                <td data-label="${t('rec_price_unit')}">${formatPrice(price)}</td>
                <td data-label="${t('rec_cost')}">
                  <strong class="text-primary">${formatPrice(line)}</strong>
                  <div style="font-size:11px;color:var(--text-faint)">${pct}% ${t('rec_pct_cost')}</div>
                </td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="editRecipeQty(${r.id},'${ing.name}',${r.quantity})">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger)" onclick="deleteRecipe(${r.id})">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
                  </div>
                </td>
              </tr>`;
    }).join('') || `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">${t('rec_no_items')}</td></tr>`}
          </tbody>
        </table>
        <div class="recipe-add-row" style="position:relative;">
          <div class="form-group flex-1">
            <label class="form-label">${t('rec_add_ing')}</label>
            <div class="searchable-select-container" id="ingSearchContainer" style="position:relative;">
              <input type="text" class="form-input" id="addIngSearch" placeholder="-- ค้นหาวัตถุดิบ --" autocomplete="off" onfocus="showIngDropdown()" oninput="filterIngDropdown(); showIngDropdown();" style="width:100%;" />
              <input type="hidden" id="addIngSel" value="" />
              <div id="ingDropdown" class="searchable-dropdown" style="display:none; background:var(--bg); border:1px solid var(--border); border-radius:var(--r-md); max-height:220px; overflow-y:auto; z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,0.6);">
                ${ings.map(i => `<div class="dropdown-item" data-id="${i.id}" data-name="${i.name.toLowerCase()}" onclick="selectIng(${i.id}, '${i.name.replace(/'/g, "\\'")}')" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-light); font-size:14px;">
                  <div style="font-weight:600;">${i.name}</div>
                  <div style="font-size:11px; color:var(--text-muted);">${i.group || ''} (${i.recipeUnit || i.buyUnit})</div>
                </div>`).join('')}
              </div>
            </div>
          </div>
          <div class="form-group" style="width:130px">
            <label class="form-label">${t('rec_qty')}</label>
            <input class="form-input" id="addIngQty" type="number" placeholder="0.1" step="0.001" min="0" />
          </div>
          <button class="btn btn-primary" style="align-self:flex-end; margin-bottom:0" onclick="addRecipeItem()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${t('rec_add_btn')}
          </button>
        </div>
      </div>`;

    // Close dropdowns on click outside or page scroll
    setTimeout(() => {
      document.addEventListener('click', function closeIngDropdown(e) {
        const container = document.getElementById('ingSearchContainer');
        const dropdown = document.getElementById('ingDropdown');
        if (container && dropdown && !container.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
      // Close on scroll so it doesn't block scrolling
      document.getElementById('pageContainer')?.addEventListener('scroll', function () {
        const d1 = document.getElementById('ingDropdown');
        const d2 = document.getElementById('menuDropdown');
        if (d1) d1.style.display = 'none';
        if (d2) d2.style.display = 'none';
      }, { passive: true });
      window.addEventListener('scroll', function () {
        const d1 = document.getElementById('ingDropdown');
        const d2 = document.getElementById('menuDropdown');
        if (d1) d1.style.display = 'none';
        if (d2) d2.style.display = 'none';
      }, { passive: true });
    }, 100);
  }

  window.showIngDropdown = function () {
    const input = document.getElementById('addIngSearch');
    const dropdown = document.getElementById('ingDropdown');
    if (!input || !dropdown) return;
    const rect = input.getBoundingClientRect();
    dropdown.style.display = 'block';
    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';
    filterIngDropdown();
  };

  window.filterIngDropdown = function () {
    const term = document.getElementById('addIngSearch').value.toLowerCase();
    const items = document.querySelectorAll('#ingDropdown .dropdown-item');
    let hasVisible = false;
    items.forEach(el => {
      if (el.dataset.name.includes(term)) {
        el.style.display = 'block';
        hasVisible = true;
      } else {
        el.style.display = 'none';
      }
    });
  };

  window.selectIng = function (id, name) {
    document.getElementById('addIngSel').value = id;
    document.getElementById('addIngSearch').value = name;
    document.getElementById('ingDropdown').style.display = 'none';
    document.getElementById('addIngQty').focus(); // auto-focus qty for speed
  };

  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">📋 ${t('rec_title')}</div><div class="page-subtitle">${t('rec_sub')}</div></div>
    </div>
    <div class="recipe-header">
      <div class="recipe-select-wrap">
        <label class="form-label">${t('rec_select_menu')}</label>
        
        <div class="searchable-select-container" id="menuSearchContainer" style="position:relative;">
          <input type="text" class="form-input" id="recipeMenuSearch" placeholder="-- ค้นหาเมนูอาหาร --" autocomplete="off" onfocus="showMenuDropdown()" oninput="filterMenuDropdown()" style="width:100%; max-width:400px;" value="${_recipeMenuId ? (menus.find(m => m.id === _recipeMenuId)?.name || '') : ''}" />
          <input type="hidden" id="recipeMenuSel" value="${_recipeMenuId || ''}" />
          
          <div id="menuDropdown" class="searchable-dropdown" style="display:none; background:var(--bg); border:1px solid var(--border); border-radius:var(--r-md); max-height:300px; overflow-y:auto; z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,0.6);">
            <div class="dropdown-item" data-id="" data-name="" onclick="selectMenu('', '-- เลือกลบเสร็จสิ้น --')" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-light); font-size:14px; font-style:italic; color:var(--text-muted)">
              -- กลับหน้าเริ่มต้น --
            </div>
            ${menus.map(m => {
    const cat = cats.find(c => c.id === m.categoryId);
    return `<div class="dropdown-item" data-id="${m.id}" data-name="${m.name.toLowerCase()}" onclick="selectMenu(${m.id}, '${m.name.replace(/'/g, "\\'")}')" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-light); font-size:14px;">
                  <div style="font-weight:600;">${cat ? cat.icon : ''} ${m.name}</div>
               </div>`;
  }).join('')}
          </div>
        </div>

      </div>
    </div>
    <div id="recipeSummary"></div>
    <div id="recipeRows"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">${t('rec_select_first')}</div></div></div>`;

  // Global click listener to close menu dropdown
  setTimeout(() => {
    document.addEventListener('click', function closeMenuDropdown(e) {
      const container = document.getElementById('menuSearchContainer');
      const dropdown = document.getElementById('menuDropdown');
      if (container && dropdown && !container.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }, 100);

  window.showMenuDropdown = function () {
    const input = document.getElementById('recipeMenuSearch');
    const dropdown = document.getElementById('menuDropdown');
    if (!input || !dropdown) return;
    const rect = input.getBoundingClientRect();
    dropdown.style.display = 'block';
    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';
    filterMenuDropdown();
  };

  window.filterMenuDropdown = function () {
    const term = document.getElementById('recipeMenuSearch').value.toLowerCase();
    const items = document.querySelectorAll('#menuDropdown .dropdown-item');
    items.forEach(el => {
      // The "clear" option always shows unless searching specifically
      if (!el.dataset.id && term === '') {
        el.style.display = 'block';
      } else if (el.dataset.name.includes(term) || (!el.dataset.id && term === '')) {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
  };

  window.selectMenu = function (id, name) {
    document.getElementById('recipeMenuSel').value = id;
    if (id) {
      document.getElementById('recipeMenuSearch').value = name;
    } else {
      document.getElementById('recipeMenuSearch').value = '';
    }
    document.getElementById('menuDropdown').style.display = 'none';
    changeRecipeMenu(id); // trigger the actual change logic
  };

  window.changeRecipeMenu = (v) => { _recipeMenuId = v ? parseInt(v) : null; drawRows(); };
  _drawRowsFn = drawRows; // expose for use in global action handlers
  if (_recipeMenuId) drawRows();
}

window.addRecipeItem = function () {
  const ingId = parseInt(document.getElementById('addIngSel').value);
  const qty = parseFloat(document.getElementById('addIngQty').value);
  if (!ingId) { Toast.show(t('rec_ing_req'), 'error'); return; }
  if (!qty || qty <= 0) { Toast.show(t('rec_qty_req'), 'error'); return; }
  if (DB.getAll('recipes').some(r => r.menuId === _recipeMenuId && r.ingredientId === ingId)) { Toast.show(t('rec_duplicate'), 'warning'); return; }
  DB.insert('recipes', { menuId: _recipeMenuId, ingredientId: ingId, quantity: qty });
  Toast.show(t('rec_added'));

  // Clear inputs without re-rendering the full page (preserves scroll)
  document.getElementById('addIngSearch').value = '';
  document.getElementById('addIngSel').value = '';
  document.getElementById('addIngQty').value = '';

  if (_drawRowsFn) _drawRowsFn(); else { const sid = _recipeMenuId; Router.render(); setTimeout(() => setRecipeMenu(sid), 60); }
};
window.editRecipeQty = function (id, name, qty) {
  const val = prompt(`${t('rec_edit_qty')} "${name}":`, qty);
  if (val !== null && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
    DB.update('recipes', id, { quantity: parseFloat(val) }); Toast.show(t('rec_qty_updated'));
    if (_drawRowsFn) _drawRowsFn(); else { const sid = _recipeMenuId; Router.render(); setTimeout(() => setRecipeMenu(sid), 60); }
  }
};
window.deleteRecipe = function (id) {
  DB.delete('recipes', id); Toast.show(t('rec_deleted'), 'info');
  if (_drawRowsFn) _drawRowsFn(); else { const sid = _recipeMenuId; Router.render(); setTimeout(() => setRecipeMenu(sid), 60); }
};
