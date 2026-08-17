import "dotenv/config";

import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

import fs from "fs";
import path from "path";

// ======================================================
// TOKEN
// ======================================================

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing from .env");
  process.exit(1);
}

// ======================================================
// CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ======================================================
// DATABASE
// ======================================================

const DATA_FILE = path.join(process.cwd(), "data.json");

let database = {
  guilds: {},
};

function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const saved = JSON.parse(
        fs.readFileSync(DATA_FILE, "utf8")
      );

      if (saved && typeof saved === "object") {
        database = saved;
      }
    }
  } catch (error) {
    console.error("❌ Database load error:", error);

    database = {
      guilds: {},
    };
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(database, null, 2)
    );
  } catch (error) {
    console.error("❌ Database save error:", error);
  }
}

// ======================================================
// GUILD DATA
// ======================================================

function getGuildData(guildId) {
  if (!database.guilds[guildId]) {
    database.guilds[guildId] = {
      setupName: "Union Tier Testing",

      testerRoles: [],
      notifyRoles: [],

      messageRoles: [],
      resultRoles: [],

      ticketRoles: [],
      highTicketRoles: [],

      ticketCategoryId: "",
      highTicketCategoryId: "",

      tierRoles: {},

      playerRanks: {},

      normalPanelChannelId: "",
      highPanelChannelId: "",

      welcome: {},
      farewell: {},
    };

    saveDatabase();
  }

  const data = database.guilds[guildId];

  if (!Array.isArray(data.testerRoles)) {
    data.testerRoles = [];
  }

  if (!Array.isArray(data.notifyRoles)) {
    data.notifyRoles = [];
  }

  if (!Array.isArray(data.messageRoles)) {
    data.messageRoles = [];
  }

  if (!Array.isArray(data.resultRoles)) {
    data.resultRoles = [];
  }

  if (!Array.isArray(data.ticketRoles)) {
    data.ticketRoles = [];
  }

  if (!Array.isArray(data.highTicketRoles)) {
    data.highTicketRoles = [];
  }

  if (typeof data.ticketCategoryId !== "string") {
    data.ticketCategoryId = "";
  }

  if (typeof data.highTicketCategoryId !== "string") {
    data.highTicketCategoryId = "";
  }

  if (!data.tierRoles || typeof data.tierRoles !== "object") {
    data.tierRoles = {};
  }

  if (!data.playerRanks || typeof data.playerRanks !== "object") {
    data.playerRanks = {};
  }

  if (typeof data.normalPanelChannelId !== "string") {
    data.normalPanelChannelId = "";
  }

  if (typeof data.highPanelChannelId !== "string") {
    data.highPanelChannelId = "";
  }

  if (!data.welcome || typeof data.welcome !== "object") {
    data.welcome = {};
  }

  if (!data.farewell || typeof data.farewell !== "object") {
    data.farewell = {};
  }

  return data;
}

// ======================================================
// KITS
// ======================================================

const KITS = {
  sword: {
    name: "Sword",
    emoji: "🗡️",
    rounds: 6,
    format: "Best of 6",
  },

  axe: {
    name: "Axe",
    emoji: "🪓",
    rounds: 3,
    format: "Best of 3",
  },

  uhc: {
    name: "UHC",
    emoji: "🛡️",
    rounds: 3,
    format: "Best of 3",
  },

  dia_smp: {
    name: "Dia SMP",
    emoji: "💎",
    rounds: 3,
    format: "Best of 3",
  },

  neth_pot: {
    name: "Neth Pot",
    emoji: "🔥",
    rounds: 3,
    format: "Best of 3",
  },

  mace: {
    name: "Mace",
    emoji: "🔨",
    rounds: 3,
    format: "Best of 3",
  },

  spear_mace: {
    name: "Spear Mace",
    emoji: "⚔️",
    rounds: 3,
    format: "Best of 3",
  },

  crystal: {
    name: "Crystal",
    emoji: "💠",
    rounds: 3,
    format: "Best of 3",
  },

  cart: {
    name: "Cart",
    emoji: "🛒",
    rounds: 3,
    format: "Best of 3",
  },
};

// ======================================================
// REGIONS
// ======================================================

const REGIONS = {
  AS: {
    name: "AS",
    emoji: "🌏",
  },

  EU: {
    name: "EU",
    emoji: "🌍",
  },

  NA: {
    name: "NA",
    emoji: "🌎",
  },

  OC: {
    name: "OC",
    emoji: "🌊",
  },
};

// ======================================================
// TIERS
// ======================================================

const NORMAL_TIERS = [
  "LT5",
  "HT5",
  "LT4",
  "HT4",
  "LT3",
];

const HIGH_TIERS = [
  "HT3",
  "LT2",
  "HT2",
  "LT1",
  "HT1",
];

const ALL_TIERS = [
  ...NORMAL_TIERS,
  ...HIGH_TIERS,
];

const NORMAL_PREVIOUS_TIERS = [
  "No Record",
  ...ALL_TIERS,
];

const HIGH_PREVIOUS_TIERS = [
  "LT3",
];

const TIER_RANK = {
  LT5: 1,
  HT5: 2,
  LT4: 3,
  HT4: 4,
  LT3: 5,
  HT3: 6,
  LT2: 7,
  HT2: 8,
  LT1: 9,
  HT1: 10,
};

// ======================================================
// DEFAULT SKIN
// ======================================================

// Your exact NameMC skin
const DEFAULT_SKIN_IMAGE =
  "https://s.namemc.com/i/6cc743790519ce59.png";

// Bigger body render
const DEFAULT_SKIN_BODY =
  "https://s.namemc.com/3d/skin/body.png?id=6cc743790519ce59&model=classic&theta=30&phi=20&time=90&width=600&height=800&bg=000000&ext=.png";

// ======================================================
// HELPERS
// ======================================================

function getKit(key) {
  return (
    KITS[key] || {
      name: "Unknown Kit",
      emoji: "🎮",
      rounds: 3,
      format: "Best of 3",
    }
  );
}

function getRegion(key) {
  return (
    REGIONS[key] || {
      name: "Unknown",
      emoji: "🌐",
    }
  );
}

function cleanText(value, fallback = "Not provided") {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value).trim();
}

function makeChannelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function isPromotion(previous, current) {
  if (
    !previous ||
    !current ||
    previous === "No Record"
  ) {
    return false;
  }

  if (
    !TIER_RANK[previous] ||
    !TIER_RANK[current]
  ) {
    return false;
  }

  return TIER_RANK[current] > TIER_RANK[previous];
}

function isDemotion(previous, current) {
  if (
    !previous ||
    !current ||
    previous === "No Record"
  ) {
    return false;
  }

  if (
    !TIER_RANK[previous] ||
    !TIER_RANK[current]
  ) {
    return false;
  }

  return TIER_RANK[current] < TIER_RANK[previous];
}

function getTierRoleName(kitKey, tier) {
  return `${getKit(kitKey).name} ${tier}`;
}

function getTierRoleId(guildData, kitKey, tier) {
  if (
    !guildData.tierRoles ||
    !guildData.tierRoles[kitKey]
  ) {
    return null;
  }

  return guildData.tierRoles[kitKey][tier] || null;
}

function getPlayerRank(guildData, userId, kitKey) {
  return (
    guildData.playerRanks?.[userId]?.[kitKey] ||
    null
  );
}

function setPlayerRank(
  guildData,
  userId,
  kitKey,
  tier
) {
  if (!guildData.playerRanks[userId]) {
    guildData.playerRanks[userId] = {};
  }

  guildData.playerRanks[userId][kitKey] = tier;
}

function normalizeSkinUrl(value) {
  if (!value || !String(value).trim()) {
    return DEFAULT_SKIN_BODY;
  }

  let url = String(value).trim();

  // Convert NameMC skin page into direct PNG
  const match = url.match(
    /namemc\.com\/skin\/([a-zA-Z0-9]+)/
  );

  if (match) {
    return `https://s.namemc.com/3d/skin/body.png?id=${match[1]}&model=classic&theta=30&phi=20&time=90&width=600&height=800&bg=000000&ext=.png`;
  }

  // If direct NameMC PNG was supplied, use it
  if (
    url.includes("s.namemc.com/i/") &&
    !url.includes(".png")
  ) {
    url += ".png";
  }

  return url;
}

// ======================================================
// PERMISSIONS
// ======================================================

function hasAnyRole(member, roleIds) {
  if (!member || !Array.isArray(roleIds)) {
    return false;
  }

  return roleIds.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

function isAdministrator(member) {
  return (
    member &&
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  );
}

function isTester(member, guildData) {
  if (!member) {
    return false;
  }

  if (isAdministrator(member)) {
    return true;
  }

  return hasAnyRole(
    member,
    guildData.testerRoles
  );
}

function canUseResults(member, guildData) {
  if (!member) {
    return false;
  }

  if (isAdministrator(member)) {
    return true;
  }

  if (isTester(member, guildData)) {
    return true;
  }

  return hasAnyRole(
    member,
    guildData.resultRoles
  );
}

function canUseMessage(member, guildData) {
  if (!member) {
    return false;
  }

  if (isAdministrator(member)) {
    return true;
  }

  return hasAnyRole(
    member,
    guildData.messageRoles
  );
}

function canAccessTicket(
  member,
  guildData,
  high = false
) {
  if (!member) {
    return false;
  }

  if (isAdministrator(member)) {
    return true;
  }

  if (isTester(member, guildData)) {
    return true;
  }

  if (high) {
    return hasAnyRole(
      member,
      guildData.highTicketRoles
    );
  }

  return hasAnyRole(
    member,
    guildData.ticketRoles
  );
}

// ======================================================
// GENERATE TIER ROLES
// ======================================================

async function generateTierRoles(guild, guildData) {
  let created = 0;
  let existing = 0;

  for (const [kitKey, kit] of Object.entries(KITS)) {
    if (!guildData.tierRoles[kitKey]) {
      guildData.tierRoles[kitKey] = {};
    }

    for (const tier of ALL_TIERS) {
      const roleName =
        getTierRoleName(kitKey, tier);

      let role = guild.roles.cache.find(
        (r) => r.name === roleName
      );

      if (!role) {
        role = await guild.roles.create({
          name: roleName,
          mentionable: true,
          reason:
            "UNION TIERS generated kit/tier role",
        });

        created++;
      } else {
        existing++;
      }

      guildData.tierRoles[kitKey][tier] =
        role.id;
    }
  }

  saveDatabase();

  return {
    created,
    existing,
  };
}

// ======================================================
// ASSIGN TIER ROLE
// ======================================================

async function assignTierRole(
  guild,
  guildData,
  userId,
  kitKey,
  tier
) {
  const member =
    await guild.members.fetch(userId).catch(() => null);

  if (!member) {
    return {
      success: false,
      error: "Player is no longer in the server.",
    };
  }

  const newRoleId = getTierRoleId(
    guildData,
    kitKey,
    tier
  );

  if (!newRoleId) {
    return {
      success: false,
      error:
        `The role **${getTierRoleName(
          kitKey,
          tier
        )}** does not exist. Run \`/generaterole\` first.`,
    };
  }

  const rolesToRemove = [];

  for (const oldTier of ALL_TIERS) {
    const oldRoleId = getTierRoleId(
      guildData,
      kitKey,
      oldTier
    );

    if (
      oldRoleId &&
      oldRoleId !== newRoleId &&
      member.roles.cache.has(oldRoleId)
    ) {
      rolesToRemove.push(oldRoleId);
    }
  }

  try {
    if (rolesToRemove.length > 0) {
      await member.roles.remove(
        rolesToRemove,
        "UNION TIERS tier update"
      );
    }

    if (!member.roles.cache.has(newRoleId)) {
      await member.roles.add(
        newRoleId,
        "UNION TIERS tier earned"
      );
    }

    setPlayerRank(
      guildData,
      userId,
      kitKey,
      tier
    );

    saveDatabase();

    return {
      success: true,
      roleId: newRoleId,
    };
  } catch (error) {
    console.error(
      "❌ Tier role assignment error:",
      error
    );

    return {
      success: false,
      error:
        "I could not assign the tier role. Make sure my bot role is above the generated tier roles.",
    };
  }
}

// ======================================================
// HIGH TIER ELIGIBILITY
// ======================================================

function getEligibleHighKits(
  member,
  guildData
) {
  const eligible = [];

  for (const kitKey of Object.keys(KITS)) {
    const lt3RoleId = getTierRoleId(
      guildData,
      kitKey,
      "LT3"
    );

    if (
      lt3RoleId &&
      member.roles.cache.has(lt3RoleId)
    ) {
      eligible.push(kitKey);
    }
  }

  return eligible;
}

function hasLT3ForKit(
  member,
  guildData,
  kitKey
) {
  const roleId = getTierRoleId(
    guildData,
    kitKey,
    "LT3"
  );

  return (
    !!roleId &&
    member.roles.cache.has(roleId)
  );
}

// ======================================================
// TESTING INSTRUCTIONS
// ======================================================

function getTestingInstructions(kitKey) {
  const kit = getKit(kitKey);

  return (
    `🧪 **Testing Instructions**\n\n` +
    `${kit.emoji} **${kit.name}**\n\n` +
    `⚔️ **Format:** ${kit.format}\n` +
    `🔢 **Rounds:** ${kit.rounds}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📌 **Testing Rules:**\n` +
    `• The tester decides where the test will be done.\n` +
    `• Complete ${kit.format} using the selected kit.\n` +
    `• Make sure both players are ready before starting.\n` +
    `• Follow the tester's instructions during the test.`
  );
}

// ======================================================
// NORMAL KIT MENU
// ======================================================

function buildKitMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId("request_kit")
    .setPlaceholder("🎯 Select a kit")
    .addOptions(
      Object.entries(KITS).map(
        ([value, kit]) => ({
          label: kit.name,
          value,
          emoji: kit.emoji,
          description:
            `${kit.format} • ${kit.rounds} rounds`,
        })
      )
    );
}

// ======================================================
// HIGH KIT MENU
// ======================================================

function buildHighKitMenu(
  member,
  guildData
) {
  const eligible =
    getEligibleHighKits(
      member,
      guildData
    );

  if (eligible.length === 0) {
    return null;
  }

  return new StringSelectMenuBuilder()
    .setCustomId("high_request_kit")
    .setPlaceholder(
      "👑 Select a kit you have LT3 in"
    )
    .addOptions(
      eligible.map((kitKey) => {
        const kit = getKit(kitKey);

        return {
          label: kit.name,
          value: kitKey,
          emoji: kit.emoji,
          description:
            `${kit.format} • You have LT3`,
        };
      })
    );
}

// ======================================================
// REGION MENU
// ======================================================

function buildRegionMenu(customId = "request_region") {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("🌎 Select your region")
    .addOptions(
      Object.entries(REGIONS).map(
        ([value, region]) => ({
          label: region.name,
          value,
          emoji: region.emoji,
          description:
            `Use ${region.name} for your test`,
        })
      )
    );
}

// ======================================================
// NORMAL PANEL
// ======================================================

function buildRequestPanel(guildData) {
  const embed = new EmbedBuilder()
    .setTitle(`🎟️ ${guildData.setupName}`)
    .setDescription(
      `Select the kit you want to test.\n\n` +
        `**1.** Select your kit\n` +
        `**2.** Select your region\n` +
        `**3.** A private testing ticket will be created\n` +
        `**4.** Configured testers can access it\n` +
        `**5.** Follow the testing instructions\n\n` +
        `🔒 **Your ticket is private.**`
    )
    .setColor(0xffc107);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        buildKitMenu()
      ),
    ],
  };
}

// ======================================================
// HIGH PANEL
// ======================================================

function buildHighPanel(guildData) {
  const embed = new EmbedBuilder()
    .setTitle(`👑 HIGH TIER TESTING`)
    .setDescription(
      `Welcome to **High Tier Testing**.\n\n` +
        `You must already have **LT3** in the kit you want to test.\n\n` +
        `You can ONLY select kits where you currently have:\n` +
        `🏆 **[Kit] LT3**\n\n` +
        `The tester decides where the test will be done.\n\n` +
        `⚠️ You cannot request a high tier test without an LT3 role for that kit.`
    )
    .setColor(0xff3b30);

  const button = new ButtonBuilder()
    .setCustomId("high_start")
    .setLabel("Start High Tier Test")
    .setEmoji("👑")
    .setStyle(ButtonStyle.Danger);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        button
      ),
    ],
  };
}

// ======================================================
// CATEGORY CREATION
// ======================================================

async function getOrCreateTicketCategory(
  guild,
  guildData,
  high = false
) {
  const id = high
    ? guildData.highTicketCategoryId
    : guildData.ticketCategoryId;

  let category;

  if (id) {
    category =
      guild.channels.cache.get(id);
  }

  if (
    category &&
    category.type === ChannelType.GuildCategory
  ) {
    return category;
  }

  const name = high
    ? "HIGH TICKETS"
    : "TEST TICKETS";

  const roleIds = [
    ...guildData.testerRoles,
    ...(high
      ? guildData.highTicketRoles
      : guildData.ticketRoles),
  ];

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
      ],
    },
  ];

  for (const roleId of [
    ...new Set(roleIds),
  ]) {
    if (guild.roles.cache.has(roleId)) {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
        ],
      });
    }
  }

  category = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites,
  });

  if (high) {
    guildData.highTicketCategoryId =
      category.id;
  } else {
    guildData.ticketCategoryId =
      category.id;
  }

  saveDatabase();

  return category;
}

// ======================================================
// UPDATE CATEGORY PERMISSIONS
// ======================================================

async function updateCategoryPermissions(
  guild,
  guildData,
  category,
  high = false
) {
  await category.permissionOverwrites
    .edit(guild.roles.everyone.id, {
      ViewChannel: false,
    })
    .catch(() => {});

  const roles = [
    ...guildData.testerRoles,
    ...(high
      ? guildData.highTicketRoles
      : guildData.ticketRoles),
  ];

  for (const roleId of [
    ...new Set(roles),
  ]) {
    await category.permissionOverwrites
      .edit(roleId, {
        ViewChannel: true,
      })
      .catch(() => {});
  }
}

// ======================================================
// FIND PLAYER TICKET
// ======================================================

function findPlayerTicket(
  guild,
  categoryId,
  userId
) {
  return guild.channels.cache.find(
    (channel) =>
      channel.parentId === categoryId &&
      channel.type === ChannelType.GuildText &&
      typeof channel.topic === "string" &&
      channel.topic.startsWith(
        `TIERTEST:${userId}:`
      )
  );
}

// ======================================================
// CREATE NORMAL TICKET
// ======================================================

async function createTestingTicket(
  interaction,
  kitKey,
  region
) {
  const guild = interaction.guild;
  const user = interaction.user;
  const guildData = getGuildData(guild.id);

  const kit = getKit(kitKey);
  const regionData = getRegion(region);

  const category =
    await getOrCreateTicketCategory(
      guild,
      guildData,
      false
    );

  await updateCategoryPermissions(
    guild,
    guildData,
    category,
    false
  );

  const existing =
    findPlayerTicket(
      guild,
      category.id,
      user.id
    );

  if (existing) {
    return {
      existing,
    };
  }

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
      ],
    },

    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  const staffRoles = [
    ...guildData.testerRoles,
    ...guildData.ticketRoles,
  ];

  for (const roleId of [
    ...new Set(staffRoles),
  ]) {
    if (guild.roles.cache.has(roleId)) {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      });
    }
  }

  const channel =
    await guild.channels.create({
      name: makeChannelName(
        `test-${kitKey}-${user.username}`
      ),

      type: ChannelType.GuildText,

      parent: category.id,

      topic:
        `TIERTEST:${user.id}:${kitKey}:${region}:normal`,

      permissionOverwrites: overwrites,
    });

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        `close_ticket:${user.id}:normal`
      )
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

  const infoButton =
    new ButtonBuilder()
      .setCustomId(
        `ticket_info:${user.id}`
      )
      .setLabel("Testing Info")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary);

  const notifyMentions =
    guildData.notifyRoles
      .filter((roleId) =>
        guild.roles.cache.has(roleId)
      )
      .map(
        (roleId) => `<@&${roleId}>`
      );

  const testerMentions =
    guildData.testerRoles
      .filter((roleId) =>
        guild.roles.cache.has(roleId)
      )
      .map(
        (roleId) => `<@&${roleId}>`
      );

  const roleMentions = [
    ...new Set([
      ...testerMentions,
      ...notifyMentions,
    ]),
  ];

  const mentionContent =
    roleMentions.length > 0
      ? roleMentions.join(" ")
      : "";

  const ticketEmbed =
    new EmbedBuilder()
      .setTitle(
        `${kit.emoji} ${kit.name} Tier Test`
      )
      .setDescription(
        `👤 **Player:** <@${user.id}>\n` +
          `🎮 **Discord:** ${user.tag}\n` +
          `${regionData.emoji} **Region:** ${regionData.name}\n\n` +
          getTestingInstructions(kitKey)
      )
      .setColor(0xffc107)
      .setThumbnail(
        user.displayAvatarURL({
          size: 256,
        })
      )
      .setFooter({
        text:
          `${guild.name} • Union Tier Testing`,
      })
      .setTimestamp();

  await channel.send({
    content:
      `${mentionContent}\n\n` +
      `🎫 **New Tier Test Ticket**\n` +
      `<@${user.id}> has opened a ${kit.emoji} **${kit.name}** test.`,

    embeds: [ticketEmbed],

    allowedMentions: {
      users: [user.id],
      roles: roleMentions.map(
        (mention) =>
          mention.replace(/<@&|>/g, "")
      ),
    },

    components: [
      new ActionRowBuilder().addComponents(
        closeButton,
        infoButton
      ),
    ],
  });

  return {
    ticket: channel,
  };
}

// ======================================================
// CREATE HIGH TICKET
// ======================================================

async function createHighTestingTicket(
  interaction,
  kitKey,
  region
) {
  const guild = interaction.guild;
  const user = interaction.user;
  const guildData = getGuildData(guild.id);

  if (
    !hasLT3ForKit(
      interaction.member,
      guildData,
      kitKey
    )
  ) {
    return {
      error:
        `❌ You cannot request a high tier test for **${getKit(kitKey).name}** because you do not have **${getKit(kitKey).name} LT3**.`,
    };
  }

  const kit = getKit(kitKey);
  const regionData = getRegion(region);

  const category =
    await getOrCreateTicketCategory(
      guild,
      guildData,
      true
    );

  await updateCategoryPermissions(
    guild,
    guildData,
    category,
    true
  );

  const existing =
    findPlayerTicket(
      guild,
      category.id,
      user.id
    );

  if (existing) {
    return {
      existing,
    };
  }

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
      ],
    },

    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  const staffRoles = [
    ...guildData.testerRoles,
    ...guildData.highTicketRoles,
  ];

  for (const roleId of [
    ...new Set(staffRoles),
  ]) {
    if (guild.roles.cache.has(roleId)) {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      });
    }
  }

  const channel =
    await guild.channels.create({
      name: makeChannelName(
        `high-${kitKey}-${user.username}`
      ),

      type: ChannelType.GuildText,

      parent: category.id,

      topic:
        `TIERTEST:${user.id}:${kitKey}:${region}:high`,

      permissionOverwrites: overwrites,
    });

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        `close_ticket:${user.id}:high`
      )
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

  const infoButton =
    new ButtonBuilder()
      .setCustomId(
        `ticket_info:${user.id}`
      )
      .setLabel("Testing Info")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary);

  const testerMentions =
    guildData.testerRoles
      .filter((roleId) =>
        guild.roles.cache.has(roleId)
      )
      .map(
        (roleId) => `<@&${roleId}>`
      );

  const highMentions =
    guildData.highTicketRoles
      .filter((roleId) =>
        guild.roles.cache.has(roleId)
      )
      .map(
        (roleId) => `<@&${roleId}>`
      );

  const roleMentions = [
    ...new Set([
      ...testerMentions,
      ...highMentions,
    ]),
  ];

  const mentionContent =
    roleMentions.length > 0
      ? roleMentions.join(" ")
      : "";

  const ticketEmbed =
    new EmbedBuilder()
      .setTitle(
        `👑 HIGH TIER TEST • ${kit.emoji} ${kit.name}`
      )
      .setDescription(
        `👤 **Player:** <@${user.id}>\n` +
          `🎮 **Discord:** ${user.tag}\n` +
          `${regionData.emoji} **Region:** ${regionData.name}\n` +
          `🏆 **Current Rank:** ${kit.name} LT3\n\n` +

          `━━━━━━━━━━━━━━━━━━━━\n\n` +

          `👑 **HIGH TIER TESTING**\n\n` +

          `The player has earned **${kit.name} LT3** and is requesting a high tier test.\n\n` +

          `📌 **High Tier Rules:**\n` +
          `• The tester decides where the test will be done.\n` +
          `• The test is for **HT3 and above**.\n` +
          `• The player must already have LT3 in this kit.\n` +
          `• The tester decides when the test starts.\n` +
          `• Follow all tester instructions.\n\n` +

          `⚔️ **Format:** ${kit.format}\n` +
          `🔢 **Rounds:** ${kit.rounds}`
      )
      .setColor(0xff3b30)
      .setThumbnail(
        user.displayAvatarURL({
          size: 256,
        })
      )
      .setFooter({
        text:
          `${guild.name} • HIGH TIER TESTING`,
      })
      .setTimestamp();

  await channel.send({
    content:
      `${mentionContent}\n\n` +
      `👑 **NEW HIGH TIER TEST TICKET**\n` +
      `<@${user.id}> has opened a high tier ${kit.emoji} **${kit.name}** test.`,

    embeds: [ticketEmbed],

    allowedMentions: {
      users: [user.id],
      roles: roleMentions.map(
        (mention) =>
          mention.replace(/<@&|>/g, "")
      ),
    },

    components: [
      new ActionRowBuilder().addComponents(
        closeButton,
        infoButton
      ),
    ],
  });

  return {
    ticket: channel,
  };
}

// ======================================================
// RESULT COMMAND BUILDER
// ======================================================

function buildResultCommand({
  name,
  description,
  previousTiers,
  resultTiers,
  high = false,
}) {
  const command =
    new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)

      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription(
            "Player who was tested"
          )
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName("gmtag")
          .setDescription(
            "Minecraft gamertag"
          )
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName("region")
          .setDescription(
            "Player region"
          )
          .setRequired(true)
          .addChoices(
            {
              name: "🌏 AS",
              value: "AS",
            },
            {
              name: "🌍 EU",
              value: "EU",
            },
            {
              name: "🌎 NA",
              value: "NA",
            },
            {
              name: "🌊 OC",
              value: "OC",
            }
          )
      )

      .addStringOption((option) =>
        option
          .setName("previous")
          .setDescription(
            "Previous tier"
          )
          .setRequired(true)
          .addChoices(
            ...previousTiers.map(
              (tier) => ({
                name: tier,
                value: tier,
              })
            )
          )
      )

      .addStringOption((option) =>
        option
          .setName("tier")
          .setDescription(
            "Earned tier"
          )
          .setRequired(true)
          .addChoices(
            ...resultTiers.map(
              (tier) => ({
                name: tier,
                value: tier,
              })
            )
          )
      )

      .addUserOption((option) =>
        option
          .setName("tester1")
          .setDescription(
            "Tester 1"
          )
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName("score1")
          .setDescription(
            "Tester 1 vs player score"
          )
          .setRequired(true)
      );

  if (high) {
    command
      .addUserOption((option) =>
        option
          .setName("tester2")
          .setDescription(
            "Tester 2"
          )
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName("score2")
          .setDescription(
            "Tester 2 vs player score"
          )
          .setRequired(true)
      );
  }

  command.addStringOption((option) =>
    option
      .setName("kit")
      .setDescription(
        "Kit tested"
      )
      .setRequired(true)
      .addChoices(
        ...Object.entries(KITS).map(
          ([value, kit]) => ({
            name:
              `${kit.emoji} ${kit.name}`,
            value,
          })
        )
      )
  );

  command.addStringOption((option) =>
    option
      .setName("skin")
      .setDescription(
        "Optional skin URL or NameMC skin link"
      )
      .setRequired(false)
  );

  return command;
}

// ======================================================
// NORMAL RESULT EMBED
// ======================================================

function buildNormalResultEmbed({
  interaction,
  user,
  gmtag,
  region,
  kitKey,
  previous,
  tier,
  tester1,
  score1,
  skin,
}) {
  const kit = getKit(kitKey);
  const regionData = getRegion(region);

  let status;

  if (previous === "No Record") {
    status =
      `🏆 **EARNED RANK ${tier}**`;
  } else if (
    isPromotion(previous, tier)
  ) {
    status =
      `🎉 **PROMOTED TO ${tier}**`;
  } else if (
    isDemotion(previous, tier)
  ) {
    status =
      `📉 **DEMOTED TO ${tier}**`;
  } else if (
    previous === tier
  ) {
    status =
      `🔄 **RETAINED ${tier}**`;
  } else {
    status =
      `🏆 **EARNED RANK ${tier}**`;
  }

  const embed =
    new EmbedBuilder()
      .setTitle("🏆 UNION TIERS")
      .setDescription(
        `👤 **Player:** ${user}\n` +
          `🎮 **GMTAG:** \`${gmtag}\`\n` +
          `${regionData.emoji} **Region:** ${region.name}\n\n` +

          `📊 **Previous Tier:** **${previous}**\n\n` +

          `# 🏆 EARNED\n` +
          `# RANK ${tier}\n\n` +

          `${status}\n\n` +

          `━━━━━━━━━━━━━━━━━━━━\n\n` +

          `🧪 **TESTER & SCORE**\n\n` +
          `👤 **Tester:** ${tester1}\n` +
          `⚔️ **Tester vs Player Score:** **${cleanText(score1)}**\n\n` +

          `━━━━━━━━━━━━━━━━━━━━`
      )
      .setColor(
        tier.startsWith("HT")
          ? 0xff3b30
          : 0xffc107
      )
      .addFields(
        {
          name: "🎯 Kit",
          value:
            `${kit.emoji} **${kit.name}**`,
          inline: false,
        },
        {
          name: "🏆 Earned Rank",
          value:
            `**${kit.name} ${tier}**`,
          inline: false,
        },
        {
          name: "⚔️ Format",
          value:
            `**${kit.format}**`,
          inline: false,
        }
      )
      .setThumbnail(
        user.displayAvatarURL({
          size: 256,
        })
      )
      .setImage(
        normalizeSkinUrl(skin)
      )
      .setFooter({
        text:
          `${interaction.guild.name} • Union Tier Testing`,
      })
      .setTimestamp();

  return embed;
}

// ======================================================
// HIGH RESULT EMBED
// ======================================================

function buildHighResultEmbed({
  interaction,
  user,
  gmtag,
  tester1,
  score1,
  tester2,
  score2,
  tier,
  kitKey,
  skin,
}) {
  const kit = getKit(kitKey);

  const passed =
    TIER_RANK[tier] >=
    TIER_RANK.HT3;

  const tierStatus = passed
    ? `✅ **PASSED HT3 TEST**`
    : `❌ **FAILED HT3 TEST**`;

  return new EmbedBuilder()
    .setTitle("👑 UNION TIERS")
    .setDescription(
      `👤 **Player:** ${user}\n` +
        `🎮 **GMTAG:** \`${gmtag}\`\n\n` +

        `🧪 **Tester 1:** ${tester1}\n` +
        `⚔️ **Tester 1 vs Player Score:** **${cleanText(score1)}**\n\n` +

        `🧪 **Tester 2:** ${tester2}\n` +
        `⚔️ **Tester 2 vs Player Score:** **${cleanText(score2)}**\n\n` +

        `━━━━━━━━━━━━━━━━━━━━\n\n` +

        `🏆 **Tier:** **${tier}**\n\n` +

        `${tierStatus}`
    )
    .setColor(
      passed
        ? 0xff3b30
        : 0xffc107
    )
    .addFields({
      name: "🎯 Kit",
      value:
        `${kit.emoji} **${kit.name}**`,
      inline: false,
    })
    .setThumbnail(
      user.displayAvatarURL({
        size: 256,
      })
    )
    .setImage(
      normalizeSkinUrl(skin)
    )
    .setFooter({
      text:
        `${interaction.guild.name} • HIGH TIER TESTING`,
    })
    .setTimestamp();
}

// ======================================================
// READY
// ======================================================

client.once(
  "clientReady",
  async () => {
    console.log(
      `✅ Logged in as ${client.user.tag}`
    );

    const commands = [];

    // ==================================================
    // SETUP
    // ==================================================

    commands.push(
      new SlashCommandBuilder()
        .setName("setup")
        .setDescription(
          "Create a Union Tier Testing panel"
        )

        .addStringOption((option) =>
          option
            .setName("mode")
            .setDescription(
              "Choose the testing panel"
            )
            .setRequired(true)
            .addChoices(
              {
                name:
                  "🧪 Tier Testing",
                value: "normal",
              },
              {
                name:
                  "👑 High Tier Testing",
                value: "high",
              }
            )
        )

        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription(
              "Name shown on the testing panel"
            )
            .setRequired(true)
        )

        .addRoleOption((option) =>
          option
            .setName("tester1")
            .setDescription(
              "Main tester role"
            )
            .setRequired(true)
        )

        .addRoleOption((option) =>
          option
            .setName("tester2")
            .setDescription(
              "Additional tester role"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("tester3")
            .setDescription(
              "Additional tester role"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("tester4")
            .setDescription(
              "Additional tester role"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("tester5")
            .setDescription(
              "Additional tester role"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("notify1")
            .setDescription(
              "Role to notify"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("notify2")
            .setDescription(
              "Role to notify"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("notify3")
            .setDescription(
              "Role to notify"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("notify4")
            .setDescription(
              "Role to notify"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("notify5")
            .setDescription(
              "Role to notify"
            )
        )

        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator
        )
    );

    // ==================================================
    // GENERATE ROLE
    // ==================================================

    commands.push(
      new SlashCommandBuilder()
        .setName("generaterole")
        .setDescription(
          "Generate every kit and tier role"
        )
        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator
        )
    );

    // ==================================================
    // ADD ROLE
    // ==================================================

    commands.push(
      new SlashCommandBuilder()
        .setName("addrole")
        .setDescription(
          "Give roles access to bot features"
        )

        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription(
              "What should these roles access?"
            )
            .setRequired(true)
            .addChoices(
              {
                name:
                  "💬 Message",
                value:
                  "message",
              },
              {
                name:
                  "🏆 Results (/result + /highresults)",
                value:
                  "results",
              },
              {
                name:
                  "🎟️ Tickets",
                value:
                  "ticket",
              },
              {
                name:
                  "👑 High Tier Tickets",
                value:
                  "high_ticket",
              }
            )
        )

        .addRoleOption((option) =>
          option
            .setName("role1")
            .setDescription(
              "First role"
            )
            .setRequired(true)
        )

        .addRoleOption((option) =>
          option
            .setName("role2")
            .setDescription(
              "Second role"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("role3")
            .setDescription(
              "Third role"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("role4")
            .setDescription(
              "Fourth role"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("role5")
            .setDescription(
              "Fifth role"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("role6")
            .setDescription(
              "Sixth role"
            )
        )

        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator
        )
    );

    // ==================================================
    // WELCOME
    // ==================================================

    commands.push(
      new SlashCommandBuilder()
        .setName("welcome")
        .setDescription(
          "Configure welcome messages"
        )

        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription(
              "Welcome channel"
            )
            .addChannelTypes(
              ChannelType.GuildText
            )
            .setRequired(true)
        )

        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription(
              "Use {user}, {username}, {server}, {count}"
            )
            .setRequired(true)
        )

        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator
        )
    );

    // ==================================================
    // FAREWELL
    // ==================================================

    commands.push(
      new SlashCommandBuilder()
        .setName("farewell")
        .setDescription(
          "Configure farewell messages"
        )

        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription(
              "Farewell channel"
            )
            .addChannelTypes(
              ChannelType.GuildText
            )
            .setRequired(true)
        )

        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription(
              "Use {user}, {username}, {server}, {count}"
            )
            .setRequired(true)
        )

        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator
        )
    );

    // ==================================================
    // MESSAGE
    // ==================================================

    commands.push(
      new SlashCommandBuilder()
        .setName("message")
        .setDescription(
          "Send a message through the bot"
        )

        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription(
              "Channel to send the message"
            )
            .addChannelTypes(
              ChannelType.GuildText
            )
            .setRequired(true)
        )

        .addStringOption((option) =>
          option
            .setName("text")
            .setDescription(
              "Message to send"
            )
            .setRequired(true)
        )
    );

    // ==================================================
    // RESULT
    // ==================================================

    commands.push(
      buildResultCommand({
        name: "result",
        description:
          "Post a normal tier testing result",
        previousTiers:
          NORMAL_PREVIOUS_TIERS,
        resultTiers:
          NORMAL_TIERS,
        high: false,
      })
    );

    // ==================================================
    // HIGH RESULTS
    // ==================================================

    commands.push(
      buildResultCommand({
        name: "highresults",
        description:
          "Post an HT3 and above result",
        previousTiers:
          HIGH_PREVIOUS_TIERS,
        resultTiers:
          HIGH_TIERS,
        high: true,
      })
    );

    // ==================================================
    // REGISTER
    // ==================================================

    const rest =
      new REST({
        version: "10",
      }).setToken(TOKEN);

    try {
      console.log(
        "🔄 Registering slash commands..."
      );

      await rest.put(
        Routes.applicationCommands(
          client.user.id
        ),
        {
          body: commands.map(
            (command) =>
              command.toJSON()
          ),
        }
      );

      console.log(
        "✅ Slash commands registered."
      );

      console.log(
        "✅ /addrole results = /result + /highresults"
      );

      console.log(
        "✅ /addrole ticket = ticket access + close"
      );

      console.log(
        "✅ /addrole high_ticket = high ticket access + close"
      );

      console.log(
        "✅ /generaterole = all kit/tier roles"
      );

      console.log(
        "✅ High testing requires kit LT3"
      );

      console.log(
        "✅ Default skin configured"
      );
    } catch (error) {
      console.error(
        "❌ Command registration error:",
        error
      );
    }
  }
);

// ======================================================
// INTERACTIONS
// ======================================================

client.on(
  "interactionCreate",
  async (interaction) => {
    try {
      // ==================================================
      // SETUP
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "setup"
      ) {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.Administrator
          )
        ) {
          return interaction.reply({
            content:
              "❌ Only server administrators can use this.",
            ephemeral: true,
          });
        }

        const guild =
          interaction.guild;

        const guildData =
          getGuildData(guild.id);

        const mode =
          interaction.options.getString(
            "mode"
          );

        const name =
          interaction.options.getString(
            "name"
          );

        const testerRoles = [
          "tester1",
          "tester2",
          "tester3",
          "tester4",
          "tester5",
        ]
          .map((key) =>
            interaction.options.getRole(
              key
            )
          )
          .filter(Boolean);

        const notifyRoles = [
          "notify1",
          "notify2",
          "notify3",
          "notify4",
          "notify5",
        ]
          .map((key) =>
            interaction.options.getRole(
              key
            )
          )
          .filter(Boolean);

        guildData.setupName = name;

        guildData.testerRoles =
          testerRoles.map(
            (role) => role.id
          );

        guildData.notifyRoles =
          notifyRoles.map(
            (role) => role.id
          );

        saveDatabase();

        if (mode === "normal") {
          const category =
            await getOrCreateTicketCategory(
              guild,
              guildData,
              false
            );

          await updateCategoryPermissions(
            guild,
            guildData,
            category,
            false
          );

          guildData.normalPanelChannelId =
            interaction.channel.id;

          saveDatabase();

          await interaction.channel.send(
            buildRequestPanel(
              guildData
            )
          );

          return interaction.reply({
            content:
              `✅ **Tier Testing** setup complete!\n\n` +
              `🧪 Testers: ${testerRoles.length}\n` +
              `🔔 Notify roles: ${notifyRoles.length}\n` +
              `📁 Category: ${category.name}\n\n` +
              `🏆 Normal results can be LT5 → LT3.`,
            ephemeral: true,
          });
        }

        if (mode === "high") {
          const category =
            await getOrCreateTicketCategory(
              guild,
              guildData,
              true
            );

          await updateCategoryPermissions(
            guild,
            guildData,
            category,
            true
          );

          guildData.highPanelChannelId =
            interaction.channel.id;

          saveDatabase();

          await interaction.channel.send(
            buildHighPanel(
              guildData
            )
          );

          return interaction.reply({
            content:
              `✅ **High Tier Testing** setup complete!\n\n` +
              `👑 Players must have the selected kit's **LT3** role.\n` +
              `📁 High ticket category: ${category.name}`,
            ephemeral: true,
          });
        }
      }

      // ==================================================
      // GENERATE ROLE
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "generaterole"
      ) {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.Administrator
          )
        ) {
          return interaction.reply({
            content:
              "❌ Only server administrators can use this.",
            ephemeral: true,
          });
        }

        await interaction.deferReply({
          ephemeral: true,
        });

        const guildData =
          getGuildData(
            interaction.guild.id
          );

        const result =
          await generateTierRoles(
            interaction.guild,
            guildData
          );

        return interaction.editReply({
          content:
            `✅ **Tier roles generated!**\n\n` +
            `🆕 Created: **${result.created}**\n` +
            `♻️ Already existed: **${result.existing}**\n\n` +
            `There are roles for every kit from **LT5 → HT1**.\n\n` +
            `⚠️ Make sure the bot's highest role is above these tier roles.`,
        });
      }

      // ==================================================
      // ADD ROLE
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "addrole"
      ) {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.Administrator
          )
        ) {
          return interaction.reply({
            content:
              "❌ Only server administrators can use this.",
            ephemeral: true,
          });
        }

        const guildData =
          getGuildData(
            interaction.guild.id
          );

        const type =
          interaction.options.getString(
            "type"
          );

        const roles = [
          "role1",
          "role2",
          "role3",
          "role4",
          "role5",
          "role6",
        ]
          .map((key) =>
            interaction.options.getRole(
              key
            )
          )
          .filter(Boolean);

        if (type === "message") {
          for (const role of roles) {
            if (
              !guildData.messageRoles.includes(
                role.id
              )
            ) {
              guildData.messageRoles.push(
                role.id
              );
            }
          }

          saveDatabase();

          return interaction.reply({
            content:
              `✅ Added ${roles.length} role(s) to **/message** permission.`,
            ephemeral: true,
          });
        }

        if (type === "results") {
          for (const role of roles) {
            if (
              !guildData.resultRoles.includes(
                role.id
              )
            ) {
              guildData.resultRoles.push(
                role.id
              );
            }
          }

          saveDatabase();

          return interaction.reply({
            content:
              `✅ Added ${roles.length} role(s) to **/result AND /highresults**.`,
            ephemeral: true,
          });
        }

        if (type === "ticket") {
          for (const role of roles) {
            if (
              !guildData.ticketRoles.includes(
                role.id
              )
            ) {
              guildData.ticketRoles.push(
                role.id
              );
            }
          }

          const category =
            await getOrCreateTicketCategory(
              interaction.guild,
              guildData,
              false
            );

          await updateCategoryPermissions(
            interaction.guild,
            guildData,
            category,
            false
          );

          saveDatabase();

          return interaction.reply({
            content:
              `✅ Added ${roles.length} role(s) to **normal ticket access**.\n\n` +
              `🎟️ They can view player tickets.\n` +
              `🔒 They can close player tickets.`,
            ephemeral: true,
          });
        }

        if (
          type === "high_ticket"
        ) {
          for (const role of roles) {
            if (
              !guildData.highTicketRoles.includes(
                role.id
              )
            ) {
              guildData.highTicketRoles.push(
                role.id
              );
            }
          }

          const category =
            await getOrCreateTicketCategory(
              interaction.guild,
              guildData,
              true
            );

          await updateCategoryPermissions(
            interaction.guild,
            guildData,
            category,
            true
          );

          saveDatabase();

          return interaction.reply({
            content:
              `✅ Added ${roles.length} role(s) to **high tier ticket access**.\n\n` +
              `👑 They can view high tier tickets.\n` +
              `🔒 They can close high tier tickets.`,
            ephemeral: true,
          });
        }
      }

      // ==================================================
      // WELCOME
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "welcome"
      ) {
        const channel =
          interaction.options.getChannel(
            "channel"
          );

        const message =
          interaction.options.getString(
            "message"
          );

        const data =
          getGuildData(
            interaction.guild.id
          );

        data.welcome = {
          channelId:
            channel.id,
          message,
        };

        saveDatabase();

        return interaction.reply({
          content:
            `✅ Welcome configured in ${channel}.`,
          ephemeral: true,
        });
      }

      // ==================================================
      // FAREWELL
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "farewell"
      ) {
        const channel =
          interaction.options.getChannel(
            "channel"
          );

        const message =
          interaction.options.getString(
            "message"
          );

        const data =
          getGuildData(
            interaction.guild.id
          );

        data.farewell = {
          channelId:
            channel.id,
          message,
        };

        saveDatabase();

        return interaction.reply({
          content:
            `✅ Farewell configured in ${channel}.`,
          ephemeral: true,
        });
      }

      // ==================================================
      // MESSAGE
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "message"
      ) {
        const data =
          getGuildData(
            interaction.guild.id
          );

        if (
          !canUseMessage(
            interaction.member,
            data
          )
        ) {
          return interaction.reply({
            content:
              "❌ You don't have permission to use `/message`.",
            ephemeral: true,
          });
        }

        const channel =
          interaction.options.getChannel(
            "channel"
          );

        const text =
          interaction.options.getString(
            "text"
          );

        await channel.send({
          content: text,
        });

        return interaction.reply({
          content:
            `✅ Message sent to ${channel}.`,
          ephemeral: true,
        });
      }

      // ==================================================
      // NORMAL RESULT
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "result"
      ) {
        const guildData =
          getGuildData(
            interaction.guild.id
          );

        if (
          !canUseResults(
            interaction.member,
            guildData
          )
        ) {
          return interaction.reply({
            content:
              "❌ You don't have permission to use `/result`.",
            ephemeral: true,
          });
        }

        const user =
          interaction.options.getUser(
            "user"
          );

        const gmtag =
          interaction.options.getString(
            "gmtag"
          );

        const region =
          interaction.options.getString(
            "region"
          );

        const previous =
          interaction.options.getString(
            "previous"
          );

        const tier =
          interaction.options.getString(
            "tier"
          );

        const tester1 =
          interaction.options.getUser(
            "tester1"
          );

        const score1 =
          interaction.options.getString(
            "score1"
          );

        const kitKey =
          interaction.options.getString(
            "kit"
          );

        const skin =
          interaction.options.getString(
            "skin"
          );

        if (
          !NORMAL_PREVIOUS_TIERS.includes(
            previous
          )
        ) {
          return interaction.reply({
            content:
              "❌ Invalid previous tier.",
            ephemeral: true,
          });
        }

        if (
          !NORMAL_TIERS.includes(
            tier
          )
        ) {
          return interaction.reply({
            content:
              "❌ `/result` can only give LT5, HT5, LT4, HT4 or LT3.",
            ephemeral: true,
          });
        }

        if (
          !score1 ||
          score1.trim() === ""
        ) {
          return interaction.reply({
            content:
              "❌ Score is required.",
            ephemeral: true,
          });
        }

        // Make sure the tier roles exist
        const roleId =
          getTierRoleId(
            guildData,
            kitKey,
            tier
          );

        if (!roleId) {
          return interaction.reply({
            content:
              `❌ The **${getKit(kitKey).name} ${tier}** role has not been generated.\n\nRun \`/generaterole\` first.`,
            ephemeral: true,
          });
        }

        const embed =
          buildNormalResultEmbed({
            interaction,
            user,
            gmtag,
            region,
            kitKey,
            previous,
            tier,
            tester1,
            score1,
            skin,
          });

        await interaction.channel.send({
          embeds: [embed],
        });

        const roleResult =
          await assignTierRole(
            interaction.guild,
            guildData,
            user.id,
            kitKey,
            tier
          );

        if (!roleResult.success) {
          return interaction.followUp({
            content:
              `⚠️ Result posted, but the role could not be assigned.\n\n${roleResult.error}`,
            ephemeral: true,
          });
        }

        let status;

        if (
          previous === "No Record"
        ) {
          status =
            `🏆 EARNED RANK ${tier}`;
        } else if (
          isPromotion(
            previous,
            tier
          )
        ) {
          status =
            `🎉 PROMOTED TO ${tier}`;
        } else if (
          isDemotion(
            previous,
            tier
          )
        ) {
          status =
            `📉 DEMOTED TO ${tier}`;
        } else {
          status =
            `🔄 RETAINED ${tier}`;
        }

        return interaction.reply({
          content:
            `✅ **Tier result posted!**\n\n` +
            `👤 Player: ${user}\n` +
            `🎯 Kit: ${getKit(kitKey).name}\n` +
            `🏆 **${status}**\n` +
            `🎖️ Role: <@&${roleResult.roleId}>`,
          ephemeral: true,
        });
      }

      // ==================================================
      // HIGH RESULTS
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "highresults"
      ) {
        const guildData =
          getGuildData(
            interaction.guild.id
          );

        if (
          !canUseResults(
            interaction.member,
            guildData
          )
        ) {
          return interaction.reply({
            content:
              "❌ You don't have permission to use `/highresults`.",
            ephemeral: true,
          });
        }

        const user =
          interaction.options.getUser(
            "user"
          );

        const gmtag =
          interaction.options.getString(
            "gmtag"
          );

        const previous =
          interaction.options.getString(
            "previous"
          );

        const tier =
          interaction.options.getString(
            "tier"
          );

        const tester1 =
          interaction.options.getUser(
            "tester1"
          );

        const score1 =
          interaction.options.getString(
            "score1"
          );

        const tester2 =
          interaction.options.getUser(
            "tester2"
          );

        const score2 =
          interaction.options.getString(
            "score2"
          );

        const kitKey =
          interaction.options.getString(
            "kit"
          );

        const skin =
          interaction.options.getString(
            "skin"
          );

        // High results MUST start from LT3
        if (
          previous !== "LT3"
        ) {
          return interaction.reply({
            content:
              "❌ `/highresults` can only use **LT3** as the previous tier.",
            ephemeral: true,
          });
        }

        if (
          !HIGH_TIERS.includes(
            tier
          )
        ) {
          return interaction.reply({
            content:
              "❌ `/highresults` can only give HT3, LT2, HT2, LT1 or HT1.",
            ephemeral: true,
          });
        }

        if (
          !hasLT3ForKit(
            await interaction.guild.members.fetch(
              user.id
            ).catch(() => null),
            guildData,
            kitKey
          )
        ) {
          return interaction.reply({
            content:
              `❌ **${user}** does not have **${getKit(kitKey).name} LT3**.`,
            ephemeral: true,
          });
        }

        const roleId =
          getTierRoleId(
            guildData,
            kitKey,
            tier
          );

        if (!roleId) {
          return interaction.reply({
            content:
              `❌ The **${getKit(kitKey).name} ${tier}** role has not been generated.\n\nRun \`/generaterole\` first.`,
            ephemeral: true,
          });
        }

        const embed =
          buildHighResultEmbed({
            interaction,
            user,
            gmtag,
            tester1,
            score1,
            tester2,
            score2,
            tier,
            kitKey,
            skin,
          });

        await interaction.channel.send({
          embeds: [embed],
        });

        const roleResult =
          await assignTierRole(
            interaction.guild,
            guildData,
            user.id,
            kitKey,
            tier
          );

        if (!roleResult.success) {
          return interaction.followUp({
            content:
              `⚠️ High result posted, but the role could not be assigned.\n\n${roleResult.error}`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            `✅ **High tier result posted!**\n\n` +
            `👤 Player: ${user}\n` +
            `🎯 Kit: ${getKit(kitKey).name}\n` +
            `🏆 Tier: **${tier}**\n` +
            `🎖️ Role: <@&${roleResult.roleId}>`,
          ephemeral: true,
        });
      }

      // ==================================================
      // NORMAL KIT SELECT
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "request_kit"
      ) {
        const kitKey =
          interaction.values[0];

        if (!KITS[kitKey]) {
          return interaction.reply({
            content:
              "❌ Invalid kit selected.",
            ephemeral: true,
          });
        }

        const kit =
          getKit(kitKey);

        if (!client.pendingRequests) {
          client.pendingRequests =
            new Map();
        }

        const requestKey =
          `${interaction.guild.id}:${interaction.user.id}`;

        client.pendingRequests.set(
          requestKey,
          {
            kit: kitKey,
            mode: "normal",
            expires:
              Date.now() +
              5 * 60 * 1000,
          }
        );

        return interaction.reply({
          content:
            `${kit.emoji} **${kit.name} selected.**\n\n` +
            `Now select your region:`,

          components: [
            new ActionRowBuilder().addComponents(
              buildRegionMenu(
                "request_region"
              )
            ),
          ],

          ephemeral: true,
        });
      }

      // ==================================================
      // HIGH START BUTTON
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "high_start"
      ) {
        const guildData =
          getGuildData(
            interaction.guild.id
          );

        const menu =
          buildHighKitMenu(
            interaction.member,
            guildData
          );

        if (!menu) {
          return interaction.reply({
            content:
              `❌ You cannot access High Tier Testing yet.\n\nYou need an **LT3 role** for at least one kit.\n\nExample: **Dia SMP LT3**`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            `👑 **High Tier Testing**\n\nSelect a kit where you already have **LT3**:`,
          components: [
            new ActionRowBuilder().addComponents(
              menu
            ),
          ],
          ephemeral: true,
        });
      }

      // ==================================================
      // HIGH KIT SELECT
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "high_request_kit"
      ) {
        const kitKey =
          interaction.values[0];

        const guildData =
          getGuildData(
            interaction.guild.id
          );

        if (
          !KITS[kitKey]
        ) {
          return interaction.reply({
            content:
              "❌ Invalid kit.",
            ephemeral: true,
          });
        }

        if (
          !hasLT3ForKit(
            interaction.member,
            guildData,
            kitKey
          )
        ) {
          return interaction.reply({
            content:
              `❌ You do not have **${getKit(kitKey).name} LT3**.`,
            ephemeral: true,
          });
        }

        if (!client.pendingRequests) {
          client.pendingRequests =
            new Map();
        }

        const requestKey =
          `${interaction.guild.id}:${interaction.user.id}`;

        client.pendingRequests.set(
          requestKey,
          {
            kit: kitKey,
            mode: "high",
            expires:
              Date.now() +
              5 * 60 * 1000,
          }
        );

        return interaction.reply({
          content:
            `👑 **${getKit(kitKey).name} LT3 confirmed.**\n\nNow select your region:`,
          components: [
            new ActionRowBuilder().addComponents(
              buildRegionMenu(
                "high_request_region"
              )
            ),
          ],
          ephemeral: true,
        });
      }

      // ==================================================
      // NORMAL REGION
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "request_region"
      ) {
        const requestKey =
          `${interaction.guild.id}:${interaction.user.id}`;

        const pending =
          client.pendingRequests?.get(
            requestKey
          );

        if (
          !pending ||
          pending.expires <
            Date.now()
        ) {
          client.pendingRequests?.delete(
            requestKey
          );

          return interaction.update({
            content:
              "❌ Your request expired. Select a kit again.",
            components: [],
          });
        }

        const region =
          interaction.values[0];

        const result =
          await createTestingTicket(
            interaction,
            pending.kit,
            region
          );

        client.pendingRequests.delete(
          requestKey
        );

        if (result.existing) {
          return interaction.update({
            content:
              `⚠️ You already have an active testing ticket:\n${result.existing}`,
            components: [],
          });
        }

        return interaction.update({
          content:
            `✅ **Your testing ticket has been created!**\n\n` +
            `🎯 **Kit:** ${getKit(pending.kit).emoji} ${getKit(pending.kit).name}\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n\n` +
            `🔒 The ticket is private.\n` +
            `🧪 Configured testers can access it.\n\n` +
            `🎫 ${result.ticket}`,
          components: [],
        });
      }

      // ==================================================
      // HIGH REGION
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "high_request_region"
      ) {
        const requestKey =
          `${interaction.guild.id}:${interaction.user.id}`;

        const pending =
          client.pendingRequests?.get(
            requestKey
          );

        if (
          !pending ||
          pending.expires <
            Date.now()
        ) {
          client.pendingRequests?.delete(
            requestKey
          );

          return interaction.update({
            content:
              "❌ Your request expired.",
            components: [],
          });
        }

        const guildData =
          getGuildData(
            interaction.guild.id
          );

        if (
          !hasLT3ForKit(
            interaction.member,
            guildData,
            pending.kit
          )
        ) {
          client.pendingRequests.delete(
            requestKey
          );

          return interaction.update({
            content:
              `❌ You no longer have **${getKit(pending.kit).name} LT3**.`,
            components: [],
          });
        }

        const region =
          interaction.values[0];

        const result =
          await createHighTestingTicket(
            interaction,
            pending.kit,
            region
          );

        client.pendingRequests.delete(
          requestKey
        );

        if (result.error) {
          return interaction.update({
            content:
              result.error,
            components: [],
          });
        }

        if (result.existing) {
          return interaction.update({
            content:
              `⚠️ You already have an active high tier ticket:\n${result.existing}`,
            components: [],
          });
        }

        return interaction.update({
          content:
            `👑 **High Tier Testing ticket created!**\n\n` +
            `🎯 **Kit:** ${getKit(pending.kit).emoji} ${getKit(pending.kit).name}\n` +
            `🏆 **Required:** ${getKit(pending.kit).name} LT3\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n\n` +
            `🎫 ${result.ticket}`,
          components: [],
        });
      }

      // ==================================================
      // TESTING INFO
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "ticket_info:"
        )
      ) {
        const parts =
          (
            interaction.channel.topic ||
            ""
          ).split(":");

        const playerId =
          parts[1];

        const kitKey =
          parts[2];

        const region =
          parts[3];

        const mode =
          parts[4] || "normal";

        if (!KITS[kitKey]) {
          return interaction.reply({
            content:
              "❌ This ticket has an invalid kit in its ticket data. Please close it and create a new ticket.",
            ephemeral: true,
          });
        }

        const kit =
          getKit(kitKey);

        if (mode === "high") {
          return interaction.reply({
            content:
              `👑 **HIGH TIER TEST INFORMATION**\n\n` +
              `👤 **Player:** <@${playerId}>\n` +
              `🎯 **Kit:** ${kit.emoji} ${kit.name}\n` +
              `🏆 **Required Rank:** ${kit.name} LT3\n` +
              `🌎 **Region:** ${getRegion(region).emoji} ${region}\n\n` +
              getTestingInstructions(
                kitKey
              ) +
              `\n\n👑 **High tier testing is for HT3 and above.**`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            `📋 **Tier Test Information**\n\n` +
            `👤 **Player:** <@${playerId}>\n` +
            `🎯 **Kit:** ${kit.emoji} ${kit.name}\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n\n` +
            getTestingInstructions(
              kitKey
            ),
          ephemeral: true,
        });
      }

      // ==================================================
      // CLOSE TICKET
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "close_ticket:"
        )
      ) {
        const guildData =
          getGuildData(
            interaction.guild.id
          );

        const parts =
          interaction.customId.split(
            ":"
          );

        const mode =
          parts[2] || "normal";

        const isHigh =
          mode === "high";

        if (
          !canAccessTicket(
            interaction.member,
            guildData,
            isHigh
          )
        ) {
          return interaction.reply({
            content:
              isHigh
                ? "❌ You don't have permission to close high tier tickets."
                : "❌ You don't have permission to close tickets.",
            ephemeral: true,
          });
        }

        await interaction.reply({
          content:
            "🔒 Closing ticket in **3 seconds**...",
        });

        setTimeout(() => {
          interaction.channel
            ?.delete()
            .catch(() => {});
        }, 3000);

        return;
      }
    } catch (error) {
      console.error(
        "❌ Interaction error:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        await interaction
          .reply({
            content:
              "❌ Something went wrong. Check the bot console.",
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  }
);

// ======================================================
// WELCOME
// ======================================================

client.on(
  "guildMemberAdd",
  async (member) => {
    const data =
      getGuildData(
        member.guild.id
      );

    if (
      !data.welcome ||
      !data.welcome.channelId ||
      !data.welcome.message
    ) {
      return;
    }

    const channel =
      member.guild.channels.cache.get(
        data.welcome.channelId
      );

    if (!channel) {
      return;
    }

    const message =
      replaceText(
        data.welcome.message,
        member
      );

    const embed =
      new EmbedBuilder()
        .setDescription(message)
        .setThumbnail(
          member.user.displayAvatarURL({
            size: 256,
          })
        )
        .setFooter({
          text:
            `${member.guild.name} • Member #${member.guild.memberCount}`,
        });

    await channel
      .send({
        embeds: [embed],
      })
      .catch(() => {});
  }
);

// ======================================================
// FAREWELL
// ======================================================

client.on(
  "guildMemberRemove",
  async (member) => {
    const data =
      getGuildData(
        member.guild.id
      );

    if (
      !data.farewell ||
      !data.farewell.channelId ||
      !data.farewell.message
    ) {
      return;
    }

    const channel =
      member.guild.channels.cache.get(
        data.farewell.channelId
      );

    if (!channel) {
      return;
    }

    const message =
      replaceText(
        data.farewell.message,
        member
      );

    const embed =
      new EmbedBuilder()
        .setDescription(message)
        .setThumbnail(
          member.user.displayAvatarURL({
            size: 256,
          })
        )
        .setFooter({
          text:
            `${member.guild.name} • Goodbye`,
        });

    await channel
      .send({
        embeds: [embed],
      })
      .catch(() => {});
  }
);

// ======================================================
// PLACEHOLDERS
// ======================================================

function replaceText(
  text,
  member
) {
  return String(text)
    .replaceAll(
      "{user}",
      `<@${member.id}>`
    )
    .replaceAll(
      "{username}",
      member.user.username
    )
    .replaceAll(
      "{server}",
      member.guild.name
    )
    .replaceAll(
      "{count}",
      String(
        member.guild.memberCount
      )
    );
}

// ======================================================
// START
// ======================================================

loadDatabase();

client.login(TOKEN);
