// ===================================================
// p_receipts.js — Receipt OCR Scanner (Tesseract.js)
// ===================================================

function renderReceipts(container) {

  // ---- State ----
  let _imageBase64 = null;
  let _ocrLines = [];      // raw lines from Tesseract
  let _parsed = [];        // [{ name, price, qty, unit, keep, ingredientId }]
  let _receiptDate = new Date().toISOString().split('T')[0];
  let _receiptNote = '';

  const ings = DB.getAll('ingredients');

  // ---- Helpers ----
  function fmtDate(str) {
    if (!str) return '-';
    const d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ---- OCR Price Parsing ----
  function parseReceiptLines(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
    const results = [];

    // Patterns for price: number with optional comma, optional decimal
    const priceRe = /[\d,]+\.?\d{0,2}/g;

    lines.forEach(line => {
      // Skip lines that look like headers/totals
      if (/รวม|ยอด|total|subtotal|vat|tax|discount|ส่วนลด|change|เงินทอน|receipt|ใบเสร็จ/i.test(line)) return;

      const prices = (line.match(priceRe) || []).map(p => parseFloat(p.replace(/,/g, ''))).filter(p => p > 0 && p < 100000);
      if (!prices.length) return;

      // The price is usually the last number on the line
      const price = prices[prices.length - 1];

      // The name is whatever is left after removing all numbers and common symbols
      let name = line.replace(/[\d,\.]+/g, '').replace(/[฿$*x×]/gi, '').replace(/\s+/g, ' ').trim();

      // Remove trailing/leading dashes, slashes etc.
      name = name.replace(/^[-/\s]+|[-/\s]+$/g, '').trim();

      if (name.length < 1) return;
      if (price <= 0) return;

      // Try to find qty pattern like "2 x 50" or "3x"
      const qtyMatch = line.match(/(\d+)\s*[xX×]\s*[\d.]+/);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

      // Try to auto-match to existing ingredient by name similarity
      let ingredientId = null;
      const nameLower = name.toLowerCase();
      const match = ings.find(i => {
        const iName = i.name.toLowerCase();
        return iName === nameLower || iName.includes(nameLower) || nameLower.includes(iName);
      });
      if (match) ingredientId = match.id;

      results.push({ name, price, qty, unit: 'กก.', keep: true, ingredientId });
    });

    return results;
  }

  // ---- Draw main layout ----
  function renderPage() {
    container.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">🧾 สแกนใบเสร็จ (OCR)</div>
      <div class="page-subtitle">ถ่ายรูปหรืออัพโหลดใบเสร็จ — ระบบอ่านชื่อสินค้าและราคาอัตโนมัติ</div></div>
    </div>

    <!-- Step 1: Upload -->
    <div class="card" style="margin-bottom:20px" id="stepUpload">
      <div style="font-weight:700;font-size:15px;margin-bottom:16px;color:var(--primary)">① อัพโหลดรูปใบเสร็จ</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- Image area -->
        <div>
          <div id="imgArea">
            <label for="receiptFile" id="imgDropZone" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:260px;border:2px dashed var(--border);border-radius:var(--r-lg);cursor:pointer;color:var(--text-muted);background:var(--bg);transition:all 0.2s" onmouseenter="this.style.borderColor='var(--primary)';this.style.background='var(--primary)08'" onmouseleave="this.style.borderColor='var(--border)';this.style.background='var(--bg)'">
              <span style="font-size:52px">📷</span>
              <div style="text-align:center">
                <div style="font-size:14px;font-weight:700">คลิกเพื่ออัพโหลดรูปใบเสร็จ</div>
                <div style="font-size:12px;margin-top:4px">รองรับ JPG, PNG — บนมือถือถ่ายรูปได้เลย</div>
              </div>
              <input type="file" id="receiptFile" accept="image/*" capture="environment" style="display:none" onchange="receiptOnImg(event)" />
            </label>
          </div>
        </div>
        <!-- Date + note -->
        <div style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label class="form-label">📅 วันที่ซื้อ</label>
            <input class="form-input" type="date" id="receiptDate" value="${_receiptDate}" oninput="_receiptDate=this.value" />
          </div>
          <div>
            <label class="form-label">🏪 ชื่อร้าน / ตลาด</label>
            <input class="form-input" id="receiptNote" placeholder="เช่น ตลาดสดท่าเรือ, Makro" oninput="_receiptNote=this.value" />
          </div>
          <button class="btn btn-primary" style="margin-top:auto" onclick="document.getElementById('receiptFile').click()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            เลือกรูป / ถ่ายภาพ
          </button>
        </div>
      </div>
    </div>

    <!-- OCR Progress -->
    <div id="ocrProgress" style="display:none;margin-bottom:20px">
      <div class="card" style="text-align:center;padding:36px">
        <div style="font-size:40px;margin-bottom:12px">🔍</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:8px">กำลังอ่านข้อความจากใบเสร็จ...</div>
        <div id="ocrStatus" style="font-size:13px;color:var(--text-muted);margin-bottom:16px">กำลังโหลด OCR engine...</div>
        <div style="background:var(--bg);border-radius:99px;height:8px;overflow:hidden;max-width:300px;margin:0 auto">
          <div id="ocrBar" style="height:100%;background:var(--primary);width:0%;transition:width 0.3s;border-radius:99px"></div>
        </div>
      </div>
    </div>

    <!-- Step 2: Review results -->
    <div id="stepReview" style="display:none;margin-bottom:20px">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="font-weight:700;font-size:15px;color:var(--primary)">② ตรวจสอบรายการที่อ่านได้</div>
          <div style="display:flex;gap:8px;align-items:center">
            <span id="parsedCount" style="font-size:13px;color:var(--text-muted)"></span>
            <button class="btn btn-ghost btn-sm" onclick="receiptOnImg(null, true)">🔄 สแกนใหม่</button>
          </div>
        </div>

        <!-- Split: image + table -->
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px">
          <!-- Receipt image (smaller) -->
          <div id="previewImgWrap" style="position:sticky;top:20px"></div>

          <!-- Results table -->
          <div>
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead><tr style="background:var(--bg)">
                  <th style="padding:8px;text-align:center;width:36px">✓</th>
                  <th style="padding:8px;text-align:left">ชื่อสินค้า (จากใบเสร็จ)</th>
                  <th style="padding:8px;text-align:right;width:90px">ราคา (฿)</th>
                  <th style="padding:8px;text-align:center;width:70px">จำนวน</th>
                  <th style="padding:8px;text-align:left;width:70px">หน่วย</th>
                  <th style="padding:8px;text-align:left">เชื่อมวัตถุดิบ</th>
                </tr></thead>
                <tbody id="parsedRows"></tbody>
              </table>
            </div>
            <div id="parsedSummary" style="margin-top:12px;padding:10px 12px;background:var(--bg);border-radius:var(--r-md);font-size:13px"></div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
              <button class="btn btn-secondary" onclick="receiptClearAll()">✕ ยกเลิก</button>
              <button class="btn btn-primary" onclick="receiptSaveApply()">
                ✅ บันทึก &amp; อัพเดตวัตถุดิบ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- History -->
    <div style="font-weight:700;font-size:16px;margin-bottom:14px;padding-top:8px;border-top:1px solid var(--border)">🗂 ประวัติใบเสร็จ</div>
    <div id="receiptHistory" style="display:flex;flex-direction:column;gap:12px"></div>
    `;

    drawHistory();
  }

  // ---- Draw OCR results table ----
  function drawParsedRows() {
    const tbody = document.getElementById('parsedRows');
    if (!tbody) return;
    if (!_parsed.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">ไม่พบรายการในใบเสร็จ — ลองปรับแสงรูปให้ชัดขึ้น</td></tr>`;
      return;
    }
    tbody.innerHTML = _parsed.map((row, idx) => {
      const linked = row.ingredientId ? ings.find(i => i.id === row.ingredientId) : null;
      return `<tr style="border-bottom:1px solid var(--border-light);${!row.keep ? 'opacity:0.4' : ''}">
        <td style="text-align:center;padding:6px">
          <input type="checkbox" class="form-checkbox" ${row.keep ? 'checked' : ''} onchange="_parsed[${idx}].keep=this.checked;drawParsedRowsInline()" style="accent-color:var(--primary)" />
        </td>
        <td style="padding:6px">
          <input class="form-input" style="font-size:12px;min-height:32px" value="${row.name}" oninput="_parsed[${idx}].name=this.value" />
        </td>
        <td style="padding:6px">
          <input class="form-input" type="number" style="font-size:12px;min-height:32px;text-align:right" value="${row.price}" min="0" step="0.01" oninput="_parsed[${idx}].price=parseFloat(this.value)||0;updateParsedSummary()" />
        </td>
        <td style="padding:6px">
          <input class="form-input" type="number" style="font-size:12px;min-height:32px;text-align:center" value="${row.qty}" min="0.001" step="0.001" oninput="_parsed[${idx}].qty=parseFloat(this.value)||1" />
        </td>
        <td style="padding:6px">
          <input class="form-input" style="font-size:12px;min-height:32px" value="${row.unit}" oninput="_parsed[${idx}].unit=this.value" />
        </td>
        <td style="padding:6px;min-width:150px">
          ${linked
          ? `<div style="display:flex;align-items:center;gap:6px">
                <span style="background:var(--success)22;color:var(--success);padding:2px 8px;border-radius:99px;font-size:11px;white-space:nowrap">✔ ${linked.name}</span>
                <button onclick="_parsed[${idx}].ingredientId=null;drawParsedRowsInline()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:13px">✕</button>
              </div>`
          : `<div style="position:relative">
                <input class="form-input" style="font-size:12px;min-height:32px" id="ls${idx}" placeholder="ค้นหาวัตถุดิบ..." oninput="filterIngLink(${idx})" onfocus="showIngLink(${idx})" autocomplete="off" />
                <div id="ld${idx}" style="display:none;position:fixed;width:210px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);max-height:160px;overflow-y:auto;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.7)">
                  ${ings.map(i => `<div class="dropdown-item" onclick="linkIng(${idx},${i.id})" style="padding:7px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border-light)">
                    <div style="font-weight:600">${i.name}</div><div style="color:var(--text-muted);font-size:11px">${i.group || ''} · ${i.recipeUnit || i.buyUnit}</div>
                  </div>`).join('')}
                  <div class="dropdown-item" onclick="linkNew(${idx})" style="padding:7px 12px;cursor:pointer;font-size:12px;color:var(--primary);font-weight:600;background:var(--primary)11">
                    ➕ เพิ่มวัตถุดิบใหม่ "${_parsed[${ idx }] ?_parsed[${ idx }].name: ''
    }"
                  </div >
                </div >
              </div > `}
        </td>
      </tr>`;
  }).join('');
  updateParsedSummary();
}

// ---- Draw receipt history ----
function drawHistory() {
  const el = document.getElementById('receiptHistory');
  if (!el) return;
  const receipts = DB.getReceipts();
  if (!receipts.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px">ยังไม่มีใบเสร็จที่บันทึกไว้</div>`;
    return;
  }
  el.innerHTML = receipts.map(r => {
    const applied = (r.items || []).filter(i => i.ingredientId).length;
    return `<div class="card" style="display:flex;gap:16px;align-items:flex-start;padding:16px">
        ${r.imageBase64
        ? `<img src="${r.imageBase64}" style="width:72px;height:72px;object-fit:cover;border-radius:var(--r-md);flex-shrink:0;border:1px solid var(--border);cursor:zoom-in" onclick="window.open(this.src,'_blank')" />`
        : `<div style="width:72px;height:72px;background:var(--bg);border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">🧾</div>`}
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <div style="font-weight:700">📅 ${fmtDate(r.date)}${r.note ? ` · ${r.note}` : ''}</div>
            <button onclick="deleteReceipt(${r.id})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:18px;padding:0">🗑</button>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${(r.items || []).length} รายการ · อัพเดตวัตถุดิบแล้ว ${applied} รายการ</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${(r.items || []).map(item => `<span style="font-size:11px;padding:2px 9px;border-radius:99px;background:${item.ingredientId ? 'var(--success)22' : 'var(--bg)'};color:${item.ingredientId ? 'var(--success)' : 'var(--text-muted)'};border:1px solid ${item.ingredientId ? 'var(--success)44' : 'var(--border)'}">
              ${item.ingredientId ? '✔ ' : ''}${item.name}${item.price ? ` ฿${Number(item.price).toFixed(2)}` : ''}
            </span>`).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ---- OCR ----
window.receiptOnImg = async function (e, rescan = false) {
  if (e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { _imageBase64 = ev.target.result; doOCR(); };
    reader.readAsDataURL(file);
  } else if (rescan && _imageBase64) {
    doOCR();
  }
};

async function doOCR() {
  // Show progress, hide review
  document.getElementById('ocrProgress').style.display = '';
  document.getElementById('stepReview').style.display = 'none';
  document.getElementById('stepUpload').style.display = 'none';

  try {
    // Ensure Tesseract is loaded
    if (typeof Tesseract === 'undefined') {
      document.getElementById('ocrStatus').textContent = 'โหลด OCR engine...';
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    const setStatus = (msg, pct) => {
      const el = document.getElementById('ocrStatus');
      const bar = document.getElementById('ocrBar');
      if (el) el.textContent = msg;
      if (bar) bar.style.width = pct + '%';
    };

    setStatus('กำลังประมวลผลรูป...', 10);

    const result = await Tesseract.recognize(_imageBase64, 'tha+eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          setStatus(`กำลังอ่านข้อความ... ${Math.round(m.progress * 100)}%`, Math.round(m.progress * 90) + 5);
        }
      }
    });

    setStatus('วิเคราะห์รายการ...', 97);
    const text = result.data.text;
    _ocrLines = text.split('\n');
    _parsed = parseReceiptLines(text);

    setStatus('เสร็จแล้ว!', 100);
    await new Promise(r => setTimeout(r, 400));

    // Show review
    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('stepReview').style.display = '';

    // Set preview image
    const pw = document.getElementById('previewImgWrap');
    if (pw) pw.innerHTML = `<img src="${_imageBase64}" style="width:100%;border-radius:var(--r-md);object-fit:contain;max-height:500px;border:1px solid var(--border);cursor:zoom-in" onclick="window.open(this.src,'_blank')" />`;

    const cnt = document.getElementById('parsedCount');
    if (cnt) cnt.textContent = `พบ ${_parsed.length} รายการ`;

    // expose _parsed for inline ops
    window._parsed = _parsed;
    drawParsedRows();

  } catch (err) {
    document.getElementById('ocrProgress').style.display = 'none';
    document.getElementById('stepUpload').style.display = '';
    Toast.show('OCR Error: ' + err.message, 'error');
    console.error(err);
  }
}

// ---- Inline helpers exposed to DOM ----
window.drawParsedRowsInline = drawParsedRows;

window.updateParsedSummary = function () {
  const el = document.getElementById('parsedSummary');
  if (!el) return;
  const active = _parsed.filter(r => r.keep);
  const linked = active.filter(r => r.ingredientId);
  const total = active.reduce((s, r) => s + (r.price || 0), 0);
  el.innerHTML = `เลือก <strong>${active.length}</strong> รายการ · เชื่อมวัตถุดิบแล้ว <strong style="color:var(--success)">${linked.length}</strong> รายการ · รวม <strong style="color:var(--primary)">฿${total.toFixed(2)}</strong>`;
};

window.showIngLink = function (idx) {
  const input = document.getElementById(`ls${idx}`);
  const dd = document.getElementById(`ld${idx}`);
  if (!dd || !input) return;
  const rect = input.getBoundingClientRect();
  dd.style.top = (rect.bottom + 4 + window.scrollY) + 'px';
  dd.style.left = rect.left + 'px';
  dd.style.display = 'block';
  document.querySelectorAll('[id^="ld"]').forEach(el => { if (el !== dd) el.style.display = 'none'; });
};

window.filterIngLink = function (idx) {
  const val = (document.getElementById(`ls${idx}`)?.value || '').toLowerCase();
  document.querySelectorAll(`#ld${idx} .dropdown-item`).forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(val) ? '' : 'none';
  });
};

window.linkIng = function (idx, ingId) {
  _parsed[idx].ingredientId = ingId;
  const ing = ings.find(i => i.id === ingId);
  if (ing && !_parsed[idx].unit) _parsed[idx].unit = ing.buyUnit || ing.recipeUnit || '';
  drawParsedRows();
};

window.linkNew = function (idx) {
  const row = _parsed[idx];
  // Insert new ingredient with placeholder
  const newIng = DB.insert('ingredients', {
    name: row.name,
    group: 'อื่นๆ',
    buyUnit: row.unit || 'กก.',
    buyQty: row.qty || 1,
    buyPrice: row.price || 0,
    recipeUnit: row.unit || 'กก.',
    convFactor: 1,
    customPrice: null, basePrice: 0,
    priceMode: 'manual',
    webhookPrice: null, lastUpdated: null
  });
  ings.push(newIng);
  _parsed[idx].ingredientId = newIng.id;
  if (row.price > 0) DB.recordPriceHistory(newIng.id, row.price / ((row.qty || 1)), '🧾 New');
  Toast.show(`เพิ่มวัตถุดิบ "${row.name}" แล้ว`, 'success');
  drawParsedRows();
};

window.receiptSaveApply = function () {
  const active = _parsed.filter(r => r.keep);
  if (!active.length) { Toast.show('กรุณาเลือกรายการอย่างน้อย 1 รายการ', 'error'); return; }

  const receiptTs = new Date(_receiptDate).getTime() || Date.now();
  let updated = 0, added = 0;

  active.forEach(row => {
    if (!row.ingredientId) return;
    const ing = DB.getById('ingredients', row.ingredientId);
    if (!ing) return;
    const oldPrice = DB.effectivePrice(ing);
    const newPpu = row.price / ((row.qty || 1) * (ing.convFactor || 1));

    DB.update('ingredients', row.ingredientId, {
      buyPrice: row.price,
      buyQty: row.qty || 1,
      buyUnit: row.unit || ing.buyUnit,
    });

    if (Math.abs(newPpu - oldPrice) > 0.00001) {
      const hist = DB._get('priceHistory') || [];
      hist.push({
        id: receiptTs + row.ingredientId + Math.random(),
        ingredientId: row.ingredientId,
        price: newPpu,
        timestamp: receiptTs,
        note: `🧾 ${_receiptNote || 'ใบเสร็จ'}`
      });
      DB._set('priceHistory', hist);
      updated++;
    }
  });

  DB.saveReceipt({
    date: _receiptDate, note: _receiptNote,
    imageBase64: _imageBase64,
    items: active.map(r => ({ ...r })),
    createdAt: Date.now()
  });

  Toast.show(`✅ บันทึกใบเสร็จแล้ว · อัพเดตราคา ${updated} วัตถุดิบ`, 'success');
  receiptClearAll();
};

window.receiptClearAll = function () {
  _imageBase64 = null; _parsed = []; _ocrLines = [];
  _receiptDate = new Date().toISOString().split('T')[0];
  _receiptNote = '';
  document.getElementById('stepUpload').style.display = '';
  document.getElementById('stepReview').style.display = 'none';
  document.getElementById('ocrProgress').style.display = 'none';
  // Reset file input
  const fi = document.getElementById('receiptFile');
  if (fi) fi.value = '';
  drawHistory();
};

window.deleteReceipt = function (id) {
  if (!confirm('ลบประวัติใบเสร็จนี้?')) return;
  DB.deleteReceipt(id);
  drawHistory();
  Toast.show('ลบใบเสร็จแล้ว', 'info');
};

// Close dropdowns
document.addEventListener('click', e => {
  if (!e.target.id?.startsWith('ls') && !e.target.closest('[id^="ld"]')) {
    document.querySelectorAll('[id^="ld"]').forEach(el => el.style.display = 'none');
  }
});

renderPage();
}
