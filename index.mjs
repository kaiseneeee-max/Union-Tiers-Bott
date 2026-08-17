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
  console.error("❌ DISCORD_TOKEN is missing from your .env file.");
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

      highTierRoles: [],

      ticketCategoryId: "",
      highTicketCategoryId: "",

      welcome: {},
      farewell: {},
    };

    saveDatabase();
  }

  const data = database.guilds[guildId];

  const arrays = [
    "testerRoles",
    "notifyRoles",
    "messageRoles",
    "resultRoles",
    "ticketRoles",
    "highTicketRoles",
    "highTierRoles",
  ];

  for (const key of arrays) {
    if (!Array.isArray(data[key])) {
      data[key] = [];
    }
  }

  if (typeof data.ticketCategoryId !== "string") {
    data.ticketCategoryId = "";
  }

  if (typeof data.highTicketCategoryId !== "string") {
    data.highTicketCategoryId = "";
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
//
// Your NameMC skin:
// https://namemc.com/skin/6cc743790519ce59
//
// This is a direct NameMC 3D render so Discord can
// display it as the large embed image.
//

const DEFAULT_SKIN =
  "https://s.namemc.com/3d/skin.png?skin=6cc743790519ce59&model=classic&width=700&height=1000&theta=0&phi=0";

// ======================================================
// HELPERS
// ======================================================

function getKit(key) {
  return KITS[key] || null;
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

  return (
    TIER_RANK[current] >
    TIER_RANK[previous]
  );
}

function isDemotion(previous, current) {
  if (
    !previous ||
    !current ||
    previous === "No Record"
  ) {
    return false;
  }

  return (
    TIER_RANK[current] <
    TIER_RANK[previous]
  );
}

function isSameTier(previous, current) {
  return (
    previous &&
    current &&
    previous === current
  );
}

// ======================================================
// ROLE HELPERS
// ======================================================

function getTierRoleName(kitKey, tier) {
  const kit = getKit(kitKey);

  if (!kit) {
    return null;
  }

  return `${kit.name} ${tier}`;
}

function getKitTierRoles(kitKey) {
  const kit = getKit(kitKey);

  if (!kit) {
    return [];
  }

  return ALL_TIERS.map((tier) =>
    getTierRoleName(kitKey, tier)
  );
}

function findTierRole(guild, kitKey, tier) {
  const roleName = getTierRoleName(
    kitKey,
    tier
  );

  if (!roleName) {
    return null;
  }

  return guild.roles.cache.find(
    (role) => role.name === roleName
  );
}

async function getOrCreateTierRole(
  guild,
  kitKey,
  tier
) {
  const existing = findTierRole(
    guild,
    kitKey,
    tier
  );

  if (existing) {
    return existing;
  }

  const kit = getKit(kitKey);

  if (!kit) {
    return null;
  }

  try {
    return await guild.roles.create({
      name: `${kit.name} ${tier}`,
      reason: "UNION TIERS tier role generation",
    });
  } catch (error) {
    console.error(
      `❌ Could not create ${kit.name} ${tier}:`,
      error
    );

    return null;
  }
}

// ======================================================
// GENERATE ALL KIT TIER ROLES
// ======================================================

async function generateAllTierRoles(guild) {
  let created = 0;
  let existing = 0;
  let failed = 0;

  for (const kitKey of Object.keys(KITS)) {
    for (const tier of ALL_TIERS) {
      const current = findTierRole(
        guild,
        kitKey,
        tier
      );

      if (current) {
        existing++;
        continue;
      }

      const role = await getOrCreateTierRole(
        guild,
        kitKey,
        tier
      );

      if (role) {
        created++;
      } else {
        failed++;
      }
    }
  }

  return {
    created,
    existing,
    failed,
  };
}

// ======================================================
// GIVE TIER ROLE
// ======================================================

async function assignTierRole(
  guild,
  userId,
  kitKey,
  tier
) {
  const member = await guild.members
    .fetch(userId)
    .catch(() => null);

  if (!member) {
    return {
      success: false,
      reason: "Member not found.",
    };
  }

  const kit = getKit(kitKey);

  if (!kit) {
    return {
      success: false,
      reason: "Invalid kit.",
    };
  }

  const newRole =
    await getOrCreateTierRole(
      guild,
      kitKey,
      tier
    );

  if (!newRole) {
    return {
      success: false,
      reason:
        "Could not create/find the tier role.",
    };
  }

  const allKitRoles = [];

  for (const kitTier of ALL_TIERS) {
    const role = findTierRole(
      guild,
      kitKey,
      kitTier
    );

    if (role) {
      allKitRoles.push(role);
    }
  }

  for (const role of allKitRoles) {
    if (
      role.id !== newRole.id &&
      member.roles.cache.has(role.id)
    ) {
      await member.roles
        .remove(role)
        .catch(() => {});
    }
  }

  if (!member.roles.cache.has(newRole.id)) {
    await member.roles
      .add(newRole)
      .catch(() => {});
  }

  return {
    success: true,
    role: newRole,
  };
}

// ======================================================
// HIGH TIER ELIGIBILITY
// ======================================================
//
// A player can high-test a kit only if they have:
// LT3, HT3, LT2, HT2, LT1 or HT1
// for THAT SPECIFIC KIT.
//

function hasHighTierForKit(
  member,
  kitKey
) {
  if (!member) {
    return false;
  }

  for (const tier of HIGH_TIERS) {
    const role = findTierRole(
      member.guild,
      kitKey,
      tier
    );

    if (
      role &&
      member.roles.cache.has(role.id)
    ) {
      return true;
    }
  }

  return false;
}

function getEligibleHighKits(member) {
  return Object.entries(KITS)
    .filter(([kitKey]) =>
      hasHighTierForKit(
        member,
        kitKey
      )
    );
}

// ======================================================
// PERMISSIONS
// ======================================================

function hasAnyRole(member, roleIds) {
  if (!member) {
    return false;
  }

  return roleIds.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

function isAdmin(member) {
  return (
    member &&
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  );
}

function isTester(member, data) {
  if (!member) {
    return false;
  }

  if (isAdmin(member)) {
    return true;
  }

  return hasAnyRole(
    member,
    data.testerRoles
  );
}

function canUseResults(member, data) {
  if (!member) {
    return false;
  }

  if (isAdmin(member)) {
    return true;
  }

  if (isTester(member, data)) {
    return true;
  }

  return hasAnyRole(
    member,
    data.resultRoles
  );
}

function canUseMessage(member, data) {
  if (!member) {
    return false;
  }

  if (isAdmin(member)) {
    return true;
  }

  return hasAnyRole(
    member,
    data.messageRoles
  );
}

function canViewNormalTickets(
  member,
  data
) {
  if (!member) {
    return false;
  }

  if (isAdmin(member)) {
    return true;
  }

  if (isTester(member, data)) {
    return true;
  }

  return hasAnyRole(
    member,
    data.ticketRoles
  );
}

function canViewHighTickets(
  member,
  data
) {
  if (!member) {
    return false;
  }

  if (isAdmin(member)) {
    return true;
  }

  if (isTester(member, data)) {
    return true;
  }

  return hasAnyRole(
    member,
    data.highTicketRoles
  );
}

function canStartHighTicketAsStaff(
  member,
  data
) {
  if (!member) {
    return false;
  }

  if (isAdmin(member)) {
    return true;
  }

  if (isTester(member, data)) {
    return true;
  }

  return hasAnyRole(
    member,
    data.highTicketRoles
  );
}

// ======================================================
// TESTING INSTRUCTIONS
// ======================================================

function getTestingInstructions(
  kitKey,
  high = false
) {
  const kit = getKit(kitKey);

  if (!kit) {
    return "❌ Invalid kit.";
  }

  if (high) {
    return (
      `🧪 **High Tier Testing Instructions**\n\n` +
      `${kit.emoji} **${kit.name}**\n\n` +
      `⚔️ **Format:** ${kit.format}\n` +
      `🔢 **Rounds:** ${kit.rounds}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📌 **Testing Rules:**\n` +
      `• The tester decides where the test will be done.\n` +
      `• Complete ${kit.format} using the selected kit.\n` +
      `• The player must already have LT3 or higher for this kit.\n` +
      `• Both players must be ready before starting.\n` +
      `• Follow the tester's instructions during the test.`
    );
  }

  return (
    `🧪 **Testing Instructions**\n\n` +
    `${kit.emoji} **${kit.name}**\n\n` +
    `⚔️ **Format:** ${kit.format}\n` +
    `🔢 **Rounds:** ${kit.rounds}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📌 **Testing Rules:**\n` +
    `• The tester decides where the test will be done.\n` +
    `• Complete ${kit.format} using the selected kit.\n` +
    `• Both players must be ready before starting.\n` +
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
          description: kit.format,
        })
      )
    );
}

// ======================================================
// REGION MENU
// ======================================================

function buildRegionMenu(customId) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(
      "🌎 Select your region"
    )
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
// HIGH KIT MENU
// ======================================================

function buildHighKitMenu(
  member,
  data
) {
  const eligible =
    getEligibleHighKits(member);

  const options = eligible.map(
    ([value, kit]) => ({
      label: kit.name,
      value,
      emoji: kit.emoji,
      description:
        `${kit.format} • You have LT3+`,
    })
  );

  if (
    canStartHighTicketAsStaff(
      member,
      data
    )
  ) {
    return new StringSelectMenuBuilder()
      .setCustomId("high_request_kit")
      .setPlaceholder(
        "👑 Select a high-tier kit"
      )
      .addOptions(
        Object.entries(KITS).map(
          ([value, kit]) => ({
            label: kit.name,
            value,
            emoji: kit.emoji,
            description:
              `${kit.format} • Staff access`,
          })
        )
      );
  }

  return new StringSelectMenuBuilder()
    .setCustomId("high_request_kit")
    .setPlaceholder(
      "👑 Select an eligible kit"
    )
    .addOptions(options);
}

// ======================================================
// NORMAL PANEL
// ======================================================

function buildRequestPanel(data) {
  const embed = new EmbedBuilder()
    .setTitle(
      `🎟️ ${data.setupName}`
    )
    .setDescription(
      `Welcome to **Tier Testing**.\n\n` +
      `Select the kit you want to test.\n\n` +
      `**1.** Select your kit\n` +
      `**2.** Select your region\n` +
      `**3.** A private ticket will be created\n` +
      `**4.** Configured testers can access it\n` +
      `**5.** Follow the testing instructions\n\n` +
      `🔒 **Your ticket is private.**\n` +
      `🧪 **The tester decides where the test happens.**`
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

function buildHighPanel(data) {
  const embed = new EmbedBuilder()
    .setTitle(
      "👑 HIGH TIER TESTING"
    )
    .setDescription(
      `Welcome to **High Tier Testing**.\n\n` +
      `You must already have **LT3 or higher** in the kit you want to test.\n\n` +
      `You can ONLY select kits where you currently have:\n` +
      `🏆 **LT3 / HT3 / LT2 / HT2 / LT1 / HT1**\n\n` +
      `The tester decides where the test will be done.\n\n` +
      `⚠️ You cannot request a high-tier test for a kit where you do not have an eligible tier.`
    )
    .setColor(0xff3030);

  const button = new ButtonBuilder()
    .setCustomId(
      "start_high_tier_test"
    )
    .setLabel(
      "Start High Tier Test"
    )
    .setEmoji("👑")
    .setStyle(
      ButtonStyle.Danger
    );

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
  data
) {
  let category;

  if (data.ticketCategoryId) {
    category =
      guild.channels.cache.get(
        data.ticketCategoryId
      );
  }

  if (
    category &&
    category.type ===
      ChannelType.GuildCategory
  ) {
    return category;
  }

  category =
    await guild.channels.create({
      name: "TEST TICKETS",
      type: ChannelType.GuildCategory,

      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [
            PermissionFlagsBits.ViewChannel,
          ],
        },

        ...data.testerRoles.map(
          (roleId) => ({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
            ],
          })
        ),

        ...data.ticketRoles.map(
          (roleId) => ({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
            ],
          })
        ),
      ],
    });

  data.ticketCategoryId =
    category.id;

  saveDatabase();

  return category;
}

async function getOrCreateHighTicketCategory(
  guild,
  data
) {
  let category;

  if (data.highTicketCategoryId) {
    category =
      guild.channels.cache.get(
        data.highTicketCategoryId
      );
  }

  if (
    category &&
    category.type ===
      ChannelType.GuildCategory
  ) {
    return category;
  }

  category =
    await guild.channels.create({
      name: "HIGH TICKETS",
      type: ChannelType.GuildCategory,

      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [
            PermissionFlagsBits.ViewChannel,
          ],
        },

        ...data.testerRoles.map(
          (roleId) => ({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
            ],
          })
        ),

        ...data.highTicketRoles.map(
          (roleId) => ({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
            ],
          })
        ),
      ],
    });

  data.highTicketCategoryId =
    category.id;

  saveDatabase();

  return category;
}

// ======================================================
// CATEGORY PERMISSIONS
// ======================================================

async function updateCategoryPermissions(
  guild,
  data
) {
  const category =
    await getOrCreateTicketCategory(
      guild,
      data
    );

  await category.permissionOverwrites
    .edit(
      guild.roles.everyone.id,
      {
        ViewChannel: false,
      }
    )
    .catch(() => {});

  const roles = [
    ...data.testerRoles,
    ...data.ticketRoles,
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

  const highCategory =
    await getOrCreateHighTicketCategory(
      guild,
      data
    );

  await highCategory.permissionOverwrites
    .edit(
      guild.roles.everyone.id,
      {
        ViewChannel: false,
      }
    )
    .catch(() => {});

  const highRoles = [
    ...data.testerRoles,
    ...data.highTicketRoles,
  ];

  for (const roleId of [
    ...new Set(highRoles),
  ]) {
    await highCategory.permissionOverwrites
      .edit(roleId, {
        ViewChannel: true,
      })
      .catch(() => {});
  }

  return {
    normal: category,
    high: highCategory,
  };
}

// ======================================================
// FIND NORMAL TICKET
// ======================================================

function findPlayerTicket(
  guild,
  categoryId,
  userId
) {
  return guild.channels.cache.find(
    (channel) =>
      channel.parentId ===
        categoryId &&
      channel.type ===
        ChannelType.GuildText &&
      typeof channel.topic ===
        "string" &&
      channel.topic.startsWith(
        `TIERTEST:${userId}:`
      )
  );
}

// ======================================================
// FIND HIGH TICKET
// ======================================================

function findHighPlayerTicket(
  guild,
  categoryId,
  userId
) {
  return guild.channels.cache.find(
    (channel) =>
      channel.parentId ===
        categoryId &&
      channel.type ===
        ChannelType.GuildText &&
      typeof channel.topic ===
        "string" &&
      channel.topic.startsWith(
        `HIGHTEST:${userId}:`
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
  const guild =
    interaction.guild;

  const user =
    interaction.user;

  const data =
    getGuildData(guild.id);

  const kit = getKit(kitKey);

  if (!kit) {
    return {
      error: "❌ Invalid kit selected.",
    };
  }

  const regionData =
    getRegion(region);

  const categories =
    await updateCategoryPermissions(
      guild,
      data
    );

  const existing =
    findPlayerTicket(
      guild,
      categories.normal.id,
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

    ...[
      ...new Set([
        ...data.testerRoles,
        ...data.ticketRoles,
      ]),
    ].map((roleId) => ({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    })),
  ];

  const channel =
    await guild.channels.create({
      name: makeChannelName(
        `test-${kitKey}-${user.username}`
      ),

      type: ChannelType.GuildText,

      parent:
        categories.normal.id,

      topic:
        `TIERTEST:${user.id}:${kitKey}:${region}`,

      permissionOverwrites:
        overwrites,
    });

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        `close_ticket:${user.id}`
      )
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(
        ButtonStyle.Danger
      );

  const infoButton =
    new ButtonBuilder()
      .setCustomId(
        `ticket_info:${user.id}`
      )
      .setLabel("Testing Info")
      .setEmoji("📋")
      .setStyle(
        ButtonStyle.Secondary
      );

  const mentionRoleIds = [
    ...new Set([
      ...data.testerRoles,
      ...data.notifyRoles,
    ]),
  ].filter((roleId) =>
    guild.roles.cache.has(roleId)
  );

  const roleMentions =
    mentionRoleIds.map(
      (roleId) =>
        `<@&${roleId}>`
    );

  const ticketEmbed =
    new EmbedBuilder()
      .setTitle(
        `${kit.emoji} ${kit.name} Tier Test`
      )

      .setDescription(
        `👤 **Player:** <@${user.id}>\n` +
        `🎮 **Discord:** ${user.tag}\n` +
        `${regionData.emoji} **Region:** ${regionData.name}\n` +
        `⚔️ **Format:** ${kit.format}\n\n` +
        getTestingInstructions(
          kitKey,
          false
        )
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
      `${roleMentions.join(" ")}\n\n` +
      `🎫 **New Tier Test Ticket**\n` +
      `<@${user.id}> has opened a ` +
      `${kit.emoji} **${kit.name}** test.`,

    embeds: [
      ticketEmbed,
    ],

    allowedMentions: {
      users: [user.id],
      roles: mentionRoleIds,
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
  const guild =
    interaction.guild;

  const user =
    interaction.user;

  const data =
    getGuildData(guild.id);

  const kit = getKit(kitKey);

  if (!kit) {
    return {
      error: "❌ Invalid kit selected.",
    };
  }

  const isStaff =
    canStartHighTicketAsStaff(
      interaction.member,
      data
    );

  if (
    !isStaff &&
    !hasHighTierForKit(
      interaction.member,
      kitKey
    )
  ) {
    return {
      error:
        `❌ You do not have **LT3 or higher** for **${kit.name}**.`,
    };
  }

  const regionData =
    getRegion(region);

  const categories =
    await updateCategoryPermissions(
      guild,
      data
    );

  const existing =
    findHighPlayerTicket(
      guild,
      categories.high.id,
      user.id
    );

  if (existing) {
    return {
      existing,
    };
  }

  const highStaffRoles = [
    ...new Set([
      ...data.testerRoles,
      ...data.highTicketRoles,
    ]),
  ];

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

    ...highStaffRoles.map(
      (roleId) => ({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      })
    ),
  ];

  const channel =
    await guild.channels.create({
      name: makeChannelName(
        `high-${kitKey}-${user.username}`
      ),

      type: ChannelType.GuildText,

      parent:
        categories.high.id,

      topic:
        `HIGHTEST:${user.id}:${kitKey}:${region}`,

      permissionOverwrites:
        overwrites,
    });

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        `close_high_ticket:${user.id}`
      )
      .setLabel("Close High Ticket")
      .setEmoji("🔒")
      .setStyle(
        ButtonStyle.Danger
      );

  const infoButton =
    new ButtonBuilder()
      .setCustomId(
        `high_ticket_info:${user.id}`
      )
      .setLabel("Testing Info")
      .setEmoji("📋")
      .setStyle(
        ButtonStyle.Secondary
      );

  const mentionRoleIds = [
    ...new Set([
      ...data.testerRoles,
      ...data.highTicketRoles,
    ]),
  ].filter((roleId) =>
    guild.roles.cache.has(roleId)
  );

  const roleMentions =
    mentionRoleIds.map(
      (roleId) =>
        `<@&${roleId}>`
    );

  const ticketEmbed =
    new EmbedBuilder()
      .setTitle(
        `👑 ${kit.emoji} HIGH TIER TEST`
      )

      .setDescription(
        `👤 **Player:** <@${user.id}>\n` +
        `🎮 **Discord:** ${user.tag}\n` +
        `${regionData.emoji} **Region:** ${regionData.name}\n` +
        `⚔️ **Format:** ${kit.format}\n\n` +
        `👑 **HIGH TIER TESTING**\n\n` +
        `This player is requesting an **HT3 or higher** test.\n\n` +
        `🏆 The player must already have **LT3 or higher** for this kit.\n` +
        `📍 The tester decides where the test will be done.\n` +
        `⚔️ Complete ${kit.format}.\n\n` +
        getTestingInstructions(
          kitKey,
          true
        )
      )

      .setColor(0xff3030)

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
      `${roleMentions.join(" ")}\n\n` +
      `👑 **New High Tier Test Ticket**\n` +
      `<@${user.id}> has opened a ` +
      `${kit.emoji} **${kit.name} HIGH TIER** test.`,

    embeds: [
      ticketEmbed,
    ],

    allowedMentions: {
      users: [user.id],
      roles: mentionRoleIds,
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
  testerCount,
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
      );

  if (!high) {
    command.addStringOption(
      (option) =>
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
    );

    command.addStringOption(
      (option) =>
        option
          .setName("previous")
          .setDescription(
            "Player's previous tier"
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
    );
  }

  command.addStringOption(
    (option) =>
      option
        .setName("tier")
        .setDescription(
          high
            ? "High tier result"
            : "New tier"
        )
        .setRequired(true)
        .addChoices(
          ...(high
            ? [
                {
                  name:
                    "❌ Failed HT3 Test",
                  value:
                    "FAILED_HT3",
                },

                ...resultTiers.map(
                  (tier) => ({
                    name:
                      `🏆 Passed - ${tier}`,
                    value: tier,
                  })
                ),
              ]
            : resultTiers.map(
                (tier) => ({
                  name: tier,
                  value: tier,
                })
              ))
        )
  );

  command.addUserOption(
    (option) =>
      option
        .setName("tester1")
        .setDescription(
          "First tester"
        )
        .setRequired(true)
  );

  command.addStringOption(
    (option) =>
      option
        .setName("score1")
        .setDescription(
          "Tester 1 vs player score"
        )
        .setRequired(true)
  );

  if (testerCount === 2) {
    command.addUserOption(
      (option) =>
        option
          .setName("tester2")
          .setDescription(
            "Second tester"
          )
          .setRequired(true)
    );

    command.addStringOption(
      (option) =>
        option
          .setName("score2")
          .setDescription(
            "Tester 2 vs player score"
          )
          .setRequired(true)
    );
  }

  command.addStringOption(
    (option) =>
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

  command.addStringOption(
    (option) =>
      option
        .setName("skin")
        .setDescription(
          "Optional direct skin image URL"
        )
        .setRequired(false)
  );

  return command;
}

// ======================================================
// NORMAL RESULT EMBED
// ======================================================

function buildResultEmbed({
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
  const kit =
    getKit(kitKey);

  const regionData =
    getRegion(region);

  let statusText;

  if (
    isDemotion(
      previous,
      tier
    )
  ) {
    statusText =
      `# ⚠️ DEMOTED\n# RANK ${tier}`;
  } else if (
    isPromotion(
      previous,
      tier
    )
  ) {
    statusText =
      `# 🎉 PROMOTED\n# EARNED RANK ${tier}`;
  } else if (
    isSameTier(
      previous,
      tier
    )
  ) {
    statusText =
      `# 🔄 RETAINED\n# EARNED RANK ${tier}`;
  } else {
    statusText =
      `# 🏆 EARNED\n# RANK ${tier}`;
  }

  const description =
    `👤 **Player:** ${user}\n` +
    `🎮 **GMTAG:** \`${gmtag}\`\n` +
    `${regionData.emoji} **Region:** ${regionData.name}\n\n` +
    `📊 **Previous Tier:** **${previous}**\n\n` +
    `${statusText}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🧪 **TESTER & SCORE**\n\n` +
    `👤 **Tester:** ${tester1}\n` +
    `⚔️ **Tester vs Player:** **${cleanText(score1)}**\n\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  const embed =
    new EmbedBuilder()
      .setTitle(
        "🏆 UNION TIERS"
      )

      .setDescription(
        description
      )

      .setColor(
        tier.startsWith("HT")
          ? 0xff3030
          : 0xffc107
      )

      .addFields(
        {
          name: "🎯 Kit",
          value:
            `${kit.emoji} **${kit.name}**`,
          inline: true,
        },
        {
          name: "🏆 Earned Rank",
          value:
            `**${tier}**`,
          inline: true,
        },
        {
          name: "⚔️ Format",
          value:
            `**${kit.format}**`,
          inline: true,
        }
      )

      .setFooter({
        text:
          `${interaction.guild.name} • Union Tier Testing`,
      })

      .setTimestamp();

  // BIG DEFAULT SKIN
  embed.setImage(
    skin &&
    skin.trim() !== ""
      ? skin.trim()
      : DEFAULT_SKIN
  );

  return embed;
}

// ======================================================
// HIGH RESULT EMBED
// ======================================================

function buildHighResultEmbed({
  interaction,
  user,
  gmtag,
  kitKey,
  tier,
  tester1,
  score1,
  tester2,
  score2,
  skin,
}) {
  const kit =
    getKit(kitKey);

  let resultText;

  if (tier === "FAILED_HT3") {
    resultText =
      "# ❌ FAILED HT3 TEST";
  } else if (tier === "HT3") {
    resultText =
      "# 👑 PASSED HT3 TEST\n# EARNED RANK HT3";
  } else {
    resultText =
      `# 👑 PASSED HT3 TEST\n# EARNED RANK ${tier}`;
  }

  const description =
    `👤 **Player:** ${user}\n` +
    `🎮 **GMTAG:** \`${gmtag}\`\n\n` +
    `${resultText}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🧪 **TESTERS & SCORES**\n\n` +
    `👤 **Tester 1:** ${tester1}\n` +
    `⚔️ **Tester 1 vs Player:** **${cleanText(score1)}**\n\n` +
    `👤 **Tester 2:** ${tester2}\n` +
    `⚔️ **Tester 2 vs Player:** **${cleanText(score2)}**\n\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  const embed =
    new EmbedBuilder()
      .setTitle(
        "👑 UNION TIERS • HIGH TIER"
      )

      .setDescription(
        description
      )

      .setColor(
        tier === "FAILED_HT3"
          ? 0xff3030
          : 0xffc107
      )

      .addFields({
        name: "🎯 Kit",
        value:
          `${kit.emoji} **${kit.name}**`,
        inline: true,
      });

  if (tier !== "FAILED_HT3") {
    embed.addFields({
      name: "🏆 Earned Rank",
      value:
        `**${tier}**`,
      inline: true,
    });
  }

  embed
    .setFooter({
      text:
        `${interaction.guild.name} • HIGH TIER TESTING`,
    })
    .setTimestamp();

  // BIG DEFAULT SKIN
  embed.setImage(
    skin &&
    skin.trim() !== ""
      ? skin.trim()
      : DEFAULT_SKIN
  );

  return embed;
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
          "Create or update UNION TIERS"
        )

        .addStringOption(
          (option) =>
            option
              .setName("name")
              .setDescription(
                "Name shown on the panel"
              )
              .setRequired(true)
        )

        .addStringOption(
          (option) =>
            option
              .setName("testing")
              .setDescription(
                "Which testing panel to send"
              )
              .setRequired(true)
              .addChoices(
                {
                  name:
                    "⚔️ Tier Testing",
                  value:
                    "normal",
                },
                {
                  name:
                    "👑 High Tier Testing",
                  value:
                    "high",
                },
                {
                  name:
                    "🔥 Both",
                  value:
                    "both",
                }
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("tester1")
              .setDescription(
                "Main tester role"
              )
              .setRequired(true)
        )

        .addRoleOption(
          (option) =>
            option
              .setName("tester2")
              .setDescription(
                "Additional tester role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("tester3")
              .setDescription(
                "Additional tester role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("tester4")
              .setDescription(
                "Additional tester role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("tester5")
              .setDescription(
                "Additional tester role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify1")
              .setDescription(
                "Role notified for normal tickets"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify2")
              .setDescription(
                "Role notified for normal tickets"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify3")
              .setDescription(
                "Role notified for normal tickets"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify4")
              .setDescription(
                "Role notified for normal tickets"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify5")
              .setDescription(
                "Role notified for normal tickets"
              )
        )

        // HIGH TIER ACCESS ROLES
        .addRoleOption(
          (option) =>
            option
              .setName("highrole1")
              .setDescription(
                "Role allowed to access high tier testing"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("highrole2")
              .setDescription(
                "Additional high tier access role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("highrole3")
              .setDescription(
                "Additional high tier access role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("highrole4")
              .setDescription(
                "Additional high tier access role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("highrole5")
              .setDescription(
                "Additional high tier access role"
              )
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
          "Add roles to UNION TIERS permissions"
        )

        .addStringOption(
          (option) =>
            option
              .setName("type")
              .setDescription(
                "What should the selected roles access?"
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
                    "🏆 Results",
                  value:
                    "results",
                },
                {
                  name:
                    "🎫 Ticket",
                  value:
                    "ticket",
                },
                {
                  name:
                    "👑 High Tier Test",
                  value:
                    "high_ticket",
                }
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("role1")
              .setDescription(
                "First role"
              )
              .setRequired(true)
        )

        .addRoleOption(
          (option) =>
            option
              .setName("role2")
              .setDescription(
                "Second role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("role3")
              .setDescription(
                "Third role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("role4")
              .setDescription(
                "Fourth role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("role5")
              .setDescription(
                "Fifth role"
              )
        )

        .addRoleOption(
          (option) =>
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
    // GENERATE ROLE
    // ==================================================

    commands.push(
      new SlashCommandBuilder()
        .setName("generaterole")
        .setDescription(
          "Generate all UNION TIERS kit tier roles"
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

        .addChannelOption(
          (option) =>
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

        .addStringOption(
          (option) =>
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

        .addChannelOption(
          (option) =>
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

        .addStringOption(
          (option) =>
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

        .addChannelOption(
          (option) =>
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

        .addStringOption(
          (option) =>
            option
              .setName("text")
              .setDescription(
                "Message to send"
              )
              .setRequired(true)
        )
    );

    // ==================================================
    // NORMAL RESULT
    // ==================================================

    commands.push(
      buildResultCommand({
        name:
          "result",
        description:
          "Post a normal tier testing result",
        previousTiers:
          NORMAL_PREVIOUS_TIERS,
        resultTiers:
          NORMAL_TIERS,
        testerCount:
          1,
        high:
          false,
      })
    );

    // ==================================================
    // HIGH RESULT
    // ==================================================

    commands.push(
      buildResultCommand({
        name:
          "highresults",
        description:
          "Post an HT3+ high tier testing result",
        previousTiers:
          ["LT3"],
        resultTiers:
          HIGH_TIERS,
        testerCount:
          2,
        high:
          true,
      })
    );

    // ==================================================
    // REGISTER
    // ==================================================

    const rest =
      new REST({
        version: "10",
      }).setToken(
        TOKEN
      );

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
        "✅ /addrole = Message / Results / Ticket / High Tier Test"
      );

      console.log(
        "✅ /generaterole = all kit tier roles"
      );

      console.log(
        "✅ Sword = Best of 6"
      );

      console.log(
        "✅ Other kits = Best of 3"
      );

      console.log(
        "✅ Default skin enabled"
      );

      console.log(
        "✅ High tier kit-specific LT3+ checking enabled"
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
        interaction.commandName ===
          "setup"
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

        const data =
          getGuildData(
            guild.id
          );

        const name =
          interaction.options.getString(
            "name"
          );

        const testing =
          interaction.options.getString(
            "testing"
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

        const highTierRoles = [
          "highrole1",
          "highrole2",
          "highrole3",
          "highrole4",
          "highrole5",
        ]
          .map((key) =>
            interaction.options.getRole(
              key
            )
          )
          .filter(Boolean);

        data.setupName =
          name;

        data.testerRoles =
          testerRoles.map(
            (role) => role.id
          );

        data.notifyRoles =
          notifyRoles.map(
            (role) => role.id
          );

        data.highTierRoles =
          highTierRoles.map(
            (role) => role.id
          );

        saveDatabase();

        const categories =
          await updateCategoryPermissions(
            guild,
            data
          );

        if (
          testing === "normal" ||
          testing === "both"
        ) {
          await interaction.channel.send(
            buildRequestPanel(
              data
            )
          );
        }

        if (
          testing === "high" ||
          testing === "both"
        ) {
          await interaction.channel.send(
            buildHighPanel(
              data
            )
          );
        }

        return interaction.reply({
          content:
            `✅ **${name}** setup complete!\n\n` +
            `🧪 Tester roles: **${testerRoles.length}**\n` +
            `🔔 Notify roles: **${notifyRoles.length}**\n` +
            `👑 High-tier access roles: **${highTierRoles.length}**\n\n` +
            `📁 Normal category: **${categories.normal.name}**\n` +
            `👑 High category: **${categories.high.name}**\n\n` +
            `⚔️ Sword: **Best of 6**\n` +
            `🎮 Other kits: **Best of 3**\n\n` +
            `🏆 Results roles can use both **/result** and **/highresults**.\n` +
            `🎫 Ticket roles can view/close normal tickets.\n` +
            `👑 High Tier Test roles can create/view/close high tickets.`,
          ephemeral: true,
        });
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

        const result =
          await generateAllTierRoles(
            interaction.guild
          );

        return interaction.editReply({
          content:
            `✅ **Tier roles generated!**\n\n` +
            `🟢 Created: **${result.created}**\n` +
            `🔵 Already existed: **${result.existing}**\n` +
            `🔴 Failed: **${result.failed}**\n\n` +
            `Roles are generated for every kit:\n` +
            `LT5 → HT5 → LT4 → HT4 → LT3 → HT3 → LT2 → HT2 → LT1 → HT1`,
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

        const data =
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

        if (
          type ===
          "message"
        ) {
          for (const role of roles) {
            if (
              !data.messageRoles.includes(
                role.id
              )
            ) {
              data.messageRoles.push(
                role.id
              );
            }
          }

          saveDatabase();

          return interaction.reply({
            content:
              `✅ Added **${roles.length}** role(s) to **/message**.`,
            ephemeral: true,
          });
        }

        // RESULTS = BOTH RESULT COMMANDS
        if (
          type ===
          "results"
        ) {
          for (const role of roles) {
            if (
              !data.resultRoles.includes(
                role.id
              )
            ) {
              data.resultRoles.push(
                role.id
              );
            }
          }

          saveDatabase();

          return interaction.reply({
            content:
              `✅ Added **${roles.length}** role(s) to **/result AND /highresults**.`,
            ephemeral: true,
          });
        }

        // NORMAL TICKETS
        if (
          type ===
          "ticket"
        ) {
          for (const role of roles) {
            if (
              !data.ticketRoles.includes(
                role.id
              )
            ) {
              data.ticketRoles.push(
                role.id
              );
            }
          }

          const categories =
            await updateCategoryPermissions(
              interaction.guild,
              data
            );

          saveDatabase();

          return interaction.reply({
            content:
              `✅ Added **${roles.length}** role(s) to normal **Ticket** access.\n\n` +
              `🎫 They can view normal player tickets and close them.`,
            ephemeral: true,
          });
        }

        // HIGH TICKETS
        if (
          type ===
          "high_ticket"
        ) {
          for (const role of roles) {
            if (
              !data.highTicketRoles.includes(
                role.id
              )
            ) {
              data.highTicketRoles.push(
                role.id
              );
            }
          }

          await updateCategoryPermissions(
            interaction.guild,
            data
          );

          saveDatabase();

          return interaction.reply({
            content:
              `✅ Added **${roles.length}** role(s) to **High Tier Test** access.\n\n` +
              `👑 They can create high-tier tickets.\n` +
              `👑 They can view other high-tier tickets.\n` +
              `👑 They can close high-tier tickets.`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            "❌ Invalid role type.",
          ephemeral: true,
        });
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
        const data =
          getGuildData(
            interaction.guild.id
          );

        if (
          !canUseResults(
            interaction.member,
            data
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
              "❌ Invalid normal tier.",
            ephemeral: true,
          });
        }

        if (
          !getKit(kitKey)
        ) {
          return interaction.reply({
            content:
              "❌ Invalid kit.",
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

        const embed =
          buildResultEmbed({
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

        // AUTOMATIC KIT TIER ROLE
        const roleResult =
          await assignTierRole(
            interaction.guild,
            user.id,
            kitKey,
            tier
          );

        return interaction.reply({
          content:
            `✅ **Tier result posted!**\n\n` +
            `👤 **Player:** ${user}\n` +
            `🎯 **Kit:** ${getKit(kitKey).name}\n` +
            `📊 **Previous Tier:** ${previous}\n` +
            `🏆 **Earned Rank:** ${tier}\n` +
            `${
              isDemotion(
                previous,
                tier
              )
                ? "⚠️ **Status:** DEMOTED\n"
                : isPromotion(
                    previous,
                    tier
                  )
                ? "🎉 **Status:** PROMOTED\n"
                : isSameTier(
                    previous,
                    tier
                  )
                ? "🔄 **Status:** RETAINED\n"
                : ""
            }` +
            `${
              roleResult.success
                ? `🎖️ **Role:** ${roleResult.role}`
                : `⚠️ **Role:** ${roleResult.reason}`
            }`,
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
        const data =
          getGuildData(
            interaction.guild.id
          );

        if (
          !canUseResults(
            interaction.member,
            data
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

        if (
          !getKit(kitKey)
        ) {
          return interaction.reply({
            content:
              "❌ Invalid kit.",
            ephemeral: true,
          });
        }

        if (
          !score1 ||
          !score2
        ) {
          return interaction.reply({
            content:
              "❌ Both tester scores are required.",
            ephemeral: true,
          });
        }

        const embed =
          buildHighResultEmbed({
            interaction,
            user,
            gmtag,
            kitKey,
            tier,
            tester1,
            score1,
            tester2,
            score2,
            skin,
          });

        await interaction.channel.send({
          embeds: [embed],
        });

        // FAILED HT3 = NO ROLE CHANGE
        if (
          tier ===
          "FAILED_HT3"
        ) {
          return interaction.reply({
            content:
              `❌ **HT3 test failed.**\n\n` +
              `👤 **Player:** ${user}\n` +
              `🎯 **Kit:** ${getKit(kitKey).name}\n` +
              `🏆 **Result:** Failed HT3 Test\n\n` +
              `The player's existing tier role was not changed.`,
            ephemeral: true,
          });
        }

        // PASSED = ASSIGN HIGH ROLE
        const roleResult =
          await assignTierRole(
            interaction.guild,
            user.id,
            kitKey,
            tier
          );

        return interaction.reply({
          content:
            `👑 **High tier result posted!**\n\n` +
            `👤 **Player:** ${user}\n` +
            `🎯 **Kit:** ${getKit(kitKey).name}\n` +
            `🏆 **Passed HT3 Test**\n` +
            `🏆 **Earned Rank:** ${tier}\n` +
            `${
              roleResult.success
                ? `🎖️ **Role:** ${roleResult.role}`
                : `⚠️ **Role:** ${roleResult.reason}`
            }`,
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

        const kit =
          getKit(kitKey);

        if (!kit) {
          return interaction.reply({
            content:
              "❌ That kit no longer exists. Please run `/setup` again.",
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
            expires:
              Date.now() +
              5 * 60 * 1000,
          }
        );

        return interaction.reply({
          content:
            `${kit.emoji} **${kit.name} selected.**\n\n` +
            `⚔️ **Format:** ${kit.format}\n\n` +
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

        const kitKey =
          pending.kit;

        const region =
          interaction.values[0];

        const result =
          await createTestingTicket(
            interaction,
            kitKey,
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
              `⚠️ You already have an active ticket:\n${result.existing}`,
            components: [],
          });
        }

        return interaction.update({
          content:
            `✅ **Your testing ticket has been created!**\n\n` +
            `🎯 **Kit:** ${getKit(kitKey).emoji} ${getKit(kitKey).name}\n` +
            `⚔️ **Format:** ${getKit(kitKey).format}\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n\n` +
            `🔒 The ticket is private.\n` +
            `🧪 The tester decides where the test happens.\n\n` +
            `🎫 ${result.ticket}`,
          components: [],
        });
      }

      // ==================================================
      // START HIGH TIER TEST
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "start_high_tier_test"
      ) {
        const data =
          getGuildData(
            interaction.guild.id
          );

        const eligible =
          getEligibleHighKits(
            interaction.member
          );

        const staff =
          canStartHighTicketAsStaff(
            interaction.member,
            data
          );

        if (
          !staff &&
          eligible.length === 0
        ) {
          return interaction.reply({
            content:
              `❌ **You cannot access High Tier Testing yet.**\n\n` +
              `You need **LT3 or higher** in at least one kit.\n\n` +
              `Example:\n` +
              `🏆 **Dia SMP LT3**`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            `👑 **High Tier Testing**\n\n` +
            `${
              staff
                ? "Staff access: you can select any kit."
                : "You can only select kits where you have LT3 or higher."
            }\n\n` +
            `Select your kit:`,
          components: [
            new ActionRowBuilder().addComponents(
              buildHighKitMenu(
                interaction.member,
                data
              )
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
        const data =
          getGuildData(
            interaction.guild.id
          );

        const kitKey =
          interaction.values[0];

        const kit =
          getKit(kitKey);

        if (!kit) {
          return interaction.update({
            content:
              "❌ Invalid kit. Please run `/setup` again.",
            components: [],
          });
        }

        const staff =
          canStartHighTicketAsStaff(
            interaction.member,
            data
          );

        if (
          !staff &&
          !hasHighTierForKit(
            interaction.member,
            kitKey
          )
        ) {
          return interaction.update({
            content:
              `❌ You cannot high-test **${kit.name}**.\n\n` +
              `You need the **${kit.name} LT3** role or higher for this specific kit.`,
            components: [],
          });
        }

        if (!client.pendingHighRequests) {
          client.pendingHighRequests =
            new Map();
        }

        const requestKey =
          `${interaction.guild.id}:${interaction.user.id}`;

        client.pendingHighRequests.set(
          requestKey,
          {
            kit: kitKey,
            expires:
              Date.now() +
              5 * 60 * 1000,
          }
        );

        return interaction.update({
          content:
            `👑 **${kit.emoji} ${kit.name} High Tier Test selected.**\n\n` +
            `⚔️ **Format:** ${kit.format}\n\n` +
            `Now select your region:`,
          components: [
            new ActionRowBuilder().addComponents(
              buildRegionMenu(
                "high_request_region"
              )
            ),
          ],
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
          client.pendingHighRequests?.get(
            requestKey
          );

        if (
          !pending ||
          pending.expires <
            Date.now()
        ) {
          client.pendingHighRequests?.delete(
            requestKey
          );

          return interaction.update({
            content:
              "❌ Your high-tier request expired.",
            components: [],
          });
        }

        const kitKey =
          pending.kit;

        const region =
          interaction.values[0];

        const result =
          await createHighTestingTicket(
            interaction,
            kitKey,
            region
          );

        client.pendingHighRequests.delete(
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
              `⚠️ You already have an active high-tier ticket:\n${result.existing}`,
            components: [],
          });
        }

        return interaction.update({
          content:
            `👑 **High Tier Ticket Created!**\n\n` +
            `🎯 **Kit:** ${getKit(kitKey).emoji} ${getKit(kitKey).name}\n` +
            `⚔️ **Format:** ${getKit(kitKey).format}\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n\n` +
            `🔒 The ticket is private.\n` +
            `👑 High-tier staff and testers can access it.\n\n` +
            `🎫 ${result.ticket}`,
          components: [],
        });
      }

      // ==================================================
      // NORMAL TESTING INFO
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "ticket_info:"
        )
      ) {
        const data =
          getGuildData(
            interaction.guild.id
          );

        if (
          !canViewNormalTickets(
            interaction.member,
            data
          )
        ) {
          return interaction.reply({
            content:
              "❌ You cannot use ticket controls.",
            ephemeral: true,
          });
        }

        const parts =
          (
            interaction.channel.topic ||
            ""
          ).split(":");

        if (
          parts[0] !==
          "TIERTEST"
        ) {
          return interaction.reply({
            content:
              "❌ Invalid ticket.",
            ephemeral: true,
          });
        }

        const playerId =
          parts[1];

        const kitKey =
          parts[2];

        const region =
          parts[3];

        const kit =
          getKit(kitKey);

        if (!kit) {
          return interaction.reply({
            content:
              "❌ This ticket has an invalid kit.",
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            `📋 **Tier Test Information**\n\n` +
            `👤 **Player:** <@${playerId}>\n` +
            `🎯 **Kit:** ${kit.emoji} ${kit.name}\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n` +
            `⚔️ **Format:** ${kit.format}\n\n` +
            getTestingInstructions(
              kitKey,
              false
            ),
          ephemeral: true,
        });
      }

      // ==================================================
      // HIGH TESTING INFO
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "high_ticket_info:"
        )
      ) {
        const data =
          getGuildData(
            interaction.guild.id
          );

        if (
          !canViewHighTickets(
            interaction.member,
            data
          )
        ) {
          return interaction.reply({
            content:
              "❌ You cannot use high-ticket controls.",
            ephemeral: true,
          });
        }

        const parts =
          (
            interaction.channel.topic ||
            ""
          ).split(":");

        if (
          parts[0] !==
          "HIGHTEST"
        ) {
          return interaction.reply({
            content:
              "❌ Invalid high ticket.",
            ephemeral: true,
          });
        }

        const playerId =
          parts[1];

        const kitKey =
          parts[2];

        const region =
          parts[3];

        const kit =
          getKit(kitKey);

        if (!kit) {
          return interaction.reply({
            content:
              "❌ This high ticket has an invalid kit.",
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            `👑 **HIGH TIER TEST INFORMATION**\n\n` +
            `👤 **Player:** <@${playerId}>\n` +
            `🎯 **Kit:** ${kit.emoji} ${kit.name}\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n` +
            `⚔️ **Format:** ${kit.format}\n\n` +
            getTestingInstructions(
              kitKey,
              true
            ),
          ephemeral: true,
        });
      }

      // ==================================================
      // CLOSE NORMAL TICKET
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "close_ticket:"
        )
      ) {
        const data =
          getGuildData(
            interaction.guild.id
          );

        if (
          !canViewNormalTickets(
            interaction.member,
            data
          )
        ) {
          return interaction.reply({
            content:
              "❌ Only testers or configured Ticket roles can close tickets.",
            ephemeral: true,
          });
        }

        await interaction.reply({
          content:
            "🔒 Closing ticket in **3 seconds**...",
        });

        setTimeout(
          () => {
            interaction.channel
              ?.delete()
              .catch(() => {});
          },
          3000
        );

        return;
      }

      // ==================================================
      // CLOSE HIGH TICKET
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId.startsWith(
          "close_high_ticket:"
        )
      ) {
        const data =
          getGuildData(
            interaction.guild.id
          );

        if (
          !canViewHighTickets(
            interaction.member,
            data
          )
        ) {
          return interaction.reply({
            content:
              "❌ Only testers or configured High Tier Test roles can close high tickets.",
            ephemeral: true,
          });
        }

        await interaction.reply({
          content:
            "🔒 Closing high-tier ticket in **3 seconds**...",
        });

        setTimeout(
          () => {
            interaction.channel
              ?.delete()
              .catch(() => {});
          },
          3000
        );

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
        .setDescription(
          message
        )
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
        .setDescription(
          message
        )
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
