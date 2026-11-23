const { PermissionFlagsBits } = require('discord.js');
const { loadState } = require('./configManager');

/**
 * ตรวจสอบว่าผู้ใช้เป็น Admin / Owner / Staff ของศาลเจ้าหรือไม่
 */
function isStaffMember(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const state = loadState();
  const { owner, staff } = state.roles || {};
  if (owner && member.roles.cache.has(owner)) return true;
  if (staff && member.roles.cache.has(staff)) return true;
  return false;
}

module.exports = {
  isStaffMember,
};
