const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { CUSTOM_IDS, STATUS_META } = require('../../utils/constants');
const { loadConfig, updateConfig } = require('../../utils/configManager');
const { isStaffMember } = require('../../utils/permissions');

module.exports = {
  customIds: [
    CUSTOM_IDS.SELECT_ADMIN_STATUS,
    CUSTOM_IDS.SELECT_ADMIN_DELETE_GAME,
  ],
  prefixes: [
    CUSTOM_IDS.SELECT_ADMIN_DELETE_ITEM_PREFIX,
  ],

  async execute(interaction) {
    if (!isStaffMember(interaction.member)) {
      return interaction.reply({
        content: '⛔ เมนูนี้สำหรับแอดมิน/ทีมงานเท่านั้น',
        flags: MessageFlags.Ephemeral,
      });
    }

    // 1. เปลี่ยนสถานะร้าน
    if (interaction.customId === CUSTOM_IDS.SELECT_ADMIN_STATUS) {
      const newStatus = interaction.values[0];
      const meta = STATUS_META[newStatus];
      if (!meta) {
        return interaction.reply({
          content: '❌ สถานะร้านไม่ถูกต้อง',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferUpdate();

      await updateConfig(interaction.client, (cfg) => {
        cfg.shopStatus = newStatus;
        return cfg;
      });

      return interaction.editReply({
        content: `✅ เปลี่ยนสถานะร้านเป็น **${meta.emoji} ${meta.label}** ลงใน \`config.json\` และซิงก์ห้อง \`${meta.channelName}\` เรียบร้อยแล้ว!`,
        components: [],
      });
    }

    // 2. ลบไอเทม ขั้นที่ 1: เลือกเกม -> แสดง Dropdown เลือกไอเทมในเกมนั้น
    if (interaction.customId === CUSTOM_IDS.SELECT_ADMIN_DELETE_GAME) {
      const gameName = interaction.values[0];
      const config = loadConfig();
      const items = config?.games?.[gameName];

      if (!Array.isArray(items) || items.length === 0) {
        return interaction.update({
          content: `📭 ไม่พบไอเทมในเกม **${gameName}**`,
          components: [],
        });
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId(`${CUSTOM_IDS.SELECT_ADMIN_DELETE_ITEM_PREFIX}${gameName}`)
        .setPlaceholder(`เลือกไอเทมในเกม ${gameName} ที่ต้องการลบ...`)
        .addOptions(
          items.slice(0, 25).map((item, idx) => ({
            label: item.name.slice(0, 100),
            value: String(idx),
            description: `ราคา ${item.price} บาท • ${(item.note || '-').slice(0, 60)}`,
            emoji: '🗑️',
          }))
        );

      return interaction.update({
        content: `🗑️ **ขั้นที่ 2/2:** เลือกไอเทมจากเกม **${gameName}** ที่ต้องการลบออกถาวร:`,
        components: [new ActionRowBuilder().addComponents(select)],
      });
    }

    // 3. ลบไอเทม ขั้นที่ 2: ลบไอเทมออกจาก config.json และซิงก์ Discord
    if (interaction.customId.startsWith(CUSTOM_IDS.SELECT_ADMIN_DELETE_ITEM_PREFIX)) {
      const gameName = interaction.customId.slice(CUSTOM_IDS.SELECT_ADMIN_DELETE_ITEM_PREFIX.length);
      const itemIndex = Number.parseInt(interaction.values[0], 10);

      await interaction.deferUpdate();

      let removedItem = null;
      await updateConfig(interaction.client, (cfg) => {
        const list = cfg.games?.[gameName];
        if (Array.isArray(list) && itemIndex >= 0 && itemIndex < list.length) {
          [removedItem] = list.splice(itemIndex, 1);
          if (list.length === 0) {
            delete cfg.games[gameName];
          }
        }
        return cfg;
      });

      if (!removedItem) {
        return interaction.editReply({
          content: '❌ ไม่พบไอเทมที่ต้องการลบ (อาจถูกลบไปแล้ว)',
          components: [],
        });
      }

      return interaction.editReply({
        content:
          `✅ ลบไอเทม **${removedItem.name}** (เกม **${gameName}**) ออกจาก \`config.json\` และอัปเดตห้อง \`🗡️・เรทไอเทมในเกม\` เรียบร้อยแล้ว!`,
        components: [],
      });
    }
  },
};
