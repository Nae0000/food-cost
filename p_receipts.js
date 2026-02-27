// ===================================================
// p_receipts.js — Receipt Scanner & Ingredient Linking
// ===================================================

function renderReceipts(container) {
    const ings = DB.getAll('ingredients');
    // State for current receipt being created/edited
    let _draft = {
        id: null, date: new Date().toISOString().split('T')[0],
        note: '', imageBase64: null, items: []
    };
    let _editReceiptId = null;

    // ---- helpers ----
    function fmtDate(str) {
        if (!str) return '-';
        const d = new Date(str);
        return isNaN(d) ? str : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    function ingName(id) {
        const i = ings.find(x => x.id === id);
        return i ? i.name : '—';
    }

    // ---- Draw draft item rows ----
    function drawDraftItems() {
        const tbody = document.getElementById('draftItems');
        if (!tbody) return;
        tbody.innerHTML = _draft.items.length ? _draft.items.map((item, idx) => {
            const linked = item.ingredientId ? ings.find(i => i.id === item.ingredientId) : null;
            return `<tr>
        <td>
          <input class="form-input" style="font-size:13px;min-height:34px" value="${item.name}" oninput="_draftItemSet(${idx},'name',this.value)" placeholder="ชื่อสินค้า" />
        </td>
        <td style="width:80px">
          <input class="form-input" style="font-size:13px;min-height:34px;text-align:right" type="number" min="0" step="0.01" value="${item.totalPrice}" oninput="_draftItemSet(${idx},'totalPrice',this.value)" placeholder="฿" />
        </td>
        <td style="width:70px">
          <input class="form-input" style="font-size:13px;min-height:34px;text-align:center" type="number" min="0" step="0.001" value="${item.qty || 1}" oninput="_draftItemSet(${idx},'qty',this.value)" placeholder="1" />
        </td>
        <td style="width:70px">
          <input class="form-input" style="font-size:13px;min-height:34px" value="${item.unit || ''}" oninput="_draftItemSet(${idx},'unit',this.value)" placeholder="กก." />
        </td>
        <td style="min-width:160px;position:relative" id="linkCell${idx}">
          ${linked
                    ? `<div style="display:flex;align-items:center;gap:6px">
                <span style="background:var(--primary)22;color:var(--primary);padding:3px 10px;border-radius:99px;font-size:12px;white-space:nowrap">🔗 ${linked.name}</span>
                <button onclick="_draftItemSet(${idx},'ingredientId',null)" style="background:none;border:none;color:var(--danger);cursor:pointer;padding:2px;font-size:14px" title="ยกเลิกลิงค์">✕</button>
              </div>`
                    : `<div style="position:relative">
                <input class="form-input" style="font-size:12px;min-height:34px" placeholder="🔗 ลิงค์วัตถุดิบ..." id="linkSearch${idx}" oninput="_filterLinkDD(${idx})" onfocus="_showLinkDD(${idx})" autocomplete="off" />
                <div id="linkDD${idx}" style="display:none;position:fixed;width:220px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);max-height:180px;overflow-y:auto;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.6)">
                  ${ings.map(i => `<div class="dropdown-item" onclick="_draftItemLink(${idx},${i.id})" style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border-light)">
                    <div style="font-weight:600">${i.name}</div><div style="color:var(--text-muted);font-size:11px">${i.group || ''} · ${i.recipeUnit || i.buyUnit}</div>
                  </div>`).join('')}
                </div>
              </div>`}
        </td>
        <td style="width:36px;text-align:center">
          <button onclick="_draftRemoveItem(${idx})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;padding:4px">🗑</button>
        </td>
      </tr>`;
        }).join('') : `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px">กดปุ่ม "+ เพิ่มรายการ" เพื่อเพิ่มสินค้าจากใบเสร็จ</td></tr>`;
    }

    // ---- Draw receipt image panel ----
    function drawImagePanel() {
        const el = document.getElementById('receiptImgWrap');
        if (!el) return;
        if (_draft.imageBase64) {
            el.innerHTML = `<img src="${_draft.imageBase64}" style="max-width:100%;max-height:480px;border-radius:var(--r-md);object-fit:contain;display:block;margin:0 auto" />
        <button onclick="_clearReceiptImg()" style="display:block;margin:10px auto 0;background:none;border:none;color:var(--danger);cursor:pointer;font-size:13px">✕ ลบรูป</button>`;
        } else {
            el.innerHTML = `<label for="receiptFileInput" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:220px;border:2px dashed var(--border);border-radius:var(--r-lg);cursor:pointer;color:var(--text-muted);background:var(--bg);transition:border-color 0.2s" onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'">
        <span style="font-size:48px">🧾</span>
        <span style="font-size:14px;font-weight:600">อัพโหลดรูปใบเสร็จ</span>
        <span style="font-size:12px">คลิกเพื่อเลือกไฟล์ หรือถ่ายรูปด้วยกล้อง</span>
        <input type="file" id="receiptFileInput" accept="image/*" capture="environment" style="display:none" onchange="_onReceiptImg(event)" />
      </label>`;
        }
    }

    // ---- Draw past receipts ----
    function drawHistory() {
        const el = document.getElementById('receiptHistory');
        if (!el) return;
        const receipts = DB.getReceipts();
        if (!receipts.length) {
            el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted)">ยังไม่มีใบเสร็จที่บันทึกไว้</div>`;
            return;
        }
        el.innerHTML = receipts.map(r => {
            const applied = r.items.filter(i => i.ingredientId);
            return `<div class="card" style="display:flex;gap:16px;align-items:flex-start;padding:16px">
        ${r.imageBase64
                    ? `<img src="${r.imageBase64}" style="width:72px;height:72px;object-fit:cover;border-radius:var(--r-md);flex-shrink:0;border:1px solid var(--border)" />`
                    : `<div style="width:72px;height:72px;background:var(--bg);border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;border:1px solid var(--border)">🧾</div>`}
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
              <div style="font-weight:700;font-size:15px">📅 ${fmtDate(r.date)}</div>
              ${r.note ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${r.note}</div>` : ''}
            </div>
            <button onclick="_deleteReceipt(${r.id})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:20px;padding:0 4px" title="ลบใบเสร็จ">🗑</button>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${r.items.length} รายการ · เชื่อมแล้ว ${applied.length} รายการ</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${r.items.map(item => `
              <span style="font-size:11px;padding:3px 10px;border-radius:99px;background:${item.ingredientId ? 'var(--primary)22' : 'var(--bg)'};color:${item.ingredientId ? 'var(--primary)' : 'var(--text-muted)'};border:1px solid ${item.ingredientId ? 'var(--primary)44' : 'var(--border)'}">
                ${item.ingredientId ? '🔗 ' : ''}${item.name} ${item.totalPrice ? `฿${Number(item.totalPrice).toFixed(2)}` : ''}
              </span>`).join('')}
          </div>
        </div>
      </div>`;
        }).join('');
    }

    function redraw() { drawDraftItems(); drawImagePanel(); drawHistory(); }

    // ---- Page layout ----
    container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">🧾 สแกนใบเสร็จ</div><div class="page-subtitle">อัพโหลดรูปใบเสร็จแล้วเชื่อมกับต้นทุนวัตถุดิบ ราคาเก่าจะถูกเก็บไว้เปรียบเทียบ</div></div>
    </div>

    <!-- === EDITOR === -->
    <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:20px;margin-bottom:32px" id="receiptEditorGrid">

      <!-- Left: image + date -->
      <div>
        <div style="font-weight:700;font-size:14px;margin-bottom:12px">📷 รูปใบเสร็จ</div>
        <div id="receiptImgWrap"></div>
        <div style="margin-top:16px">
          <label class="form-label">📅 วันที่ซื้อ</label>
          <input class="form-input" type="date" id="receiptDate" value="${_draft.date}" oninput="_draft.date=this.value" />
        </div>
        <div style="margin-top:12px">
          <label class="form-label">📝 หมายเหตุ (ร้านค้า / ตลาด)</label>
          <input class="form-input" id="receiptNote" placeholder="เช่น ตลาดสดท่าเรือ" oninput="_draft.note=this.value" value="${_draft.note}" />
        </div>
      </div>

      <!-- Right: items table -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-weight:700;font-size:14px">📋 รายการสินค้า</div>
          <button class="btn btn-ghost btn-sm" onclick="_draftAddItem()">+ เพิ่มรายการ</button>
        </div>
        <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--r-md)">
          <table style="width:100%;border-collapse:collapse">
            <thead style="background:var(--bg)"><tr>
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:var(--text-muted)">ชื่อสินค้า</th>
              <th style="padding:8px 6px;font-size:12px;color:var(--text-muted)">ราคา (฿)</th>
              <th style="padding:8px 6px;font-size:12px;color:var(--text-muted)">จำนวน</th>
              <th style="padding:8px 6px;font-size:12px;color:var(--text-muted)">หน่วย</th>
              <th style="padding:8px 6px;font-size:12px;color:var(--text-muted)">เชื่อมวัตถุดิบ</th>
              <th></th>
            </tr></thead>
            <tbody id="draftItems"></tbody>
          </table>
        </div>

        <!-- Total -->
        <div id="draftTotal" style="text-align:right;padding:10px 12px;font-size:13px;color:var(--text-muted)"></div>

        <!-- Save button -->
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-secondary btn-sm" onclick="_clearDraft()">🗑 ล้างข้อมูล</button>
          <button class="btn btn-primary" onclick="_saveReceipt()">
            💾 บันทึกใบเสร็จ &amp; อัพเดตต้นทุน
          </button>
        </div>
      </div>
    </div>

    <!-- === HISTORY === -->
    <div style="font-weight:700;font-size:16px;margin-bottom:16px;padding-top:8px;border-top:1px solid var(--border)">🗂 ประวัติใบเสร็จ</div>
    <div id="receiptHistory" style="display:flex;flex-direction:column;gap:12px"></div>
  `;

    // ---- Wire up global helpers ----
    window._draft = _draft;

    window._onReceiptImg = function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => { _draft.imageBase64 = ev.target.result; drawImagePanel(); };
        reader.readAsDataURL(file);
    };
    window._clearReceiptImg = function () { _draft.imageBase64 = null; drawImagePanel(); };

    window._draftAddItem = function () {
        _draft.items.push({ name: '', totalPrice: '', qty: 1, unit: '', ingredientId: null });
        drawDraftItems();
        updateTotal();
    };
    window._draftRemoveItem = function (idx) {
        _draft.items.splice(idx, 1);
        drawDraftItems();
        updateTotal();
    };
    window._draftItemSet = function (idx, key, val) {
        _draft.items[idx][key] = key === 'ingredientId' ? (val === null ? null : parseInt(val)) : val;
        if (key !== 'name') updateTotal();
        if (key === 'ingredientId') drawDraftItems();
    };

    // Dropdown link helpers
    window._showLinkDD = function (idx) {
        // Position dropdown under the cell
        const input = document.getElementById(`linkSearch${idx}`);
        const dd = document.getElementById(`linkDD${idx}`);
        if (!dd || !input) return;
        const rect = input.getBoundingClientRect();
        dd.style.top = (rect.bottom + 4 + window.scrollY) + 'px';
        dd.style.left = rect.left + 'px';
        dd.style.display = 'block';
        _filterLinkDD(idx);
        // Close others
        document.querySelectorAll('[id^="linkDD"]').forEach(el => { if (el !== dd) el.style.display = 'none'; });
    };
    window._filterLinkDD = function (idx) {
        const val = (document.getElementById(`linkSearch${idx}`)?.value || '').toLowerCase();
        const dd = document.getElementById(`linkDD${idx}`);
        if (!dd) return;
        dd.querySelectorAll('.dropdown-item').forEach(el => {
            el.style.display = el.textContent.toLowerCase().includes(val) ? '' : 'none';
        });
    };
    window._draftItemLink = function (idx, ingId) {
        _draft.items[idx].ingredientId = ingId;
        // Auto-fill name & unit from ingredient if blank
        const ing = ings.find(i => i.id === ingId);
        if (ing && !_draft.items[idx].name) _draft.items[idx].name = ing.name;
        if (ing && !_draft.items[idx].unit) _draft.items[idx].unit = ing.buyUnit || ing.recipeUnit || '';
        drawDraftItems();
    };

    function updateTotal() {
        const el = document.getElementById('draftTotal');
        if (!el) return;
        const total = _draft.items.reduce((s, i) => s + (parseFloat(i.totalPrice) || 0), 0);
        const linked = _draft.items.filter(i => i.ingredientId).length;
        el.innerHTML = `รวม <strong style="color:var(--primary)">${formatPrice(total)}</strong> · เชื่อมแล้ว <strong style="color:var(--success)">${linked}</strong> / ${_draft.items.length} รายการ`;
    }

    window._clearDraft = function () {
        _draft.id = null; _draft.note = ''; _draft.imageBase64 = null; _draft.items = [];
        _draft.date = new Date().toISOString().split('T')[0];
        const el = document.getElementById('receiptDate'); if (el) el.value = _draft.date;
        const ne = document.getElementById('receiptNote'); if (ne) ne.value = '';
        redraw();
    };

    window._saveReceipt = function () {
        if (!_draft.items.length) { Toast.show('กรุณาเพิ่มรายการสินค้าก่อน', 'error'); return; }

        // Update ingredient prices for linked items
        let updatedCount = 0;
        const receiptTs = new Date(_draft.date).getTime() || Date.now();
        _draft.items.forEach(item => {
            if (!item.ingredientId) return;
            const price = parseFloat(item.totalPrice);
            const qty = parseFloat(item.qty) || 1;
            if (!price || price <= 0) return;

            const ing = DB.getById('ingredients', item.ingredientId);
            if (!ing) return;

            const oldPrice = DB.effectivePrice(ing);
            // Update buy price in ingredient
            DB.update('ingredients', item.ingredientId, {
                buyPrice: price,
                buyQty: qty,
                buyUnit: item.unit || ing.buyUnit,
            });
            // Record history with receipt date and note
            const newPricePerUnit = price / (qty * (ing.convFactor || 1));
            if (Math.abs(newPricePerUnit - oldPrice) > 0.00001) {
                const hist = DB.getPriceHistory(null);
                // Save with receipt timestamp
                const items = DB._get('priceHistory') || [];
                items.push({
                    id: receiptTs + item.ingredientId,
                    ingredientId: item.ingredientId,
                    price: newPricePerUnit,
                    timestamp: receiptTs,
                    note: `🧾 ${_draft.note || 'ใบเสร็จ'}`
                });
                DB._set('priceHistory', items);
            }
            updatedCount++;
        });

        // Save receipt record
        const saved = DB.saveReceipt({
            id: _draft.id || null,
            date: _draft.date,
            note: _draft.note,
            imageBase64: _draft.imageBase64,
            items: _draft.items.map(i => ({ ...i })),
            createdAt: Date.now()
        });

        Toast.show(`💾 บันทึกใบเสร็จแล้ว · อัพเดตราคา ${updatedCount} วัตถุดิบ`, 'success');
        _clearDraft();
    };

    window._deleteReceipt = function (id) {
        if (!confirm('ลบใบเสร็จนี้ออกจากประวัติ? (ราคาที่อัพเดตแล้วจะยังคงอยู่)')) return;
        DB.deleteReceipt(id);
        drawHistory();
        Toast.show('ลบใบเสร็จแล้ว', 'info');
    };

    // Close dropdowns on outside click
    document.addEventListener('click', function closeDD(e) {
        if (!e.target.closest('[id^="linkSearch"]') && !e.target.closest('[id^="linkDD"]')) {
            document.querySelectorAll('[id^="linkDD"]').forEach(el => el.style.display = 'none');
        }
    }, { once: false });

    redraw();
    updateTotal();
}
