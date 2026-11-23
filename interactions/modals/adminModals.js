const { MessageFlags } = require('discord.js');
const { CUSTOM_IDS } = require('../../utils/constants');
const { updateConfig } = require('../../utils/configManager');
const { isStaffMember } = require('../../utils/permissions');

module.exports = {
  customIds: [
    CUSTOM_IDS.MODAL_SET_RATE,
    CUSTOM_IDS.MODAL_UPSERT_ITEM,
    CUSTOM_IDS.MODAL_SET_QUEUE,
  ],

  async execute(interaction) {
    if (!isStaffMember(interaction.member)) {
      return interaction.reply({
        content: '⛔ คุณไม่มีสิทธิ์ใช้งานแผงควบคุมแอดมิน',
        flags: MessageFlags.Ephemeral,
      });
    }

    // 1. ตั้งค่าเรท Gamepass
    if (interaction.customId === CUSTOM_IDS.MODAL_SET_RATE) {
      const rawRate = interaction.fields.getTextInputValue('gamepass_rate').trim();
      const rate = Number(rawRate);

      if (!Number.isFinite(rate) || rate <= 0) {
        return interaction.reply({
          content: '❌ กรุณากรอกตัวเลขเรทที่มากกว่า 0 (เช่น `5.5` หรือ `6`)',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      await updateConfig(interaction.client, (cfg) => {
        cfg.gamepassRate = rate;
        return cfg;
      });

      return interaction.editReply(
        `✅ อัปเดต **เรทกด Gamepass** เป็น **เรท \`${rate}\`** ลงใน \`config.json\` และซิงก์ห้อง \`🎟️・เรทกด-gamepass\` เรียบร้อยแล้ว!`
      );
    }

    // 2. เพิ่ม / แก้ไขไอเทมในเกม
    if (interaction.customId === CUSTOM_IDS.MODAL_UPSERT_ITEM) {
      const gameName = interaction.fields.getTextInputValue('item_game').trim();
      const itemName = interaction.fields.getTextInputValue('item_name').trim();
      const rawPrice = interaction.fields.getTextInputValue('item_price').trim();
      const itemNote = interaction.fields.getTextInputValue('item_note').trim();
      const price = Number(rawPrice);

      if (!gameName || !itemName) {
        return interaction.reply({
          content: '❌ กรุณากรอกชื่อเกมและชื่อไอเทมให้ครบถ้วน',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!Number.isFinite(price) || price < 0) {
        return interaction.reply({
          content: '❌ กรุณากรอกราคาเป็นตัวเลขที่ถูกต้อง (เช่น `320`)',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      let actionText = 'เพิ่มไอเทมใหม่';
      await updateConfig(interaction.client, (cfg) => {
        if (!cfg.games || typeof cfg.games !== 'object') cfg.games = {};
        if (!Array.isArray(cfg.games[gameName])) cfg.games[gameName] = [];

        const existingIndex = cfg.games[gameName].findIndex(
          (i) => i.name.toLowerCase() === itemName.toLowerCase()
        );

        const itemObj = {
          name: itemName,
          price,
          note: itemNote || '-',
        };

        if (existingIndex >= 0) {
          cfg.games[gameName][existingIndex] = itemObj;
          actionText = 'แก้ไขข้อมูลไอเทม';
        } else {
          cfg.games[gameName].push(itemObj);
        }
        return cfg;
      });

      return interaction.editReply(
        `✅ **${actionText}สำเร็จ!**\n` +
        `• เกม: **${gameName}**\n` +
        `• ไอเทม: **${itemName}** — **${price.toLocaleString('en-US')} บาท**\n` +
        `• หมายเหตุ: ${itemNote || '-'}\n` +
        `*(บันทึกลง \`config.json\` และอัปเดตเมนูห้อง \`🗡️・เรทไอเทมในเกม\` แล้ว)*`
      );
    }

    // 3. อัปเดตจำนวนคิว
    if (interaction.customId === CUSTOM_IDS.MODAL_SET_QUEUE) {
      const rawQueue = interaction.fields.getTextInputValue('queue_count').trim();
      const queueCount = Number.parseInt(rawQueue, 10);

      if (!Number.isInteger(queueCount) || queueCount < 0) {
        return interaction.reply({
          content: '❌ กรุณากรอกจำนวนคิวเป็นตัวเลขจำนวนเต็มตั้งแต่ `0` ขึ้นไป',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      await updateConfig(interaction.client, (cfg) => {
        cfg.queueCount = queueCount;
        return cfg;
      });

      return interaction.editReply(
        `✅ อัปเดตจำนวนคิวเป็น **${queueCount} คิว** ลงใน \`config.json\` และซิงก์ห้อง \`⏳・เช็กคิวออเดอร์\` เรียบร้อยแล้ว!`
      );
    }
  },
};
