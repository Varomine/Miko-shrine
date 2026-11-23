const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { CUSTOM_IDS, COLORS } = require('../../utils/constants');
const { loadConfig, updateConfig } = require('../../utils/configManager');
const { isStaffMember } = require('../../utils/permissions');

const closingChannels = new Set();

module.exports = {
  customIds: [
    CUSTOM_IDS.ORDER_GAMEPASS_BTN,
    CUSTOM_IDS.ORDER_ITEM_BTN,
    CUSTOM_IDS.TICKET_CLOSE_BTN,
    CUSTOM_IDS.TICKET_SEND_REVIEW_BTN,
    CUSTOM_IDS.CUSTOMER_REVIEW_BTN,
  ],

  async execute(interaction) {
    // 1. ปุ่มสั่งกด Gamepass -> เปิด Modal
    if (interaction.customId === CUSTOM_IDS.ORDER_GAMEPASS_BTN) {
      const config = loadConfig();
      if (config?.shopStatus === 'closed') {
        return interaction.reply({
          content: '🔴 ขณะนี้ศาลเจ้าปิดให้บริการชั่วคราว กรุณารอเปิดร้านแล้วลองใหม่อีกครั้งครับ',
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_ORDER_GAMEPASS)
        .setTitle('🎟️ สั่งกด Gamepass — Miko Shrine');

      const usernameInput = new TextInputBuilder()
        .setCustomId('roblox_username')
        .setLabel('ชื่อตัวละคร Roblox (Username)')
        .setPlaceholder('เช่น MikoPlayer123')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const gameInput = new TextInputBuilder()
        .setCustomId('game_name')
        .setLabel('ชื่อเกม (Game Name)')
        .setPlaceholder('เช่น Blox Fruits')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const robuxInput = new TextInputBuilder()
        .setCustomId('robux_amount')
        .setLabel('จำนวน Robux ที่ต้องการกด (ตัวเลข)')
        .setPlaceholder('เช่น 450 หรือ 1200')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const extraInput = new TextInputBuilder()
        .setCustomId('extra_note')
        .setLabel('ชื่อ Gamepass / หมายเหตุ (ไม่บังคับ)')
        .setPlaceholder('เช่น 2x Mastery')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(usernameInput),
        new ActionRowBuilder().addComponents(gameInput),
        new ActionRowBuilder().addComponents(robuxInput),
        new ActionRowBuilder().addComponents(extraInput)
      );
      return interaction.showModal(modal);
    }

    // 2. ปุ่มซื้อไอเทมในเกม -> เปิด Modal
    if (interaction.customId === CUSTOM_IDS.ORDER_ITEM_BTN) {
      const config = loadConfig();
      if (config?.shopStatus === 'closed') {
        return interaction.reply({
          content: '🔴 ขณะนี้ศาลเจ้าปิดให้บริการชั่วคราว กรุณารอเปิดร้านแล้วลองใหม่อีกครั้งครับ',
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_ORDER_ITEM)
        .setTitle('🗡️ ซื้อไอเทมในเกม — Miko Shrine');

      const usernameInput = new TextInputBuilder()
        .setCustomId('roblox_username')
        .setLabel('ชื่อตัวละคร Roblox (Username)')
        .setPlaceholder('เช่น MikoPlayer123')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const gameInput = new TextInputBuilder()
        .setCustomId('game_name')
        .setLabel('ชื่อเกม (Game Name)')
        .setPlaceholder('เช่น Blox Fruits / Murder Mystery 2')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const itemQtyInput = new TextInputBuilder()
        .setCustomId('item_and_qty')
        .setLabel('ชื่อไอเทมและจำนวนที่ต้องการ')
        .setPlaceholder('เช่น Permanent Buddha x1')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(usernameInput),
        new ActionRowBuilder().addComponents(gameInput),
        new ActionRowBuilder().addComponents(itemQtyInput)
      );
      return interaction.showModal(modal);
    }

    // 3. ปุ่ม Staff: ส่งปุ่มให้ลูกค้าลงเครดิต
    if (interaction.customId === CUSTOM_IDS.TICKET_SEND_REVIEW_BTN) {
      if (!isStaffMember(interaction.member)) {
        return interaction.reply({
          content: '⛔ ปุ่มนี้สำหรับแอดมิน/ทีมงานเท่านั้นครับ',
          flags: MessageFlags.Ephemeral,
        });
      }

      const reviewEmbed = new EmbedBuilder()
        .setColor(COLORS.SHRINE_GOLD)
        .setTitle('⭐ ขอบคุณที่ใช้บริการศาลเจ้า Miko Shrine!')
        .setDescription(
          'ออเดอร์ของคุณดำเนินการเรียบร้อยแล้ว 🌸\n' +
          'หากประทับใจบริการของเรา สามารถกดปุ่มด้านล่างเพื่อให้คะแนน (1–5 ดาว) และเขียนรีวิวให้กำลังใจมิโกะได้เลยครับ!'
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.CUSTOMER_REVIEW_BTN)
          .setLabel('⭐ ให้คะแนนและเขียนรีวิว')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({ embeds: [reviewEmbed], components: [row] });
      return;
    }

    // 4. ปุ่มลูกค้า: เปิด Modal ให้คะแนน 1-5 ดาว + คอมเมนต์
    if (interaction.customId === CUSTOM_IDS.CUSTOMER_REVIEW_BTN) {
      const modal = new ModalBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_CUSTOMER_REVIEW)
        .setTitle('⭐ ลงเครดิตและรีวิว — Miko Shrine');

      const starsInput = new TextInputBuilder()
        .setCustomId('review_stars')
        .setLabel('ให้คะแนนความพึงพอใจ (กรอกตัวเลข 1 ถึง 5)')
        .setPlaceholder('5')
        .setValue('5')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const serviceInput = new TextInputBuilder()
        .setCustomId('review_service')
        .setLabel('สินค้า / บริการที่สั่งซื้อ')
        .setPlaceholder('เช่น กด Gamepass Blox Fruits 1200 Robux')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const commentInput = new TextInputBuilder()
        .setCustomId('review_comment')
        .setLabel('ความคิดเห็น / รีวิวของคุณ')
        .setPlaceholder('ส่งไวมาก แอดมินบริการดี ปลอดภัย 100% ครับ!')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(starsInput),
        new ActionRowBuilder().addComponents(serviceInput),
        new ActionRowBuilder().addComponents(commentInput)
      );
      return interaction.showModal(modal);
    }

    // 5. ปุ่ม Staff: ปิดตั๋ว (ลดคิว -1 แบบเรียลไทม์)
    if (interaction.customId === CUSTOM_IDS.TICKET_CLOSE_BTN) {
      if (!isStaffMember(interaction.member)) {
        return interaction.reply({
          content: '⛔ ปุ่มปิดตั๋วสำหรับแอดมิน/ทีมงานเท่านั้นครับ',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (closingChannels.has(interaction.channelId)) {
        return interaction.reply({
          content: '⏳ กำลังปิดตั๋วนี้อยู่แล้วครับ...',
          flags: MessageFlags.Ephemeral,
        });
      }
      closingChannels.add(interaction.channelId);

      await interaction.reply({
        content: '🔒 **กำลังปิดตั๋วนี้และอัปเดตคิวออเดอร์ (-1)...** ห้องตั๋วจะถูกลบในอีก 5 วินาที ขอบคุณที่ใช้บริการศาลเจ้า Miko Shrine ⛩️',
      });

      await updateConfig(interaction.client, (cfg) => {
        cfg.queueCount = Math.max(0, (Number(cfg.queueCount) || 0) - 1);
        return cfg;
      }).catch((err) => {
        console.error('[Ticket Close] อัปเดตคิว -1 ไม่สำเร็จ:', err.message);
      });

      setTimeout(async () => {
        try {
          await interaction.channel.delete(`ปิดตั๋วโดย ${interaction.user.tag}`);
        } catch (err) {
          console.error('[Ticket Close] ลบห้องตั๋วไม่สำเร็จ:', err.message);
        } finally {
          closingChannels.delete(interaction.channelId);
        }
      }, 5000);
    }
  },
};
