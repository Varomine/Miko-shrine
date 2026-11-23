const fs = require('fs');
const path = require('path');
const { STATUS_META } = require('./constants');
const {
  buildAdminPanelMessage,
  buildShopStatusMessage,
  buildGamepassRateMessage,
  buildItemRateMessage,
  buildPaymentMessage,
  buildOrderPanelMessage,
  buildQueueStatusMessage,
} = require('./embeds');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config.json');
const STATE_PATH = path.join(ROOT_DIR, 'state.json');

const DEFAULT_CONFIG = {
  shopName: 'Miko Shrine',
  gamepassRate: 5.5,
  shopStatus: 'open',
  queueCount: 0,
  paymentInfo: {
    promptPay: '0XX-XXX-XXXX (กรุณาแก้ไขใน config.json)',
    bankName: 'ธนาคารกสิกรไทย (KBank)',
    accountNumber: 'XXX-X-XXXXX-X',
    accountName: 'ชื่อบัญชีเจ้าของศาลเจ้า',
    note: 'โอนแล้วส่งสลิปในห้องตั๋วสั่งซื้อเท่านั้น ห้ามโอนนอกตั๋วเด็ดขาด',
  },
  games: {},
};

const DEFAULT_STATE = {
  guildId: null,
  roles: {},
  categories: {},
  channels: {},
  messages: {},
  ticketCounter: 0,
};

let watcher = null;
let debounceTimer = null;
let lastSerializedConfig = null;
let syncInProgress = false;
let pendingSync = false;

/**
 * อ่าน config.json อย่างปลอดภัย (คืนค่า fallback หากไฟล์เสียหายชั่วคราวระหว่างเซฟ)
 */
function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
      return structuredClone(DEFAULT_CONFIG);
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      paymentInfo: {
        ...DEFAULT_CONFIG.paymentInfo,
        ...(parsed.paymentInfo || {}),
      },
      games: parsed.games && typeof parsed.games === 'object' ? parsed.games : {},
    };
  } catch (err) {
    console.error('[ConfigManager] อ่าน config.json ไม่สำเร็จ:', err.message);
    return null;
  }
}

/**
 * บันทึก config.json แบบจัดรูปแบบสวยงาม (2-space indent)
 */
function saveConfig(newConfig) {
  const serialized = JSON.stringify(newConfig, null, 2) + '\n';
  lastSerializedConfig = serialized;
  fs.writeFileSync(CONFIG_PATH, serialized, 'utf8');
  return newConfig;
}

/**
 * อัปเดต config.json ผ่าน callback แล้วซิงก์ Discord ทันที
 */
async function updateConfig(client, mutatorFn) {
  const current = loadConfig() || structuredClone(DEFAULT_CONFIG);
  const updated = (await mutatorFn(current)) || current;
  saveConfig(updated);
  if (client) {
    await syncDiscordPanels(client, updated);
  }
  return updated;
}

/**
 * อ่าน state.json (เก็บ ID ของห้อง, ยศ, ข้อความ และเลขคิวตั๋ว)
 */
function loadState() {
  try {
    if (!fs.existsSync(STATE_PATH)) {
      return structuredClone(DEFAULT_STATE);
    }
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      roles: { ...(parsed.roles || {}) },
      categories: { ...(parsed.categories || {}) },
      channels: { ...(parsed.channels || {}) },
      messages: { ...(parsed.messages || {}) },
    };
  } catch (err) {
    console.error('[ConfigManager] อ่าน state.json ไม่สำเร็จ:', err.message);
    return structuredClone(DEFAULT_STATE);
  }
}

/**
 * บันทึก state.json
 */
function saveState(newState) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2) + '\n', 'utf8');
  return newState;
}

/**
 * เพิ่มและคืนค่าเลขตั๋วถัดไป
 */
function nextTicketNumber() {
  const state = loadState();
  state.ticketCounter = (Number(state.ticketCounter) || 0) + 1;
  saveState(state);
  return String(state.ticketCounter).padStart(3, '0');
}

/**
 * Helper แก้ไขข้อความเดิมในห้องตาม channelId + messageId
 */
async function editTrackedMessage(guild, channelId, messageId, payload, label) {
  if (!channelId || !messageId) return false;
  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return false;
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return false;
    await message.edit(payload);
    return true;
  } catch (err) {
    console.warn(`[LiveSync] ไม่สามารถอัปเดตข้อความ (${label}):`, err.message);
    return false;
  }
}

/**
 * ซิงก์ Embeds, Select Menus และชื่อห้องสถานะร้านทั้งหมดใน Discord จาก config.json
 */
async function syncDiscordPanels(client, configOverride = null) {
  if (!client || !client.isReady()) return;

  if (syncInProgress) {
    pendingSync = true;
    return;
  }

  syncInProgress = true;
  try {
    const config = configOverride || loadConfig();
    if (!config) return;

    const state = loadState();
    if (!state.guildId) return;

    const guild = await client.guilds.fetch(state.guildId).catch(() => null);
    if (!guild) {
      console.warn('[LiveSync] ไม่พบ Guild ID ที่บันทึกไว้ใน state.json');
      return;
    }

    const { channels, messages } = state;

    // 1. อัปเดตแผงควบคุมแอดมิน (⚙️・แผงควบคุมแอดมิน)
    await editTrackedMessage(
      guild,
      channels.adminPanel,
      messages.adminPanel,
      buildAdminPanelMessage(config),
      'adminPanel'
    );

    // 2. อัปเดตเรทกด Gamepass (🎟️・เรทกด-gamepass)
    await editTrackedMessage(
      guild,
      channels.gamepassRate,
      messages.gamepassRate,
      buildGamepassRateMessage(config),
      'gamepassRate'
    );

    // 3. อัปเดตเรทไอเทมในเกม + Dropdown (🗡️・เรทไอเทมในเกม)
    await editTrackedMessage(
      guild,
      channels.itemRate,
      messages.itemRate,
      buildItemRateMessage(config),
      'itemRate'
    );

    // 4. อัปเดตคิวออเดอร์ (⏳・เช็กคิวออเดอร์)
    await editTrackedMessage(
      guild,
      channels.queueStatus,
      messages.queueStatus,
      buildQueueStatusMessage(config),
      'queueStatus'
    );

    // 5. อัปเดตช่องทางการโอนเงิน (💳・ช่องทางการโอนเงิน)
    await editTrackedMessage(
      guild,
      channels.payment,
      messages.payment,
      buildPaymentMessage(config),
      'payment'
    );

    // 6. อัปเดตหน้าเปิดตั๋วสั่งซื้อ (🎫・เปิดตั๋วสั่งซื้อ — เปิด/ปิดปุ่มตามสถานะร้านแบบเรียลไทม์)
    await editTrackedMessage(
      guild,
      channels.openTicket,
      messages.openTicket,
      buildOrderPanelMessage(config),
      'openTicket'
    );

    // 7. อัปเดตสถานะร้าน + เปลี่ยนชื่อห้อง (🟢/🟡/🔴・สถานะร้าน)
    await editTrackedMessage(
      guild,
      channels.shopStatus,
      messages.shopStatus,
      buildShopStatusMessage(config),
      'shopStatus'
    );

    if (channels.shopStatus) {
      const statusMeta = STATUS_META[config.shopStatus] || STATUS_META.open;
      const statusChannel = await guild.channels.fetch(channels.shopStatus).catch(() => null);
      if (statusChannel && statusChannel.name !== statusMeta.channelName) {
        await statusChannel.setName(statusMeta.channelName, 'Miko Shrine: อัปเดตสถานะร้านอัตโนมัติ').catch((err) => {
          console.warn('[LiveSync] เปลี่ยนชื่อห้องสถานะร้านไม่สำเร็จ (อาจติด Rate Limit ของ Discord):', err.message);
        });
      }
    }

    console.log('[LiveSync] ✅ ซิงก์ข้อมูลจาก config.json ไปยัง Discord เรียบร้อยแล้ว');
  } catch (err) {
    console.error('[LiveSync] เกิดข้อผิดพลาดขณะซิงก์ Discord:', err);
  } finally {
    syncInProgress = false;
    if (pendingSync) {
      pendingSync = false;
      await syncDiscordPanels(client);
    }
  }
}

/**
 * เริ่มระบบ Live File Watcher (fs.watch + 500ms debounce) สำหรับ config.json
 * ใช้การเฝ้าดูโฟลเดอร์หลักเพื่อรองรับทั้งการเขียนทับและการเซฟแบบ Atomic Rename ของ VS Code
 */
function startConfigWatcher(client) {
  if (watcher) {
    watcher.close();
    watcher = null;
  }

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      lastSerializedConfig = fs.readFileSync(CONFIG_PATH, 'utf8');
    }

    watcher = fs.watch(ROOT_DIR, (eventType, filename) => {
      if (!filename || path.basename(filename.toString()) !== 'config.json') return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          if (!fs.existsSync(CONFIG_PATH)) return;
          const raw = fs.readFileSync(CONFIG_PATH, 'utf8');

          // ข้ามหากเนื้อหาเหมือนเดิม (เช่น บอทเพิ่งเขียนเองผ่าน Admin Panel)
          if (raw === lastSerializedConfig) return;

          // ตรวจสอบว่า JSON ถูกต้องก่อนซิงก์
          JSON.parse(raw);
          lastSerializedConfig = raw;

          console.log('[FileWatcher] 🔄 ตรวจพบการแก้ไข config.json — กำลังซิงก์ไปยัง Discord...');
          await syncDiscordPanels(client);
        } catch (err) {
          console.warn('[FileWatcher] ⚠️ รอการบันทึก config.json ที่สมบูรณ์ (JSON ยังไม่ถูกต้อง):', err.message);
        }
      }, 500);
    });

    watcher.on('error', (err) => {
      console.error('[FileWatcher] เกิดข้อผิดพลาด:', err);
    });

    console.log('[FileWatcher] 👀 กำลังเฝ้าดูการเปลี่ยนแปลงของ config.json (debounce 500ms)');
  } catch (err) {
    console.error('[FileWatcher] ไม่สามารถเริ่มระบบเฝ้าดูไฟล์ได้:', err);
  }
}

module.exports = {
  CONFIG_PATH,
  STATE_PATH,
  loadConfig,
  saveConfig,
  updateConfig,
  loadState,
  saveState,
  nextTicketNumber,
  syncDiscordPanels,
  startConfigWatcher,
};
