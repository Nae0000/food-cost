// ===================================================
// core.js — Toast, Modal, Router, Dashboard, Categories (i18n + currency)
// ===================================================

const Toast = {
  show(msg, type = 'success', duration = 3000) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type] || '📢'}</span><span>${msg}</span>`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => { el.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => el.remove(), 300); }, duration);
  }
};

const Modal = {
  open({ title, body, footerHtml, onConfirm }) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modalFooter').innerHTML = footerHtml || `
      <button class="btn btn-secondary" onclick="Modal.close()">${t('btn_cancel')}</button>
      <button class="btn btn-primary" id="modalConfirmBtn">${t('btn_save')}</button>`;
    document.getElementById('modalBackdrop').classList.add('show');
    document.getElementById('globalModal').classList.add('show');
    const cb = document.getElementById('modalConfirmBtn');
    if (cb && onConfirm) cb.onclick = onConfirm;
  },
  close() {
    document.getElementById('modalBackdrop').classList.remove('show');
    document.getElementById('globalModal').classList.remove('show');
  }
};
document.getElementById('modalClose').addEventListener('click', () => Modal.close());
document.getElementById('modalBackdrop').addEventListener('click', () => Modal.close());

const Router = {
  routes: {},
  register(page, fn) { this.routes[page] = fn; },
  navigate(page) { window.location.hash = page; },
  init() { window.addEventListener('hashchange', () => this.render()); this.render(); },
  render() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === hash));
    const c = document.getElementById('pageContainer');
    c.innerHTML = '';
    const fn = this.routes[hash];
    if (fn) fn(c); else c.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">${t('page_not_found')}</div></div>`;
  }
};

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('mainContent').classList.toggle('expanded');
});
document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (confirm(t('btn_reset_confirm'))) { DB.reset(); SEED.run(); Toast.show(t('btn_reset_ok')); Router.render(); }
});

// ===================================================
// DASHBOARD (with i18n + formatPrice)
// ===================================================
function renderDashboard(container) {
  const cats = DB.getAll('categories'), ings = DB.getAll('ingredients');
  const menus = DB.getAll('menus'), recipes = DB.getAll('recipes');
  const menusWithCost = menus.map(m => ({ ...m, cost: DB.menuCost(m.id) })).sort((a, b) => b.cost - a.cost);
  const maxCost = menusWithCost[0]?.cost || 1;
  const webhookIngs = ings.filter(i => i.priceMode === 'webhook').length;
  const customIngs = ings.filter(i => i.priceMode === 'custom').length;
  const colors = ['#f97316', '#0ea5e9', '#22c55e', '#8b5cf6'];
  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">📊 ${t('dash_title')}</div><div class="page-subtitle">Food Cost Dashboard</div></div>
    </div>
    <div class="grid-4 dashboard-stats">
      ${[{ l: t('dash_categories'), v: cats.length, i: '🏷️', c: colors[0] }, { l: t('dash_ingredients'), v: ings.length, i: '🧂', c: colors[1] },
    { l: t('dash_menus'), v: menus.length, i: '🍜', c: colors[2] }, { l: t('dash_recipes'), v: recipes.length, i: '📋', c: colors[3] }]
      .map(s => `<div class="stat-card" style="--accent-color:${s.c}">
          <span class="stat-icon">${s.i}</span><div class="stat-value" style="color:${s.c}">${s.v}</div>
          <div class="stat-label">${s.l}</div></div>`).join('')}
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">🔥 ${t('dash_top_menus')}</div></div>
        <div class="top-menus-list">
          ${menusWithCost.slice(0, 5).map((m, i) => {
        const cat = cats.find(c => c.id === m.categoryId);
        const pct = ((m.cost / maxCost) * 100).toFixed(1);
        const rc = ['#f97316', '#f59e0b', '#22c55e', '#0ea5e9', '#8b5cf6'][i];
        return `<div class="top-menu-item">
              <div class="top-menu-rank" style="background:${rc}22;color:${rc}">${i + 1}</div>
              <div class="top-menu-bar-wrap">
                <div class="top-menu-name">${m.name} ${cat ? `<span class="badge badge-cat" style="background:${cat.color}22;color:${cat.color}">${cat.icon} ${cat.name}</span>` : ''}</div>
                <div class="top-menu-bar"><div class="top-menu-bar-fill" style="width:${pct}%"></div></div>
              </div>
              <div class="top-menu-cost">${formatPrice(m.cost)}</div>
            </div>`;
      }).join('')}
          ${menusWithCost.length === 0 ? `<div class="empty-state" style="padding:2rem"><div class="empty-icon" style="font-size:40px">🍽️</div><div class="empty-title">${t('menu_empty')}</div></div>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">💰 ${t('dash_latest_prices')}</div></div>
        <table style="width:100%">
          <thead><tr><th>${t('ing_col_name')}</th><th>${t('ing_unit')}</th><th>${t('ing_col_mode')}</th><th>${t('ing_col_price')}</th></tr></thead>
          <tbody>
            ${ings.slice(0, 8).map(i => {
        const px = DB.effectivePrice(i);
        const bc = i.priceMode === 'webhook' ? 'badge-webhook' : i.priceMode === 'custom' ? 'badge-custom' : 'badge-manual';
        return `<tr><td><strong>${i.name}</strong><br><small class="text-muted">${i.group}</small></td>
                <td class="text-muted">${i.recipeUnit || i.buyUnit}</td>
                <td><span class="badge ${bc}">${i.priceMode}</span></td>
                <td class="fw-bold text-primary">${formatPrice(px)}</td></tr>`;
      }).join('')}
          </tbody>
        </table>
        ${ings.length > 8 ? `<div style="text-align:center;padding:1rem"><a href="#ingredients" class="btn btn-ghost btn-sm" onclick="Router.navigate('ingredients')">${t('dash_view_all')} ${ings.length} →</a></div>` : ''}
      </div>
    </div>
    <div class="card mt-6">
      <div class="card-header"><div class="card-title">📈 ${t('dash_price_stats')}</div></div>
      <div class="grid-3" style="gap:1rem;margin-top:0.5rem">
        ${[{ l: t('dash_stat_manual'), v: ings.length - webhookIngs - customIngs, c: '#f59e0b', i: '✏️' },
    { l: t('dash_stat_custom'), v: customIngs, c: '#22c55e', i: '🎯' },
    { l: t('dash_stat_webhook'), v: webhookIngs, c: '#8b5cf6', i: '🔗' }]
      .map(s => `<div style="display:flex;align-items:center;gap:12px;padding:16px;background:var(--bg);border-radius:var(--r-md);border:1px solid var(--border)">
            <span style="font-size:24px">${s.i}</span>
            <div><div style="font-size:24px;font-weight:800;color:${s.c}">${s.v}</div>
            <div style="font-size:12px;color:var(--text-muted)">${s.l}</div></div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ===================================================
// CATEGORIES (with i18n & Grid/List view)
// ===================================================
const CAT_COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#14b8a6'];

window.toggleViewMode = (page, mode) => {
  localStorage.setItem(`fc_view_mode_${page}`, mode);
  Router.render();
};

function renderCategories(container) {
  const cats = DB.getAll('categories'), menus = DB.getAll('menus');
  const viewMode = localStorage.getItem('fc_view_mode_categories') || 'grid';

  const viewToggleHtml = `
    <div class="view-toggle">
      <button class="view-btn ${viewMode === 'grid' ? 'active' : ''}" onclick="toggleViewMode('categories', 'grid')" title="${t('view_grid')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </button>
      <button class="view-btn ${viewMode === 'list' ? 'active' : ''}" onclick="toggleViewMode('categories', 'list')" title="${t('view_list')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
    </div>
  `;

  let contentHtml = '';
  if (viewMode === 'grid') {
    contentHtml = `<div class="grid-auto">
      ${cats.map(c => {
      const cnt = menus.filter(m => m.categoryId === c.id).length;
      return `<div class="category-card" style="--cat-bg:${c.color}22">
          <div class="category-actions">
            <button class="btn btn-icon btn-ghost btn-sm" onclick="openCategoryModal(${c.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger)" onclick="deleteCategory(${c.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
          <div class="category-icon-wrap" style="background:${c.color}22"><span>${c.icon}</span></div>
          <div class="category-name">${c.name}</div>
          <div class="category-count">${cnt} ${t('cat_menus')}</div>
        </div>`;
    }).join('')}
      <div class="category-card" style="border-style:dashed;color:var(--text-muted)" onclick="openCategoryModal()">
        <div style="font-size:36px;opacity:0.4">＋</div>
        <div class="category-name" style="color:var(--text-muted)">${t('cat_add')}</div>
      </div>
    </div>`;
  } else {
    contentHtml = `<div class="list-container">
      ${cats.map(c => {
      const cnt = menus.filter(m => m.categoryId === c.id).length;
      return `<div class="category-list-row">
          <div class="category-list-icon" style="background:${c.color}22"><span>${c.icon}</span></div>
          <div class="category-list-details">
            <div>
              <div style="font-weight:700;font-size:16px">${c.name}</div>
              <div style="font-size:12px;color:var(--text-muted)">${cnt} ${t('cat_menus')}</div>
            </div>
            <div class="category-list-actions">
              <button class="btn btn-icon btn-ghost btn-sm" onclick="openCategoryModal(${c.id})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-icon btn-sm" style="background:transparent;border:none;color:var(--danger)" onclick="deleteCategory(${c.id})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
          </div>
        </div>`;
    }).join('')}
    </div>`;
  }

  container.innerHTML = `
    <div class="page-header" style="align-items:flex-start">
      <div style="flex:1"><div class="page-title">🏷️ ${t('cat_title')}</div><div class="page-subtitle">${t('cat_sub')}</div></div>
      <div style="display:flex;gap:12px;align-items:center">
        ${viewToggleHtml}
        <button class="btn btn-primary" onclick="openCategoryModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${t('cat_add')}
        </button>
      </div>
    </div>
    ${contentHtml}`;
}

window.openCategoryModal = function (id = null) {
  const cat = id ? DB.getById('categories', id) : null;
  const sw = CAT_COLORS.map(c => `<div class="color-swatch" style="background:${c};${cat?.color === c ? 'border-color:white;transform:scale(1.2)' : ''}"
    onclick="document.getElementById('catColor').value='${c}';document.querySelectorAll('.color-swatch').forEach(s=>{s.style.borderColor='var(--border)';s.style.transform=''});this.style.borderColor='white';this.style.transform='scale(1.2)'"></div>`).join('');
  Modal.open({
    title: cat ? `✏️ ${t('cat_edit')}` : `➕ ${t('cat_add_modal')}`,
    body: `<div class="form-group"><label class="form-label">${t('cat_name')} <span>*</span></label>
      <input class="form-input" id="catName" value="${cat?.name || ''}" placeholder="เช่น ต้ม, ผัด, แกง..." /></div>
      <div class="form-group"><label class="form-label">${t('cat_icon')}</label>
      <input class="form-input" id="catIcon" value="${cat?.icon || '🍽️'}" maxlength="4" style="font-size:24px;text-align:center;width:80px" /></div>
      <div class="form-group"><label class="form-label">${t('cat_color')}</label>
      <input type="hidden" id="catColor" value="${cat?.color || CAT_COLORS[0]}" /><div class="color-row">${sw}</div></div>`,
    onConfirm() {
      const name = document.getElementById('catName').value.trim();
      if (!name) { Toast.show(t('cat_name_required'), 'error'); return; }
      const data = { name, icon: document.getElementById('catIcon').value.trim(), color: document.getElementById('catColor').value };
      if (id) DB.update('categories', id, data); else DB.insert('categories', data);
      Modal.close(); Toast.show(id ? t('cat_updated') : t('cat_saved')); Router.render();
    }
  });
};

window.deleteCategory = function (id) {
  if (DB.getAll('menus').some(m => m.categoryId === id)) { Toast.show(t('cat_delete_warn'), 'warning'); return; }
  if (confirm(t('cat_delete_confirm'))) { DB.delete('categories', id); Toast.show(t('cat_deleted'), 'info'); Router.render(); }
};
