// ===================================================
// p_sub_recipe.js — Sub-Recipe modal (compound ingredients)
// ===================================================

window.openSubRecipeModal = function (ingredientId) {
    const ing = DB.getById('ingredients', ingredientId);
    if (!ing) return;

    const allIngs = DB.getAll('ingredients').filter(i => i.id !== ingredientId);
    let items = DB.getAll('subRecipes').filter(r => r.parentIngredientId === ingredientId);

    function calcTotals() {
        let total = 0;
        items.forEach(item => {
            const child = DB.getById('ingredients', item.ingredientId);
            if (child) total += DB.effectivePrice(child) * Number(item.quantity || 0);
        });
        return total;
    }

    function renderBody() {
        const total = calcTotals();
        const yield_ = parseFloat(document.getElementById('subYieldVal')?.value) || Number(ing.subYield) || 1;
        const yieldUnit = document.getElementById('subYieldUnit')?.value || ing.subYieldUnit || ing.recipeUnit || 'หน่วย';
        const perUnit = yield_ > 0 ? total / yield_ : 0;

        const tableEl = document.getElementById('subItemsTable');
        if (tableEl) {
            tableEl.innerHTML = items.length === 0
                ? `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">${t('sub_no_items')}</td></tr>`
                : items.map((item, idx) => {
                    const child = DB.getById('ingredients', item.ingredientId);
                    if (!child) return '';
                    const price = DB.effectivePrice(child);
                    const lineCost = price * Number(item.quantity || 0);
                    return `<tr>
            <td><strong>${child.name}</strong><br><small class="text-muted">${child.group || ''}</small></td>
            <td>${child.recipeUnit || child.buyUnit}</td>
            <td><input type="number" class="form-input" style="width:80px;padding:4px 8px;font-size:13px" value="${item.quantity}" step="0.001" min="0"
              onchange="updateSubQty(${idx}, this.value)" /></td>
            <td style="color:var(--primary);font-weight:600">${formatPrice(lineCost)}</td>
            <td><button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger)" onclick="removeSubItem(${idx})">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button></td>
          </tr>`;
                }).join('');
        }

        const summaryEl = document.getElementById('subSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `${t('sub_total_cost')}: <strong style="color:var(--primary);font-size:18px">${formatPrice(total)}</strong>
        &nbsp;|&nbsp; ${t('sub_cost_per_unit')}: <strong style="color:var(--success);font-size:18px">${formatPrice(perUnit)}</strong> / ${yieldUnit}`;
        }
    }

    // Window functions for inline handlers
    window.updateSubQty = (idx, val) => {
        const q = parseFloat(val);
        if (!isNaN(q) && q >= 0) items[idx].quantity = q;
        renderBody();
    };

    window.removeSubItem = (idx) => {
        items.splice(idx, 1);
        renderBody();
    };

    window.addSubComponent = () => {
        const selEl = document.getElementById('subAddSel');
        const qtyEl = document.getElementById('subAddQty');
        const ingId = parseInt(selEl.value);
        const qty = parseFloat(qtyEl.value);

        if (!ingId) return;
        if (ingId === ingredientId) { Toast.show(t('sub_self'), 'error'); return; }
        if (items.some(it => it.ingredientId === ingId)) { Toast.show(t('sub_dup'), 'warning'); return; }
        if (!qty || qty <= 0) { Toast.show(t('rec_qty_req'), 'error'); return; }

        items.push({ parentIngredientId: ingredientId, ingredientId: ingId, quantity: qty });
        selEl.value = '';
        qtyEl.value = '';
        renderBody();
    };

    window.onSubYieldChange = () => renderBody();

    Modal.open({
        title: `🧪 ${t('sub_title').replace('{name}', ing.name)}`,
        body: `
      <div style="margin-bottom:16px">
        <label class="form-label">${t('sub_components')}</label>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden">
          <table style="width:100%">
            <thead><tr>
              <th>${t('rec_ingredient')}</th><th>${t('rec_unit')}</th><th>${t('rec_qty')}</th>
              <th>${t('rec_cost')}</th><th></th>
            </tr></thead>
            <tbody id="subItemsTable"></tbody>
          </table>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap">
        <div class="form-group flex-1" style="margin-bottom:0;min-width:140px">
          <label class="form-label">${t('sub_add_ing')}</label>
          <select class="form-select" id="subAddSel">
            <option value="">-- ${t('sub_add_ing')} --</option>
            ${allIngs.map(i => `<option value="${i.id}">${i.name} (${i.recipeUnit || i.buyUnit})</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="width:100px;margin-bottom:0">
          <label class="form-label">${t('rec_qty')}</label>
          <input class="form-input" id="subAddQty" type="number" placeholder="0.1" step="0.001" min="0" />
        </div>
        <button class="btn btn-primary btn-sm" style="margin-bottom:0;padding:8px 14px" onclick="addSubComponent()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;margin-bottom:12px">
        <div style="font-weight:600;margin-bottom:10px;color:var(--accent)">📦 ${t('sub_yield')}</div>
        <div style="display:flex;gap:12px;align-items:flex-end">
          <div class="form-group" style="margin-bottom:0;flex:1">
            <label class="form-label">${t('sub_yield')}</label>
            <input class="form-input" id="subYieldVal" type="number" step="0.01" min="0.01"
              value="${ing.subYield || 1}" placeholder="500" oninput="onSubYieldChange()" />
            <div class="form-hint">${t('sub_yield_hint')}</div>
          </div>
          <div class="form-group" style="margin-bottom:0;width:120px">
            <label class="form-label">${t('sub_yield_unit')}</label>
            <select class="form-select" id="subYieldUnit" onchange="onSubYieldChange()">
              ${RECIPE_UNITS.map(u => `<option value="${u}" ${(ing.subYieldUnit || ing.recipeUnit || 'กก.') === u ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div id="subSummary" style="background:linear-gradient(135deg,var(--primary)22,var(--accent)22);border:1px solid var(--primary);border-radius:var(--r-md);padding:14px;text-align:center;font-size:14px"></div>`,
        onConfirm() {
            const yield_ = parseFloat(document.getElementById('subYieldVal').value) || 1;
            const yieldUnit = document.getElementById('subYieldUnit').value;

            // Update ingredient
            DB.update('ingredients', ingredientId, {
                priceMode: 'sub_recipe',
                subYield: yield_,
                subYieldUnit: yieldUnit,
                recipeUnit: yieldUnit,
            });

            // Save sub-recipe items: delete old, insert new
            const oldItems = DB.getAll('subRecipes').filter(r => r.parentIngredientId === ingredientId);
            oldItems.forEach(item => DB.delete('subRecipes', item.id));
            items.forEach(item => {
                DB.insert('subRecipes', {
                    parentIngredientId: ingredientId,
                    ingredientId: item.ingredientId,
                    quantity: item.quantity
                });
            });

            Modal.close();
            Toast.show(t('sub_saved'));
            Router.render();
        }
    });

    // Initial render after modal opens
    setTimeout(renderBody, 50);
};
