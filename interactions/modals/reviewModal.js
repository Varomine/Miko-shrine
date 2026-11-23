const { EmbedBuilder, MessageFlags } = require('discord.js');
const { CUSTOM_IDS, COLORS } = require('../../utils/constants');
const { loadConfig, loadState } = require('../../utils/configManager');

module.exports = {
  customIds: [CUSTOM_IDS.MODAL_CUSTOMER_REVIEW],

  async execute(interaction) {
    const rawStars = interaction.fields.getTextInputValue('review_stars').trim();
    const service = interaction.fields.getTextInputValue('review_service').trim();
    const comment = interaction.fields.getTextInputValue('review_comment').trim();

    const stars = Number.parseInt(rawStars, 10);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return interaction.reply({
        content: '❌ กรุณากรอกคะแนนเป็นตัวเลขตั้งแต่ `1` ถึง `5` เท่านั้นครับ',
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = loadConfig();
    const state = loadState();
    const reviewsChannelId = state.channels?.reviews;

    if (!reviewsChannelId) {
      return interaction.reply({
        content: '❌ ไม่พบห้อง `⭐・เครดิตและรีวิว` ในระบบ กรุณาแจ้งแอดมิน',
        flags: MessageFlags.Ephemeral,
      });
    }

    const reviewsChannel = await interaction.guild.channels.fetch(reviewsChannelId).catch(() => null);
    if (!reviewsChannel || !reviewsChannel.isTextBased()) {
      return interaction.reply({
        content: '❌ ไม่สามารถส่งข้อความไปยังห้องรีวิวได้ กรุณาแจ้งแอดมิน',
        flags: MessageFlags.Ephemeral,
      });
    }

    const starBar = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

    const reviewEmbed = new EmbedBuilder()
      .setColor(COLORS.SHRINE_GOLD)
      .setAuthor({
        name: `รีวิวจากคุณ ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ size: 128 }),
      })
      .setTitle(`⛩️ เครดิตความประทับใจ (${stars}/5 ดาว)`)
      .addFields(
        { name: '⭐ คะแนนความพึงพอใจ', value: `${starBar} (**${stars}/5**)`, inline: false },
        { name: '🛍️ สินค้า / บริการ', value: service, inline: false },
        { name: '💬 ความคิดเห็น', value: `> ${comment.replace(/\n/g, '\n> ')}`, inline: false }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
      .setFooter({ text: `⛩️ ${config?.shopName || 'Miko Shrine'} • ขอบคุณที่ไว้วางใจศาลเจ้าของเรา` })
      .setTimestamp();

    await reviewsChannel.send({ embeds: [reviewEmbed] });

    return interaction.reply({
      content: `🌸 **ขอบคุณสำหรับรีวิว ${stars} ดาวครับ!** เครดิตของคุณถูกบันทึกไว้ที่ห้อง ${reviewsChannel} เรียบร้อยแล้ว ⛩️`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
