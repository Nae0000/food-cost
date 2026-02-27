// ===================================================
// p_gdrive.js — Google Login + Google Drive Sync
// ===================================================

const GDrive = {
  // !! REPLACE THIS with your actual Google OAuth 2.0 Client ID !!
  CLIENT_ID: '1043266816295-li8ngvf7aov58dovlma31hm40qncjemm.apps.googleusercontent.com',
  SCOPES: 'https://www.googleapis.com/auth/drive.file',
  FILE_NAME: 'foodcost_backup.json',
  MIME_TYPE: 'application/json',

  _tokenClient: null,
  _accessToken: null,
  _userInfo: null,

  // ---- Initialization ----
  init() {
    if (typeof google === 'undefined' || !google.accounts) {
      console.warn('GDrive: Google Identity Services not loaded yet.');
      return;
    }
    this._tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (resp) => this._handleTokenResponse(resp),
    });
    // Restore session from localStorage
    const saved = localStorage.getItem('fc_gdrive_user');
    if (saved) {
      try { this._userInfo = JSON.parse(saved); } catch (e) { this._userInfo = null; }
    }
  },

  isLoggedIn() {
    return !!this._accessToken && !!this._userInfo;
  },

  // ---- Login / Logout ----
  login() {
    if (!this._tokenClient) {
      Toast.show('Google API ยังไม่พร้อม กรุณารีเฟรชหน้าแล้วลองใหม่', 'error');
      return;
    }
    this._tokenClient.requestAccessToken({ prompt: 'consent' });
  },

  logout() {
    if (this._accessToken) {
      google.accounts.oauth2.revoke(this._accessToken, () => { });
    }
    this._accessToken = null;
    this._userInfo = null;
    localStorage.removeItem('fc_gdrive_user');
    Toast.show('ออกจากระบบ Google แล้ว', 'info');
    // Re-render settings page to reflect logout
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
    else Router.render();
  },

  // ---- Internal handler ----
  async _handleTokenResponse(resp) {
    if (resp.error) {
      Toast.show('Google Login ล้มเหลว: ' + resp.error, 'error');
      return;
    }
    this._accessToken = resp.access_token;
    // Fetch user profile
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + this._accessToken }
      });
      this._userInfo = await res.json();
      localStorage.setItem('fc_gdrive_user', JSON.stringify(this._userInfo));
      Toast.show(`ล็อคอินสำเร็จ: ${this._userInfo.name || this._userInfo.email}`, 'success');
      // Re-render settings page to update the UI with user info
      if (typeof renderCurrentPage === 'function') renderCurrentPage();
      else Router.render();
    } catch (e) {
      Toast.show('ไม่สามารถดึงข้อมูลบัญชี Google ได้', 'error');
      console.error(e);
    }
  },

  // ---- Find existing backup file in Drive ----
  async _findFile() {
    const q = encodeURIComponent(`name='${this.FILE_NAME}' and not trashed`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`,
      { headers: { Authorization: 'Bearer ' + this._accessToken } }
    );
    const data = await res.json();
    return (data.files && data.files.length > 0) ? data.files[0] : null;
  },

  // ---- Upload (Backup) ----
  async uploadBackup() {
    if (!this.isLoggedIn()) { Toast.show('กรุณาล็อคอิน Google ก่อน', 'warning'); return; }

    const tables = ['categories', 'ingredients', 'menus', 'recipes', 'subRecipes', 'sets', 'webhooks'];
    const backup = {};
    tables.forEach(t => { backup[t] = DB.getAll(t); });
    backup.__exportedAt = new Date().toISOString();
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: this.MIME_TYPE });

    try {
      Toast.show('กำลังบันทึกข้อมูลไปยัง Google Drive...', 'info', 2000);
      const existing = await this._findFile();

      if (existing) {
        // Update existing file
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer ' + this._accessToken,
            'Content-Type': this.MIME_TYPE,
          },
          body: blob,
        });
        Toast.show('✅ บันทึกข้อมูลไปยัง Google Drive สำเร็จ', 'success');
      } else {
        // Create new file
        const meta = new Blob([JSON.stringify({ name: this.FILE_NAME, mimeType: this.MIME_TYPE })], { type: 'application/json' });
        const form = new FormData();
        form.append('metadata', meta);
        form.append('file', blob);
        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + this._accessToken },
          body: form,
        });
        Toast.show('✅ สร้างไฟล์สำรองใน Google Drive สำเร็จ', 'success');
      }
    } catch (e) {
      Toast.show('เกิดข้อผิดพลาดขณะบันทึกข้อมูล', 'error');
      console.error(e);
    }
  },

  // ---- Download (Restore) ----
  async downloadBackup() {
    if (!this.isLoggedIn()) { Toast.show('กรุณาล็อคอิน Google ก่อน', 'warning'); return; }

    try {
      Toast.show('กำลังดึงข้อมูลจาก Google Drive...', 'info', 2000);
      const file = await this._findFile();
      if (!file) {
        Toast.show('ไม่พบไฟล์สำรองข้อมูลใน Google Drive', 'warning');
        return;
      }
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: 'Bearer ' + this._accessToken } }
      );
      const jsonStr = await res.text();
      DataSync.importJSON(jsonStr);
    } catch (e) {
      Toast.show('เกิดข้อผิดพลาดขณะดึงข้อมูล', 'error');
      console.error(e);
    }
  },

  // ---- Info about last backup ----
  async getFileInfo() {
    if (!this.isLoggedIn()) return null;
    try {
      return await this._findFile();
    } catch (e) {
      return null;
    }
  }
};
