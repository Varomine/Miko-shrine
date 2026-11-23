# ⛩️ Miko Shrine — Roblox Gamepass & In-game Item Shop Bot

บอท Discord ระดับ Production สำหรับร้านรับกด Gamepass และขายไอเทมในเกม Roblox ในธีมศาลเจ้าญี่ปุ่น (**Miko Shrine**) พัฒนาด้วย Node.js และ `discord.js` v14

## ✨ จุดเด่นของระบบ
- **Config-Driven + Live File Watcher (`fs.watch`)**: แก้ไขเรท Gamepass, รายการไอเทม, ช่องทางการโอนเงิน, สถานะร้าน หรือจำนวนคิวใน `config.json` ผ่าน VS Code แล้วกด Save — บอทจะ **อัปเดต Embed, Dropdown และชื่อห้องใน Discord อัตโนมัติทันที** (มี debounce 500ms ป้องกันสแปม API)
- **Zero-Command UI สำหรับลูกค้า**: ลูกค้าไม่ต้องพิมพ์คำสั่งใดๆ ใช้งานผ่านปุ่ม, Dropdown และ Modal ภาษาไทยทั้งหมด มีเพียงคำสั่งเดียวคือ `/setup-shrine` (สำหรับ Administrator)
- **Automated Server Setup**: คำสั่ง `/setup-shrine` สร้างยศ 6 ระดับ, หมวดหมู่, ห้องข้อความ, ห้องเสียง (Voice Channels) และแผง UI ถาวรครบทั้งเซิร์ฟเวอร์
- **2-Way Admin Sync**: แก้ไขได้ทั้งจากปุ่มในห้อง `⚙️・แผงควบคุมแอดมิน` หรือแก้ตรงใน `config.json` ทั้งสองทางซิงก์ข้อมูลกันตลอดเวลา

---

## 📁 โครงสร้างโปรเจกต์
```text
miko-shrine-bot/
├── config.json                    # ตั้งค่าราคา, เรท, สถานะร้าน, คิว, บัญชีโอนเงิน (แก้แล้วซิงก์สด!)
├── state.json                     # (สร้างอัตโนมัติหลังรัน /setup-shrine) เก็บ ID ห้อง/ยศ/ข้อความ
├── index.js                       # ไฟล์หลักของบอท
├── deploy-commands.js             # สคริปต์ลงทะเบียน Slash Command (/setup-shrine)
├── commands/
│   └── setup-shrine.js            # คำสั่งติดตั้งเซิร์ฟเวอร์ศาลเจ้าทั้งหมด
├── events/
│   ├── ready.js                   # เริ่ม Live Watcher & ซิงก์แผง UI ตอนเปิดบอท
│   ├── guildMemberAdd.js          # มอบยศ Unverified อัตโนมัติ & ส่งข้อความต้อนรับ
│   └── interactionCreate.js       # ตัวกระจาย Slash Command / Button / Modal / Select Menu
├── interactions/
│   ├── buttons/                   # verify.js, adminPanel.js, calculator.js, orders.js
│   ├── modals/                    # adminModals.js, calcModal.js, orderModals.js, reviewModal.js
│   └── selectMenus/               # itemSelect.js, adminSelects.js
└── utils/
    ├── configManager.js           # จัดการ config.json, state.json, fs.watch และ Live-Sync
    ├── constants.js               # สีธีมศาลเจ้า, ชื่อยศ, Custom IDs
    ├── embeds.js                  # ตัวสร้าง Embed และปุ่มภาษาไทยทั้งหมด
    └── permissions.js             # ตรวจสอบสิทธิ์ Owner / Staff
```

---

## 🚀 วิธีติดตั้งและเริ่มใช้งาน

### 1. เตรียมบอทบน Discord Developer Portal
1. ไปที่ [Discord Developer Portal](https://discord.com/developers/applications) และสร้าง Application ใหม่
2. ในหน้า **Bot** ให้เปิด **Privileged Gateway Intents**:
   - ✅ **Server Members Intent** (`GuildMembers`) — *จำเป็นสำหรับการมอบยศ `👻・วิญญาณเร่ร่อน` อัตโนมัติ*
3. เชิญบอทเข้าเซิร์ฟเวอร์ด้วย Scope `bot` และ `applications.commands` พร้อมสิทธิ์ **Administrator**
4. ลากยศของบอทขึ้นไปไว้ด้านบนสุดใน Server Settings > Roles เพื่อให้บอทสามารถจัดการยศอื่นๆ ได้

### 2. ตั้งค่าไฟล์ `.env`
คัดลอก `.env.example` เป็น `.env` แล้วกรอกข้อมูล:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
```

### 3. ติดตั้ง Dependencies และลงทะเบียนคำสั่ง
```bash
npm install
npm run deploy
```

### 4. รันบอทและติดตั้งเซิร์ฟเวอร์
```bash
npm start
```
จากนั้นพิมพ์คำสั่ง `/setup-shrine` ในเซิร์ฟเวอร์ Discord ของคุณ บอทจะสร้างโครงสร้างทั้งหมดและบันทึก ID ลง `state.json` โดยอัตโนมัติ

---

## ⚙️ การแก้ไขราคาผ่าน `config.json` (Live-Sync)
เปิดไฟล์ `config.json` ใน VS Code แล้วแก้ไขค่าที่ต้องการ จากนั้นกด `Ctrl + S`:
- `gamepassRate`: เรทคำนวณราคา Gamepass (สูตร `Math.ceil(robux / gamepassRate)`)
- `shopStatus`: `"open"` (`🟢`), `"busy"` (`🟡`), หรือ `"closed"` (`🔴`)
- `queueCount`: จำนวนคิวงานปัจจุบัน
- `paymentInfo`: ข้อมูล PromptPay และบัญชีธนาคาร
- `games`: รายการเกมและไอเทม (เพิ่มเกมใหม่หรือเพิ่มไอเทมใน array ได้ทันที)

บอทจะตรวจจับการบันทึกไฟล์ภายใน ~500ms และอัปเดตห้อง `🎟️・เรทกด-gamepass`, `🗡️・เรทไอเทมในเกม`, `⏳・เช็กคิวออเดอร์`, `💳・ช่องทางการโอนเงิน`, `⚙️・แผงควบคุมแอดมิน` และ `🟢・สถานะร้าน` ให้อัตโนมัติทันที ⛩️
