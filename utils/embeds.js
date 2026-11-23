const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { COLORS, STATUS_META, CUSTOM_IDS } = require('./constants');

function footerText(config) {
  const shopName = (config && config.shopName) || 'Miko Shrine';
  return `⛩️ ${shopName} • ศาลเจ้าแห่งความซื่อสัตย์และรวดเร็ว`;
}

/**
 * คำนวณราคา Gamepass (บาท) จากจำนวน Robux และเรท
 * สูตร: Math.ceil(robux / gamepassRate)
 */
function calculateGamepassPrice(robux, rate) {
  const numericRobux = Number(robux);
  const numericRate = Number(rate);
  if (!Number.isFinite(numericRobux) || numericRobux <= 0 || !Number.isFinite(numericRate) || numericRate <= 0) {
    return null;
  }
  return Math.ceil(numericRobux / numericRate);
}

/**
 * 1. Admin Control Panel Embed + Buttons
 */
function buildAdminPanelMessage(config) {
  const statusInfo = STATUS_META[config.shopStatus] || STATUS_META.open;
  const gameCount = Object.keys(config.games || {}).length;
  const itemCount = Object.values(config.games || {}).reduce(
    (sum, items) => sum + (Array.isArray(items) ? items.length : 0),
    0
  );

  const embed = new EmbedBuilder()
    .setColor(COLORS.SHRINE_RED)
    .setTitle('🏮 แผงควบคุมศาลเจ้า — Miko Shrine Admin Panel')
    .setDescription(
      'ควบคุมราคา เรทกด Gamepass รายการไอเทม สถานะร้าน และจำนวนคิวได้จากปุ่มด้านล่าง\n' +
      '*(ทุกการเปลี่ยนแปลงจะบันทึกลง `config.json` และอัปเดตทุกห้องในดิสคอร์ดอัตโนมัติ)*'
    )
    .addFields(
      { name: '🎟️ เรทกด Gamepass ปัจจุบัน', value: `**เรท ${config.gamepassRate}** (\`Math.ceil(Robux / ${config.gamepassRate})\`)`, inline: true },
      { name: '🟢 สถานะร้าน', value: `${statusInfo.emoji} **${statusInfo.label}**`, inline: true },
      { name: '⏳ คิวออเดอร์ปัจจุบัน', value: `**${config.queueCount} คิว**`, inline: true },
      { name: '🗡️ รายการเกมและไอเทม', value: `ทั้งหมด **${gameCount} เกม** (**${itemCount} รายการ**)`, inline: false }
    )
    .setFooter({ text: `${footerText(config)} • ซิงก์อัตโนมัติกับ config.json` })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ADMIN_SET_RATE)
      .setLabel('📈 ตั้งค่าเรท Gamepass')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ADMIN_UPSERT_ITEM)
      .setLabel('➕ เพิ่ม/แก้ไขไอเทม')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ADMIN_DELETE_ITEM)
      .setLabel('➖ ลบไอเทม')
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ADMIN_SET_STATUS)
      .setLabel('🟢 เปลี่ยนสถานะร้าน')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ADMIN_SET_QUEUE)
      .setLabel('⏳ อัปเดตจำนวนคิว')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

/**
 * 2. Rules Embed
 */
function buildRulesMessage(config) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SHRINE_RED)
    .setTitle('📜 กฎระเบียบของศาลเจ้า Miko Shrine')
    .setDescription('เพื่อความสงบสุขและปลอดภัยของทุกท่าน กรุณาปฏิบัติตามกฎของศาลเจ้าอย่างเคร่งครัด ⛩️')
    .addFields(
      {
        name: '1. การเคารพซึ่งกันและกัน',
        value: 'ห้ามใช้คำหยาบคาย ด่าทอ คุกคาม หรือสร้างความวุ่นวายภายในเซิร์ฟเวอร์',
      },
      {
        name: '2. ห้ามโฆษณาหรือสแปม',
        value: 'ห้ามส่งลิงก์เชิญเซิร์ฟเวอร์อื่น ขายของตัดหน้า หรือสแปมข้อความในทุกช่อง',
      },
      {
        name: '3. ความปลอดภัยในการสั่งซื้อ (Anti-Scam)',
        value:
          '• **สั่งซื้อผ่านห้องตั๋ว (Ticket) เท่านั้น** ทีมงานไม่มีนโยบายทัก DM ไปเรียกเก็บเงินก่อนเด็ดขาด\n' +
          '• ตรวจสอบชื่อบัญชีและหมายเลข PromptPay ให้ตรงกับห้อง `💳・ช่องทางการโอนเงิน` ทุกครั้งก่อนโอน\n' +
          '• ห้ามส่งรหัสผ่าน Roblox ให้ใครเด็ดขาด (บริการของร้านใช้การส่ง Gift / เทรดในเกมเท่านั้น)',
      },
      {
        name: '4. การเคลมและคิวงาน',
        value: 'กรุณาตรวจสอบชื่อตัวละคร (Roblox Username) ให้ถูกต้องก่อนส่งออเดอร์ แอดมินจะดำเนินการตามลำดับคิวอย่างเร็วที่สุด',
      }
    )
    .setFooter({ text: footerText(config) })
    .setTimestamp();

  return { embeds: [embed] };
}

/**
 * 3. Verification Embed + Button
 */
function buildVerifyMessage(config) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SAKURA_PINK)
    .setTitle('⛩️ ยืนยันตัวตนเข้าสู่ศาลเจ้า Miko Shrine')
    .setDescription(
      'ยินดีต้อนรับสู่ศาลเจ้า **Miko Shrine** 🌸\n\n' +
      'กรุณากดปุ่มด้านล่างเพื่อยืนยันตัวตนรับยศ **🎐・ผู้มาเยือน (Member)**\n' +
      'เพื่อปลดล็อกห้องดูเรทราคา เปิดตั๋วสั่งซื้อ และร่วมพูดคุยในศาลเจ้า!'
    )
    .setFooter({ text: footerText(config) });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.VERIFY_BTN)
      .setLabel('✅ ยืนยันตัวตนเข้าศาลเจ้า')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * 4. Shop Status Embed
 */
function buildShopStatusMessage(config) {
  const statusInfo = STATUS_META[config.shopStatus] || STATUS_META.open;

  const embed = new EmbedBuilder()
    .setColor(statusInfo.color)
    .setTitle(`${statusInfo.emoji} สถานะศาลเจ้า: ${statusInfo.label}`)
    .setDescription(statusInfo.description)
    .addFields(
      { name: '🎟️ เรทกด Gamepass', value: `**เรท ${config.gamepassRate}**`, inline: true },
      { name: '⏳ คิวงานปัจจุบัน', value: `**${config.queueCount} คิว**`, inline: true }
    )
    .setFooter({ text: `${footerText(config)} • อัปเดตล่าสุด` })
    .setTimestamp();

  return { embeds: [embed] };
}

/**
 * 5. Gamepass Rate Embed + Calculator Button
 */
function buildGamepassRateMessage(config) {
  const rate = config.gamepassRate;
  const examples = [100, 400, 800, 1200, 2000]
    .map((rbx) => `• **${rbx.toLocaleString('en-US')} Robux** ≈ **${calculateGamepassPrice(rbx, rate).toLocaleString('en-US')} บาท**`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(COLORS.SHRINE_GOLD)
    .setTitle('🎟️ เรทบริการกด Gamepass (Gift / ส่งในเกม)')
    .setDescription(
      `⛩️ **เรทปัจจุบันของศาลเจ้า: เรท \`${rate}\`**\n` +
      `สูตรคำนวณ: \`ราคา (บาท) = ปัดขึ้น(จำนวน Robux ÷ ${rate})\`\n\n` +
      'กดปุ่มด้านล่างเพื่อคำนวณราคาที่แน่นอนก่อนเปิดตั๋วสั่งซื้อได้เลย! 🌸'
    )
    .addFields(
      { name: '📊 ตัวอย่างราคาโดยประมาณ', value: examples, inline: false },
      {
        name: '📌 หมายเหตุสำคัญ',
        value: '• เป็นบริการกดส่งเป็น **Gift ในเกมเท่านั้น** ปลอดภัย 100% ไม่ต้องใช้รหัสผ่าน',
        inline: false,
      }
    )
    .setFooter({ text: `${footerText(config)} • อัปเดตอัตโนมัติ` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.CALC_GAMEPASS_BTN)
      .setLabel('🧮 กดคำนวณราคา Gamepass')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * 6. In-game Items Rate Embed + Dynamic Game Select Menu
 */
function buildItemRateMessage(config) {
  const games = config.games || {};
  const gameNames = Object.keys(games);

  const gameSummary =
    gameNames.length > 0
      ? gameNames
          .map((g) => {
            const count = Array.isArray(games[g]) ? games[g].length : 0;
            return `• **${g}** (${count} รายการ)`;
          })
          .join('\n')
      : '*ยังไม่มีรายการเกมในขณะนี้ โปรดติดตามเร็วๆ นี้*';

  const embed = new EmbedBuilder()
    .setColor(COLORS.SAKURA_PINK)
    .setTitle('🗡️ เรทราคาไอเทมในเกม — คลังสมบัติศาลเจ้า')
    .setDescription(
      'เลือกเกมที่คุณต้องการดูรายการไอเทมและราคาจากเมนูด้านล่างได้เลย 🌸\n' +
      '*(ระบบจะแสดงรายการสินค้าเฉพาะคุณ เพื่อไม่ให้หน้าแชทรก)*'
    )
    .addFields({ name: '🎮 เกมที่เปิดให้บริการในขณะนี้', value: gameSummary })
    .setFooter({ text: `${footerText(config)} • อัปเดตอัตโนมัติ` })
    .setTimestamp();

  const components = [];
  if (gameNames.length > 0) {
    const options = gameNames.slice(0, 25).map((gameName) => {
      const count = Array.isArray(games[gameName]) ? games[gameName].length : 0;
      return {
        label: gameName.slice(0, 100),
        value: gameName.slice(0, 100),
        description: `ดูรายการไอเทมทั้งหมด (${count} รายการ)`,
        emoji: '🗡️',
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(CUSTOM_IDS.SELECT_ITEM_GAME)
      .setPlaceholder('🌸 เลือกเกมที่ต้องการดูราคาไอเทม...')
      .addOptions(options);

    components.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  return { embeds: [embed], components };
}

/**
 * 7. Payment Info Embed
 */
function buildPaymentMessage(config) {
  const pay = config.paymentInfo || {};

  const embed = new EmbedBuilder()
    .setColor(COLORS.SHRINE_GOLD)
    .setTitle('💳 ช่องทางการชำระเงิน — Miko Shrine')
    .setDescription(
      'กรุณาตรวจสอบข้อมูลบัญชีให้ถูกต้องก่อนทำรายการโอนเงินทุกครั้ง ⛩️\n' +
      '**เมื่อโอนเสร็จแล้ว กรุณาส่งสลิปที่มี QR Code ในห้องตั๋วสั่งซื้อของท่านเท่านั้น**'
    )
    .addFields(
      { name: '📱 พร้อมเพย์ (PromptPay)', value: `\`${pay.promptPay || 'กรุณาตั้งค่าใน config.json'}\``, inline: false },
      { name: '🏦 ธนาคาร', value: `${pay.bankName || 'กรุณาตั้งค่าใน config.json'}`, inline: true },
      { name: '🔢 เลขที่บัญชี', value: `\`${pay.accountNumber || 'XXX-X-XXXXX-X'}\``, inline: true },
      { name: '👤 ชื่อบัญชี', value: `${pay.accountName || 'กรุณาตั้งค่าใน config.json'}`, inline: false },
      {
        name: '⚠️ คำเตือนความปลอดภัย',
        value: pay.note || 'โอนแล้วส่งสลิปในห้องตั๋วสั่งซื้อเท่านั้น ห้ามโอนนอกตั๋วเด็ดขาด',
      }
    )
    .setFooter({ text: footerText(config) })
    .setTimestamp();

  return { embeds: [embed] };
}

/**
 * 8. Order Ticket Panel Embed + 2 Buttons
 */
function buildOrderPanelMessage(config) {
  const isClosed = config?.shopStatus === 'closed';
  const statusInfo = STATUS_META[config?.shopStatus] || STATUS_META.open;

  const embed = new EmbedBuilder()
    .setColor(isClosed ? COLORS.CLOSED_RED : COLORS.SHRINE_RED)
    .setTitle(
      isClosed
        ? '🔴 เปิดตั๋วสั่งซื้อสินค้า — ปิดให้บริการชั่วคราว'
        : '🎫 เปิดตั๋วสั่งซื้อสินค้า — Miko Shrine'
    )
    .setDescription(
      isClosed
        ? 'ขณะนี้ศาลเจ้า **ปิดให้บริการชั่วคราว** 🌙\n' +
          'ระบบปิดรับออเดอร์ชั่วคราว กรุณารอเปิดร้านแล้วกลับมาสั่งซื้อใหม่นะครับ'
        : `สถานะร้านตอนนี้: ${statusInfo.emoji} **${statusInfo.label}** (คิวปัจจุบัน: **${config?.queueCount ?? 0} คิว**)\n\n` +
          'ต้องการสั่งกด Gamepass หรือซื้อไอเทมในเกม? กดปุ่มที่ตรงกับบริการด้านล่างได้เลย! ⛩️\n\n' +
          '• **🎟️ สั่งกด Gamepass** — กรอกชื่อตัวละคร ชื่อเกม และจำนวน Robux\n' +
          '• **🗡️ ซื้อไอเทมในเกม** — กรอกชื่อตัวละคร ชื่อเกม ชื่อไอเทม และจำนวนที่ต้องการ\n\n' +
          'ระบบจะสร้างห้องตั๋วส่วนตัวให้คุณกับแอดมินทันที 🌸'
    )
    .setFooter({ text: `${footerText(config)} • อัปเดตเรียลไทม์` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ORDER_GAMEPASS_BTN)
      .setLabel('🎟️ สั่งกด Gamepass')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isClosed),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ORDER_ITEM_BTN)
      .setLabel('🗡️ ซื้อไอเทมในเกม')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isClosed)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * 9. Queue Status Embed
 */
function buildQueueStatusMessage(config) {
  const queueCount = Number(config.queueCount) || 0;
  const statusInfo = STATUS_META[config.shopStatus] || STATUS_META.open;

  let queueNotice = '✨ ขณะนี้ **คิวว่าง!** สามารถเปิดตั๋วสั่งซื้อและรับบริการได้ทันที';
  if (queueCount >= 1 && queueCount <= 5) {
    queueNotice = `🌸 กำลังดำเนินการอยู่ **${queueCount} คิว** — รอไม่นานครับ!`;
  } else if (queueCount > 5) {
    queueNotice = `🔥 ขณะนี้มี **${queueCount} คิว** — แอดมินกำลังเร่งดำเนินการตามลำดับคิว ขอบคุณที่รอคอยครับ`;
  }

  const embed = new EmbedBuilder()
    .setColor(queueCount === 0 ? COLORS.OPEN_GREEN : COLORS.SHRINE_GOLD)
    .setTitle('⏳ เช็กคิวออเดอร์ศาลเจ้า — Live Queue')
    .setDescription(queueNotice)
    .addFields(
      { name: '📋 จำนวนคิวคงค้าง', value: `**${queueCount} คิว**`, inline: true },
      { name: '🏮 สถานะร้าน', value: `${statusInfo.emoji} **${statusInfo.label}**`, inline: true }
    )
    .setFooter({ text: `${footerText(config)} • ซิงก์ข้อมูลล่าสุด` })
    .setTimestamp();

  return { embeds: [embed] };
}

/**
 * 10. Ticket Summary Embed + Staff Controls
 */
function buildTicketSummaryMessage({ config, user, orderType, details }) {
  const pay = (config && config.paymentInfo) || {};
  const paymentField = {
    name: '💳 ช่องทางการโอนเงิน (กรุณาโอนแล้วแนบสลิปในห้องนี้)',
    value:
      `• **พร้อมเพย์ (PromptPay):** \`${pay.promptPay || '-'}\`\n` +
      `• **ธนาคาร:** ${pay.bankName || '-'}\n` +
      `• **เลขที่บัญชี:** \`${pay.accountNumber || '-'}\`\n` +
      `• **ชื่อบัญชี:** ${pay.accountName || '-'}\n` +
      '⏳ *เมื่อโอนเงินและส่งสลิปแล้ว กรุณารอแอดมินเข้ามาตรวจสอบและจัดส่งสินค้าให้ทันทีครับ*',
    inline: false,
  };

  const embed = new EmbedBuilder()
    .setColor(COLORS.SHRINE_RED)
    .setTitle(orderType === 'gamepass' ? '🎟️ ออเดอร์ใหม่: สั่งกด Gamepass' : '🗡️ ออเดอร์ใหม่: ซื้อไอเทมในเกม')
    .setDescription(
      `สวัสดีคุณ ${user} ⛩️\n` +
      'ทีมงานมิโกะได้รับข้อมูลออเดอร์ของคุณแล้ว!\n' +
      '**กรุณาโอนเงินตามข้อมูลด้านล่าง พร้อมแนบสลิปการโอนในห้องนี้ จากนั้นรอแอดมินเข้ามาดำเนินการให้ครับ** 🌸'
    )
    .addFields(...details, paymentField)
    .setThumbnail(user.displayAvatarURL({ size: 128 }))
    .setFooter({ text: `${footerText(config)} • ผู้สั่งซื้อ: ${user.tag}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.TICKET_SEND_REVIEW_BTN)
      .setLabel('⭐ ส่งปุ่มให้ลูกค้าลงเครดิต')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.TICKET_CLOSE_BTN)
      .setLabel('🔒 ปิดตั๋ว')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * 11. Welcome Embed for guildMemberAdd
 */
function buildWelcomeEmbed(member, config) {
  return new EmbedBuilder()
    .setColor(COLORS.SAKURA_PINK)
    .setTitle('⛩️ ยินดีต้อนรับผู้มาเยือนใหม่สู่ Miko Shrine!')
    .setDescription(
      `ยินดีต้อนรับคุณ ${member} เข้าสู่ศาลเจ้า **${config.shopName || 'Miko Shrine'}** 🌸\n\n` +
      'กรุณาไปที่ห้อง `✅・ยืนยันตัวตน` เพื่อกดรับยศ **🎐・ผู้มาเยือน (Member)**\n' +
      'และอ่านกฎของศาลเจ้าได้ที่ห้อง `📜・กฎของศาลเจ้า` นะครับ'
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `สมาชิกคนที่ ${member.guild.memberCount} • ${footerText(config)}` })
    .setTimestamp();
}

module.exports = {
  calculateGamepassPrice,
  buildAdminPanelMessage,
  buildRulesMessage,
  buildVerifyMessage,
  buildShopStatusMessage,
  buildGamepassRateMessage,
  buildItemRateMessage,
  buildPaymentMessage,
  buildOrderPanelMessage,
  buildQueueStatusMessage,
  buildTicketSummaryMessage,
  buildWelcomeEmbed,
};
