require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ กรุณาตั้งค่า DISCORD_TOKEN และ CLIENT_ID ในไฟล์ .env ก่อนรัน deploy-commands.js');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command && command.data) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`⛩️ กำลังลงทะเบียน Slash Command จำนวน ${commands.length} คำสั่ง...`);

    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`✅ ลงทะเบียนคำสั่งไปยังเซิร์ฟเวอร์ (${GUILD_ID}) สำเร็จแล้ว!`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ ลงทะเบียนคำสั่งแบบ Global สำเร็จแล้ว (อาจใช้เวลาซิงก์ 1–5 นาที)');
    }
  } catch (error) {
    console.error('❌ ลงทะเบียน Slash Command ไม่สำเร็จ:', error);
    process.exit(1);
  }
})();
