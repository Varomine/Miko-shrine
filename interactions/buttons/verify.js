const { MessageFlags } = require('discord.js');
const { CUSTOM_IDS } = require('../../utils/constants');
const { loadState } = require('../../utils/configManager');

module.exports = {
  customIds: [CUSTOM_IDS.VERIFY_BTN],

  async execute(interaction) {
    const state = loadState();
    const memberRoleId = state.roles?.member;
    const unverifiedRoleId = state.roles?.unverified;

    if (!memberRoleId) {
      return interaction.reply({
        content: '❌ ยังไม่พบการตั้งค่ายศในระบบ กรุณาแจ้งแอดมินรันคำสั่ง `/setup-shrine` ใหม่',
        flags: MessageFlags.Ephemeral,
      });
    }

    const member = interaction.member;
    if (member.roles.cache.has(memberRoleId)) {
      return interaction.reply({
        content: '🌸 คุณยืนยันตัวตนเข้าสู่ศาลเจ้าเรียบร้อยแล้วครับ!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const memberRole = interaction.guild.roles.cache.get(memberRoleId);
    if (!memberRole) {
      return interaction.reply({
        content: '❌ ไม่พบยศ `🎐・ผู้มาเยือน (Member)` ในเซิร์ฟเวอร์ กรุณาแจ้งแอดมินรัน `/setup-shrine` ใหม่',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!memberRole.editable) {
      return interaction.reply({
        content:
          '⚠️ **บอทไม่สามารถมอบยศได้เนื่องจากลำดับยศของบอทอยู่ต่ำกว่ายศ `🎐・ผู้มาเยือน (Member)`**\n' +
          'วิธีแก้สำหรับแอดมิน: ไปที่ **Server Settings → Roles** แล้ว **ลากยศ `เทพมิโกะ` ขึ้นไปไว้ด้านบนสุด** (สูงกว่ายศทั้งหมดที่สร้างขึ้น)',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await member.roles.add(memberRole, 'Miko Shrine: สมาชิกยืนยันตัวตนสำเร็จ');
      if (unverifiedRoleId && member.roles.cache.has(unverifiedRoleId)) {
        const unverifiedRole = interaction.guild.roles.cache.get(unverifiedRoleId);
        if (unverifiedRole && unverifiedRole.editable) {
          await member.roles.remove(unverifiedRole, 'Miko Shrine: ลบยศผู้ยังไม่ยืนยันตัวตน');
        }
      }

      return interaction.reply({
        content:
          '⛩️ **ยืนยันตัวตนสำเร็จ!** ยินดีต้อนรับสู่ศาลเจ้า **Miko Shrine** 🌸\n' +
          'คุณได้รับยศ **🎐・ผู้มาเยือน (Member)** แล้ว สามารถเข้าชมเรทราคาและเปิดตั๋วสั่งซื้อได้ทันที!',
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error('[Verify Button] Error:', err);
      return interaction.reply({
        content: '❌ ไม่สามารถมอบยศได้ กรุณาแจ้งแอดมินให้ตรวจสอบลำดับยศของบอท',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
