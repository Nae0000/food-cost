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
    // Sync bottom nav active state
    document.querySelectorAll('.bottom-nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === hash));
    // Update mobile header title
    const pageTitles = { dashboard: '📊 ภาพรวม', categories: '🏷️ หมวดหมู่', ingredients: '🧂 วัตถุดิบ', menus: '🍜 เมนู', sets: '🍱 เซต', recipes: '📋 สูตร', webhook: '🔗 Webhook', settings: '⚙️ ตั้งค่า' };
    const mTitle = document.getElementById('mobilePageTitle');
    if (mTitle) mTitle.textContent = pageTitles[hash] || 'FoodCost';
    const c = document.getElementById('pageContainer');
    c.innerHTML = '';
    const fn = this.routes[hash];
    if (fn) fn(c); else c.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">${t('page_not_found')}</div></div>`;
    // Close mobile sidebar on navigation
    closeMobileSidebar();
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
// MOBILE: Sidebar, Bottom Nav, More Overlay
// ===================================================
function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.add('mobile-open');
  // Create backdrop
  let bd = document.querySelector('.sidebar-mobile-backdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.className = 'sidebar-mobile-backdrop';
    bd.addEventListener('click', closeMobileSidebar);
    document.body.appendChild(bd);
  }
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  const bd = document.querySelector('.sidebar-mobile-backdrop');
  if (bd) bd.remove();
}
window.closeMobileSidebar = closeMobileSidebar;

// Mobile header hamburger → open full sidebar
const mobileSidebarBtn = document.getElementById('mobileSidebarBtn');
if (mobileSidebarBtn) {
  mobileSidebarBtn.addEventListener('click', openMobileSidebar);
}

// More overlay toggle
function openMoreOverlay() {
  document.getElementById('moreOverlay').classList.add('show');
}
function closeMoreOverlay() {
  document.getElementById('moreOverlay').classList.remove('show');
}
window.closeMoreOverlay = closeMoreOverlay;

const moreMenuBtn = document.getElementById('moreMenuBtn');
if (moreMenuBtn) moreMenuBtn.addEventListener('click', openMoreOverlay);
const moreOverlayBackdrop = document.getElementById('moreOverlayBackdrop');
if (moreOverlayBackdrop) moreOverlayBackdrop.addEventListener('click', closeMoreOverlay);
const moreOverlayClose = document.getElementById('moreOverlayClose');
if (moreOverlayClose) moreOverlayClose.addEventListener('click', closeMoreOverlay);

// Sidebar nav links: close sidebar on mobile after navigation
document.querySelectorAll('.sidebar .nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) closeMobileSidebar();
  });
});

const DataSync = {
  exportCSV() {
    const tables = ['categories', 'ingredients', 'menus', 'recipes', 'subRecipes', 'sets'];
    tables.forEach(table => {
      const data = DB.getAll(table);
      if (data.length === 0) return;

      const keys = Object.keys(data[0]);
      const csvContent = [
        keys.join(','),
        ...data.map(item => keys.map(k => {
          let val = item[k];
          if (Array.isArray(val) || typeof val === 'object') val = JSON.stringify(val);
          if (typeof val === 'string') val = '"' + val.replace(/"/g, '""') + '"';
          return val;
        }).join(','))
      ].join('\n');

      this._download(csvContent, `foodcost_${table}.csv`, 'text/csv;charset=utf-8;');
    });
    Toast.show(t('export_csv_success'), 'success');
  },

  exportJSON() {
    const backup = {
      categories: DB.getAll('categories'),
      ingredients: DB.getAll('ingredients'),
      menus: DB.getAll('menus'),
      recipes: DB.getAll('recipes'),
      subRecipes: DB.getAll('subRecipes'),
      sets: DB.getAll('sets')
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    this._download(jsonStr, `foodcost_backup_${dateStr}.json`, 'application/json;charset=utf-8;');
    Toast.show(t('export_csv_success'), 'success');
  },

  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const tables = ['categories', 'ingredients', 'menus', 'recipes', 'subRecipes', 'sets'];
      if (!tables.some(t => data[t])) throw new Error("Invalid structure");

      tables.forEach(t => {
        if (data[t] && Array.isArray(data[t])) {
          data[t].forEach(item => DB.insert(t, item)); // Use DB wrapper to push to Cloud
        }
      });
      Toast.show(t('restore_success'), 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      Toast.show(t('restore_error'), 'error');
      console.error("Import JSON error", e);
    }
  },

  _download(content, fileName, mimeType) {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

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

        // Compute Gross Profit if selling price > 0
        const sellingPrice = m.sellingPrice || 0;
        const gpPct = sellingPrice > 0 ? (((sellingPrice - m.cost) / sellingPrice) * 100).toFixed(0) : 0;
        const gpColor = gpPct >= 65 ? 'var(--success)' : gpPct >= 40 ? 'var(--warning)' : 'var(--danger)';

        return `<div class="top-menu-item" style="padding:12px; border-bottom:1px solid var(--border-light); background:var(--bg); border-radius:var(--r-md); margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="top-menu-rank" style="background:${rc}22;color:${rc}; margin:0;">${i + 1}</div>
                  <div class="top-menu-name" style="margin:0;">${m.name} ${cat ? `<span class="badge badge-cat" style="background:${cat.color}22;color:${cat.color}; font-size:10px;">${cat.icon}</span>` : ''}</div>
                </div>
                <div style="text-align:right;">
                   <div style="font-size:12px; color:var(--text-muted);">ต้นทุน: <span style="font-size:15px; font-weight:700; color:var(--text);">${formatPrice(m.cost)}</span></div>
                </div>
              </div>
              
              <div class="top-menu-bar" style="margin-bottom:8px; height:6px;"><div class="top-menu-bar-fill" style="width:${pct}%; background:linear-gradient(90deg, ${rc}, ${rc}dd);"></div></div>
              
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                 <div style="color:var(--text-muted);">ราคาขาย: <strong style="color:var(--primary);">${sellingPrice > 0 ? formatPrice(sellingPrice) : '-'}</strong></div>
                 ${sellingPrice > 0 ? `<div style="color:${gpColor}; font-weight:600; font-size:12px; background:${gpColor}15; padding:2px 6px; border-radius:4px;">กำไร ${gpPct}%</div>` : ''}
              </div>
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
  const selectedCats = new Set();

  window.toggleSelectCat = (id, checked) => {
    if (checked) selectedCats.add(id);
    else selectedCats.delete(id);
    const toolbar = document.getElementById('catBulkToolbar');
    if (toolbar) toolbar.style.display = selectedCats.size > 0 ? 'flex' : 'none';
    const btn = document.getElementById('catBulkDelBtn');
    if (btn) btn.querySelector('span').textContent = `ลบที่เลือก (${selectedCats.size})`;

    const row = document.getElementById('ccard-' + id);
    if (row) {
      if (checked) row.classList.add('selected-row'); else row.classList.remove('selected-row');
    }
  };

  const viewToggleHtml = `
    <div id="catBulkToolbar" style="display:${selectedCats.size > 0 ? 'flex' : 'none'}; align-items:center; gap:8px; margin-right:12px;">
      <button class="btn btn-sm" id="catBulkDelBtn" style="border-color:var(--danger);color:var(--danger)" onclick="bulkDeleteCategory()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        <span>ลบที่เลือก (${selectedCats.size})</span>
      </button>
    </div>
    <div class="view-toggle">
      <button class="view-btn ${viewMode === 'grid' ? 'active' : ''}" onclick="toggleViewMode('categories', 'grid')" title="${t('view_grid')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      </button>
      <button class="view-btn ${viewMode === 'list' ? 'active' : ''}" onclick="toggleViewMode('categories', 'list')" title="${t('view_list')}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
    </div>
  `;

  window.catSelectAll = (checked) => {
    cats.forEach(c => {
      toggleSelectCat(c.id, checked);
      const cb = document.getElementById('ccb-' + c.id);
      if (cb) cb.checked = checked;
    });
  };

  let contentHtml = '';
  if (viewMode === 'grid') {
    contentHtml = `<div class="grid-auto">
      ${cats.map(c => {
      const cnt = menus.filter(m => m.categoryId === c.id).length;
      return `<div class="category-card ${selectedCats.has(c.id) ? 'selected-row' : ''}" id="ccard-${c.id}" style="--cat-bg:${c.color}22">
          <div style="position:absolute;top:10px;left:10px;z-index:10;">
             <input type="checkbox" class="form-checkbox" id="ccb-${c.id}" ${selectedCats.has(c.id) ? 'checked' : ''} onchange="toggleSelectCat(${c.id},this.checked)" />
          </div>
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
      return `<div class="category-list-row ${selectedCats.has(c.id) ? 'selected-row' : ''}" id="ccard-${c.id}" style="padding-left:45px; position:relative;">
          <div style="position:absolute;top:50%;left:14px;transform:translateY(-50%);z-index:10;">
             <input type="checkbox" class="form-checkbox" id="ccb-${c.id}" ${selectedCats.has(c.id) ? 'checked' : ''} onchange="toggleSelectCat(${c.id},this.checked)" />
          </div>
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
    <div style="display:flex;gap:12px;margin-bottom:20px;align-items:center;">
      <div style="display:flex;align-items:center;gap:8px;background:var(--bg);padding:6px 10px;border-radius:var(--r-md)">
        <input type="checkbox" class="form-checkbox" onchange="catSelectAll(this.checked)" title="Select All" />
        <span style="font-size:13px;color:var(--text-muted)">เลือกทั้งหมด</span>
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
      <input class="form-input" id="catName" value="${cat?.name || ''}" placeholder="เช่น ต้ม, ผัด, แกง..." autocomplete="off" /></div>
      <div class="form-group"><label class="form-label">${t('cat_icon')} <span style="font-size:12px; font-weight:normal; color:var(--text-muted);">(แนะนำอัตโนมัติตามชื่อ)</span></label>
      <div style="display:flex; gap:10px; align-items:center;">
        <input class="form-input" id="catIcon" value="${cat?.icon || '🍽️'}" maxlength="4" style="font-size:24px;text-align:center;width:80px" />
        <span style="font-size:12px; color:var(--text-muted); line-height:1.4;">พิมพ์ชื่อหมวดหมู่ที่ต้องการ<br>ระบบจะเลือก EMOJI ให้โดยอัตโนมัติ</span>
      </div></div>
      <div class="form-group"><label class="form-label">${t('cat_color')}</label>
      <input type="hidden" id="catColor" value="${cat?.color || CAT_COLORS[0]}" /><div class="color-row">${sw}</div></div>`,
    onConfirm() {
      const name = document.getElementById('catName').value.trim();
      if (!name) { Toast.show(t('cat_name_required'), 'error'); return; }
      const data = { name, icon: document.getElementById('catIcon').value.trim() || '🍽️', color: document.getElementById('catColor').value };
      if (id) DB.update('categories', id, data); else DB.insert('categories', data);
      Modal.close(); Toast.show(id ? t('cat_updated') : t('cat_saved')); Router.render();
    }
  });

  // ========== Auto-Suggest EMOJI Logic ==========
  const catNameInput = document.getElementById('catName');
  const catIconInput = document.getElementById('catIcon');
  let userChangedIcon = false;

  if (catIconInput) {
    catIconInput.addEventListener('input', () => {
      userChangedIcon = true;
    });
  }

  if (catNameInput && catIconInput) {
    catNameInput.addEventListener('input', (e) => {
      // ถ้าผู้ใช้เคยพิมพ์อีโมจิเองในการแก้ไขครั้งนี้แล้ว จะไม่เขียนทับ
      if (userChangedIcon) return;

      const val = e.target.value.toLowerCase();

      // ชุดคำค้นหาและอีโมจิที่จับคู่ไว้
      const emojiMap = [
        { keys: ['ต้ม', 'ซุป', 'soup'], emoji: '🍲' },
        { keys: ['ผัด', 'stir'], emoji: '🥘' },
        { keys: ['แกง', 'curry'], emoji: '🍛' },
        { keys: ['ทอด', 'fried', 'กรอบ'], emoji: '🍳' },
        { keys: ['ยำ', 'ตำ', 'สลัด', 'salad'], emoji: '🥗' },
        { keys: ['น้ำ', 'เครื่องดื่ม', 'drink', 'beverage', 'ชง'], emoji: '🧃' },
        { keys: ['หวาน', 'ขนม', 'dessert', 'cake', 'เค้ก'], emoji: '🍮' },
        { keys: ['เนื้อ', 'สเต็ก', 'meat', 'beef'], emoji: '🥩' },
        { keys: ['หมู', 'pork'], emoji: '🐷' },
        { keys: ['ไก่', 'chicken'], emoji: '🍗' },
        { keys: ['ปลา', 'fish'], emoji: '🐟' },
        { keys: ['ทะเล', 'seafood', 'กุ้ง', 'หมึก', 'หอย', 'ปู'], emoji: '🦐' },
        { keys: ['เส้น', 'ก๋วยเตี๋ยว', 'noodle', 'พาสต้า', 'สปาเก็ตตี้', 'มาม่า'], emoji: '🍜' },
        { keys: ['ข้าว', 'rice', 'อาหารจานเดียว'], emoji: '🍚' },
        { keys: ['ย่าง', 'ปิ้ง', 'grill', 'หมูกระทะ', 'บาร์บีคิว', 'สเต๊ะ'], emoji: '🍢' },
        { keys: ['ผลไม้', 'fruit'], emoji: '🍉' },
        { keys: ['กาแฟ', 'coffee'], emoji: '☕' },
        { keys: ['ชา', 'tea'], emoji: '🍵' },
        { keys: ['เบียร์', 'เหล้า', 'แอลกอฮอล์', 'alcohol', 'beer', 'wine', 'ค็อกเทล'], emoji: '🍺' },
        { keys: ['ไอศกรีม', 'ไอติม', 'ice cream', 'บิงซู'], emoji: '🍦' },
        { keys: ['อบ', 'bake', 'เบเกอรี่', 'ขนมปัง'], emoji: '🥐' },
        { keys: ['พิซซ่า', 'pizza'], emoji: '🍕' },
        { keys: ['เบอร์เกอร์', 'burger', 'แฮมเบอร์เกอร์'], emoji: '🍔' },
        { keys: ['ญี่ปุ่น', 'ซูชิ', 'sushi', 'ซาซิมิ'], emoji: '🍣' },
        { keys: ['เกาหลี', 'korean'], emoji: '🍱' },
        { keys: ['มังสวิรัติ', 'เจ', 'vegan', 'vegetarian', 'ผัก'], emoji: '🥦' },
        { keys: ['พิเศษ', 'แนะนำ', 'special', 'recommend', 'ซิกเนเจอร์'], emoji: '⭐' }
      ];

      for (const item of emojiMap) {
        if (item.keys.some(k => val.includes(k))) {
          catIconInput.value = item.emoji;
          break;
        }
      }
    });
  }
};

window.deleteCategory = function (id) {
  if (DB.getAll('menus').some(m => m.categoryId === id)) { Toast.show(t('cat_delete_warn'), 'warning'); return; }
  if (confirm(t('cat_delete_confirm'))) { DB.delete('categories', id); Toast.show(t('cat_deleted'), 'info'); Router.render(); }
};

window.bulkDeleteCategory = function () {
  const selectedCats = Array.from(document.querySelectorAll('input[id^="ccb-"]:checked')).map(cb => parseInt(cb.id.replace('ccb-', '')));
  if (selectedCats.length === 0) return;

  // Check if any selected category has menus
  const allMenus = DB.getAll('menus');
  const hasMenus = selectedCats.some(id => allMenus.some(m => m.categoryId === id));

  if (hasMenus) {
    Toast.show('ไม่สามารถลบหมวดหมู่ที่มีเมนูอาหารอยู่ได้ กรุณาย้ายเมนูก่อนลบ', 'warning', 4000);
    return;
  }

  if (confirm(`คุณต้องการลบหมวดหมู่ที่เลือกจำนวน ${selectedCats.length} รายการใช่ไหม?`)) {
    let delCount = 0;
    selectedCats.forEach(id => {
      DB.delete('categories', id);
      delCount++;
    });
    Toast.show(`ลบสำเร็จ ${delCount} รายการ`, 'success');
    Router.render();
  }
};

// ===================================================
// AUTHENTICATION (Logout functionality)
// ===================================================
function handleLogout(e) {
  if (e) e.preventDefault();
  if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
    if (typeof auth !== 'undefined' && auth) {
      auth.signOut().then(() => {
        window.location.href = 'login.html';
      }).catch((error) => {
        console.error("Sign out error", error);
        Toast.show('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
      });
    } else {
      window.location.href = 'login.html';
    }
  }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

