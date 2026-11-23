const { Events } = require('discord.js');
const { ROLE_DEFS } = require('../utils/constants');
const { loadConfig, loadState } = require('../utils/configManager');
const { buildWelcomeEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(member) {
    if (member.user.bot) return;

    const state = loadState();
    const config = loadConfig();

    // 1. มอบยศ 👻・วิญญาณเร่ร่อน (Unverified) อัตโนมัติ
    try {
      let unverifiedRole = state.roles?.unverified
        ? member.guild.roles.cache.get(state.roles.unverified)
        : null;

      if (!unverifiedRole) {
        unverifiedRole = member.guild.roles.cache.find((r) => r.name === ROLE_DEFS.unverified.name);
      }

      if (unverifiedRole) {
        if (unverifiedRole.editable) {
          await member.roles.add(unverifiedRole, 'Miko Shrine: มอบยศผู้มาเยือนใหม่ที่ยังไม่ยืนยันตัวตน');
          console.log(`[GuildMemberAdd] ✅ มอบยศ ${unverifiedRole.name} ให้ ${member.user.tag} เรียบร้อยแล้ว`);
        } else {
          console.warn(
            `[GuildMemberAdd] ⚠️ ไม่สามารถมอบยศ ${unverifiedRole.name} ให้ ${member.user.tag} ได้ (กรุณาลากยศบอทขึ้นไปไว้บนสุดใน Server Settings → Roles)`
          );
        }
      }
    } catch (err) {
      console.warn(`[GuildMemberAdd] มอบยศ Unverified ให้ ${member.user.tag} ไม่สำเร็จ:`, err.message);
    }

    // 2. ส่งข้อความต้อนรับในห้อง 👋・ต้อนรับผู้มาเยือน
    try {
      const welcomeChannelId = state.channels?.welcome;
      if (!welcomeChannelId) return;

      const welcomeChannel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);
      if (welcomeChannel && welcomeChannel.isTextBased()) {
        await welcomeChannel.send({
          content: `🌸 ยินดีต้อนรับ ${member} สู่ศาลเจ้า **${config?.shopName || 'Miko Shrine'}**!`,
          embeds: [buildWelcomeEmbed(member, config)],
        });
      }
    } catch (err) {
      console.warn('[GuildMemberAdd] ส่งข้อความต้อนรับไม่สำเร็จ:', err.message);
    }
  },
};
