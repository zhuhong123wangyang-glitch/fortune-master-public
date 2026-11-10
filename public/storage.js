(() => {
  'use strict';

  const TOKEN_KEY = 'fm_device_token_v1';
  const ENCRYPTION_SECRET_KEY = 'fm_encryption_secret_v1';
  const LOCAL_KEY = 'fortune-master-public-records-v1';
  const PROFILE_KEY = 'fortune-master-public-profiles-v1';
  const encoder = new TextEncoder();
  const labels = {
    bazi: '八字命盘', ziwei: '紫微斗数', liuyao: '六爻起卦', meihua: '梅花易数',
    daily: '每日一签', almanac: '传统黄历', compatibility: '双人合盘', profile: '命盘档案'
  };
  let keyPromise;
  let current = null;
  let localRecords = loadLocal();
  let cloudRecords = [];
  let cloudReady = false;
  let activeTab = 'local';

  const $ = (id) => document.getElementById(id);
  const safeParse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const base64url = (bytes) => {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };
  const fromBase64url = (value) => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  };

  function getToken() {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      token = base64url(crypto.getRandomValues(new Uint8Array(32)));
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  }
  function getEncryptionSecret() {
    let secret = localStorage.getItem(ENCRYPTION_SECRET_KEY);
    if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) {
      secret = base64url(crypto.getRandomValues(new Uint8Array(32)));
      localStorage.setItem(ENCRYPTION_SECRET_KEY, secret);
    }
    return secret;
  }
  function getKey() {
    if (!keyPromise) {
      // This secret is never sent to the API; the server only receives the separate auth token.
      const raw = fromBase64url(getEncryptionSecret());
      keyPromise = crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']).then((material) =>
        crypto.subtle.deriveKey(
          { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('fortune-master-cloud-v1'), info: encoder.encode('record-encryption') },
          material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
        )
      );
    }
    return keyPromise;
  }
  async function encrypt(value) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getKey(), encoder.encode(JSON.stringify(value)));
    return { v: 1, iv: base64url(iv), ciphertext: base64url(new Uint8Array(ciphertext)) };
  }
  async function decrypt(envelope) {
    if (!envelope || envelope.v !== 1) throw new Error('加密记录格式不支持');
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64url(envelope.iv) }, await getKey(), fromBase64url(envelope.ciphertext));
    return JSON.parse(new TextDecoder().decode(plaintext));
  }
  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${getToken()}`);
    if (options.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(url, { ...options, headers });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `请求失败（${response.status}）`);
    return body;
  }
  function loadLocal() {
    const records = safeParse(localStorage.getItem(LOCAL_KEY) || '[]', []);
    return Array.isArray(records) ? records : [];
  }
  function persistLocal() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localRecords));
    updateCounts();
    if (activeTab === 'local') renderRecords();
  }
  function methodType(data) {
    return ({ 'daily-sign': 'daily', huangli: 'almanac', hepan: 'compatibility' })[data.method] || data.method;
  }
  function makeTitle(data) {
    const type = methodType(data);
    const label = labels[type] || data.method || '计算结果';
    const context = data.input?.date || data.input?.question || data.input?.referenceYear || data.result?.record?.date || '';
    return `${label}${context ? `｜${context}` : ''}`.slice(0, 120);
  }
  function setCurrent(data) {
    if (!data || typeof data !== 'object' || !data.method) return;
    const now = new Date().toISOString();
    current = {
      id: crypto.randomUUID(), type: methodType(data), title: makeTitle(data), data,
      createdAt: now, updatedAt: now
    };
    for (const id of ['save-local', 'save-cloud', 'save-both']) if ($(id)) $(id).disabled = false;
    setHint('本次结果已就绪。请选择本机保存、加密云端保存，或两者同时保存。');
  }
  function clearCurrent() {
    current = null;
    for (const id of ['save-local', 'save-cloud', 'save-both']) if ($(id)) $(id).disabled = true;
    setHint('完成排盘后，可将结果保存到当前浏览器或加密云端。');
  }
  function setHint(message) { if ($('public-save-hint')) $('public-save-hint').textContent = message; }
  function setStatus(message, state = '') {
    if ($('public-storage-status')) {
      $('public-storage-status').innerHTML = `<span class="status-dot ${state}"></span>${escapeHtml(message)}`;
    }
  }
  function updateCounts() {
    if ($('public-local-count')) $('public-local-count').textContent = localRecords.length;
    if ($('public-cloud-count')) $('public-cloud-count').textContent = cloudRecords.length;
  }
  function summarize(record) {
    if (record.locked) return '此记录无法用当前设备加密秘密解密。可尝试导入原设备备份。';
    const data = record.data || {};
    if (record.type === 'profile') return `${data.date || ''} ${data.time || ''} · ${data.gender === 'male' ? '男' : '女'} · 出生资料`;
    return data.interpretation?.summary || data.input?.question || data.input?.date || data.result?.record?.date || '传统术数计算记录';
  }
  function renderRecords() {
    const holder = $('public-record-list');
    if (!holder) return;
    const records = activeTab === 'local' ? localRecords : cloudRecords;
    if (!records.length) {
      holder.innerHTML = `<p class="public-record-empty">${activeTab === 'local' ? '当前浏览器还没有保存记录。' : (cloudReady ? '该匿名设备 Token 尚无云端记录。' : '云端数据库尚未启用；仍可使用本机保存。')}</p>`;
      return;
    }
    holder.innerHTML = records.map((record) => {
      const type = labels[record.type] || record.type || '记录';
      return `<article class="public-record-item"><div class="public-record-main"><strong>${escapeHtml(record.title || type)}</strong><small>${escapeHtml(type)} · ${escapeHtml(new Date(record.updatedAt || record.updated_at || record.createdAt || record.created_at || Date.now()).toLocaleString('zh-CN'))}</small><p>${escapeHtml(summarize(record))}</p></div><div class="public-record-actions"><button type="button" class="minor" data-record-delete="${escapeHtml(record.id)}" data-source="${activeTab}">删除</button></div></article>`;
    }).join('');
  }
  async function saveLocal() {
    if (!current) throw new Error('请先完成一次计算');
    const record = { ...current, updatedAt: new Date().toISOString() };
    const index = localRecords.findIndex((item) => item.id === record.id);
    if (index >= 0) localRecords[index] = record; else localRecords.unshift(record);
    if (localRecords.length > 300) localRecords = localRecords.slice(0, 300);
    try { persistLocal(); } catch { throw new Error('本机存储空间不足，请导出备份或清理旧记录'); }
  }
  async function saveEncryptedRecord(record) {
    const payload = await encrypt({ record });
    // Keep descriptive titles inside ciphertext. The database receives only a generic category label.
    const publicTitle = labels[record.type] || '加密记录';
    const result = await api('/api/records', { method: 'POST', body: JSON.stringify({ id: record.id, type: record.type, title: publicTitle, payload }) });
    const decoded = await decrypt(result.record.payload);
    cloudRecords = [decoded.record, ...cloudRecords.filter((item) => item.id !== record.id)];
    cloudReady = true; updateCounts();
    if (activeTab === 'cloud') renderRecords();
    return decoded.record;
  }
  async function saveCloud() {
    if (!current) throw new Error('请先完成一次计算');
    if (!cloudReady) await refreshCloud(true);
    if (!cloudReady) throw new Error('云端数据库暂不可用，请先保存到本机');
    await saveEncryptedRecord(current);
  }
  async function listCloudProfiles() {
    if (!cloudReady) await refreshCloud(true);
    return cloudReady ? cloudRecords.filter((item) => item.type === 'profile' && item.data).map((item) => item.data) : [];
  }
  async function saveProfileToCloud(profile) {
    if (!cloudReady) await refreshCloud(true);
    if (!cloudReady) throw new Error('云端数据库暂不可用；命盘档案已保存在本机');
    const record = {
      id: profile.id, type: 'profile', title: '命盘档案', data: { ...profile },
      createdAt: profile.createdAt || new Date().toISOString(), updatedAt: profile.updatedAt || new Date().toISOString()
    };
    await saveEncryptedRecord(record);
  }
  async function deleteCloudProfile(id) {
    await api(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
    cloudRecords = cloudRecords.filter((item) => item.id !== id);
    updateCounts(); if (activeTab === 'cloud') renderRecords();
  }
  async function save(mode) {
    const buttonIds = ['save-local', 'save-cloud', 'save-both'];
    buttonIds.forEach((id) => { if ($(id)) $(id).disabled = true; });
    try {
      if (mode === 'local' || mode === 'both') await saveLocal();
      if (mode === 'cloud' || mode === 'both') await saveCloud();
      const message = mode === 'both' ? '已保存到本机和加密云端。' : mode === 'cloud' ? '已加密保存到云端。' : '已保存到当前浏览器。';
      setHint(message); setStatus(message, 'ok');
    } catch (error) {
      const message = mode === 'both' && localRecords.some((x) => x.id === current?.id)
        ? `本机已保存，但云端保存失败：${error.message}` : error.message;
      setHint(message); setStatus(message, 'error');
    } finally {
      buttonIds.forEach((id) => { if ($(id)) $(id).disabled = !current; });
    }
  }
  async function refreshCloud(silent = false) {
    try {
      const result = await api('/api/records?limit=500');
      const records = await Promise.all((result.records || []).map(async (row) => {
        try { const clear = await decrypt(row.payload); return { ...clear.record, cloudUpdatedAt: row.updatedAt || row.updated_at, locked: false }; }
        catch { return { id: row.id, type: row.type, title: row.title, updatedAt: row.updatedAt || row.updated_at, locked: true }; }
      }));
      cloudRecords = records; cloudReady = true;
      setStatus(`加密云端已连接 · ${records.length} 条记录`, 'ok'); updateCounts();
      if (activeTab === 'cloud') renderRecords();
      if (!silent) setHint(`云端同步完成，共 ${records.length} 条记录。`);
      return true;
    } catch (error) {
      cloudReady = false;
      const msg = error.message.includes('云端存储尚未启用') ? '云端数据库尚未配置；本机保存仍可用。' : `云端暂不可用：${error.message}`;
      setStatus(msg, 'error'); updateCounts();
      if (!silent) setHint(msg);
      return false;
    }
  }
  async function deleteRecord(id, source) {
    if (!confirm('确定永久删除这条记录吗？')) return;
    try {
      if (source === 'local') {
        localRecords = localRecords.filter((x) => x.id !== id); persistLocal();
      } else {
        await api(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
        cloudRecords = cloudRecords.filter((x) => x.id !== id); updateCounts(); renderRecords();
      }
      setStatus('记录已删除。', 'ok');
    } catch (error) { setStatus(error.message, 'error'); }
  }
  function exportBackup() {
    const profiles = safeParse(localStorage.getItem(PROFILE_KEY) || '[]', []);
    const backup = {
      app: 'Fortune Master Public', version: 2, exportedAt: new Date().toISOString(),
      warning: '备份含匿名访问 Token 和独立加密秘密。持有此文件的人可能访问并解密该设备关联的云端记录，请像密码一样妥善保管。',
      deviceToken: getToken(), encryptionSecret: getEncryptionSecret(), localRecords, profiles
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `fortune-master-device-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    setHint('设备备份已导出，请放在安全位置保管。');
  }
  async function importBackup(file) {
    if (file.size > 20 * 1024 * 1024) throw new Error('备份文件超过 20 MB');
    const backup = safeParse(await file.text(), null);
    if (!backup || backup.app !== 'Fortune Master Public' || backup.version !== 2 || !/^[A-Za-z0-9_-]{43}$/.test(backup.deviceToken || '') || !/^[A-Za-z0-9_-]{43}$/.test(backup.encryptionSecret || '') || !Array.isArray(backup.localRecords)) throw new Error('备份文件格式无效');
    if (!confirm('导入将替换当前匿名设备密钥、本地记录和命盘档案。建议先导出当前备份。是否继续？')) return;
    localStorage.setItem(TOKEN_KEY, backup.deviceToken);
    localStorage.setItem(ENCRYPTION_SECRET_KEY, backup.encryptionSecret);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(backup.localRecords));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(Array.isArray(backup.profiles) ? backup.profiles : []));
    keyPromise = undefined; localRecords = loadLocal(); cloudRecords = [];
    updateCounts(); renderRecords();
    const restored = await refreshCloud(true);
    window.dispatchEvent(new Event('fortune:profiles-imported'));
    setHint(restored ? '设备备份已导入，本地资料和云端记录已恢复。' : '本地备份已导入；云端暂不可用，可稍后重新同步。');
  }

  window.FortuneStorage = Object.freeze({ listCloudProfiles, saveProfileToCloud, deleteCloudProfile });

  document.addEventListener('DOMContentLoaded', async () => {
    try { getToken(); updateCounts(); renderRecords(); }
    catch (error) { setStatus(`浏览器加密能力不可用：${error.message}`, 'error'); }
    window.addEventListener('fortune:result', (event) => setCurrent(event.detail));
    window.addEventListener('fortune:clear-result', clearCurrent);
    $('save-local')?.addEventListener('click', () => void save('local'));
    $('save-cloud')?.addEventListener('click', () => void save('cloud'));
    $('save-both')?.addEventListener('click', () => void save('both'));
    $('sync-cloud')?.addEventListener('click', () => void refreshCloud(false));
    $('export-device-backup')?.addEventListener('click', exportBackup);
    $('import-device-backup')?.addEventListener('click', () => $('device-backup-file')?.click());
    $('device-backup-file')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0]; if (!file) return;
      try { await importBackup(file); } catch (error) { setStatus(error.message, 'error'); }
      event.target.value = '';
    });
    $('public-record-list')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-record-delete]');
      if (button) void deleteRecord(button.dataset.recordDelete, button.dataset.source);
    });
    document.querySelectorAll('[data-record-tab]').forEach((button) => button.addEventListener('click', () => {
      activeTab = button.dataset.recordTab;
      document.querySelectorAll('[data-record-tab]').forEach((tab) => tab.classList.toggle('active', tab === button));
      renderRecords();
    }));
    if (!window.isSecureContext || !crypto?.subtle) setStatus('请通过 HTTPS 或 localhost 使用加密云端保存；本机保存仍可用。', 'error');
    await refreshCloud(true);
  });
})();
