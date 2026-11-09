# ລະບົບບໍລິຫານ ໜ່ວຍບໍລິການ ເມືອງຄອບ

<img src="docs/img/logo.svg" width="96" alt="logo">

Google Apps Script web app ຂອງ ທະນາຄານພັດທະນາລາວ · ໜ່ວຍບໍລິການ ເມືອງຄອບ
(ລາຍງານປະຈຳອາທິດ, ແດຊບອດ, ເຄື່ອງມືຂອງໜ່ວຍ). ໃຊ້ **Google Sheet ຖານຂໍ້ມູນເດີມ** ແລະ **ໜ້າຕ່າງແອັບເດີມ**.

| ຊ່ອງທາງ | ລິ້ງ |
|---|---|
| **GitHub Pages** (ເປີດແອັບ) | https://maketingldbhox-arch.github.io/mk-unit-system/ |
| Apps Script web app (URL ເດີມ) | https://script.google.com/macros/s/AKfycbw_OjXqEk_KDXJ37UaHBzMnxcS_P3wDuZ9_hyNFyKVgrLmbazIiDvk_RUiUd9bAMlSY/exec |

## ການອັບເດດອັດຕະໂນມັດ

```
ແກ້ໄຟລ໌ໃນ apps-script/ ເທິງ GitHub → commit ໃສ່ main
        ↓ (ພາຍໃນ ~5 ນາທີ)
Updater.gs ໃນ Apps Script ກວດເຫັນ commit ໃໝ່
        ↓
ແທນໂຄດໃນໂປຣເຈັກ → ສ້າງ Version ໃໝ່ → ອັບເດດ Deployment ເດີມ
        ↓
URL /exec ເດີມ + GitHub Pages ໃຊ້ໂຄດໃໝ່ທັນທີ (Sheet ເດີມ)
```

- ບໍ່ຕ້ອງເຂົ້າ Editor ເພື່ອ Deploy ເອງອີກ.
- ຖ້າໄຟລ໌ທີ່ປ່ຽນແມ່ນ `docs/` ຫຼື README ເທົ່ານັ້ນ ຈະບໍ່ສ້າງ Version ໃໝ່.
- **ຢ່າແກ້ໂຄດໃນ Apps Script Editor ໂດຍກົງ** — GitHub ເປັນຕົ້ນສະບັບ, ການອັບເດດຄັ້ງຕໍ່ໄປຈະຂຽນທັບ.

## ໂຄງສ້າງ

| ໄຟລ໌ | ໜ້າທີ່ |
|---|---|
| `apps-script/Code.gs` | Backend: `doGet`, ອ່ານ/ຂຽນ Google Sheet |
| `apps-script/Index.html` | ໜ້າຕ່າງແອັບ (UI ທັງໝົດ) |
| `apps-script/Updater.gs` | ດຶງໂຄດຈາກ GitHub ແລະ deploy ອັດຕະໂນມັດ |
| `apps-script/appsscript.json` | Manifest (timezone, web app, scopes) |
| `docs/` | GitHub Pages: ໜ້າເປີດແອັບ, ໂລໂກ້, PWA manifest |

ໄຟລ໌ໃໝ່ທີ່ເພີ່ມໃນ `apps-script/` (`.gs` / `.html`) ຈະຖືກເພີ່ມເຂົ້າໂປຣເຈັກອັດຕະໂນມັດ;
ໄຟລ໌ທີ່ລຶບອອກຈາກ `apps-script/` ຈະຖືກລຶບອອກຈາກໂປຣເຈັກ (ຍົກເວັ້ນ `Updater`).

## ຟັງຊັນໃນ Updater.gs (ແລ່ນໃນ Editor)

| ຟັງຊັນ | ໃຊ້ເມື່ອ |
|---|---|
| `setupAutoUpdate` | ຕິດຕັ້ງຄັ້ງທຳອິດ (ສ້າງ trigger ທຸກ 5 ນາທີ) |
| `forceGitHubUpdate` | ບັງຄັບ deploy ໃໝ່ທັນທີ |
| `showGitHubUpdateStatus` | ເບິ່ງ commit/version ທີ່ deploy ຫຼ້າສຸດ ແລະ error |
| `stopAutoUpdate` | ຢຸດການອັບເດດອັດຕະໂນມັດ |

ເງື່ອນໄຂ: ເປີດ **Apps Script API** ທີ່ https://script.google.com/home/usersettings.
Apps Script ເກັບ Version ໄດ້ສູງສຸດ 200 — ຖ້າເຕັມ ໃຫ້ລຶບ Version ເກົ່າໃນ Project History.

## ໝາຍເຫດ GitHub Pages

ໜ້າ GitHub Pages ສະແດງແອັບຜ່ານ iframe (Code.gs ຕັ້ງ `XFrameOptionsMode.ALLOWALL` ແລ້ວ).
Web app ຕັ້ງເປັນ "Anyone with Google account" ດັ່ງນັ້ນຜູ້ໃຊ້ຕ້ອງເຂົ້າສູ່ລະບົບ Google;
ຖ້າ browser ບລັອກ ໃຫ້ກົດປຸ່ມ **ເປີດເຕັມຈໍ ↗** ເທິງແຖບດ້ານເທິງ.

**iPhone/iPad:** Safari ບລັອກການເຂົ້າສູ່ລະບົບ Google ໃນ iframe, ດັ່ງນັ້ນໜ້ານີ້ສະແດງປຸ່ມ **ເປີດແອັບ** ແທນ.
ໄອຄອນໃນໜ້າຈໍຫຼັກ (`manifest-ios.webmanifest`, `?pwa=1`) ເປີດໃນ Safari ແລ້ວໄປທີ່ແອັບໂດຍກົງ.
