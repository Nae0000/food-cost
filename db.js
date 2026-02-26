// ===================================================
// db.js — localStorage database layer + Thai seed data
// ===================================================

const DB = {
  _get(key) { try { return JSON.parse(localStorage.getItem('fc_' + key) || 'null'); } catch { return null; } },
  _set(key, data) { localStorage.setItem('fc_' + key, JSON.stringify(data)); },
  _nextId(col) { const a = this._get(col) || []; return a.length > 0 ? Math.max(...a.map(i => i.id)) + 1 : 1; },

  getAll(col) { return this._get(col) || []; },
  getById(col, id) { return (this._get(col) || []).find(i => i.id === id) || null; },
  insert(col, data) {
    const items = this._get(col) || [];
    const item = { ...data, id: this._nextId(col), createdAt: Date.now() };
    items.push(item); this._set(col, items); return item;
  },
  update(col, id, data) {
    const items = this._get(col) || [];
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data, updatedAt: Date.now() };
    this._set(col, items); return items[idx];
  },
  delete(col, id) {
    const items = this._get(col) || [];
    const next = items.filter(i => i.id !== id);
    this._set(col, next); return next.length < items.length;
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
  effectivePrice(ing) {
    if (!ing) return 0;
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

  menuCost(menuId) {
    const recipes = this.getAll('recipes').filter(r => r.menuId === menuId);
    let total = 0;
    for (const r of recipes) {
      const ing = this.getById('ingredients', r.ingredientId);
      if (ing) total += this.effectivePrice(ing) * Number(r.quantity || 0);
    }
    return Math.round(total * 10000) / 10000;
  },

  isInitialized() { return !!this._get('__initialized__'); },
  markInitialized() { this._set('__initialized__', true); },
  reset() {
    ['categories', 'ingredients', 'menus', 'recipes', 'webhooks', '__initialized__']
      .forEach(k => localStorage.removeItem('fc_' + k));
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
