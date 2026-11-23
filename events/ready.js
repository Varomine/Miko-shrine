const { Events, ActivityType } = require('discord.js');
const { startConfigWatcher, syncDiscordPanels, loadConfig } = require('../utils/configManager');

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    const config = loadConfig();
    console.log(`⛩️ [Miko Shrine] เข้าสู่ระบบสำเร็จในชื่อ ${client.user.tag}`);

    client.user.setPresence({
      activities: [
        {
          name: `⛩️ ${config?.shopName || 'Miko Shrine'} • ศาลเจ้า Roblox`,
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });

    // ซิงก์แผง UI ล่าสุดทันทีตอนเปิดบอท (เผื่อมีการแก้ config.json ระหว่างปิดบอท)
    await syncDiscordPanels(client);

    // เริ่มระบบเฝ้าดูไฟล์ config.json แบบเรียลไทม์ (debounce 500ms)
    startConfigWatcher(client);
  },
};
