/**
 * Updater.gs — ອັບເດດ Apps Script ອັດຕະໂນມັດຈາກ GitHub
 * ---------------------------------------------------------------
 * ທຸກໆ 5 ນາທີ trigger ຈະກວດ GitHub repo (branch main).
 * ຖ້າໄຟລ໌ໃນໂຟນເດີ apps-script/ ມີການປ່ຽນແປງ:
 *   1. ດຶງໄຟລ໌ທັງໝົດມາແທນໂຄດໃນໂປຣເຈັກນີ້ (Apps Script API)
 *   2. ສ້າງ Version ໃໝ່
 *   3. ອັບເດດ Deployment ເດີມ → URL /exec ເດີມ, Google Sheet ເດີມ, ໜ້າຕາເດີມ
 *
 * ຕິດຕັ້ງຄັ້ງດຽວ:
 *   - ເປີດ Apps Script API: https://script.google.com/home/usersettings → ON
 *   - ໃນ Editor ເລືອກຟັງຊັນ setupAutoUpdate → Run → ອະນຸຍາດສິດ
 *
 * ຂໍ້ຄວນລະວັງ:
 *   - GitHub ເປັນຕົ້ນສະບັບ: ໄຟລ໌ທີ່ບໍ່ມີໃນ apps-script/ ຈະຖືກລຶບອອກຈາກໂປຣເຈັກ
 *     (ຍົກເວັ້ນ Updater ເອງ). ຢ່າແກ້ໂຄດໃນ Editor ໂດຍກົງ — ແກ້ໃນ GitHub ແທນ.
 *   - Apps Script ເກັບ Version ໄດ້ສູງສຸດ 200. ຖ້າເຕັມ ໃຫ້ລຶບ Version ເກົ່າໃນ
 *     Project History ຂອງ Editor.
 */

var GH_OWNER = 'maketingldbhox-arch';
var GH_REPO = 'mk-unit-system';
var GH_BRANCH = 'main';
var GH_DIR = 'apps-script/';
var GH_DEPLOYMENT_ID = 'AKfycbw_OjXqEk_KDXJ37UaHBzMnxcS_P3wDuZ9_hyNFyKVgrLmbazIiDvk_RUiUd9bAMlSY';
var GH_CHECK_MINUTES = 5;

var GH_REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/script.external_request',
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.deployments',
  'https://www.googleapis.com/auth/script.scriptapp'
];

/** ແລ່ນຄັ້ງດຽວໃນ Editor: ສ້າງ trigger + ອັບເດດຄັ້ງທຳອິດ */
function setupAutoUpdate() {
  stopAutoUpdate();
  ScriptApp.newTrigger('checkGitHubUpdate').timeBased().everyMinutes(GH_CHECK_MINUTES).create();
  ghApi_('get', '/content'); // ທົດສອບວ່າເປີດ Apps Script API ແລ້ວ
  var result = checkGitHubUpdate();
  Logger.log(result);
  return result;
}

/** ຢຸດການອັບເດດອັດຕະໂນມັດ */
function stopAutoUpdate() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'checkGitHubUpdate') ScriptApp.deleteTrigger(t);
  });
}

/** trigger: ອັບເດດເມື່ອ GitHub ມີການປ່ຽນແປງ */
function checkGitHubUpdate() {
  return ghSync_(false);
}

/** ບັງຄັບອັບເດດ + deploy ໃໝ່ທັນທີ (ເຖິງວ່າຈະບໍ່ມີການປ່ຽນແປງ) */
function forceGitHubUpdate() {
  var r = ghSync_(true);
  Logger.log(r);
  return r;
}

/** ເບິ່ງສະຖານະການອັບເດດຫຼ້າສຸດ */
function showGitHubUpdateStatus() {
  var p = PropertiesService.getScriptProperties();
  var s = {
    lastDeploy: p.getProperty('GH_LAST_DEPLOY'),
    lastCheckedSha: p.getProperty('GH_CHECKED_SHA'),
    lastError: p.getProperty('GH_LAST_ERROR')
  };
  Logger.log(JSON.stringify(s, null, 2));
  return s;
}

function ghSync_(force) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return 'busy';
  var props = PropertiesService.getScriptProperties();
  try {
    var sha = ghLatestSha_();
    if (!force && sha === props.getProperty('GH_CHECKED_SHA')) return 'up-to-date ' + sha.slice(0, 7);

    var repoFiles = ghFetchFiles_(sha);
    var current = ghApi_('get', '/content').files || [];
    var merged = ghMerge_(repoFiles, current);
    var hash = ghHash_(merged);

    if (!force && hash === ghHash_(ghNormalize_(current))) {
      props.setProperty('GH_CHECKED_SHA', sha);
      props.deleteProperty('GH_LAST_ERROR');
      return 'no code change ' + sha.slice(0, 7);
    }

    ghApi_('put', '/content', { files: merged });
    var label = 'GitHub ' + sha.slice(0, 7);
    var ver = ghApi_('post', '/versions', { description: label });
    ghApi_('put', '/deployments/' + GH_DEPLOYMENT_ID, {
      deploymentConfig: {
        scriptId: ScriptApp.getScriptId(),
        versionNumber: ver.versionNumber,
        manifestFileName: 'appsscript',
        description: label
      }
    });

    var info = { sha: sha, version: ver.versionNumber, at: new Date().toISOString(), files: merged.map(function (f) { return f.name; }) };
    props.setProperty('GH_CHECKED_SHA', sha);
    props.setProperty('GH_LAST_DEPLOY', JSON.stringify(info));
    props.deleteProperty('GH_LAST_ERROR');
    return 'deployed ' + label + ' → version ' + ver.versionNumber;
  } catch (err) {
    props.setProperty('GH_LAST_ERROR', new Date().toISOString() + ' ' + err.message);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/** commit ລ່າສຸດຂອງ branch (ໃຊ້ git endpoint ທີ່ບໍ່ຕິດ rate limit ຂອງ GitHub API) */
function ghLatestSha_() {
  var url = 'https://github.com/' + GH_OWNER + '/' + GH_REPO + '.git/info/refs?service=git-upload-pack';
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'Cache-Control': 'no-cache' } });
  if (res.getResponseCode() === 200) {
    var m = res.getContentText().match(new RegExp('([0-9a-f]{40}) refs/heads/' + GH_BRANCH + '(?![\\w/.-])'));
    if (m) return m[1];
  }
  var api = UrlFetchApp.fetch('https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/commits/' + GH_BRANCH, {
    muteHttpExceptions: true,
    headers: { Accept: 'application/vnd.github.sha' }
  });
  var sha = api.getContentText().trim();
  if (api.getResponseCode() !== 200 || !/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error('ອ່ານ commit ຈາກ GitHub ບໍ່ໄດ້ (HTTP ' + api.getResponseCode() + ')');
  }
  return sha;
}

/** ດາວໂຫຼດ zip ຂອງ commit ນັ້ນ ແລ້ວເອົາສະເພາະໄຟລ໌ໃນ apps-script/ */
function ghFetchFiles_(sha) {
  var res = UrlFetchApp.fetch('https://codeload.github.com/' + GH_OWNER + '/' + GH_REPO + '/zip/' + sha, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ດາວໂຫຼດໄຟລ໌ຈາກ GitHub ບໍ່ໄດ້ (HTTP ' + res.getResponseCode() + ')');
  var blobs = Utilities.unzip(res.getBlob().setContentType('application/zip'));
  var files = [];
  blobs.forEach(function (b) {
    var full = b.getName();
    var i = full.indexOf('/' + GH_DIR);
    if (i < 0 || /\/$/.test(full)) return;
    var rel = full.slice(i + 1 + GH_DIR.length);
    var src = b.getDataAsString('UTF-8');
    if (rel === 'appsscript.json') files.push({ name: 'appsscript', type: 'JSON', source: src });
    else if (/\.(gs|js)$/i.test(rel)) files.push({ name: rel.replace(/\.(gs|js)$/i, ''), type: 'SERVER_JS', source: src });
    else if (/\.html$/i.test(rel)) files.push({ name: rel.replace(/\.html$/i, ''), type: 'HTML', source: src });
  });
  return files;
}

/** ລວມໄຟລ໌ຈາກ GitHub ກັບ manifest ປັດຈຸບັນ (ຮັກສາການຕັ້ງຄ່າ web app + scope ທີ່ຈຳເປັນ) */
function ghMerge_(repoFiles, current) {
  var byName = function (list, name) { return list.filter(function (f) { return f.name === name; })[0]; };
  var curManifest = byName(current, 'appsscript');
  var repoManifest = byName(repoFiles, 'appsscript');
  var cur = curManifest ? JSON.parse(curManifest.source) : {};
  var rep = repoManifest ? JSON.parse(repoManifest.source) : {};
  var manifest = Object.assign({}, cur, rep);
  var scopes = (rep.oauthScopes || cur.oauthScopes || []).slice();
  GH_REQUIRED_SCOPES.forEach(function (s) { if (scopes.indexOf(s) < 0) scopes.push(s); });
  manifest.oauthScopes = scopes;

  var out = repoFiles.filter(function (f) { return f.name !== 'appsscript'; })
    .map(function (f) { return { name: f.name, type: f.type, source: f.source }; });
  if (!byName(out, 'Updater')) {
    var self = byName(current, 'Updater');
    if (self) out.push({ name: self.name, type: self.type, source: self.source });
  }
  var hasDoGet = out.some(function (f) { return f.type === 'SERVER_JS' && /function\s+doGet\s*\(/.test(f.source); });
  if (!hasDoGet) throw new Error('ບໍ່ພົບ doGet ໃນໄຟລ໌ຈາກ GitHub — ຍົກເລີກການອັບເດດເພື່ອຄວາມປອດໄພ');

  out.unshift({ name: 'appsscript', type: 'JSON', source: JSON.stringify(manifest, null, 2) });
  return out;
}

function ghNormalize_(files) {
  return files.map(function (f) { return { name: f.name, type: f.type, source: f.source }; });
}

function ghHash_(files) {
  var sorted = files.slice().sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; })
    .map(function (f) { return [f.name, f.type, f.type === 'JSON' ? JSON.stringify(JSON.parse(f.source)) : f.source]; });
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(sorted), Utilities.Charset.UTF_8);
  return d.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

function ghApi_(method, path, body) {
  var opt = {
    method: method,
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  var res = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + ScriptApp.getScriptId() + path, opt);
  var text = res.getContentText();
  if (res.getResponseCode() >= 300) {
    if (/usersettings/i.test(text)) {
      throw new Error('ຍັງບໍ່ໄດ້ເປີດ Apps Script API: ເປີດທີ່ https://script.google.com/home/usersettings ແລ້ວລອງໃໝ່');
    }
    if (path === '/versions' && /limit|maximum/i.test(text)) {
      throw new Error('Version ເຕັມ 200 ແລ້ວ: ລຶບ Version ເກົ່າໃນ Project History ຂອງ Editor');
    }
    throw new Error('Apps Script API ' + method.toUpperCase() + ' ' + path + ' → ' + res.getResponseCode() + ': ' + text.slice(0, 500));
  }
  return text ? JSON.parse(text) : {};
}
