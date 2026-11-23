const { Events, MessageFlags } = require('discord.js');

function resolveHandler(collection, prefixList, customId) {
  if (collection.has(customId)) {
    return collection.get(customId);
  }
  for (const entry of prefixList) {
    if (customId.startsWith(entry.prefix)) {
      return entry.handler;
    }
  }
  return null;
}

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction) {
    const client = interaction.client;

    try {
      // 1. Slash Commands (/setup-shrine)
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      // 2. Buttons
      if (interaction.isButton()) {
        const handler = resolveHandler(client.buttons, client.buttonPrefixes, interaction.customId);
        if (!handler) return;
        await handler.execute(interaction);
        return;
      }

      // 3. Modals
      if (interaction.isModalSubmit()) {
        const handler = resolveHandler(client.modals, client.modalPrefixes, interaction.customId);
        if (!handler) return;
        await handler.execute(interaction);
        return;
      }

      // 4. String Select Menus
      if (interaction.isStringSelectMenu()) {
        const handler = resolveHandler(client.selectMenus, client.selectMenuPrefixes, interaction.customId);
        if (!handler) return;
        await handler.execute(interaction);
        return;
      }
    } catch (err) {
      console.error(`[InteractionCreate] เกิดข้อผิดพลาด (${interaction.customId || interaction.commandName}):`, err);

      const errorPayload = {
        content: '❌ เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้งหรือติดต่อแอดมิน',
        flags: MessageFlags.Ephemeral,
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorPayload);
        } else {
          await interaction.reply(errorPayload);
        }
      } catch {
        // ข้ามหาก interaction หมดอายุแล้ว
      }
    }
  },
};
