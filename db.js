// ===================================================
// db.js — localStorage database layer + Thai seed data
// ===================================================

const DB = {
  _cache: {}, // In-memory cache for all collections
  _listeners: [], // array to hold unsubscribe functions

  // Initialize snapshot listeners to sync Firestore -> Local Cache 
  initFirestoreRealtime(uid) {
    if (!uid || typeof dbFirestore === 'undefined') return;

    // Clear any existing listeners
    this._listeners.forEach(unsub => unsub());
    this._listeners = [];

    // Collections to sync
    const collections = ['categories', 'ingGroups', 'ingredients', 'menus', 'recipes', 'subRecipes', 'sets', 'priceHistory', 'receipts'];

    collections.forEach(col => {
      // Ensure local array exists
      this._cache[col] = [];
      const unsub = dbFirestore.collection('users').doc(uid).collection(col)
        .onSnapshot((snapshot) => {
          const items = [];
          snapshot.forEach(doc => {
            items.push({ _docId: doc.id, ...doc.data() });
          });
          // Update local cache
          this._cache[col] = items;

          // Re-render UI upon data change (skip if user is inline-editing)
          if (typeof Router !== 'undefined' && Router.render) {
            if (typeof _ingInlineEditing !== 'undefined' && _ingInlineEditing) {
              _ingRenderPending = true;
            } else {
              Router.render();
            }
          }
        });
      this._listeners.push(unsub);
    });

    // Sync user settings (like Gemini API key, currency, lang)
    const unsubSettings = dbFirestore.collection('users').doc(uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.settings && typeof _settings !== 'undefined') {
            Object.assign(_settings, data.settings);
            localStorage.setItem('fc_settings', JSON.stringify(_settings));
            if (typeof applyI18n === 'function') applyI18n();
            // Optional: Re-render if on settings page
            if (window.location.hash === '#settings' && typeof window.saveSettingsPage !== 'undefined') {
              // A hacky way to redraw settings without an explicit redraw function reference
              if (typeof Router !== 'undefined' && Router.render) Router.render();
            }
          }
        }
      });
    this._listeners.push(unsubSettings);

    this.markInitialized();
  },

  _get(col) { return this._cache[col] || []; },
  _nextId(col) { const a = this._get(col); return a.length > 0 ? Math.max(...a.map(i => i.id || 0)) + 1 : 1; },

  getAll(col) { return this._get(col); },
  getById(col, id) { return (this._get(col)).find(i => i.id === id) || null; },

  insert(col, data) {
    if (typeof auth === 'undefined' || !auth.currentUser) return null;
    const uid = auth.currentUser.uid;

    // Generate an ID for consistency across app logic
    const item = { ...data, id: this._nextId(col), createdAt: Date.now() };

    // Optimistically update local cache immediately for instant UI response
    if (!this._cache[col]) this._cache[col] = [];
    this._cache[col].push(item);

    // Push to Firestore, it will trigger onSnapshot later to confirm
    dbFirestore.collection('users').doc(uid).collection(col).add(item)
      .catch(err => {
        console.error("Error inserting to Firestore", err);
        // On error, we could rollback the local cache here, but for now just log it
      });

    return item;
  },

  update(col, id, data) {
    if (typeof auth === 'undefined' || !auth.currentUser) return null;
    const uid = auth.currentUser.uid;
    const items = this._get(col);
    const target = items.find(i => i.id === id);
    if (!target) return null;

    const payload = { ...data, updatedAt: Date.now() };

    // Optimistically update local cache immediately
    Object.assign(target, payload);

    if (target._docId) {
      dbFirestore.collection('users').doc(uid).collection(col).doc(target._docId).update(payload)
        .catch(err => console.error("Error updating to Firestore", err));
    }

    return target;
  },

  delete(col, id) {
    if (typeof auth === 'undefined' || !auth.currentUser) return false;
    const uid = auth.currentUser.uid;
    const items = this._get(col);
    const targetIdx = items.findIndex(i => i.id === id);
    if (targetIdx === -1) return false;

    const target = items[targetIdx];

    // Optimistically remove from local cache immediately
    items.splice(targetIdx, 1);

    if (target._docId) {
      dbFirestore.collection('users').doc(uid).collection(col).doc(target._docId).delete()
        .catch(err => console.error("Error deleting in Firestore", err));
    }

    return true;
  },

  // ---------------------------------------------------
  // Effective price per RECIPE UNIT
  // ---------------------------------------------------
  // New fields on ingredient:
  //   buyQty       — ปริมาณที่ซื้อ (เช่น 5) ต่อครั้ง
  //   buyUnit      — หน่วยที่ซื้อ (เช่น กก.)
  //   buyPrice     — ราคาที่ซื้อทั้งแพ็ค/ครั้ง (เช่น 600 บาท)
  //   recipeUnit   — หน่วยที่ใช้ในสูตร (เช่น กรัม)
  //   convFactor   — อัตราแปลง: 1 buyUnit = convFactor recipeUnit (เช่น 1กก.=1000กรัม)
  //   basePrice    — fallback ราคา/recipeUnit
  //   customPrice  — override ราคา (manual input)
  //   webhookPrice — ราคาจาก Webhook /buyUnit → ต้องแปลงด้วย convFactor
  //   priceMode    — 'manual'|'custom'|'webhook'
  //
  // Logic:
  //   calcPrice = customPrice ?? (buyPrice / (buyQty * convFactor)) ?? (webhookPrice / convFactor) ?? basePrice
  effectivePrice(ing, _visited) {
    if (!ing) return 0;
    // Sub-recipe mode: cost = total component cost / yield
    if (ing.priceMode === 'sub_recipe') {
      const yield_ = Number(ing.subYield) || 1;
      return Math.round((this.subRecipeCost(ing.id, _visited) / yield_) * 10000) / 10000;
    }
    // Custom price always wins (per recipeUnit)
    if (ing.customPrice != null && ing.customPrice !== '') return Number(ing.customPrice);
    // Bulk purchase calculation
    const buyPrice = Number(ing.buyPrice) || 0;
    const buyQty = Number(ing.buyQty) || 0;
    const convFactor = Number(ing.convFactor) || 1;
    if (buyPrice > 0 && buyQty > 0) {
      return Math.round((buyPrice / (buyQty * convFactor)) * 10000) / 10000;
    }
    // Webhook price (per buyUnit) → divide by convFactor to get per recipeUnit
    if (ing.priceMode === 'webhook' && ing.webhookPrice != null && ing.webhookPrice !== '') {
      return Number(ing.webhookPrice) / convFactor;
    }
    // Fallback to basePrice
    return Number(ing.basePrice) || 0;
  },

  // Price per recipeUnit WITH consumption tax applied (when ing.includeConsumptionTax === true)
  effectivePriceWithTax(ing, _visited) {
    const base = this.effectivePrice(ing, _visited);
    if (!ing || !ing.includeConsumptionTax) return base;
    const rate = (typeof _settings !== 'undefined' ? (_settings.consumptionTax || 0) : 0);
    return Math.round(base * (1 + rate / 100) * 10000) / 10000;
  },

  // Total cost of a sub-recipe’s components (with circular-reference guard)
  subRecipeCost(ingredientId, _visited) {
    const visited = _visited || new Set();
    if (visited.has(ingredientId)) return 0; // prevent infinite loops
    visited.add(ingredientId);
    const items = this.getAll('subRecipes').filter(r => r.parentIngredientId === ingredientId);
    let total = 0;
    for (const item of items) {
      const child = this.getById('ingredients', item.ingredientId);
      if (child) total += this.effectivePriceWithTax(child, visited) * Number(item.quantity || 0);
    }
    return Math.round(total * 10000) / 10000;
  },

  menuCost(menuId, _visited) {
    // Guard against circular references
    if (!_visited) _visited = new Set();
    if (_visited.has(menuId)) return 0;
    _visited.add(menuId);

    const menu = this.getById('menus', menuId);

    // Set menu: sum of sub-menu costs * portion
    if (menu && menu.menuType === 'set' && Array.isArray(menu.subMenus)) {
      let total = 0;
      for (const sm of menu.subMenus) {
        total += this.menuCost(sm.menuId, new Set(_visited)) * Number(sm.portion || 1);
      }
      return Math.round(total * 10000) / 10000;
    }

    // Regular menu: sum of recipe ingredient costs
    const recipes = this.getAll('recipes').filter(r => r.menuId === menuId);
    let total = 0;
    for (const r of recipes) {
      const ing = this.getById('ingredients', r.ingredientId);
      if (ing) total += this.effectivePriceWithTax(ing) * Number(r.quantity || 0);
    }
    return Math.round(total * 10000) / 10000;
  },

  isInitialized() { return this._cache['__initialized__']; },
  markInitialized() { this._cache['__initialized__'] = true; },

  // ---------------------------------------------------
  // Price History
  // ---------------------------------------------------
  recordPriceHistory(ingredientId, price, note = 'auto') {
    this.insert('priceHistory', { ingredientId, price, timestamp: Date.now(), note });
  },
  getPriceHistory(ingredientId) {
    const all = this._get('priceHistory') || [];
    const rows = ingredientId ? all.filter(r => r.ingredientId === ingredientId) : all;
    return rows.sort((a, b) => a.timestamp - b.timestamp);
  },
  snapshotAllPrices(note = 'snapshot') {
    const ings = this.getAll('ingredients');
    const ts = Date.now();
    let count = 0;
    ings.forEach(ing => {
      const price = this.effectivePrice(ing);
      if (price > 0) {
        this.insert('priceHistory', { ingredientId: ing.id, price, timestamp: ts, note });
        count++;
      }
    });
    return count;
  },

  reset() {
    if (typeof auth === 'undefined' || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const cols = ['categories', 'ingredients', 'menus', 'recipes', 'subRecipes', 'webhooks', 'priceHistory', 'receipts'];

    if (confirm('ยืนยันว่าจะลบข้อมูลทั้งหมดใน Cloud Firestore ของคุณ? ข้อมูลจะไม่สามารถกู้คืนได้')) {
      cols.forEach(col => {
        // Warning: This does not delete all deeply nested docs efficiently, but works for limited client-side resets
        dbFirestore.collection('users').doc(uid).collection(col).get().then(snapshot => {
          snapshot.forEach(doc => doc.ref.delete());
        });
      });
      Toast.show('กำลังรีเซ็ตข้อมูลทั้งหมด...', 'info');
    }
  },

  // ---------------------------------------------------
  // Receipts
  // ---------------------------------------------------
  saveReceipt(receipt) {
    if (receipt.id) {
      this.update('receipts', receipt.id, receipt);
    } else {
      this.insert('receipts', receipt);
    }
    return receipt;
  },
  getReceipts() {
    return (this._get('receipts') || []).sort((a, b) => b.createdAt - a.createdAt);
  },
  deleteReceipt(id) {
    this.delete('receipts', id);
  }
};

// ===================================================
// SEED DATA
// ===================================================
const SEED = {
  run() {
    if (DB.isInitialized()) return;

    [
      { name: 'ต้ม', icon: '🍲', color: '#f97316' }, { name: 'ผัด', icon: '🥘', color: '#0ea5e9' },
      { name: 'แกง', icon: '🍛', color: '#f59e0b' }, { name: 'ทอด', icon: '🍳', color: '#ef4444' },
      { name: 'ยำ', icon: '🥗', color: '#22c55e' }, { name: 'เครื่องดื่ม', icon: '🧃', color: '#8b5cf6' },
      { name: 'ของหวาน', icon: '🍮', color: '#ec4899' },
    ].forEach(c => DB.insert('categories', c));

    // ingredients with bulk purchase info
    // buyQty=ปริมาณต่อครั้งที่ซื้อ buyUnit=หน่วยที่ซื้อ buyPrice=ราคาต่อครั้ง
    // recipeUnit=หน่วยในสูตร convFactor=จำนวน recipeUnit ต่อ 1 buyUnit
    const ings = [
      // เนื้อสัตว์
      { name: 'หมูสับ', group: 'เนื้อสัตว์', buyUnit: 'กก.', buyQty: 1, buyPrice: 120, recipeUnit: 'กก.', convFactor: 1 },
      { name: 'หมูกรอบ', group: 'เนื้อสัตว์', buyUnit: 'กก.', buyQty: 1, buyPrice: 180, recipeUnit: 'กก.', convFactor: 1 },
      { name: 'สะโพกไก่', group: 'เนื้อสัตว์', buyUnit: 'กก.', buyQty: 1, buyPrice: 75, recipeUnit: 'กก.', convFactor: 1 },
      { name: 'กุ้งขาว', group: 'เนื้อสัตว์', buyUnit: 'กก.', buyQty: 1, buyPrice: 200, recipeUnit: 'กก.', convFactor: 1 },
      { name: 'ปลาหมึก', group: 'เนื้อสัตว์', buyUnit: 'กก.', buyQty: 1, buyPrice: 160, recipeUnit: 'กก.', convFactor: 1 },
      // ผัก/สมุนไพร
      { name: 'ใบกะเพรา', group: 'ผัก/สมุนไพร', buyUnit: 'กำ', buyQty: 1, buyPrice: 10, recipeUnit: 'กำ', convFactor: 1 },
      { name: 'พริกขี้หนูจินดา', group: 'ผัก/สมุนไพร', buyUnit: 'กก.', buyQty: 0.1, buyPrice: 8, recipeUnit: 'กก.', convFactor: 1 },
      { name: 'กระเทียมไทย', group: 'ผัก/สมุนไพร', buyUnit: 'กก.', buyQty: 0.5, buyPrice: 30, recipeUnit: 'กก.', convFactor: 1 },
      { name: 'มะนาว', group: 'ผัก/สมุนไพร', buyUnit: 'กก.', buyQty: 0.5, buyPrice: 20, recipeUnit: 'กก.', convFactor: 1 },
      { name: 'ตะไคร้', group: 'ผัก/สมุนไพร', buyUnit: 'กก.', buyQty: 0.5, buyPrice: 15, recipeUnit: 'กก.', convFactor: 1 },
      { name: 'ใบมะกรูด', group: 'ผัก/สมุนไพร', buyUnit: 'กำ', buyQty: 1, buyPrice: 15, recipeUnit: 'กำ', convFactor: 1 },
      { name: 'ข่า', group: 'ผัก/สมุนไพร', buyUnit: 'กก.', buyQty: 0.5, buyPrice: 25, recipeUnit: 'กก.', convFactor: 1 },
      // เครื่องปรุง — ซื้อเป็นขวด/ลิตร ใช้เป็นช้อนโต๊ะ (1ลิตร≈67ช้อนโต๊ะ)
      { name: 'น้ำปลา', group: 'เครื่องปรุง', buyUnit: 'ขวด', buyQty: 1, buyPrice: 45, recipeUnit: 'ช้อนโต๊ะ', convFactor: 20 },
      { name: 'ซีอิ๊วขาว', group: 'เครื่องปรุง', buyUnit: 'ขวด', buyQty: 1, buyPrice: 40, recipeUnit: 'ช้อนโต๊ะ', convFactor: 20 },
      { name: 'ซอสหอยนางรม', group: 'เครื่องปรุง', buyUnit: 'ขวด', buyQty: 1, buyPrice: 55, recipeUnit: 'ช้อนโต๊ะ', convFactor: 20 },
      { name: 'น้ำตาลมะพร้าว', group: 'เครื่องปรุง', buyUnit: 'กก.', buyQty: 1, buyPrice: 90, recipeUnit: 'ช้อนโต๊ะ', convFactor: 12 },
      { name: 'น้ำตาลทราย', group: 'เครื่องปรุง', buyUnit: 'กก.', buyQty: 1, buyPrice: 25, recipeUnit: 'ช้อนชา', convFactor: 30 },
      { name: 'กะทิกล่อง', group: 'เครื่องปรุง', buyUnit: 'กล่อง', buyQty: 1, buyPrice: 35, recipeUnit: 'ลิตร', convFactor: 0.4 },
      // ของแห้ง
      { name: 'ข้าวหอมมะลิ', group: 'ของแห้ง', buyUnit: 'กก.', buyQty: 5, buyPrice: 225, recipeUnit: 'กรัม', convFactor: 1000 },
      { name: 'เส้นจันท์', group: 'ของแห้ง', buyUnit: 'กก.', buyQty: 1, buyPrice: 35, recipeUnit: 'กรัม', convFactor: 1000 },
      { name: 'พริกแกงแดง', group: 'ของแห้ง', buyUnit: 'กก.', buyQty: 0.2, buyPrice: 24, recipeUnit: 'ช้อนโต๊ะ', convFactor: 10 },
      { name: 'พริกแกงเขียวหวาน', group: 'ของแห้ง', buyUnit: 'กก.', buyQty: 0.2, buyPrice: 26, recipeUnit: 'ช้อนโต๊ะ', convFactor: 10 },
    ];
    ings.forEach(i => DB.insert('ingredients', { ...i, basePrice: 0, priceMode: 'manual', webhookPrice: null, customPrice: null, lastUpdated: null }));

    const cats = DB.getAll('categories');
    const cid = n => cats.find(c => c.name === n)?.id;
    [
      { name: 'ผัดกะเพราหมูสับ', categoryId: cid('ผัด'), sellingPrice: 60, description: 'ผัดกะเพราหมูสับไข่ดาว' },
      { name: 'ต้มยำกุ้งน้ำข้น', categoryId: cid('ต้ม'), sellingPrice: 120, description: 'ต้มยำกุ้งแม่น้ำน้ำข้น' },
      { name: 'แกงเขียวหวานไก่', categoryId: cid('แกง'), sellingPrice: 80, description: 'แกงเขียวหวานไก่กะทิสด' },
      { name: 'ข้าวผัดทะเล', categoryId: cid('ผัด'), sellingPrice: 100, description: 'ข้าวผัดรวมทะเลไข่' },
      { name: 'ยำวุ้นเส้น', categoryId: cid('ยำ'), sellingPrice: 70, description: 'ยำวุ้นเส้นกุ้งสด' },
    ].forEach(m => DB.insert('menus', m));

    const ingList = DB.getAll('ingredients');
    const iid = n => ingList.find(i => i.name === n)?.id;
    const menuList = DB.getAll('menus');
    const mid = n => menuList.find(m => m.name === n)?.id;

    [
      // ผัดกะเพราหมูสับ (ปริมาณเป็น กก.)
      { m: 'ผัดกะเพราหมูสับ', i: 'หมูสับ', q: 0.15 }, { m: 'ผัดกะเพราหมูสับ', i: 'ใบกะเพรา', q: 0.5 },
      { m: 'ผัดกะเพราหมูสับ', i: 'พริกขี้หนูจินดา', q: 0.02 }, { m: 'ผัดกะเพราหมูสับ', i: 'กระเทียมไทย', q: 0.02 },
      { m: 'ผัดกะเพราหมูสับ', i: 'น้ำปลา', q: 1 }, { m: 'ผัดกะเพราหมูสับ', i: 'ซอสหอยนางรม', q: 1 },
      { m: 'ผัดกะเพราหมูสับ', i: 'น้ำตาลทราย', q: 0.5 },
      // ต้มยำกุ้งน้ำข้น
      { m: 'ต้มยำกุ้งน้ำข้น', i: 'กุ้งขาว', q: 0.15 }, { m: 'ต้มยำกุ้งน้ำข้น', i: 'ตะไคร้', q: 0.03 },
      { m: 'ต้มยำกุ้งน้ำข้น', i: 'ข่า', q: 0.02 }, { m: 'ต้มยำกุ้งน้ำข้น', i: 'ใบมะกรูด', q: 0.3 },
      { m: 'ต้มยำกุ้งน้ำข้น', i: 'พริกขี้หนูจินดา', q: 0.02 }, { m: 'ต้มยำกุ้งน้ำข้น', i: 'มะนาว', q: 0.05 },
      { m: 'ต้มยำกุ้งน้ำข้น', i: 'น้ำปลา', q: 1 }, { m: 'ต้มยำกุ้งน้ำข้น', i: 'กะทิกล่อง', q: 0.1 },
      // แกงเขียวหวานไก่
      { m: 'แกงเขียวหวานไก่', i: 'สะโพกไก่', q: 0.15 }, { m: 'แกงเขียวหวานไก่', i: 'พริกแกงเขียวหวาน', q: 2 },
      { m: 'แกงเขียวหวานไก่', i: 'กะทิกล่อง', q: 0.2 }, { m: 'แกงเขียวหวานไก่', i: 'น้ำตาลมะพร้าว', q: 1 },
      { m: 'แกงเขียวหวานไก่', i: 'น้ำปลา', q: 1 },
      // ข้าวผัดทะเล
      { m: 'ข้าวผัดทะเล', i: 'กุ้งขาว', q: 0.08 }, { m: 'ข้าวผัดทะเล', i: 'ปลาหมึก', q: 0.08 },
      { m: 'ข้าวผัดทะเล', i: 'ข้าวหอมมะลิ', q: 150 }, { m: 'ข้าวผัดทะเล', i: 'กระเทียมไทย', q: 0.02 },
      { m: 'ข้าวผัดทะเล', i: 'ซีอิ๊วขาว', q: 1 }, { m: 'ข้าวผัดทะเล', i: 'ซอสหอยนางรม', q: 1 },
      // ยำวุ้นเส้น
      { m: 'ยำวุ้นเส้น', i: 'กุ้งขาว', q: 0.1 }, { m: 'ยำวุ้นเส้น', i: 'เส้นจันท์', q: 50 },
      { m: 'ยำวุ้นเส้น', i: 'มะนาว', q: 0.05 }, { m: 'ยำวุ้นเส้น', i: 'น้ำปลา', q: 1 },
      { m: 'ยำวุ้นเส้น', i: 'น้ำตาลทราย', q: 1 }, { m: 'ยำวุ้นเส้น', i: 'พริกขี้หนูจินดา', q: 0.02 },
    ].forEach(r => { if (mid(r.m) && iid(r.i)) DB.insert('recipes', { menuId: mid(r.m), ingredientId: iid(r.i), quantity: r.q }); });

    DB.markInitialized();
  }
};
