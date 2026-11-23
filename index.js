require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();
client.buttons = new Collection();
client.buttonPrefixes = [];
client.modals = new Collection();
client.modalPrefixes = [];
client.selectMenus = new Collection();
client.selectMenuPrefixes = [];

/**
 * โหลด Slash Commands จากโฟลเดอร์ commands/
 */
function loadCommands() {
  const commandsDir = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsDir)) return;

  for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
    const command = require(path.join(commandsDir, file));
    if (command?.data && typeof command.execute === 'function') {
      client.commands.set(command.data.name, command);
    }
  }
}

/**
 * โหลด Interaction Handlers (buttons / modals / selectMenus)
 */
function loadInteractionGroup(folderName, mapCollection, prefixList) {
  const dir = path.join(__dirname, 'interactions', folderName);
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const handler = require(path.join(dir, file));
    if (!handler || typeof handler.execute !== 'function') continue;

    if (Array.isArray(handler.customIds)) {
      for (const id of handler.customIds) {
        mapCollection.set(id, handler);
      }
    }
    if (Array.isArray(handler.prefixes)) {
      for (const prefix of handler.prefixes) {
        prefixList.push({ prefix, handler });
      }
    }
  }
}

/**
 * โหลด Events จากโฟลเดอร์ events/
 */
function loadEvents() {
  const eventsDir = path.join(__dirname, 'events');
  if (!fs.existsSync(eventsDir)) return;

  for (const file of fs.readdirSync(eventsDir).filter((f) => f.endsWith('.js'))) {
    const event = require(path.join(eventsDir, file));
    if (!event?.name || typeof event.execute !== 'function') continue;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
}

loadCommands();
loadInteractionGroup('buttons', client.buttons, client.buttonPrefixes);
loadInteractionGroup('modals', client.modals, client.modalPrefixes);
loadInteractionGroup('selectMenus', client.selectMenus, client.selectMenuPrefixes);
loadEvents();

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ ไม่พบ DISCORD_TOKEN ในไฟล์ .env กรุณาคัดลอก .env.example เป็น .env แล้วกรอกโทเค็นให้เรียบร้อย');
  process.exit(1);
}

client.login(token);
