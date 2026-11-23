const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { CUSTOM_IDS, STATUS_META } = require('../../utils/constants');
const { loadConfig } = require('../../utils/configManager');
const { isStaffMember } = require('../../utils/permissions');

module.exports = {
  customIds: [
    CUSTOM_IDS.ADMIN_SET_RATE,
    CUSTOM_IDS.ADMIN_UPSERT_ITEM,
    CUSTOM_IDS.ADMIN_DELETE_ITEM,
    CUSTOM_IDS.ADMIN_SET_STATUS,
    CUSTOM_IDS.ADMIN_SET_QUEUE,
  ],

  async execute(interaction) {
    if (!isStaffMember(interaction.member)) {
      return interaction.reply({
        content: '⛔ ปุ่มนี้สำหรับ **หัวหน้ามิโกะ (Owner)** และ **ผู้ดูแลศาลเจ้า (Staff)** เท่านั้น',
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = loadConfig();

    // 1. ตั้งค่าเรท Gamepass (Modal)
    if (interaction.customId === CUSTOM_IDS.ADMIN_SET_RATE) {
      const modal = new ModalBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_SET_RATE)
        .setTitle('📈 ตั้งค่าเรทกด Gamepass');

      const rateInput = new TextInputBuilder()
        .setCustomId('gamepass_rate')
        .setLabel('ระบุเรทใหม่ (เช่น 5.5 หรือ 6)')
        .setPlaceholder('5.5')
        .setValue(String(config?.gamepassRate ?? 5.5))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(rateInput));
      return interaction.showModal(modal);
    }

    // 2. เพิ่ม / แก้ไขไอเทม (Modal)
    if (interaction.customId === CUSTOM_IDS.ADMIN_UPSERT_ITEM) {
      const modal = new ModalBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_UPSERT_ITEM)
        .setTitle('➕ เพิ่ม / แก้ไขไอเทมในเกม');

      const gameInput = new TextInputBuilder()
        .setCustomId('item_game')
        .setLabel('ชื่อเกม (เช่น Blox Fruits)')
        .setPlaceholder('Blox Fruits')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const nameInput = new TextInputBuilder()
        .setCustomId('item_name')
        .setLabel('ชื่อไอเทม (ซ้ำ = แก้ไขราคา/หมายเหตุ)')
        .setPlaceholder('Permanent Buddha')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const priceInput = new TextInputBuilder()
        .setCustomId('item_price')
        .setLabel('ราคา (บาท)')
        .setPlaceholder('320')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const noteInput = new TextInputBuilder()
        .setCustomId('item_note')
        .setLabel('หมายเหตุเพิ่มเติม (ไม่บังคับ)')
        .setPlaceholder('ส่งเป็น Gift ในเกมทันที')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(gameInput),
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(priceInput),
        new ActionRowBuilder().addComponents(noteInput)
      );
      return interaction.showModal(modal);
    }

    // 3. ลบไอเทม (Ephemeral Dropdown เลือกเกมก่อน)
    if (interaction.customId === CUSTOM_IDS.ADMIN_DELETE_ITEM) {
      const games = config?.games || {};
      const gameNames = Object.keys(games).filter((g) => Array.isArray(games[g]) && games[g].length > 0);

      if (gameNames.length === 0) {
        return interaction.reply({
          content: '📭 ขณะนี้ยังไม่มีรายการไอเทมใน `config.json` ให้ลบครับ',
          flags: MessageFlags.Ephemeral,
        });
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId(CUSTOM_IDS.SELECT_ADMIN_DELETE_GAME)
        .setPlaceholder('เลือกเกมที่ต้องการลบไอเทม...')
        .addOptions(
          gameNames.slice(0, 25).map((g) => ({
            label: g.slice(0, 100),
            value: g.slice(0, 100),
            description: `มีไอเทมทั้งหมด ${games[g].length} รายการ`,
            emoji: '🎮',
          }))
        );

      return interaction.reply({
        content: '🗑️ **ขั้นที่ 1/2:** กรุณาเลือกเกมที่มีไอเทมที่ต้องการลบ:',
        components: [new ActionRowBuilder().addComponents(select)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // 4. เปลี่ยนสถานะร้าน (Ephemeral Dropdown)
    if (interaction.customId === CUSTOM_IDS.ADMIN_SET_STATUS) {
      const select = new StringSelectMenuBuilder()
        .setCustomId(CUSTOM_IDS.SELECT_ADMIN_STATUS)
        .setPlaceholder('เลือกสถานะร้านใหม่...')
        .addOptions([
          {
            label: `เปิดให้บริการปกติ (${STATUS_META.open.channelName})`,
            value: 'open',
            description: 'เปิดรับออเดอร์ปกติ',
            emoji: '🟢',
          },
          {
            label: `เปิดให้บริการ - คิวแน่น (${STATUS_META.busy.channelName})`,
            value: 'busy',
            description: 'เปิดรับออเดอร์แต่มีคิวสะสมจำนวนมาก',
            emoji: '🟡',
          },
          {
            label: `ปิดให้บริการชั่วคราว (${STATUS_META.closed.channelName})`,
            value: 'closed',
            description: 'มิโกะพักผ่อนชั่วคราว',
            emoji: '🔴',
          },
        ]);

      return interaction.reply({
        content: '🏮 เลือกสถานะร้านที่ต้องการอัปเดต (จะบันทึกลง `config.json` และเปลี่ยนชื่อห้องอัตโนมัติ):',
        components: [new ActionRowBuilder().addComponents(select)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // 5. อัปเดตจำนวนคิว (Modal)
    if (interaction.customId === CUSTOM_IDS.ADMIN_SET_QUEUE) {
      const modal = new ModalBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_SET_QUEUE)
        .setTitle('⏳ อัปเดตจำนวนคิวออเดอร์');

      const queueInput = new TextInputBuilder()
        .setCustomId('queue_count')
        .setLabel('จำนวนคิวปัจจุบัน (ตัวเลข 0 ขึ้นไป)')
        .setPlaceholder('0')
        .setValue(String(config?.queueCount ?? 0))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(queueInput));
      return interaction.showModal(modal);
    }
  },
};
