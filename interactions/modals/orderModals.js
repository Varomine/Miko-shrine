const {
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { CUSTOM_IDS } = require('../../utils/constants');
const { loadConfig, loadState, nextTicketNumber, updateConfig } = require('../../utils/configManager');
const { buildTicketSummaryMessage, calculateGamepassPrice } = require('../../utils/embeds');

module.exports = {
  customIds: [
    CUSTOM_IDS.MODAL_ORDER_GAMEPASS,
    CUSTOM_IDS.MODAL_ORDER_ITEM,
  ],

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const config = loadConfig();
    const state = loadState();
    const ticketsCategoryId = state.categories?.tickets;

    if (config?.shopStatus === 'closed') {
      return interaction.editReply('🔴 ขณะนี้ศาลเจ้าปิดให้บริการชั่วคราว ไม่สามารถเปิดตั๋วสั่งซื้อได้ครับ');
    }

    if (!ticketsCategoryId) {
      return interaction.editReply('❌ ยังไม่พบหมวดหมู่ `🎫・ออเดอร์ลูกค้า` กรุณาแจ้งแอดมินรัน `/setup-shrine` ก่อน');
    }

    const isGamepass = interaction.customId === CUSTOM_IDS.MODAL_ORDER_GAMEPASS;
    const robloxUsername = interaction.fields.getTextInputValue('roblox_username').trim();
    const gameName = interaction.fields.getTextInputValue('game_name').trim();

    let details = [];
    if (isGamepass) {
      const rawRobux = interaction.fields.getTextInputValue('robux_amount').replace(/,/g, '').trim();
      const extraNote = interaction.fields.getTextInputValue('extra_note').trim();
      const robux = Number(rawRobux);
      const rate = config?.gamepassRate ?? 5.5;
      const estimatedThb = calculateGamepassPrice(robux, rate);

      details = [
        { name: '👤 ชื่อตัวละคร Roblox', value: `\`${robloxUsername}\``, inline: true },
        { name: '🎮 เกม', value: gameName, inline: true },
        { name: '💎 จำนวน Robux', value: Number.isFinite(robux) ? `${robux.toLocaleString('en-US')} Robux` : rawRobux, inline: true },
        {
          name: '💰 ราคาประมาณการ',
          value: estimatedThb ? `**${estimatedThb.toLocaleString('en-US')} บาท** *(เรท ${rate})*` : 'รอแอดมินสรุปราคา',
          inline: true,
        },
        { name: '📝 รายละเอียดเพิ่มเติม', value: extraNote || '-', inline: false },
      ];
    } else {
      const itemAndQty = interaction.fields.getTextInputValue('item_and_qty').trim();
      details = [
        { name: '👤 ชื่อตัวละคร Roblox', value: `\`${robloxUsername}\``, inline: true },
        { name: '🎮 เกม', value: gameName, inline: true },
        { name: '🗡️ ไอเทมและจำนวนที่สั่ง', value: itemAndQty, inline: false },
      ];
    }

    const ticketNo = nextTicketNumber();
    const prefix = isGamepass ? 'gamepass' : 'item';
    const safeUser = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'guest';
    const channelName = `🎫-${prefix}-${ticketNo}-${safeUser}`;

    const permissionOverwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages,
        ],
      },
    ];

    if (state.roles?.owner) {
      permissionOverwrites.push({
        id: state.roles.owner,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }
    if (state.roles?.staff) {
      permissionOverwrites.push({
        id: state.roles.staff,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketsCategoryId,
        topic: `ออเดอร์ #${ticketNo} | ลูกค้า: ${interaction.user.tag} (${interaction.user.id})`,
        permissionOverwrites,
        reason: `Miko Shrine: เปิดตั๋วสั่งซื้อ #${ticketNo} โดย ${interaction.user.tag}`,
      });

      const staffMentions = [
        state.roles?.owner ? `<@&${state.roles.owner}>` : null,
        state.roles?.staff ? `<@&${state.roles.staff}>` : null,
      ]
        .filter(Boolean)
        .join(' ');

      const summaryPayload = buildTicketSummaryMessage({
        config,
        user: interaction.user,
        orderType: isGamepass ? 'gamepass' : 'item',
        details,
      });

      await ticketChannel.send({
        content: `🔔 ${interaction.user} ${staffMentions}`.trim(),
        ...summaryPayload,
      });

      // อัปเดตคิวออเดอร์ +1 แบบเรียลไทม์
      await updateConfig(interaction.client, (cfg) => {
        cfg.queueCount = (Number(cfg.queueCount) || 0) + 1;
        return cfg;
      });

      return interaction.editReply(
        `⛩️ **เปิดตั๋วสั่งซื้อสำเร็จ!** กรุณาเข้าไปที่ห้อง ${ticketChannel} เพื่อโอนเงินและแนบสลิปได้เลยครับ 🌸`
      );
    } catch (err) {
      console.error('[Order Modal] สร้างห้องตั๋วไม่สำเร็จ:', err);
      return interaction.editReply(
        `❌ ไม่สามารถสร้างห้องตั๋วได้: \`${err.message}\`\nกรุณาติดต่อแอดมินเพื่อตรวจสอบสิทธิ์ของบอท`
      );
    }
  },
};
