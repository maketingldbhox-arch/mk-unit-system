/**
 * ລາຍງານຜົນການໃຫ້ບໍລິການປະຈຳອາທິດ — ໜ່ວຍບໍລິການເມືອງຄອບ (ທະນາຄານ ພັດທະນາລາວ ຈຳກັດ)
 * Back-end: Google Apps Script + Google Sheets
 *
 * ໂຄງສ້າງຊີດ (ສ້າງໃຫ້ອັດຕະໂນມັດເມື່ອເປີດໃຊ້ຄັ້ງທຳອິດ):
 *   DAILY         ຂໍ້ມູນການເຄື່ອນໄຫວລາຍວັນ (1 ແຖວ = 1 ວັນ)
 *   MOBILIZE      ຜົນລະດົມລູກຄ້າ ໃນແຜນ / ນອກແຜນ (ພ້ອມເຫດຜົນ)
 *   PROJECT_1000  ໂຄງການຄູ່ຮ່ວມຍຸດທະສາດ 1,000 ສັນຍາ
 *   NOTES         ບົດສະຫຼຸບ/ບັນຫາ/ແຜນຕໍ່ໄປ ຂອງແຕ່ລະໄລຍະລາຍງານ
 *   SETTINGS      ຊື່ໜ່ວຍ, ອັດຕາແລກປ່ຽນ, ຜູ້ລາຍງານ
 *
 * ແຫຼ່ງຂໍ້ມູນອັດຕະໂນມັດ: ຊີດ "WEBAPP ສະຫຼຸບລາຍງານປະຈຳວັນ ສາຂາ ບໍ່ແກ້ວ" (ແຖບ DATA)
 *   ດຶງສະເພາະແຖວທີ່ branch = ໜ່ວຍບໍລິການ ມ.ຄອບ: ບັນຊີເປີດໃໝ່, ເງິນຝາກ-ຖອນ, ຜະລິດຕະພັນດິຈິຕອນ,
 *   ແລກປ່ຽນເງິນຕາ, ໂອນເງິນເຂົ້າ-ອອກຕ່າງປະເທດ. ສ່ວນທີ່ບໍ່ມີໃນຊີດນັ້ນ (ເງິນຄືນສາຂາ, RTGS,
 *   ບໍລິການອື່ນ) ຍັງປ້ອນໃນໜ້າ "ປ້ອນຂໍ້ມູນ". ປ່ຽນແຫຼ່ງ/ໜ່ວຍໄດ້ໃນໜ້າ "ຕັ້ງຄ່າ".
 * RTGS / NPS ຂາອອກ: ດຶງຈາກແຖບ "ວຽກ-NPS" ໃນຊີດ "ເລກທີ ມ.ຄອບ 2026" (1 ແຖວ = 1 ທຸລະກຳ).
 * ລາຍການທີ່ປ້ອນເອງ (ເຄື່ອນວັດຖຸ, ບໍລິການອື່ນ) ປ້ອນເປັນຍອດລວມປະຈຳອາທິດ ແລະ ບັນທຶກໄວ້ວັນຈັນຂອງອາທິດນັ້ນ.
 *
 * ຖ້າໂປຣເຈັກນີ້ຜູກກັບ Google Sheet (Extensions > Apps Script) ຈະໃຊ້ຊີດນັ້ນເລີຍ.
 * ຖ້າເປັນ standalone script ຈະສ້າງ Spreadsheet ໃໝ່ໃຫ້ ແລ້ວຈື່ ID ໄວ້ໃນ Script Properties.
 * ຖ້າຢາກໃຊ້ຊີດທີ່ມີຢູ່ແລ້ວ: ໃສ່ ID ໃນ Script Properties ຊື່ SPREADSHEET_ID.
 */

const TZ = 'Asia/Vientiane';
/** Google Sheet ຖານຂໍ້ມູນ: ຖານຂໍ້ມູນ ລາຍງານປະຈຳອາທິດ ໜ່ວຍບໍລິການເມືອງຄອບ */
const DB_SPREADSHEET_ID = '1MQiYktJMSU6tM4LxbSlFhqN5hGSnxew6kUGNNP-SlbE';
const SH = { DAILY: 'DAILY', MOB: 'MOBILIZE', P1000: 'PROJECT_1000', NOTES: 'NOTES', SET: 'SETTINGS' };
const RECORD_SHEETS = [SH.MOB, SH.P1000, SH.NOTES];
const META_KEYS = ['date', 'updated_at', 'updated_by'];

const DEFAULT_SETTINGS = {
  org_name: 'ທະນາຄານ ພັດທະນາລາວ ຈຳກັດ',
  branch_name: 'ສາຂາ ບໍ່ແກ້ວ',
  unit_name: 'ໜ່ວຍບໍລິການ ເມືອງຄອບ',
  prepared_by: '',
  prepared_title: 'ພະນັກງານວິຊາການ',
  approver: '',
  approver_title: 'ຫົວໜ້າໜ່ວຍບໍລິການ',
  rate_usd: 21286,
  rate_thb: 685,
  rate_cny: 3056,
  rate_eur: 0,
  rate_gbp: 0,
  rate_aud: 0,
  src_enabled: 'ເປີດ',
  src_sheet_id: '17gGL4ZBpjka5vLZ6bn6pwK3uUcMYt3C1XG6DtG-XUUk',
  src_tab: 'DATA',
  src_unit: 'ໜ່ວຍບໍລິການ ມ.ຄອບ',
  nps_enabled: 'ເປີດ',
  nps_sheet_id: '16aaBzItGUo6uHlNrFHGKZYeWjKZffmMxOZCw9bDn6JY',
  nps_tab: 'ວຽກ-NPS'
};

/** ຈຳນວນລາຍການຕໍ່ມື້ທີ່ສູງກວ່ານີ້ ຖືວ່າເປັນຍອດເງິນທີ່ປ້ອນຜິດຊ່ອງ */
const COUNT_LIMIT = 1000;

/** ແປງຊື່ຖັນໃນຊີດສາຂາ → ຊື່ຂໍ້ມູນໃນແອັບນີ້ (null = ບໍ່ໃຊ້) */
function mapKey_(k) {
  k = String(k || '').trim().toLowerCase();
  let m;
  if (/^(saving|fixed|current|dep|wit)_(lak|thb|cny|usd)_(count|amount)$/.test(k)) return k;
  if ((m = k.match(/^prod_(atm|ldb_trust|qr_trust_pay|sms_alert)_count$/))) return m[1] + '_count';
  if (/^inward_(usd|thb|cny|lak)_(count|amount)$/.test(k)) return k;
  if ((m = k.match(/^ex_([a-z]{3})_lak_(count|amount)$/))) return 'ex_' + m[1] + '_' + m[2];
  if ((m = k.match(/^outward_(wu|western)_(count|amount)$/))) return 'western_out_' + m[2];
  if ((m = k.match(/^outward_(eborder|swift)_(count|amount)$/))) return m[1] + '_out_' + m[2];
  return null;
}

/* ---------------- Web app ---------------- */

function doGet() {
  ss_(); // ກຽມຖານຂໍ້ມູນ
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ລາຍງານປະຈຳອາທິດ ມ.ຄອບ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** ເອີ້ນຄັ້ງດຽວຈາກ editor ເພື່ອສ້າງຊີດທັງໝົດ ແລະ ອະນຸຍາດສິດ */
function setup() {
  Object.keys(SH).forEach(k => sheet_(SH[k]));
  const s = getSettings();
  saveSettings(s);
  Logger.log('ພ້ອມໃຊ້ງານ: ' + ss_().getUrl());
}

/* ---------------- Helpers ---------------- */

function ss_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID') || DB_SPREADSHEET_ID;
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* ID ບໍ່ຖືກ → ສ້າງໃໝ່ */ }
  }
  let ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  if (!ss) ss = SpreadsheetApp.create('ຖານຂໍ້ມູນ ລາຍງານປະຈຳອາທິດ ໜ່ວຍບໍລິການເມືອງຄອບ');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function sheet_(name) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const base = name === SH.DAILY ? META_KEYS.slice()
      : name === SH.SET ? ['key', 'value']
      : ['id', 'updated_at', 'updated_by'];
    styleHeader_(sh.getRange(1, 1, 1, base.length).setValues([base]));
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@');
  }
  return sh;
}

function styleHeader_(rg) {
  return rg.setFontWeight('bold').setBackground('#2778b9').setFontColor('#ffffff');
}

function headers_(sh) {
  const lc = sh.getLastColumn();
  return lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : [];
}

function ensureCols_(sh, keys) {
  const h = headers_(sh);
  const missing = keys.filter(k => k && h.indexOf(k) === -1);
  if (missing.length) {
    styleHeader_(sh.getRange(1, h.length + 1, 1, missing.length).setValues([missing]));
    return h.concat(missing);
  }
  return h;
}

function cell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return v;
}

function now_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }

function user_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

function num_(v) {
  if (v === '' || v === null || v === undefined) return '';
  const n = Number(String(v).replace(/,/g, ''));
  return isNaN(n) || n === 0 ? '' : n;
}

/** ເກັບເລກບັນຊີ/ຂໍ້ຄວາມທີ່ເປັນຕົວເລກຍາວ ເປັນ text ເພື່ອບໍ່ໃຫ້ເລກ 0 ຂ້າງໜ້າຫາຍ */
function txt_(v) {
  if (typeof v === 'string' && /^(0\d+|\d{11,})$/.test(v.trim())) return "'" + v.trim();
  return v === undefined || v === null ? '' : v;
}

function readAll_(sh) {
  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 2 || lc < 1) return [];
  const vals = sh.getRange(1, 1, lr, lc).getValues();
  const h = vals[0].map(String);
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const r = vals[i];
    if (r[0] === '' || r[0] === null) continue;
    const o = {};
    h.forEach((k, j) => { if (k) o[k] = cell_(r[j]); });
    out.push(o);
  }
  return out;
}

function findRow_(sh, keyVal) {
  const lr = sh.getLastRow();
  if (lr < 2) return -1;
  const col = sh.getRange(2, 1, lr - 1, 1).getValues();
  for (let i = 0; i < col.length; i++) {
    if (String(cell_(col[i][0])) === String(keyVal)) return i + 2;
  }
  return -1;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------------- API: init / settings ---------------- */

function getInit() {
  return { settings: getSettings(), user: user_(), sheetUrl: ss_().getUrl() };
}

function getSettings() {
  const rows = readAll_(sheet_(SH.SET));
  const s = Object.assign({}, DEFAULT_SETTINGS);
  rows.forEach(r => { if (r.key) s[r.key] = r.value; });
  return s;
}

function saveSettings(obj) {
  return withLock_(() => {
    const sh = sheet_(SH.SET);
    const merged = Object.assign({}, DEFAULT_SETTINGS, obj || {});
    merged.src_sheet_id = sheetId_(merged.src_sheet_id);
    merged.nps_sheet_id = sheetId_(merged.nps_sheet_id);
    const rows = Object.keys(merged).map(k => [k, merged[k]]);
    sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 2).clearContent();
    sh.getRange(2, 1, rows.length, 2).setValues(rows);
    return getSettings();
  });
}

/* ---------------- API: daily data ---------------- */

function getDaily(date) {
  const sh = sheet_(SH.DAILY);
  const row = findRow_(sh, date);
  if (row < 0) return null;
  const h = headers_(sh);
  const v = sh.getRange(row, 1, 1, h.length).getValues()[0];
  const o = {};
  h.forEach((k, i) => { if (k) o[k] = cell_(v[i]); });
  return o;
}

function saveDaily(date, data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error('ວັນທີບໍ່ຖືກຕ້ອງ');
  return withLock_(() => {
    const sh = sheet_(SH.DAILY);
    const keys = Object.keys(data || {}).filter(k => META_KEYS.indexOf(k) === -1);
    const h = ensureCols_(sh, keys);
    let row = findRow_(sh, date);
    const current = row > 0 ? sh.getRange(row, 1, 1, h.length).getValues()[0] : new Array(h.length).fill('');
    const values = h.map((k, i) => {
      if (k === 'date') return date;
      if (k === 'updated_at') return now_();
      if (k === 'updated_by') return user_();
      if (Object.prototype.hasOwnProperty.call(data, k)) return num_(data[k]);
      return current[i];
    });
    if (row < 0) row = sh.getLastRow() + 1;
    sh.getRange(row, 1).setNumberFormat('@');
    sh.getRange(row, 1, 1, values.length).setValues([values]);
    return true;
  });
}

function deleteDaily(date) {
  return withLock_(() => {
    const sh = sheet_(SH.DAILY);
    const row = findRow_(sh, date);
    if (row > 0) sh.deleteRow(row);
    return true;
  });
}

/* ---------------- API: source sheet (WEBAPP ສະຫຼຸບລາຍງານປະຈຳວັນ ສາຂາ ບໍ່ແກ້ວ) ---------------- */

function sheetId_(v) {
  const s = String(v || '').trim();
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : s;
}

function normText_(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }

function normDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // dd/mm/yyyy
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function openSource_(id, tab) {
  const ss = SpreadsheetApp.openById(sheetId_(id));
  const sh = ss.getSheetByName(tab || 'DATA');
  if (!sh) throw new Error('ບໍ່ພົບແຖບ "' + (tab || 'DATA') + '" ໃນຊີດແຫຼ່ງຂໍ້ມູນ');
  const vals = sh.getDataRange().getValues();
  const h = vals[0].map(x => normText_(x).toLowerCase());
  const iD = h.indexOf('date'), iB = h.indexOf('branch');
  if (iD < 0 || iB < 0) throw new Error('ຊີດແຫຼ່ງຂໍ້ມູນບໍ່ມີຖັນ date / branch');
  return { name: ss.getName(), vals: vals, h: h, iD: iD, iB: iB };
}

/** ອ່ານຂໍ້ມູນຂອງໜ່ວຍທີ່ຕັ້ງໄວ້ ໃນຊ່ວງວັນທີ, ລວມແຖວທີ່ວັນທີຊ້ຳກັນ */
function readSource_(start, end) {
  const s = getSettings();
  if (String(s.src_enabled) === 'ປິດ') return { on: false, ok: false, rows: [] };
  const unit = normText_(s.src_unit);
  try {
    const src = openSource_(s.src_sheet_id, s.src_tab);
    const map = src.h.map(mapKey_);
    const byDate = {}, fixes = [];
    let last = '', n = 0;
    for (let i = 1; i < src.vals.length; i++) {
      const r = src.vals[i];
      if (normText_(r[src.iB]) !== unit) continue;
      const d = normDate_(r[src.iD]);
      if (!d) continue;
      if (d > last) last = d;
      if (d < start || d > end) continue;
      n++;
      const one = {};
      map.forEach((k, j) => {
        if (!k) return;
        const v = Number(String(r[j]).replace(/,/g, ''));
        if (v) one[k] = (one[k] || 0) + v;
      });
      // ກວດການປ້ອນຜິດຊ່ອງ: ຍອດເງິນຖືກພິມໃສ່ຊ່ອງ "ຈຳນວນລາຍການ" ແລະ ຊ່ອງຍອດເງິນວ່າງ
      Object.keys(one).forEach(k => {
        if (!/_count$/.test(k) || one[k] <= COUNT_LIMIT) return;
        const ak = k.replace(/_count$/, '_amount');
        if (!one[ak]) {
          fixes.push({ date: d, field: k, value: one[k] });
          one[ak] = one[k];
          one[k] = 1;
        }
      });
      const o = byDate[d] || (byDate[d] = { date: d });
      Object.keys(one).forEach(k => { o[k] = (o[k] || 0) + one[k]; });
    }
    return { on: true, ok: true, rows: Object.keys(byDate).map(k => byDate[k]), unit: unit, last: last, name: src.name, n: n, fixes: fixes };
  } catch (e) {
    return { on: true, ok: false, error: e.message, rows: [], unit: unit };
  }
}

/** ສຳລັບໜ້າຕັ້ງຄ່າ: ລາຍຊື່ໜ່ວຍ/ສາຂາ ທີ່ມີໃນຊີດແຫຼ່ງ (ໃຊ້ທົດສອບການເຊື່ອມຕໍ່ນຳ) */
function listSourceUnits(id, tab) {
  const s = getSettings();
  const src = openSource_(id || s.src_sheet_id, tab || s.src_tab);
  const units = {};
  let last = '';
  for (let i = 1; i < src.vals.length; i++) {
    const b = normText_(src.vals[i][src.iB]);
    if (!b) continue;
    const d = normDate_(src.vals[i][src.iD]);
    if (!units[b] || d > units[b]) units[b] = d;
    if (d > last) last = d;
  }
  return { name: src.name, last: last, units: Object.keys(units).sort().map(u => ({ unit: u, last: units[u] })) };
}

/* ---------------- API: RTGS / NPS ຂາອອກ (ແຖບ ວຽກ-NPS) ---------------- */

function openNps_(id, tab) {
  const ss = SpreadsheetApp.openById(sheetId_(id));
  const sh = ss.getSheetByName(tab || 'ວຽກ-NPS');
  if (!sh) throw new Error('ບໍ່ພົບແຖບ "' + (tab || 'ວຽກ-NPS') + '"');
  const rg = sh.getDataRange();
  const vals = rg.getValues(), disp = rg.getDisplayValues();
  let hr = -1;
  for (let i = 0; i < Math.min(15, disp.length) && hr < 0; i++) {
    if (disp[i].some(c => normText_(c) === 'ວ.ດ.ປ')) hr = i;
  }
  if (hr < 0) throw new Error('ບໍ່ພົບຫົວຖັນ "ວ.ດ.ປ" ໃນແຖບ NPS');
  const h = disp[hr].map(normText_);
  const col = name => h.findIndex(x => x.indexOf(name) === 0);
  const c = { d: col('ວ.ດ.ປ'), a: col('ຈຳນວນເງິນ'), ccy: col('ສະກຸນເງິນ'), bank: col('ທະນາຄານປາຍທາງ') };
  if (c.a < 0 || c.ccy < 0) throw new Error('ແຖບ NPS ບໍ່ມີຖັນ ຈຳນວນເງິນ / ສະກຸນເງິນ');
  const txs = [];
  for (let i = hr + 1; i < disp.length; i++) {
    const d = normDate_(disp[i][c.d]);
    if (!d) continue;
    const raw = vals[i][c.a];
    const amt = typeof raw === 'number' ? raw : Number(String(disp[i][c.a]).replace(/[^\d.-]/g, ''));
    const ccy = normText_(disp[i][c.ccy]).toLowerCase();
    if (!amt || ['lak', 'usd', 'thb', 'cny'].indexOf(ccy) < 0) continue;
    txs.push({ date: d, ccy: ccy, amount: amt, bank: c.bank >= 0 ? normText_(disp[i][c.bank]) : '' });
  }
  return { name: ss.getName(), txs: txs };
}

/** RTGS/NPS ຂາອອກ: ລວມເປັນລາຍວັນ ແລະ ສົ່ງລາຍການ (ວັນທີ, ສະກຸນ, ຍອດ, ທະນາຄານ) ໃຫ້ໜ້າລາຍງານ */
function readNps_(start, end) {
  const s = getSettings();
  if (String(s.nps_enabled) === 'ປິດ') return { on: false, ok: false, rows: [], txs: [] };
  try {
    const n = openNps_(s.nps_sheet_id, s.nps_tab);
    const byDate = {};
    let last = '';
    n.txs.forEach(t => { if (t.date > last) last = t.date; });
    const txs = n.txs.filter(t => t.date >= start && t.date <= end);
    txs.forEach(t => {
      const o = byDate[t.date] || (byDate[t.date] = { date: t.date });
      o['rtgs_out_' + t.ccy + '_count'] = (o['rtgs_out_' + t.ccy + '_count'] || 0) + 1;
      o['rtgs_out_' + t.ccy + '_amount'] = (o['rtgs_out_' + t.ccy + '_amount'] || 0) + t.amount;
    });
    return { on: true, ok: true, rows: Object.keys(byDate).map(k => byDate[k]), txs: txs, last: last, name: n.name, total: n.txs.length };
  } catch (e) {
    return { on: true, ok: false, error: e.message, rows: [], txs: [] };
  }
}

/** ສຳລັບໜ້າຕັ້ງຄ່າ: ທົດສອບການເຊື່ອມຕໍ່ແຖບ NPS */
function testNps(id, tab) {
  const s = getSettings();
  const n = openNps_(id || s.nps_sheet_id, tab || s.nps_tab);
  const last = n.txs.reduce((m, t) => t.date > m ? t.date : m, '');
  return { name: n.name, total: n.txs.length, last: last };
}

/** ວັນທີທີ່ມີຂໍ້ມູນປ້ອນເອງ (ໃຊ້ສະແດງອາທິດທີ່ປ້ອນແລ້ວ) */
function listDailyDates() {
  return readAll_(sheet_(SH.DAILY)).map(r => r.date).filter(Boolean);
}

/** ແຖວ DAILY ໃນຊ່ວງວັນທີ (ໃຊ້ໃນໜ້າປ້ອນຂໍ້ມູນ: ຍອດລາຍວັນ + ຍອດລວມອາທິດ) */
function getDailyRange(start, end) {
  return readAll_(sheet_(SH.DAILY)).filter(r => r.date >= start && r.date <= end);
}

/** ດຶງຂໍ້ມູນທັງໝົດທີ່ໜ້າລາຍງານຕ້ອງການ ໃນການເອີ້ນຄັ້ງດຽວ */
function getReportData(start, end) {
  const daily = readAll_(sheet_(SH.DAILY)).filter(r => r.date >= start && r.date <= end);
  return {
    daily: daily,
    src: readSource_(start, end),
    nps: readNps_(start, end),
    mob: readAll_(sheet_(SH.MOB)),
    p1000: readAll_(sheet_(SH.P1000)),
    notes: readAll_(sheet_(SH.NOTES)),
    settings: getSettings()
  };
}

/* ---------------- API: record sheets (ລະດົມ, 1,000 ສັນຍາ, ໝາຍເຫດ) ---------------- */

function checkSheet_(name) {
  if (RECORD_SHEETS.indexOf(name) === -1) throw new Error('ບໍ່ອະນຸຍາດຊີດ: ' + name);
}

function listRecords(name) {
  checkSheet_(name);
  return readAll_(sheet_(name));
}

function saveRecord(name, obj) {
  checkSheet_(name);
  return withLock_(() => {
    const sh = sheet_(name);
    const rec = Object.assign({}, obj || {});
    if (!rec.id) rec.id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    rec.updated_at = now_();
    rec.updated_by = user_();
    const h = ensureCols_(sh, Object.keys(rec));
    let row = findRow_(sh, rec.id);
    const current = row > 0 ? sh.getRange(row, 1, 1, h.length).getValues()[0] : new Array(h.length).fill('');
    const values = h.map((k, i) => Object.prototype.hasOwnProperty.call(rec, k) ? txt_(rec[k]) : current[i]);
    if (row < 0) row = sh.getLastRow() + 1;
    sh.getRange(row, 1, 1, values.length).setValues([values]);
    return rec.id;
  });
}

function deleteRecord(name, id) {
  checkSheet_(name);
  return withLock_(() => {
    const sh = sheet_(name);
    const row = findRow_(sh, id);
    if (row > 0) sh.deleteRow(row);
    return true;
  });
}
