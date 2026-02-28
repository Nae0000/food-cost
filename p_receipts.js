// ===================================================
// p_receipts.js — Receipt OCR Scanner (Tesseract.js)
// ===================================================

function renderReceipts(container) {

  var _imageBase64 = null;
  var _parsed = [];
  var _receiptDate = new Date().toISOString().split('T')[0];
  var _receiptNote = '';

  var ings = DB.getAll('ingredients');

  function fmtDate(str) {
    if (!str) return '-';
    var d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ---- Smart receipt parser — uses Tesseract line/word data ----
  function parseReceiptData(ocrResult) {
    var results = [];

    // Keywords that signal non-product lines
    var SKIP_RE = /合計|小計|消費税|税込|外税|内税|税|割引|値引|お釣|おつり|ありがとう|レシート|領収|お買上|点数|会員|ポイント|担当|電話|住所|〒|TEL|FAX|receipt|total|subtotal|vat|\btax\b|discount|change|รวม|ยอด|ส่วนลด|เงินทอน|ใบเสร็จ|สาขา|เบอร์|หน้า|^\s*\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}/i;
    var YEN_RE = /[¥]\s*([\d,]+)/;
    var EN_RE = /([\d,]+)\s*円/;
    var QTY_RE = /(\d+(?:\.\d+)?)\s*[×xX\*]\s*[\d.]+/;
    var QTY_UNIT_RE = /(\d+(?:\.\d+)?)\s*(?:個|本|袋|枚|缶|パック|冊|本|ชิ้น|ขวด|กก|กรัม)/;

    // Use Tesseract's line objects if available (higher accuracy)
    var lines = [];
    if (ocrResult.lines && ocrResult.lines.length) {
      lines = ocrResult.lines
        .filter(function (ln) { return ln.confidence > 25 && ln.text && ln.text.trim().length > 1; })
        .map(function (ln) { return ln.text.trim(); });
    } else {
      lines = ocrResult.text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 1; });
    }

    lines.forEach(function (line) {
      // --- Non-product filter ---
      if (SKIP_RE.test(line)) return;

      // Meaningful chars = Thai/JP/Kana/Latin — must be enough to be a product name
      var meaningful = line.replace(/[^\u0e00-\u0e7f\u3000-\u9fff\u30a0-\u30ffa-zA-Z]/g, '');
      if (!meaningful || meaningful.length < 1) return;
      // Ratio filter: if mostly digits/symbols, skip (e.g. barcodes, dates)
      var ratio = meaningful.length / line.replace(/\s/g, '').length;
      if (ratio < 0.12) return;

      // --- Price ---
      var price = 0;
      var yenM = line.match(YEN_RE);
      var enM = line.match(EN_RE);
      if (yenM) {
        price = parseFloat(yenM[1].replace(/,/g, ''));
      } else if (enM) {
        price = parseFloat(enM[1].replace(/,/g, ''));
      } else {
        var allNums = (line.match(/[\d,]+(?:\.\d{1,2})?/g) || [])
          .map(function (n) { return parseFloat(n.replace(/,/g, '')); })
          .filter(function (n) { return n > 0 && n < 200000; });
        if (allNums.length) price = allNums[allNums.length - 1];
      }
      if (price <= 0) return;

      // --- Quantity ---
      var qty = 1;
      var qtyM = line.match(QTY_RE);
      if (qtyM) {
        qty = parseFloat(qtyM[1]) || 1;
      } else {
        var qtyU = line.match(QTY_UNIT_RE);
        if (qtyU) qty = parseFloat(qtyU[1]) || 1;
      }

      // --- Name: strip price / qty tokens, keep text ---
      var name = line;
      if (yenM) name = name.replace(YEN_RE, '');
      if (enM) name = name.replace(EN_RE, '');
      // Remove qty×price pattern
      name = name.replace(/(\d+(?:\.\d+)?)\s*[×xX\*]\s*[\d.,]+/g, '');
      // Remove unit qty (e.g. 2個)
      name = name.replace(/(\d+(?:\.\d+)?)\s*(?:個|本|袋|枚|缶|パック|ชิ้น|ขวด|กก|กรัม)/g, '');
      // Remove remaining numbers and symbols
      name = name
        .replace(/[\d,]+(?:\.\d{1,2})?/g, '')
        .replace(/[¥฿$*\\]/g, '')
        .replace(/[|\(\)\[\]{}「」【】〔〕]/g, ' ')
        .replace(/\s+/g, ' ').trim()
        .replace(/^[\s\-\/\.\*]+|[\s\-\/\.\*]+$/g, '').trim();

      // Final name quality check
      var nameCheck = name.replace(/[^\u0e00-\u0e7f\u3000-\u9fff\u30a0-\u30ffa-zA-Z]/g, '');
      if (!nameCheck || nameCheck.length < 1) return;

      // --- Auto-match ingredient ---
      var ingredientId = null;
      var nameLower = name.toLowerCase();
      for (var k = 0; k < ings.length; k++) {
        var iName = ings[k].name.toLowerCase();
        if (iName === nameLower || iName.includes(nameLower) || nameLower.includes(iName)) {
          ingredientId = ings[k].id; break;
        }
      }

      results.push({ name: name, price: price, qty: qty, unit: 'กก.', keep: true, ingredientId: ingredientId });
    });

    return results;
  }

  // ---- Draw rows ----
  function drawParsedRows() {
    var tbody = document.getElementById('parsedRows');
    if (!tbody) return;
    if (!_parsed.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">ไม่พบรายการ — ลองปรับแสงรูปให้ชัดขึ้น</td></tr>';
      return;
    }
    var html = '';
    for (var i = 0; i < _parsed.length; i++) {
      var row = _parsed[i];
      var linked = row.ingredientId ? ings.find(function (x) { return x.id === row.ingredientId; }) : null;
      var linkedHtml = '';
      if (linked) {
        linkedHtml = '<div style="display:flex;align-items:center;gap:6px">'
          + '<span style="background:var(--success)22;color:var(--success);padding:2px 8px;border-radius:99px;font-size:11px;white-space:nowrap">✔ ' + linked.name + '</span>'
          + '<button onclick="rcUnlink(' + i + ')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:13px">✕</button>'
          + '</div>';
      } else {
        var ddItems = '';
        for (var j = 0; j < ings.length; j++) {
          ddItems += '<div class="dropdown-item" onclick="rcLink(' + i + ',' + ings[j].id + ')" style="padding:7px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border-light)">'
            + '<div style="font-weight:600">' + ings[j].name + '</div>'
            + '<div style="color:var(--text-muted);font-size:11px">' + (ings[j].group || '') + ' · ' + (ings[j].recipeUnit || ings[j].buyUnit) + '</div>'
            + '</div>';
        }
        ddItems += '<div class="dropdown-item" onclick="rcLinkNew(' + i + ')" style="padding:7px 12px;cursor:pointer;font-size:12px;color:var(--primary);font-weight:600;background:var(--primary)11">'
          + '➕ เพิ่มวัตถุดิบใหม่'
          + '</div>';
        linkedHtml = '<div style="position:relative">'
          + '<input class="form-input" style="font-size:12px;min-height:32px" id="rcls' + i + '" placeholder="ค้นหาวัตถุดิบ..." oninput="rcFilter(' + i + ')" onfocus="rcShow(' + i + ')" autocomplete="off" />'
          + '<div id="rcdd' + i + '" style="display:none;position:fixed;width:210px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);max-height:160px;overflow-y:auto;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.7)">'
          + ddItems
          + '</div></div>';
      }

      html += '<tr style="border-bottom:1px solid var(--border-light);' + (!row.keep ? 'opacity:0.4' : '') + '">'
        + '<td style="text-align:center;padding:6px"><input type="checkbox" class="form-checkbox" ' + (row.keep ? 'checked' : '') + ' onchange="rcToggle(' + i + ',this.checked)" style="accent-color:var(--primary)" /></td>'
        + '<td style="padding:6px"><input class="form-input" style="font-size:12px;min-height:32px" value="' + row.name + '" oninput="rcName(' + i + ',this.value)" /></td>'
        + '<td style="padding:6px"><input class="form-input" type="number" style="font-size:12px;min-height:32px;text-align:right" value="' + row.price + '" min="0" step="0.01" oninput="rcPrice(' + i + ',this.value)" /></td>'
        + '<td style="padding:6px"><input class="form-input" type="number" style="font-size:12px;min-height:32px;text-align:center" value="' + row.qty + '" min="0.001" step="0.001" oninput="rcQty(' + i + ',this.value)" /></td>'
        + '<td style="padding:6px"><input class="form-input" style="font-size:12px;min-height:32px" value="' + row.unit + '" oninput="rcUnit(' + i + ',this.value)" /></td>'
        + '<td style="padding:6px;min-width:150px">' + linkedHtml + '</td>'
        + '</tr>';
    }
    tbody.innerHTML = html;
    rcUpdateSummary();
  }

  function drawHistory() {
    var el = document.getElementById('receiptHistory');
    if (!el) return;
    var receipts = DB.getReceipts();
    if (!receipts.length) { el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px">ยังไม่มีใบเสร็จที่บันทึกไว้</div>'; return; }
    var html = '';
    receipts.forEach(function (r) {
      var items = r.items || [];
      var applied = items.filter(function (i) { return i.ingredientId; }).length;
      var imgHtml = r.imageBase64
        ? '<img src="' + r.imageBase64 + '" style="width:72px;height:72px;object-fit:cover;border-radius:var(--r-md);flex-shrink:0;border:1px solid var(--border);cursor:zoom-in" onclick="window.open(this.src,\'_blank\')" />'
        : '<div style="width:72px;height:72px;background:var(--bg);border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">🧾</div>';
      var pills = items.map(function (item) {
        return '<span style="font-size:11px;padding:2px 9px;border-radius:99px;background:' + (item.ingredientId ? 'var(--success)22' : 'var(--bg)') + ';color:' + (item.ingredientId ? 'var(--success)' : 'var(--text-muted)') + ';border:1px solid ' + (item.ingredientId ? 'var(--success)44' : 'var(--border)') + '">' + (item.ingredientId ? '✔ ' : '') + item.name + (item.price ? ' ฿' + Number(item.price).toFixed(2) : '') + '</span>';
      }).join('');
      html += '<div class="card" style="display:flex;gap:16px;align-items:flex-start;padding:16px">'
        + imgHtml
        + '<div style="flex:1;min-width:0">'
        + '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><div style="font-weight:700">📅 ' + fmtDate(r.date) + (r.note ? ' · ' + r.note : '') + '</div>'
        + '<button onclick="rcDeleteReceipt(' + r.id + ')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:18px;padding:0">🗑</button></div>'
        + '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">' + items.length + ' รายการ · อัพเดตแล้ว ' + applied + ' รายการ</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:6px">' + pills + '</div>'
        + '</div></div>';
    });
    el.innerHTML = html;
  }

  // ---- Render page HTML ----
  container.innerHTML = [
    '<div class="page-header">',
    '  <div><div class="page-title">🧾 สแกนใบเสร็จ (OCR)</div>',
    '  <div class="page-subtitle">ถ่ายรูปหรืออัพโหลดใบเสร็จ — ระบบอ่านชื่อสินค้าและราคาอัตโนมัติ</div></div>',
    '</div>',

    '<div class="card" style="margin-bottom:20px" id="stepUpload">',
    '  <div style="font-weight:700;font-size:15px;margin-bottom:16px;color:var(--primary)">① อัพโหลดรูปใบเสร็จ</div>',
    '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">',
    '    <div id="imgArea">',
    '      <label for="rcFile" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:240px;border:2px dashed var(--border);border-radius:var(--r-lg);cursor:pointer;color:var(--text-muted);background:var(--bg);transition:all 0.2s" onmouseenter="this.style.borderColor=\'var(--primary)\'" onmouseleave="this.style.borderColor=\'var(--border)\'">',
    '        <span style="font-size:52px">📷</span>',
    '        <div style="text-align:center"><div style="font-size:14px;font-weight:700">คลิกเพื่ออัพโหลดรูปใบเสร็จ</div><div style="font-size:12px;margin-top:4px">รองรับ JPG, PNG — บนมือถือถ่ายรูปได้เลย</div></div>',
    '        <input type="file" id="rcFile" accept="image/*" capture="environment" style="display:none" onchange="rcOnImg(event)" />',
    '      </label>',
    '    </div>',
    '    <div style="display:flex;flex-direction:column;gap:14px">',
    '      <div><label class="form-label">📅 วันที่ซื้อ</label><input class="form-input" type="date" id="rcDate" value="' + _receiptDate + '" oninput="window._rcDate=this.value" /></div>',
    '      <div><label class="form-label">🏪 ชื่อร้าน / ตลาด</label><input class="form-input" id="rcNote" placeholder="เช่น ตลาดสดท่าเรือ, Makro" oninput="window._rcNote=this.value" /></div>',
    '      <div>',
    '        <label class="form-label">🌐 ภาษาในใบเสร็จ</label>',
    '        <select class="form-select" id="rcLang">',
    '          <option value="tha+eng">🇹🇭 ภาษาไทย + อังกฤษ</option>',
    '          <option value="jpn" selected>🇯🇵 ภาษาญี่ปุ่น</option>',
    '          <option value="jpn+eng">🇯🇵 ญี่ปุ่น + อังกฤษ</option>',
    '          <option value="tha+eng+jpn">🌐 ทุกภาษา (ช้ากว่า)</option>',
    '        </select>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',

    '<div id="ocrProgress" style="display:none;margin-bottom:20px">',
    '  <div class="card" style="text-align:center;padding:36px">',
    '    <div style="font-size:40px;margin-bottom:12px">🔍</div>',
    '    <div style="font-weight:700;font-size:16px;margin-bottom:8px">กำลังอ่านข้อความจากใบเสร็จ...</div>',
    '    <div id="ocrStatus" style="font-size:13px;color:var(--text-muted);margin-bottom:16px">กำลังโหลด OCR engine...</div>',
    '    <div style="background:var(--bg);border-radius:99px;height:8px;overflow:hidden;max-width:300px;margin:0 auto">',
    '      <div id="ocrBar" style="height:100%;background:var(--primary);width:0%;transition:width 0.3s;border-radius:99px"></div>',
    '    </div>',
    '  </div>',
    '</div>',

    '<div id="stepReview" style="display:none;margin-bottom:20px">',
    '  <div class="card">',
    '    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">',
    '      <div style="font-weight:700;font-size:15px;color:var(--primary)">② ตรวจสอบรายการที่อ่านได้</div>',
    '      <div style="display:flex;gap:8px;align-items:center"><span id="parsedCount" style="font-size:13px;color:var(--text-muted)"></span>',
    '      <button class="btn btn-ghost btn-sm" onclick="rcToggleAll(false)" title="ติ๊กออกทั้งหมด">☐ ติ๊กออกทั้งหมด</button>',
    '      <button class="btn btn-ghost btn-sm" onclick="rcToggleAll(true)" title="เลือกทั้งหมด">☑ เลือกทั้งหมด</button>',
    '      <button class="btn btn-ghost btn-sm" onclick="rcRescan()">🔄 สแกนใหม่</button></div>',
    '    </div>',
    '    <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px">',
    '      <div id="previewImgWrap" style="position:sticky;top:20px;align-self:start"></div>',
    '      <div>',
    '        <div style="overflow-x:auto">',
    '          <table style="width:100%;border-collapse:collapse;font-size:13px">',
    '            <thead><tr style="background:var(--bg)">',
    '              <th style="padding:8px;text-align:center;width:36px"><input type="checkbox" id="rcSelectAll" checked onchange="rcToggleAll(this.checked)" style="accent-color:var(--primary);width:15px;height:15px;cursor:pointer" title="เลือก/ติ๊กออกทั้งหมด" /></th>',
    '              <th style="padding:8px;text-align:left">ชื่อสินค้า</th>',
    '              <th style="padding:8px;text-align:right;width:90px">ราคา (฿)</th>',
    '              <th style="padding:8px;text-align:center;width:70px">จำนวน</th>',
    '              <th style="padding:8px;text-align:left;width:70px">หน่วย</th>',
    '              <th style="padding:8px;text-align:left">เชื่อมวัตถุดิบ</th>',
    '            </tr></thead>',
    '            <tbody id="parsedRows"></tbody>',
    '          </table>',
    '        </div>',
    '        <div id="parsedSummary" style="margin-top:12px;padding:10px 12px;background:var(--bg);border-radius:var(--r-md);font-size:13px"></div>',
    '        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">',
    '          <button class="btn btn-secondary" onclick="rcClear()">✕ ยกเลิก</button>',
    '          <button class="btn btn-primary" onclick="rcSave()">✅ บันทึก &amp; อัพเดตวัตถุดิบ</button>',
    '        </div>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',

    '<div style="font-weight:700;font-size:16px;margin-bottom:14px;padding-top:8px;border-top:1px solid var(--border)">🗂 ประวัติใบเสร็จ</div>',
    '<div id="receiptHistory" style="display:flex;flex-direction:column;gap:12px"></div>'
  ].join('\n');

  // Init global state
  window._rcDate = _receiptDate;
  window._rcNote = '';
  window._rcParsed = _parsed;

  // ---- OCR ----
  window.rcOnImg = async function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) { _imageBase64 = ev.target.result; rcDoOCR(); };
    reader.readAsDataURL(file);
  };

  window.rcRescan = function () { if (_imageBase64) rcDoOCR(); };

  async function rcDoOCR() {
    if (!_settings.geminiApiKey) {
      Toast.show('กรุณาใส่ Gemini API Key ในเมนู ตั้งค่า ก่อนใช้งาน', 'error');
      return;
    }

    document.getElementById('ocrProgress').style.display = '';
    document.getElementById('stepReview').style.display = 'none';
    document.getElementById('stepUpload').style.display = 'none';

    function setStatus(msg, pct) {
      var el = document.getElementById('ocrStatus');
      var bar = document.getElementById('ocrBar');
      if (el) el.textContent = msg;
      if (bar) bar.style.width = pct + '%';
    }

    try {
      setStatus('ส่งรูปให้ AI วิเคราะห์...', 20);

      // Clean base64 string
      const base64Data = _imageBase64.split(',')[1];
      const mimeType = _imageBase64.split(';')[0].split(':')[1];

      // Build Gemini Payload
      const payload = {
        "contents": [
          {
            "parts": [
              { "text": "You are a professional data extractor. Read this receipt image. Translate all non-Thai item names to valid Thai. Ignore non-food items, taxes, totals, and discounts. Return ONLY a valid JSON array of objects with keys: `name` (string, valid Thai name of the ingredient), `qty` (number), `unit` (string, e.g., กก., กรัม, ชิ้น, แพ็ค), and `price` (number in original currency but clean digits only). DO NOT WRAP IN MARKDOWN BACKTICKS. JUST STRICT JSON ARRAY." },
              {
                "inline_data": {
                  "mime_type": mimeType,
                  "data": base64Data
                }
              }
            ]
          }
        ]
      };

      setStatus('AI กำลังอ่านและแปลภาษา...', 60);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${_settings.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

      // Clean up markdown markers if Gemini ignores the prompt instruction
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

      setStatus('รวบรวมข้อมูล...', 90);

      let items = [];
      try {
        items = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse Gemini JSON:', rawText);
        throw new Error('AI ส่งข้อมูลกลับมาไม่ถูกต้อง');
      }

      // Map back to our structure and find matching ingredients
      _parsed = items.map(item => {
        let ingredientId = null;
        let nameLower = item.name.toLowerCase();
        for (let k = 0; k < ings.length; k++) {
          let iName = ings[k].name.toLowerCase();
          if (iName === nameLower || iName.includes(nameLower) || nameLower.includes(iName)) {
            ingredientId = ings[k].id; break;
          }
        }
        return {
          name: item.name,
          price: parseFloat(item.price) || 0,
          qty: parseFloat(item.qty) || 1,
          unit: item.unit || 'ชิ้น',
          keep: true,
          ingredientId: ingredientId
        };
      });

      window._rcParsed = _parsed;

      setStatus('เสร็จแล้ว!', 100);
      await new Promise(function (r) { setTimeout(r, 400); });

      document.getElementById('ocrProgress').style.display = 'none';
      document.getElementById('stepReview').style.display = '';

      var pw = document.getElementById('previewImgWrap');
      if (pw) pw.innerHTML = '<img src="' + _imageBase64 + '" style="width:100%;border-radius:var(--r-md);object-fit:contain;max-height:500px;border:1px solid var(--border);cursor:zoom-in" onclick="window.open(this.src,\'_blank\')" />';

      var cnt = document.getElementById('parsedCount');
      if (cnt) cnt.textContent = 'พบ ' + _parsed.length + ' รายการ';

      drawParsedRows();
    } catch (err) {
      document.getElementById('ocrProgress').style.display = 'none';
      document.getElementById('stepUpload').style.display = '';
      Toast.show('AI Error: ' + err.message, 'error');
    }
  }

  // ---- Row helpers (global) ----
  window.rcToggle = function (i, v) { _parsed[i].keep = v; drawParsedRows(); };
  window.rcName = function (i, v) { _parsed[i].name = v; };
  window.rcPrice = function (i, v) { _parsed[i].price = parseFloat(v) || 0; rcUpdateSummary(); };
  window.rcQty = function (i, v) { _parsed[i].qty = parseFloat(v) || 1; };
  window.rcUnit = function (i, v) { _parsed[i].unit = v; };
  window.rcUnlink = function (i) { _parsed[i].ingredientId = null; drawParsedRows(); };

  window.rcToggleAll = function (val) {
    _parsed.forEach(function (r) { r.keep = val; });
    // Sync master checkbox
    var cb = document.getElementById('rcSelectAll');
    if (cb) cb.checked = val;
    drawParsedRows();
  };

  window.rcShow = function (i) {
    var inp = document.getElementById('rcls' + i);
    var dd = document.getElementById('rcdd' + i);
    if (!dd || !inp) return;
    var rect = inp.getBoundingClientRect();
    dd.style.top = (rect.bottom + 2 + window.scrollY) + 'px';
    dd.style.left = rect.left + 'px';
    dd.style.display = 'block';
    document.querySelectorAll('[id^="rcdd"]').forEach(function (el) { if (el !== dd) el.style.display = 'none'; });
  };

  window.rcFilter = function (i) {
    var val = (document.getElementById('rcls' + i) ? document.getElementById('rcls' + i).value : '').toLowerCase();
    var dd = document.getElementById('rcdd' + i);
    if (!dd) return;
    dd.querySelectorAll('.dropdown-item').forEach(function (el) { el.style.display = el.textContent.toLowerCase().includes(val) ? '' : 'none'; });
  };

  window.rcLink = function (i, ingId) {
    _parsed[i].ingredientId = ingId;
    var ing = ings.find(function (x) { return x.id === ingId; });
    if (ing && !_parsed[i].unit) _parsed[i].unit = ing.buyUnit || ing.recipeUnit || '';
    drawParsedRows();
  };

  window.rcLinkNew = function (i) {
    var row = _parsed[i];
    var newIng = DB.insert('ingredients', {
      name: row.name, group: 'อื่นๆ',
      buyUnit: row.unit || 'กก.', buyQty: row.qty || 1, buyPrice: row.price || 0,
      recipeUnit: row.unit || 'กก.', convFactor: 1,
      customPrice: null, basePrice: 0, priceMode: 'manual',
      webhookPrice: null, lastUpdated: null
    });
    ings.push(newIng);
    _parsed[i].ingredientId = newIng.id;
    if (row.price > 0) DB.recordPriceHistory(newIng.id, row.price / (row.qty || 1), '🧾 New');
    Toast.show('เพิ่มวัตถุดิบ "' + row.name + '" แล้ว', 'success');
    drawParsedRows();
  };

  window.rcUpdateSummary = function () {
    var el = document.getElementById('parsedSummary');
    if (!el) return;
    var active = _parsed.filter(function (r) { return r.keep; });
    var linked = active.filter(function (r) { return r.ingredientId; });
    var total = active.reduce(function (s, r) { return s + (r.price || 0); }, 0);
    el.innerHTML = 'เลือก <strong>' + active.length + '</strong> รายการ · เชื่อมวัตถุดิบ <strong style="color:var(--success)">' + linked.length + '</strong> รายการ · รวม <strong style="color:var(--primary)">฿' + total.toFixed(2) + '</strong>';
  };

  window.rcSave = function () {
    var active = _parsed.filter(function (r) { return r.keep; });
    if (!active.length) { Toast.show('กรุณาเลือกรายการอย่างน้อย 1 รายการ', 'error'); return; }
    var receiptDate = document.getElementById('rcDate') ? document.getElementById('rcDate').value : _receiptDate;
    var receiptNote = document.getElementById('rcNote') ? document.getElementById('rcNote').value : '';
    var receiptTs = new Date(receiptDate).getTime() || Date.now();
    var updated = 0;
    active.forEach(function (row) {
      if (!row.ingredientId) return;
      var ing = DB.getById('ingredients', row.ingredientId);
      if (!ing) return;
      var oldPrice = DB.effectivePrice(ing);
      var newPpu = row.price / ((row.qty || 1) * (ing.convFactor || 1));
      DB.update('ingredients', row.ingredientId, { buyPrice: row.price, buyQty: row.qty || 1, buyUnit: row.unit || ing.buyUnit });
      if (Math.abs(newPpu - oldPrice) > 0.00001) {
        var hist = DB._get('priceHistory') || [];
        hist.push({ id: receiptTs + row.ingredientId + Math.floor(Math.random() * 1000), ingredientId: row.ingredientId, price: newPpu, timestamp: receiptTs, note: '🧾 ' + (receiptNote || 'ใบเสร็จ') });
        DB._set('priceHistory', hist);
        updated++;
      }
    });
    DB.saveReceipt({ date: receiptDate, note: receiptNote, imageBase64: _imageBase64, items: active.map(function (r) { return Object.assign({}, r); }), createdAt: Date.now() });
    Toast.show('✅ บันทึกใบเสร็จแล้ว · อัพเดตราคา ' + updated + ' วัตถุดิบ', 'success');
    rcClear();
  };

  window.rcClear = function () {
    _imageBase64 = null; _parsed = [];
    document.getElementById('stepUpload').style.display = '';
    document.getElementById('stepReview').style.display = 'none';
    document.getElementById('ocrProgress').style.display = 'none';
    var fi = document.getElementById('rcFile'); if (fi) fi.value = '';
    drawHistory();
  };

  window.rcDeleteReceipt = function (id) {
    if (!confirm('ลบประวัติใบเสร็จนี้?')) return;
    DB.deleteReceipt(id);
    drawHistory();
    Toast.show('ลบใบเสร็จแล้ว', 'info');
  };

  // Close dropdowns on outside click
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.id || !e.target.id.startsWith('rcls')) {
      if (!e.target.closest || !e.target.closest('[id^="rcdd"]')) {
        document.querySelectorAll('[id^="rcdd"]').forEach(function (el) { el.style.display = 'none'; });
      }
    }
  });

  drawHistory();
}
