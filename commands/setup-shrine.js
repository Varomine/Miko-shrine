const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { COLORS, ROLE_DEFS, STATUS_META } = require('../utils/constants');
const { loadConfig, loadState, saveState } = require('../utils/configManager');
const {
  buildAdminPanelMessage,
  buildRulesMessage,
  buildVerifyMessage,
  buildShopStatusMessage,
  buildGamepassRateMessage,
  buildItemRateMessage,
  buildPaymentMessage,
  buildOrderPanelMessage,
  buildQueueStatusMessage,
} = require('../utils/embeds');

/**
 * หาหรือสร้างยศ (ป้องกันสร้างยศซ้ำ และอัปเดตสถานะ hoist ให้ตรงกับค่าตั้งต้น)
 */
async function findOrCreateRole(guild, def, permissions = []) {
  const existing = guild.roles.cache.find((r) => r.name === def.name);
  if (existing) {
    if (existing.editable && existing.hoist !== Boolean(def.hoist)) {
      await existing.setHoist(Boolean(def.hoist)).catch(() => {});
    }
    return existing;
  }
  return guild.roles.create({
    name: def.name,
    color: def.color,
    hoist: Boolean(def.hoist),
    permissions,
    reason: 'Miko Shrine: ติดตั้งระบบศาลเจ้าอัตโนมัติ (/setup-shrine)',
  });
}

/**
 * หาหรือสร้างหมวดหมู่ (Category)
 */
async function findOrCreateCategory(guild, name, permissionOverwrites = []) {
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name
  );
  if (existing) {
    await existing.permissionOverwrites.set(permissionOverwrites).catch(() => {});
    return existing;
  }
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
    reason: 'Miko Shrine: ติดตั้งหมวดหมู่ศาลเจ้า (/setup-shrine)',
  });
}

/**
 * หาหรือสร้างห้องข้อความ (Text Channel)
 */
async function findOrCreateTextChannel(guild, name, parent, permissionOverwrites = null, topic = '', matchFn = null) {
  const existing = guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildText &&
      c.parentId === parent.id &&
      (matchFn ? matchFn(c) : c.name === name)
  );
  if (existing) {
    if (permissionOverwrites) {
      await existing.permissionOverwrites.set(permissionOverwrites).catch(() => {});
    }
    if (existing.name !== name) {
      await existing.setName(name).catch(() => {});
    }
    return existing;
  }
  const options = {
    name,
    type: ChannelType.GuildText,
    parent: parent.id,
    topic,
    reason: 'Miko Shrine: ติดตั้งห้องศาลเจ้า (/setup-shrine)',
  };
  if (permissionOverwrites) {
    options.permissionOverwrites = permissionOverwrites;
  }
  return guild.channels.create(options);
}

/**
 * หาหรือสร้างห้องเสียง (Voice Channel)
 */
async function findOrCreateVoiceChannel(guild, name, parent, options = {}) {
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildVoice && c.parentId === parent.id && c.name === name
  );
  if (existing) {
    if (options.permissionOverwrites) {
      await existing.permissionOverwrites.set(options.permissionOverwrites).catch(() => {});
    }
    if (typeof options.userLimit === 'number') {
      await existing.setUserLimit(options.userLimit).catch(() => {});
    }
    return existing;
  }
  return guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: parent.id,
    userLimit: options.userLimit || 0,
    permissionOverwrites: options.permissionOverwrites || undefined,
    reason: 'Miko Shrine: ติดตั้งห้องเสียงศาลเจ้า (/setup-shrine)',
  });
}

/**
 * ลบข้อความเดิมในห้อง (ถ้ามี) ก่อนส่งแผง UI ใหม่
 */
async function clearAndSend(channel, payload) {
  try {
    const existingMessages = await channel.messages.fetch({ limit: 50 });
    if (existingMessages.size > 0) {
      const deleted = await channel.bulkDelete(existingMessages, true).catch(() => null);
      // ลบข้อความที่เก่ากว่า 14 วันทีละข้อความหาก bulkDelete ข้ามไป
      const remaining = deleted
        ? existingMessages.filter((m) => !deleted.has(m.id))
        : existingMessages;
      for (const msg of remaining.values()) {
        await msg.delete().catch(() => {});
      }
    }
  } catch (err) {
    console.warn(`[setup-shrine] ลบข้อความเดิมในห้อง ${channel.name} ไม่สำเร็จ:`, err.message);
  }
  return channel.send(payload);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-shrine')
    .setDescription('⛩️ ติดตั้งระบบศาลเจ้า Miko Shrine ทั้งเซิร์ฟเวอร์ (ยศ, ห้องข้อความ, ห้องเสียง และแผงควบคุม)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const botMember = guild.members.me;
    const config = loadConfig();
    if (!config) {
      return interaction.editReply('❌ ไม่สามารถอ่านไฟล์ `config.json` ได้ กรุณาตรวจสอบรูปแบบ JSON');
    }

    await interaction.editReply('⛩️ กำลังอัญเชิญโครงสร้างศาลเจ้า **Miko Shrine**... กรุณารอสักครู่ (อาจใช้เวลา 10–20 วินาที)');

    try {
      // ============================================================
      // 1. สร้างยศทั้ง 7 ระดับ (สร้างจากล่างขึ้นบนเพื่อให้ลำดับยศเรียงถูกต้อง)
      // ============================================================
      const unverifiedRole = await findOrCreateRole(guild, ROLE_DEFS.unverified);
      const memberRole = await findOrCreateRole(guild, ROLE_DEFS.member);
      const buyerRole = await findOrCreateRole(guild, ROLE_DEFS.buyer);
      const vipRole = await findOrCreateRole(guild, ROLE_DEFS.vip);
      const botRole = await findOrCreateRole(guild, ROLE_DEFS.bot);
      const staffRole = await findOrCreateRole(guild, ROLE_DEFS.staff, [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.MoveMembers,
      ]);
      const ownerRole = await findOrCreateRole(guild, ROLE_DEFS.owner, [
        PermissionFlagsBits.Administrator,
      ]);

      // มอบยศ Bot ให้ตัวบอทเอง (ถ้าสิทธิ์สูงพอ)
      if (botMember && botRole.editable) {
        await botMember.roles.add(botRole).catch(() => {});
      }

      const everyoneId = guild.roles.everyone.id;
      const botId = botMember.id;

      // Permission presets
      const adminOnlyOverwrites = [
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
        { id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
        { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
        { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] },
      ];

      const welcomeReadOnlyOverwrites = [
        { id: everyoneId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions] },
        { id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] },
      ];

      const verifyChannelOverwrites = [
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: unverifiedRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
        { id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
      ];

      const memberReadOnlyOverwrites = [
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: unverifiedRole.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
        { id: buyerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
        { id: vipRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
        { id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
      ];

      // ห้อง ⭐・เครดิตและรีวิว — ผู้ที่มี Role Buyer สามารถพิมพ์ลงเครดิตได้
      const reviewsChannelOverwrites = [
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: unverifiedRole.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
        { id: buyerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        { id: vipRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        { id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
      ];

      const memberChatOverwrites = [
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
        { id: unverifiedRole.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        { id: buyerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        { id: vipRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        { id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
      ];

      const memberVoiceOverwrites = [
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        { id: unverifiedRole.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        { id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream] },
        { id: buyerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream] },
        { id: vipRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream] },
        { id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.MoveMembers] },
        { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.MoveMembers] },
        { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.MoveMembers] },
      ];

      const afkVoiceOverwrites = [
        { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        { id: unverifiedRole.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        { id: memberRole.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
        { id: buyerRole.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
        { id: vipRole.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
        { id: ownerRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
        { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
        { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
      ];

      // ============================================================
      // 2. สร้างหมวดหมู่และช่องทั้งหมด
      // ============================================================

      // 1. 🏮・ห้องควบคุมศาลเจ้า (Admin Zone)
      const catAdmin = await findOrCreateCategory(guild, '🏮・ห้องควบคุมศาลเจ้า', adminOnlyOverwrites);
      const chAdminPanel = await findOrCreateTextChannel(
        guild,
        '⚙️・แผงควบคุมแอดมิน',
        catAdmin,
        adminOnlyOverwrites,
        'แผงควบคุมราคา เรท Gamepass ไอเทม สถานะร้าน และคิวออเดอร์ (ซิงก์กับ config.json อัตโนมัติ)'
      );

      // 2. ⛩️・ทางเข้าศาลเจ้า (Welcome & Verification)
      const catWelcome = await findOrCreateCategory(guild, '⛩️・ทางเข้าศาลเจ้า', welcomeReadOnlyOverwrites);
      const chWelcome = await findOrCreateTextChannel(guild, '👋・ต้อนรับผู้มาเยือน', catWelcome, welcomeReadOnlyOverwrites);
      const chRules = await findOrCreateTextChannel(guild, '📜・กฎของศาลเจ้า', catWelcome, welcomeReadOnlyOverwrites);
      const chVerify = await findOrCreateTextChannel(guild, '✅・ยืนยันตัวตน', catWelcome, verifyChannelOverwrites);
      const chAnnouncements = await findOrCreateTextChannel(guild, '📢・ประกาศจากมิโกะ', catWelcome, welcomeReadOnlyOverwrites);
      const statusMeta = STATUS_META[config.shopStatus] || STATUS_META.open;
      const chShopStatus = await findOrCreateTextChannel(
        guild,
        statusMeta.channelName,
        catWelcome,
        welcomeReadOnlyOverwrites,
        '',
        (c) => c.name.includes('สถานะร้าน')
      );

      // 3. 💎・คลังสมบัติศาลเจ้า (Rates & Payment)
      const catRates = await findOrCreateCategory(guild, '💎・คลังสมบัติศาลเจ้า', memberReadOnlyOverwrites);
      const chGamepassRate = await findOrCreateTextChannel(guild, '🎟️・เรทกด-gamepass', catRates, memberReadOnlyOverwrites);
      const chItemRate = await findOrCreateTextChannel(guild, '🗡️・เรทไอเทมในเกม', catRates, memberReadOnlyOverwrites);
      const chPayment = await findOrCreateTextChannel(guild, '💳・ช่องทางการโอนเงิน', catRates, memberReadOnlyOverwrites);

      // 4. 🏮・จุดรับออเดอร์ (Order & Queue)
      const catOrders = await findOrCreateCategory(guild, '🏮・จุดรับออเดอร์', memberReadOnlyOverwrites);
      const chOpenTicket = await findOrCreateTextChannel(guild, '🎫・เปิดตั๋วสั่งซื้อ', catOrders, memberReadOnlyOverwrites);
      const chQueueStatus = await findOrCreateTextChannel(guild, '⏳・เช็กคิวออเดอร์', catOrders, memberReadOnlyOverwrites);

      // หมวดหมู่เก็บห้องตั๋วส่วนตัวของลูกค้า
      const catTickets = await findOrCreateCategory(guild, '🎫・ออเดอร์ลูกค้า', adminOnlyOverwrites);

      // 5. 📜・บันทึกการส่งมอบ (Proofs & Reviews)
      const catProofs = await findOrCreateCategory(guild, '📜・บันทึกการส่งมอบ', memberReadOnlyOverwrites);
      const chReviews = await findOrCreateTextChannel(guild, '⭐・เครดิตและรีวิว', catProofs, reviewsChannelOverwrites);
      const chDeliveryLog = await findOrCreateTextChannel(guild, '📦・ประวัติการส่งมอบ', catProofs, memberReadOnlyOverwrites);

      // 6. 💬・ลานพูดคุย (Community)
      const catCommunity = await findOrCreateCategory(guild, '💬・ลานพูดคุย', memberChatOverwrites);
      const chGeneralChat = await findOrCreateTextChannel(guild, '🍵・พูดคุยทั่วไป', catCommunity, memberChatOverwrites);
      const chHelpSupport = await findOrCreateTextChannel(guild, '🆘・แจ้งปัญหา-สอบถาม', catCommunity, memberChatOverwrites);

      // 7. 🔊・ศาลาสนทนา (Voice Channels)
      const catVoice = await findOrCreateCategory(guild, '🔊・ศาลาสนทนา', memberVoiceOverwrites);
      await findOrCreateVoiceChannel(guild, '⛩️・ลานศาลเจ้า (พูดคุยทั่วไป)', catVoice, {
        userLimit: 0,
        permissionOverwrites: memberVoiceOverwrites,
      });
      await findOrCreateVoiceChannel(guild, '🎮・ห้องเล่นเกมด้วยกัน', catVoice, {
        userLimit: 0,
        permissionOverwrites: memberVoiceOverwrites,
      });
      await findOrCreateVoiceChannel(guild, '🏮・ห้องคุยกับแอดมิน (1-on-1)', catVoice, {
        userLimit: 2,
        permissionOverwrites: memberVoiceOverwrites,
      });
      await findOrCreateVoiceChannel(guild, '💤・แอดมินพักผ่อน (AFK)', catVoice, {
        userLimit: 0,
        permissionOverwrites: afkVoiceOverwrites,
      });

      // ============================================================
      // 3. ลบข้อความเก่า (ถ้ามี) แล้วส่งแผง UI ถาวรทั้งหมด + บันทึก state.json
      // ============================================================
      const msgAdminPanel = await clearAndSend(chAdminPanel, buildAdminPanelMessage(config));
      const msgRules = await clearAndSend(chRules, buildRulesMessage(config));
      const msgVerify = await clearAndSend(chVerify, buildVerifyMessage(config));
      const msgShopStatus = await clearAndSend(chShopStatus, buildShopStatusMessage(config));
      const msgGamepassRate = await clearAndSend(chGamepassRate, buildGamepassRateMessage(config));
      const msgItemRate = await clearAndSend(chItemRate, buildItemRateMessage(config));
      const msgPayment = await clearAndSend(chPayment, buildPaymentMessage(config));
      const msgOpenTicket = await clearAndSend(chOpenTicket, buildOrderPanelMessage(config));
      const msgQueueStatus = await clearAndSend(chQueueStatus, buildQueueStatusMessage(config));

      const prevState = loadState();
      saveState({
        guildId: guild.id,
        ticketCounter: prevState.ticketCounter || 0,
        roles: {
          owner: ownerRole.id,
          staff: staffRole.id,
          bot: botRole.id,
          vip: vipRole.id,
          buyer: buyerRole.id,
          member: memberRole.id,
          unverified: unverifiedRole.id,
        },
        categories: {
          admin: catAdmin.id,
          welcome: catWelcome.id,
          rates: catRates.id,
          orders: catOrders.id,
          tickets: catTickets.id,
          proofs: catProofs.id,
          community: catCommunity.id,
          voice: catVoice.id,
        },
        channels: {
          adminPanel: chAdminPanel.id,
          welcome: chWelcome.id,
          rules: chRules.id,
          verify: chVerify.id,
          announcements: chAnnouncements.id,
          shopStatus: chShopStatus.id,
          gamepassRate: chGamepassRate.id,
          itemRate: chItemRate.id,
          payment: chPayment.id,
          openTicket: chOpenTicket.id,
          queueStatus: chQueueStatus.id,
          reviews: chReviews.id,
          deliveryLog: chDeliveryLog.id,
          generalChat: chGeneralChat.id,
          helpSupport: chHelpSupport.id,
        },
        messages: {
          adminPanel: msgAdminPanel.id,
          rules: msgRules.id,
          verify: msgVerify.id,
          shopStatus: msgShopStatus.id,
          gamepassRate: msgGamepassRate.id,
          itemRate: msgItemRate.id,
          payment: msgPayment.id,
          openTicket: msgOpenTicket.id,
          queueStatus: msgQueueStatus.id,
        },
      });

      const doneEmbed = new EmbedBuilder()
        .setColor(COLORS.SHRINE_GOLD)
        .setTitle('⛩️ ติดตั้งศาลเจ้า Miko Shrine เสร็จสมบูรณ์!')
        .setDescription(
          'สร้างยศทั้ง 7 ระดับ (รวม Buyer & Hoisted Member), หมวดหมู่, ห้องข้อความ, ห้องเสียง และแผงควบคุมครบทุกจุดเรียบร้อยแล้ว!\n' +
          'บันทึกข้อมูล ID ทั้งหมดลง `state.json` แล้ว — จากนี้คุณสามารถแก้ไข `config.json` ใน VS Code หรือกดปุ่มในห้องแอดมินเพื่อให้ระบบอัปเดตสดทันที 🌸'
        )
        .addFields(
          { name: '⚙️ แผงควบคุมแอดมิน', value: `${chAdminPanel}`, inline: true },
          { name: '✅ ห้องยืนยันตัวตน', value: `${chVerify}`, inline: true },
          { name: '🎫 ห้องเปิดตั๋วสั่งซื้อ', value: `${chOpenTicket}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ content: '', embeds: [doneEmbed] });
    } catch (err) {
      console.error('[setup-shrine] Error:', err);
      await interaction.editReply(
        `❌ เกิดข้อผิดพลาดระหว่างติดตั้งศาลเจ้า: \`${err.message}\`\n` +
        'กรุณาตรวจสอบว่ายศของบอทอยู่สูงกว่ายศที่จะสร้าง และบอทมีสิทธิ์ Administrator'
      );
    }
  },
};
