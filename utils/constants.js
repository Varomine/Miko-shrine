/**
 * Miko Shrine — Constants, Theme Palette, Role/Channel Definitions & Custom IDs
 */

const COLORS = {
  SHRINE_RED: 0x990000,   // สีแดงศาลเจ้า (หลัก)
  SHRINE_GOLD: 0xFFD700,  // สีทองมงคล (เน้นราคา/VIP/รีวิว)
  SAKURA_PINK: 0xFFB7C5,  // สีชมพูซากุระ (ต้อนรับ/แอดมิน/อบอุ่น)
  OPEN_GREEN: 0x2ECC71,   // สถานะเปิดร้าน
  BUSY_AMBER: 0xF1C40F,   // สถานะคิวแน่น
  CLOSED_RED: 0xE74C3C,   // สถานะปิดร้าน
};

const STATUS_META = {
  open: {
    label: 'เปิดให้บริการปกติ',
    emoji: '🟢',
    channelName: '🟢・สถานะร้าน',
    color: COLORS.OPEN_GREEN,
    description: 'ศาลเจ้าเปิดประตูต้อนรับแล้ว! สามารถเปิดตั๋วสั่งซื้อและสอบถามแอดมินได้ทันที ⛩️',
  },
  busy: {
    label: 'เปิดให้บริการ (คิวแน่น)',
    emoji: '🟡',
    channelName: '🟡・สถานะร้าน',
    color: COLORS.BUSY_AMBER,
    description: 'ขณะนี้มีออเดอร์เข้ามาจำนวนมาก สามารถเปิดตั๋วรอคิวไว้ได้เลย แอดมินจะทยอยดำเนินการตามลำดับคิว 🌸',
  },
  closed: {
    label: 'ปิดให้บริการชั่วคราว',
    emoji: '🔴',
    channelName: '🔴・สถานะร้าน',
    color: COLORS.CLOSED_RED,
    description: 'ขณะนี้มิโกะพักผ่อนอยู่ สามารถดูเรทราคาและเตรียมข้อมูลไว้ก่อนได้ แล้วพบกันใหม่เมื่อศาลเจ้าเปิดทำการ 🌙',
  },
};

const ROLE_DEFS = {
  owner: { name: '⛩️・หัวหน้ามิโกะ (Owner)', color: 0x990000, hoist: true },
  staff: { name: '🌸・ผู้ดูแลศาลเจ้า (Staff)', color: 0xFFB7C5, hoist: true },
  bot: { name: '🤖・เทพารักษ์ (Bot)', color: 0x5865F2, hoist: true },
  vip: { name: '👑・ผู้ศรัทธาระดับสูง (VIP)', color: 0xFFD700, hoist: true },
  buyer: { name: '🛍️・ลูกค้าศาลเจ้า (Buyer)', color: 0xFFA500, hoist: true },
  member: { name: '🎐・ผู้มาเยือน (Member)', color: 0xFFFDD0, hoist: true },
  unverified: { name: '👻・วิญญาณเร่ร่อน (Unverified)', color: 0x2C2F33, hoist: false },
};

const CUSTOM_IDS = {
  // Verification
  VERIFY_BTN: 'miko_verify_member',

  // Admin Panel Buttons
  ADMIN_SET_RATE: 'miko_admin_set_rate',
  ADMIN_UPSERT_ITEM: 'miko_admin_upsert_item',
  ADMIN_DELETE_ITEM: 'miko_admin_delete_item',
  ADMIN_SET_STATUS: 'miko_admin_set_status',
  ADMIN_SET_QUEUE: 'miko_admin_set_queue',

  // Admin Modals & Select Menus
  MODAL_SET_RATE: 'miko_modal_set_rate',
  MODAL_UPSERT_ITEM: 'miko_modal_upsert_item',
  MODAL_SET_QUEUE: 'miko_modal_set_queue',
  SELECT_ADMIN_STATUS: 'miko_select_admin_status',
  SELECT_ADMIN_DELETE_GAME: 'miko_select_admin_delete_game',
  SELECT_ADMIN_DELETE_ITEM_PREFIX: 'miko_select_admin_delete_item:',

  // Customer Rate & Calculator
  CALC_GAMEPASS_BTN: 'miko_calc_gamepass',
  MODAL_CALC_GAMEPASS: 'miko_modal_calc_gamepass',
  SELECT_ITEM_GAME: 'miko_select_item_game',

  // Order & Ticket System
  ORDER_GAMEPASS_BTN: 'miko_order_gamepass',
  ORDER_ITEM_BTN: 'miko_order_item',
  MODAL_ORDER_GAMEPASS: 'miko_modal_order_gamepass',
  MODAL_ORDER_ITEM: 'miko_modal_order_item',
  TICKET_CLOSE_BTN: 'miko_ticket_close',
  TICKET_SEND_REVIEW_BTN: 'miko_ticket_send_review',
  CUSTOMER_REVIEW_BTN: 'miko_customer_review',
  MODAL_CUSTOMER_REVIEW: 'miko_modal_customer_review',
};

module.exports = {
  COLORS,
  STATUS_META,
  ROLE_DEFS,
  CUSTOM_IDS,
};
