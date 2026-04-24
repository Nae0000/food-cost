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

  // --- Smart Price Adjustment Alert Logic ---
  const calcMethod = _settings.calcMethod !== 'markup' ? 'margin' : 'markup';
  const targetMargin = _settings.targetMargin || 65;
  const targetCost = _settings.targetCost || 35;

  const menusNeedingAdjustment = menusWithCost.filter(m => {
    if (m.cost <= 0) return false;
    let suggestedPrice = 0;
    if (calcMethod === 'margin') {
      suggestedPrice = m.cost / (1 - targetMargin / 100);
    } else {
      suggestedPrice = m.cost / (targetCost / 100);
    }
    const currentPrice = m.sellingPrice || 0;
    // Suggest price if selling price is 0 or less than the target suggested price
    if (currentPrice < suggestedPrice) {
      m.suggestedPrice = suggestedPrice;
      return true;
    }
    return false;
  });

  let alertHtml = '';
  if (menusNeedingAdjustment.length > 0) {
    alertHtml = `
      <div class="alert-box" style="background:var(--danger-light, #fee2e2); color:var(--danger, #ef4444); padding:16px; border-radius:var(--r-md); border-left:4px solid var(--danger, #ef4444); margin-bottom:20px; display:flex; align-items:flex-start; gap:12px;">
        <div style="font-size:24px; line-height:1;">⚠️</div>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:16px; margin-bottom:4px; color:#991b1b;">${t('dash_alert_price_adj')}</div>
          <div style="font-size:13px; margin-bottom:12px; color:#991b1b;">${t('dash_alert_price_adj_desc').replace('{n}', menusNeedingAdjustment.length)}</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${menusNeedingAdjustment.slice(0, 3).map(m => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.7); padding:10px 14px; border-radius:6px;">
                <div>
                  <strong style="font-size:14px; color:var(--text);">${m.name}</strong>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                    ${t('cost_label')}: ${formatPrice(m.cost)} | ${t('menu_selling_price')}: ${formatPrice(m.sellingPrice || 0)}
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:11px; color:var(--text-muted);">${t('dash_alert_suggested')}</div>
                  <strong style="color:var(--danger, #ef4444); font-size:15px;">${formatPrice(m.suggestedPrice)}</strong>
                </div>
              </div>
            `).join('')}
          </div>
          ${menusNeedingAdjustment.length > 3 ? `<div style="font-size:12px; color:#991b1b; margin-top:10px; font-weight:600;">+ ${menusNeedingAdjustment.length - 3} เมนูอื่นๆ</div>` : ''}
          <button class="btn btn-sm" style="margin-top:14px; background:var(--danger, #ef4444); color:white; border:none; font-weight:bold; padding:8px 16px; box-shadow:0 2px 4px rgba(239, 68, 68, 0.3);" onclick="Router.navigate('menus')">
            👉 ${t('dash_alert_btn')}
          </button>
        </div>
      </div>
    `;
  }
  // ------------------------------------------

  container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">📊 ${t('dash_title')}</div><div class="page-subtitle">Food Cost Dashboard</div></div>
    </div>
    ${alertHtml}
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
                 <div style="color:var(--text-muted); display:flex; align-items:center; gap:8px;">
                   <span>ราคาขาย: <strong style="color:var(--primary);">${sellingPrice > 0 ? formatPrice(sellingPrice) : '-'}</strong></span>
                   <span style="font-size:11px; color:var(--text-faint);">(ขั้นต่ำ ${formatPrice(m.cost / 0.3)})</span>
                 </div>
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
// AUTHENTICATION (Logout functionality)
// ===================================================
function handleLogout(e) {
  if (e) e.preventDefault();
  if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
    localStorage.removeItem('local_admin_bypass'); // Clear local bypass flag
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

