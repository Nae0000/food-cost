// ===================================================
// p_webhook.js — หน้า Webhook Settings
// ===================================================

function renderWebhook(container) {
    function draw() {
        const webhooks = DB.getAll('webhooks');
        const ings = DB.getAll('ingredients');
        document.getElementById('webhookList').innerHTML = webhooks.length === 0
            ? `<div class="empty-state"><div class="empty-icon">🔗</div><div class="empty-title">ยังไม่มี Webhook</div><div class="empty-desc">เพิ่ม Webhook เพื่ออัปเดตราคาวัตถุดิบอัตโนมัติ</div></div>`
            : webhooks.map(wh => {
                const linked = ings.filter(i => i.webhookConfigId === wh.id);
                return `<div class="webhook-card">
            <div class="webhook-card-header">
              <div style="display:flex;align-items:center;gap:12px">
                <div class="webhook-status-dot ${wh.active ? '' : 'inactive'}"></div>
                <div>
                  <div style="font-weight:700">${wh.name}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${wh.method} — ${wh.url}</div>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-accent btn-sm" onclick="syncWebhook(${wh.id})">🔄 Sync Now</button>
                <button class="btn btn-secondary btn-sm" onclick="openWebhookModal(${wh.id})">แก้ไข</button>
                <button class="btn btn-sm" style="background:transparent;border:1px solid var(--danger);color:var(--danger)" onclick="deleteWebhook(${wh.id})">ลบ</button>
              </div>
            </div>
            <div class="webhook-body">
              <div style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap">
                ${linked.map(i => `<span class="ing-pill">🧂 ${i.name}</span>`).join('')}
                ${linked.length === 0 ? `<span style="font-size:12px;color:var(--text-faint)">ยังไม่ได้ผูกวัตถุดิบ</span>` : ''}
              </div>
              <div style="font-size:12px;color:var(--text-muted)">Price Field: <code style="background:var(--bg);padding:2px 6px;border-radius:4px">${wh.priceField || 'price'}</code></div>
              ${wh.lastResult ? `<div class="code-preview" style="margin-top:8px">${JSON.stringify(wh.lastResult, null, 2)}</div>` : ''}
            </div>
          </div>`;
            }).join('');
    }

    container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">🔗 Webhook Settings</div><div class="page-subtitle">ตั้งค่าการดึงราคาวัตถุดิบอัตโนมัติจาก API ภายนอก</div></div>
      <button class="btn btn-primary" onclick="openWebhookModal()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        เพิ่ม Webhook
      </button>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="card-title" style="margin-bottom:12px">💡 วิธีการทำงาน</div>
      <div class="grid-3" style="gap:16px">
        ${[['1️⃣', 'สร้าง Webhook', 'กรอก URL ของ API ที่มีข้อมูลราคา เช่น Make.com หรือ endpoint ที่ return JSON'],
        ['2️⃣', 'ผูกวัตถุดิบ', 'เลือกว่า field ใดใน JSON คือราคา และผูกกับวัตถุดิบที่ต้องการ'],
        ['3️⃣', 'Sync!', 'กด Sync Now เพื่ออัปเดตราคาในระบบทันที']]
            .map(([ico, t, d]) => `<div style="display:flex;gap:12px;padding:16px;background:var(--bg);border-radius:var(--r-md);border:1px solid var(--border)">
            <span style="font-size:24px;flex-shrink:0">${ico}</span>
            <div><div style="font-weight:600;margin-bottom:4px">${t}</div><div style="font-size:12px;color:var(--text-muted)">${d}</div></div>
          </div>`).join('')}
      </div>
    </div>
    <div id="webhookList"></div>`;
    draw();
}

window.openWebhookModal = function (id = null) {
    const wh = id ? DB.getById('webhooks', id) : null;
    const ings = DB.getAll('ingredients');
    const linkedIds = wh ? ings.filter(i => i.webhookConfigId === wh.id).map(i => i.id) : [];
    Modal.open({
        title: wh ? '✏️ แก้ไข Webhook' : '➕ เพิ่ม Webhook',
        body: `
      <div class="form-group">
        <label class="form-label">ชื่อ Webhook <span>*</span></label>
        <input class="form-input" id="whName" value="${wh?.name || ''}" placeholder="เช่น ราคาหมู - Make.com" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">HTTP Method</label>
          <select class="form-select" id="whMethod">
            <option value="GET" ${wh?.method === 'GET' ? 'selected' : ''}>GET</option>
            <option value="POST" ${wh?.method === 'POST' ? 'selected' : ''}>POST</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">ชื่อ Field ราคาใน JSON</label>
          <input class="form-input" id="whField" value="${wh?.priceField || 'price'}" placeholder="price" />
          <div class="form-hint">เช่น {"price": 120} → field = "price"</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Webhook URL <span>*</span></label>
        <input class="form-input" id="whUrl" value="${wh?.url || ''}" placeholder="https://hook.make.com/xxxx" />
      </div>
      <div class="form-group">
        <label class="form-label">ผูกกับวัตถุดิบ</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:180px;overflow-y:auto;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);padding:10px">
          ${ings.map(i => `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
            <input type="checkbox" value="${i.id}" ${linkedIds.includes(i.id) ? 'checked' : ''} style="accent-color:var(--primary);width:14px;height:14px" />
            ${i.name} <span style="color:var(--text-faint)">(${i.unit})</span>
          </label>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <div class="toggle-wrap">
          <div class="toggle ${wh?.active !== false ? 'on' : ''}" id="whToggle" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div>
          <span>เปิดใช้งาน Webhook นี้</span>
        </div>
      </div>
      <button class="btn btn-secondary w-full" style="margin-bottom:8px" onclick="testWebhook()">🧪 Test Webhook URL</button>
      <div id="whTestResult" style="font-size:12px;padding:8px;border-radius:var(--r-md);display:none"></div>`,
        onConfirm() {
            const name = document.getElementById('whName').value.trim();
            const url = document.getElementById('whUrl').value.trim();
            if (!name || !url) { Toast.show('กรุณากรอกชื่อและ URL', 'error'); return; }
            const selectedIngs = [...document.querySelectorAll('#modalBody input[type=checkbox]:checked')].map(c => parseInt(c.value));
            const data = {
                name, url, method: document.getElementById('whMethod').value,
                priceField: document.getElementById('whField').value || 'price',
                active: document.getElementById('whToggle').classList.contains('on')
            };
            let whId;
            if (id) { DB.update('webhooks', id, data); whId = id; }
            else { const nw = DB.insert('webhooks', data); whId = nw.id; }
            DB.getAll('ingredients').filter(i => i.webhookConfigId === whId).forEach(i => DB.update('ingredients', i.id, { webhookConfigId: null }));
            selectedIngs.forEach(iid => DB.update('ingredients', iid, { webhookConfigId: whId, priceMode: 'webhook' }));
            Modal.close(); Toast.show(id ? 'อัปเดต Webhook แล้ว' : 'เพิ่ม Webhook แล้ว'); Router.render();
        }
    });
};

window.testWebhook = async function () {
    const url = document.getElementById('whUrl').value.trim();
    const res = document.getElementById('whTestResult');
    if (!url) { Toast.show('กรอก URL ก่อน', 'error'); return; }
    res.style.display = 'block'; res.style.background = 'var(--bg)'; res.style.border = '1px solid var(--border)';
    res.textContent = '⟳ กำลังทดสอบ...';
    try {
        const resp = await fetch(url, { method: document.getElementById('whMethod').value, mode: 'cors' });
        const json = await resp.json();
        res.style.background = 'var(--success-light)'; res.style.color = '#166534';
        res.textContent = '✅ สำเร็จ: ' + JSON.stringify(json).slice(0, 200);
    } catch (e) {
        res.style.background = 'var(--danger-light)'; res.style.color = '#991b1b';
        res.textContent = '❌ เกิดข้อผิดพลาด: ' + e.message;
    }
};

window.syncWebhook = async function (id) {
    const wh = DB.getById('webhooks', id); if (!wh) return;
    Toast.show('กำลัง Sync...', 'info', 1500);
    try {
        const resp = await fetch(wh.url, { method: wh.method, mode: 'cors' });
        const json = await resp.json();
        const price = json[wh.priceField] ?? (Array.isArray(json) ? json[0]?.[wh.priceField] : null);
        DB.update('webhooks', id, { lastResult: json, lastSynced: Date.now() });
        if (price != null) {
            const linked = DB.getAll('ingredients').filter(i => i.webhookConfigId === id);
            linked.forEach(i => DB.update('ingredients', i.id, { webhookPrice: parseFloat(price), lastUpdated: Date.now() }));
            Toast.show(`อัปเดตราคา ${linked.length} รายการ → ฿${price}`, 'success', 4000);
        } else {
            Toast.show(`Sync สำเร็จแต่ไม่พบ field "${wh.priceField}"`, 'warning', 4000);
        }
    } catch (e) { Toast.show('Sync ล้มเหลว: ' + e.message, 'error', 4000); }
    Router.render();
};

window.deleteWebhook = function (id) {
    if (!confirm('ลบ Webhook นี้?')) return;
    DB.getAll('ingredients').filter(i => i.webhookConfigId === id).forEach(i => DB.update('ingredients', i.id, { webhookConfigId: null, priceMode: 'manual' }));
    DB.delete('webhooks', id); Toast.show('ลบ Webhook แล้ว', 'info'); Router.render();
};
