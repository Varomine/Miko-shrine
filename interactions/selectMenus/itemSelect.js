const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { CUSTOM_IDS, COLORS } = require('../../utils/constants');
const { loadConfig, loadState } = require('../../utils/configManager');

module.exports = {
  customIds: [CUSTOM_IDS.SELECT_ITEM_GAME],

  async execute(interaction) {
    const selectedGame = interaction.values[0];
    const config = loadConfig();
    const state = loadState();
    const items = config?.games?.[selectedGame];

    if (!Array.isArray(items) || items.length === 0) {
      return interaction.reply({
        content: `📭 ขณะนี้ยังไม่มีรายการไอเทมสำหรับเกม **${selectedGame}** ครับ`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const lines = items.map((item, idx) => {
      const priceText = Number.isFinite(Number(item.price))
        ? `${Number(item.price).toLocaleString('en-US')} บาท`
        : String(item.price);
      const noteText = item.note && item.note !== '-' ? `\n   └ *${item.note}*` : '';
      return `**${idx + 1}. ${item.name}** — 💰 **${priceText}**${noteText}`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.SHRINE_GOLD)
      .setTitle(`🗡️ รายการไอเทมเกม: ${selectedGame}`)
      .setDescription(lines.join('\n\n').slice(0, 4096))
      .setFooter({ text: `⛩️ ${config?.shopName || 'Miko Shrine'} • สนใจชิ้นไหนกดปุ่มด้านล่างเพื่อเปิดตั๋วสั่งซื้อ` })
      .setTimestamp();

    const components = [];
    const openTicketChannelId = state.channels?.openTicket;
    if (openTicketChannelId && interaction.guildId) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🎫 ไปหน้าเปิดตั๋วสั่งซื้อ')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${interaction.guildId}/${openTicketChannelId}`)
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
