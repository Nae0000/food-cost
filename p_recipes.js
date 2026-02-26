// ===================================================
// p_recipes.js — Recipe builder (i18n + formatPrice)
// ===================================================

let _recipeMenuId = null;
window.setRecipeMenu = function (id) {
  const sel = document.getElementById('recipeMenuSel');
  if (sel) { sel.value = id; sel.dispatchEvent(new Event('change')); }
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
    const gp = menu?.sellingPrice ? (((menu.sellingPrice - cost) / menu.sellingPrice) * 100).toFixed(1) : null;
    document.getElementById('recipeSummary').innerHTML = `
      <div class="cost-summary">
        <div>
          <div class="cost-summary-label">${t('rec_total_cost')}</div>
          <div class="cost-summary-value">${formatPrice(cost)}</div>
          ${gp ? `<div class="cost-summary-margin">${t('rec_selling')} ${formatPrice(menu.sellingPrice)} &nbsp;|&nbsp; ${t('gp_label')} ${gp}%</div>` : ''}
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
                <td><strong>${ing.name}</strong><br><small class="text-muted">${ing.group || ''}</small></td>
                <td>${ing.recipeUnit || ing.buyUnit}</td>
                <td style="font-weight:600">${r.quantity}</td>
                <td>${formatPrice(price)}</td>
                <td>
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
        <div class="recipe-add-row">
          <div class="form-group flex-1">
            <label class="form-label">${t('rec_add_ing')}</label>
            <select class="form-select" id="addIngSel">
              <option value="">-- ${t('rec_add_ing')} --</option>
              ${ings.map(i => `<option value="${i.id}">${i.name} (${i.recipeUnit || i.buyUnit})</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="width:130px">
            <label class="form-label">${t('rec_qty')}</label>
            <input class="form-input" id="addIngQty" type="number" placeholder="0.1" step="0.001" min="0" />
          </div>
          <button class="btn btn-primary" style="align-self:flex-end;margin-bottom:0" onclick="addRecipeItem()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${t('rec_add_btn')}
          </button>
        </div>
      </div>`;
  }

  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">📋 ${t('rec_title')}</div><div class="page-subtitle">${t('rec_sub')}</div></div>
    </div>
    <div class="recipe-header">
      <div class="recipe-select-wrap">
        <label class="form-label">${t('rec_select_menu')}</label>
        <select class="form-select" id="recipeMenuSel" onchange="changeRecipeMenu(this.value)">
          <option value="">${t('rec_menu_placeholder')}</option>
          ${menus.map(m => { const cat = cats.find(c => c.id === m.categoryId); return `<option value="${m.id}" ${_recipeMenuId === m.id ? 'selected' : ''}>${cat ? cat.icon : ''} ${m.name}</option>`; }).join('')}
        </select>
      </div>
    </div>
    <div id="recipeSummary"></div>
    <div id="recipeRows"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">${t('rec_select_first')}</div></div></div>`;

  window.changeRecipeMenu = (v) => { _recipeMenuId = v ? parseInt(v) : null; drawRows(); };
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
  const sid = _recipeMenuId; Router.render(); setTimeout(() => setRecipeMenu(sid), 60);
};
window.editRecipeQty = function (id, name, qty) {
  const val = prompt(`${t('rec_edit_qty')} "${name}":`, qty);
  if (val !== null && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
    DB.update('recipes', id, { quantity: parseFloat(val) }); Toast.show(t('rec_qty_updated'));
    const sid = _recipeMenuId; Router.render(); setTimeout(() => setRecipeMenu(sid), 60);
  }
};
window.deleteRecipe = function (id) {
  DB.delete('recipes', id); Toast.show(t('rec_deleted'), 'info');
  const sid = _recipeMenuId; Router.render(); setTimeout(() => setRecipeMenu(sid), 60);
};
