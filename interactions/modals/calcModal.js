const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { CUSTOM_IDS, COLORS } = require('../../utils/constants');
const { loadConfig, loadState } = require('../../utils/configManager');
const { calculateGamepassPrice } = require('../../utils/embeds');

module.exports = {
  customIds: [CUSTOM_IDS.MODAL_CALC_GAMEPASS],

  async execute(interaction) {
    const rawRobux = interaction.fields.getTextInputValue('robux_amount').replace(/,/g, '').trim();
    const robux = Number(rawRobux);

    if (!Number.isFinite(robux) || robux <= 0) {
      return interaction.reply({
        content: '❌ กรุณากรอกจำนวน Robux เป็นตัวเลขที่มากกว่า 0 (เช่น `400` หรือ `1200`)',
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = loadConfig();
    const state = loadState();
    const rate = config?.gamepassRate ?? 5.5;
    const priceThb = calculateGamepassPrice(robux, rate);

    const embed = new EmbedBuilder()
      .setColor(COLORS.SHRINE_GOLD)
      .setTitle('🧮 ผลการคำนวณราคา Gamepass — Miko Shrine')
      .setDescription('ราคาที่คำนวณได้อ้างอิงจากเรทปัจจุบันของศาลเจ้า ⛩️')
      .addFields(
        { name: '💎 จำนวน Robux', value: `**${robux.toLocaleString('en-US')} Robux**`, inline: true },
        { name: '📈 เรทปัจจุบัน', value: `**เรท ${rate}**`, inline: true },
        { name: '💰 ราคาที่ต้องชำระ', value: `**${priceThb.toLocaleString('en-US')} บาท**`, inline: true },
        {
          name: '📌 รูปแบบการจัดส่ง',
          value: `• เป็นบริการ **กดส่ง Gift Gamepass ในเกมโดยตรง** ปลอดภัย 100% ไม่ต้องใช้รหัสผ่าน ใช้ราคา **${priceThb.toLocaleString('en-US')} บาท** ตามนี้ได้เลย 🌸`,
          inline: false,
        }
      )
      .setFooter({ text: `สูตรคำนวณ: Math.ceil(${robux} / ${rate}) = ${priceThb} บาท` })
      .setTimestamp();

    const components = [];
    const openTicketChannelId = state.channels?.openTicket;
    if (openTicketChannelId && interaction.guildId) {
      const ticketUrl = `https://discord.com/channels/${interaction.guildId}/${openTicketChannelId}`;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🎫 ไปหน้าเปิดตั๋วสั่งซื้อ')
          .setStyle(ButtonStyle.Link)
          .setURL(ticketUrl)
      );
      components.push(row);
    }

    return interaction.reply({
      embeds: [embed],
      components,
      flags: MessageFlags.Ephemeral,
    });
  },
};
