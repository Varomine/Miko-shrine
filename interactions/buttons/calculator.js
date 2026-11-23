const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { CUSTOM_IDS } = require('../../utils/constants');

module.exports = {
  customIds: [CUSTOM_IDS.CALC_GAMEPASS_BTN],

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_IDS.MODAL_CALC_GAMEPASS)
      .setTitle('🧮 คำนวณราคา Gamepass (Miko Shrine)');

    const robuxInput = new TextInputBuilder()
      .setCustomId('robux_amount')
      .setLabel('ระบุจำนวน Robux ของ Gamepass')
      .setPlaceholder('เช่น 400, 800, 1200')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(robuxInput));
    return interaction.showModal(modal);
  },
};
