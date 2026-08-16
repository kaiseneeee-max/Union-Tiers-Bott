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
      const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

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

      // tier_testing or high_tier_testing
      testingType: "tier_testing",

      testerRoles: [],
      notifyRoles: [],
      messageRoles: [],
      resultRoles: [],

      // Roles that can view/close tickets
      ticketRoles: [],

      // Kit/tier role IDs
      tierRoles: {},

      ticketCategoryId: "",

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

  if (!data.tierRoles || typeof data.tierRoles !== "object") {
    data.tierRoles = {};
  }

  if (typeof data.ticketCategoryId !== "string") {
    data.ticketCategoryId = "";
  }

  if (
    data.testingType !== "tier_testing" &&
    data.testingType !== "high_tier_testing"
  ) {
    data.testingType = "tier_testing";
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
  "LT3",
  "HT4",
  "LT4",
  "HT5",
  "LT5",
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
//
// Your NameMC skin:
// https://namemc.com/skin/6cc743790519ce59
//
// This is a large NameMC body render.
//
// ======================================================

const DEFAULT_SKIN =
  "https://s.namemc.com/3d/skin/body.png?id=6cc743790519ce59&model=classic&width=1024&height=1024";

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

function isPromotion(previous, current) {
  if (!previous || !current || previous === "No Record") {
    return false;
  }

  if (
    !TIER_RANK[previous] ||
    !TIER_RANK[current]
  ) {
    return false;
  }

  return (
    TIER_RANK[current] >
    TIER_RANK[previous]
  );
}

function makeChannelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function cleanText(
  value,
  fallback = "Not provided"
) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value).trim();
}

// ======================================================
// TIER ROLE NAME
// ======================================================

function getTierRoleName(
  kitKey,
  tier
) {
  const kit = getKit(kitKey);

  return `${kit.name} ${tier}`;
}

// ======================================================
// TIER ROLE KEY
// ======================================================

function getTierRoleKey(
  kitKey,
  tier
) {
  return `${kitKey}:${tier}`;
}

// ======================================================
// GENERATE TIER ROLES
// ======================================================

async function generateTierRoles(
  guild,
  guildData
) {
  const created = [];
  const existing = [];

  for (const [kitKey, kit] of Object.entries(KITS)) {
    for (const tier of ALL_TIERS) {
      const key = getTierRoleKey(
        kitKey,
        tier
      );

      const roleName = getTierRoleName(
        kitKey,
        tier
      );

      let role = null;

      const savedRoleId =
        guildData.tierRoles[key];

      if (savedRoleId) {
        role =
          guild.roles.cache.get(
            savedRoleId
          );
      }

      if (!role) {
        role =
          guild.roles.cache.find(
            (r) =>
              r.name === roleName
          );
      }

      if (role) {
        guildData.tierRoles[key] =
          role.id;

        existing.push(roleName);

        continue;
      }

      try {
        role =
          await guild.roles.create({
            name: roleName,
            reason:
              "Union Tiers automatic tier role generation",
          });

        guildData.tierRoles[key] =
          role.id;

        created.push(roleName);
      } catch (error) {
        console.error(
          `❌ Failed to create ${roleName}:`,
          error
        );
      }
    }
  }

  saveDatabase();

  return {
    created,
    existing,
  };
}

// ======================================================
// GET TIER ROLE
// ======================================================

function getTierRole(
  guild,
  guildData,
  kitKey,
  tier
) {
  const key = getTierRoleKey(
    kitKey,
    tier
  );

  const roleId =
    guildData.tierRoles[key];

  if (!roleId) {
    return null;
  }

  return (
    guild.roles.cache.get(roleId) ||
    null
  );
}

// ======================================================
// PLAYER HAS TIER ROLE
// ======================================================

function playerHasTier(
  member,
  guildData,
  kitKey,
  tier
) {
  const role =
    getTierRole(
      member.guild,
      guildData,
      kitKey,
      tier
    );

  if (!role) {
    return false;
  }

  return member.roles.cache.has(
    role.id
  );
}

// ======================================================
// GIVE EARNED TIER ROLE
// ======================================================

async function giveEarnedTierRole(
  member,
  guildData,
  kitKey,
  tier
) {
  const earnedRole =
    getTierRole(
      member.guild,
      guildData,
      kitKey,
      tier
    );

  if (!earnedRole) {
    return {
      success: false,
      reason:
        "Tier role does not exist. Run /generaterole first.",
    };
  }

  // Remove every tier role for this kit
  for (const possibleTier of ALL_TIERS) {
    const oldRole =
      getTierRole(
        member.guild,
        guildData,
        kitKey,
        possibleTier
      );

    if (
      oldRole &&
      member.roles.cache.has(
        oldRole.id
      ) &&
      oldRole.id !== earnedRole.id
    ) {
      await member.roles
        .remove(oldRole)
        .catch(() => {});
    }
  }

  await member.roles
    .add(
      earnedRole
    )
    .catch(() => {});

  return {
    success:
      member.roles.cache.has(
        earnedRole.id
      ),
    role: earnedRole,
  };
}

// ======================================================
// GET ALL KIT LT3 ROLES PLAYER HAS
// ======================================================

function getPlayerLT3Kits(
  member,
  guildData
) {
  const kits = [];

  for (const [
    kitKey,
    kit,
  ] of Object.entries(KITS)) {
    const role =
      getTierRole(
        member.guild,
        guildData,
        kitKey,
        "LT3"
      );

    if (
      role &&
      member.roles.cache.has(
        role.id
      )
    ) {
      kits.push(kitKey);
    }
  }

  return kits;
}

// ======================================================
// TESTER PERMISSION
// ======================================================

function isTester(
  member,
  guildData
) {
  if (!member) {
    return false;
  }

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  return guildData.testerRoles.some(
    (roleId) =>
      member.roles.cache.has(
        roleId
      )
  );
}

// ======================================================
// TICKET PERMISSION
// ======================================================

function canManageTickets(
  member,
  guildData
) {
  if (!member) {
    return false;
  }

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  if (
    isTester(
      member,
      guildData
    )
  ) {
    return true;
  }

  return guildData.ticketRoles.some(
    (roleId) =>
      member.roles.cache.has(
        roleId
      )
  );
}

// ======================================================
// RESULT PERMISSION
// ======================================================
//
// Result roles can use BOTH /result and /highresults.
// ======================================================

function canUseResults(
  member,
  guildData
) {
  if (!member) {
    return false;
  }

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  if (
    isTester(
      member,
      guildData
    )
  ) {
    return true;
  }

  return guildData.resultRoles.some(
    (roleId) =>
      member.roles.cache.has(
        roleId
      )
  );
}

// ======================================================
// MESSAGE PERMISSION
// ======================================================

function canUseMessage(
  member,
  guildData
) {
  if (!member) {
    return false;
  }

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  return guildData.messageRoles.some(
    (roleId) =>
      member.roles.cache.has(
        roleId
      )
  );
}

// ======================================================
// HIGH TIER ACCESS
// ======================================================
//
// The COMMAND USER needs result/tester permission.
// The PLAYER being tested MUST have the correct
// <KIT> LT3 role.
//
// ======================================================

function canUseHighResultsForPlayer(
  commandMember,
  playerMember,
  guildData,
  kitKey
) {
  if (
    !canUseResults(
      commandMember,
      guildData
    )
  ) {
    return false;
  }

  if (!playerMember) {
    return false;
  }

  return playerHasTier(
    playerMember,
    guildData,
    kitKey,
    "LT3"
  );
}

// ======================================================
// TESTING INSTRUCTIONS
// ======================================================

function getTestingInstructions(
  kitKey
) {
  const kit =
    getKit(kitKey);

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
// SKIN URL
// ======================================================
//
// Supports:
// - NameMC skin URL
// - NameMC skin ID
// - normal image URL
//
// ======================================================

function getSkinUrl(
  skinInput
) {
  if (
    !skinInput ||
    skinInput.trim() === ""
  ) {
    return DEFAULT_SKIN;
  }

  const value =
    skinInput.trim();

  // NameMC skin page
  const nameMcMatch =
    value.match(
      /namemc\.com\/skin\/([a-zA-Z0-9]+)/
    );

  if (nameMcMatch) {
    const skinId =
      nameMcMatch[1];

    return (
      `https://s.namemc.com/3d/skin/body.png` +
      `?id=${encodeURIComponent(
        skinId
      )}` +
      `&model=classic` +
      `&width=1024` +
      `&height=1024`
    );
  }

  // Raw NameMC skin ID
  if (
    /^[a-zA-Z0-9]{10,64}$/.test(
      value
    ) &&
    !value.includes("/")
  ) {
    return (
      `https://s.namemc.com/3d/skin/body.png` +
      `?id=${encodeURIComponent(
        value
      )}` +
      `&model=classic` +
      `&width=1024` +
      `&height=1024`
    );
  }

  // Normal image URL
  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return DEFAULT_SKIN;
}

// ======================================================
// REQUEST KIT MENU
// ======================================================

function buildKitMenu(
  guild,
  userId,
  highTier = false
) {
  const guildData =
    getGuildData(
      guild.id
    );

  let entries =
    Object.entries(KITS);

  // High tier:
  // ONLY show kits where the PLAYER has LT3.
  if (highTier) {
    const member =
      guild.members.cache.get(
        userId
      );

    if (member) {
      entries =
        entries.filter(
          ([kitKey]) =>
            playerHasTier(
              member,
              guildData,
              kitKey,
              "LT3"
            )
        );
    } else {
      entries = [];
    }
  }

  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        highTier
          ? "request_kit:high"
          : "request_kit:normal"
      )
      .setPlaceholder(
        highTier
          ? "👑 Select a kit you have LT3 in"
          : "🎯 Select a kit"
      );

  if (entries.length === 0) {
    menu.addOptions({
      label: highTier
        ? "No eligible kits"
        : "No kits available",
      value: "none",
      description:
        highTier
          ? "You need an LT3 role in a kit first."
          : "No kits are configured.",
    });

    return menu;
  }

  menu.addOptions(
    entries.map(
      ([value, kit]) => ({
        label: kit.name,
        value,
        emoji: kit.emoji,
        description:
          highTier
            ? `LT3 required • ${kit.format}`
            : kit.format,
      })
    )
  );

  return menu;
}

// ======================================================
// REGION MENU
// ======================================================

function buildRegionMenu(
  highTier = false
) {
  return new StringSelectMenuBuilder()
    .setCustomId(
      highTier
        ? "request_region:high"
        : "request_region:normal"
    )
    .setPlaceholder(
      "🌎 Select your region"
    )
    .addOptions(
      Object.entries(
        REGIONS
      ).map(
        ([
          value,
          region,
        ]) => ({
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
// REQUEST PANEL
// ======================================================

function buildRequestPanel(
  guildData,
  guild
) {
  const highTier =
    guildData.testingType ===
    "high_tier_testing";

  const embed =
    new EmbedBuilder()
      .setTitle(
        `${highTier ? "👑" : "🎟️"} ${guildData.setupName}`
      )
      .setDescription(
        highTier
          ? `**HIGH TIER TESTING**\n\n` +
              `You must already have an **LT3 role** in the kit you want to test.\n\n` +
              `**1.** Select a kit where you have LT3\n` +
              `**2.** Select your region\n` +
              `**3.** A private high-tier testing ticket will be created\n` +
              `**4.** Configured testers can access it\n\n` +
              `🔒 **Your ticket is private.**`
          : `**TIER TESTING**\n\n` +
              `**1.** Select your kit\n` +
              `**2.** Select your region\n` +
              `**3.** A private testing ticket will be created\n` +
              `**4.** Configured testers can access it\n\n` +
              `🔒 **Your ticket is private.**`
      )
      .setColor(
        highTier
          ? 0xff3b30
          : 0xffc107
      );

  return {
    embeds: [embed],

    components: [
      new ActionRowBuilder().addComponents(
        buildKitMenu(
          guild,
          null,
          false
        )
      ),
    ],
  };
}

// ======================================================
// SEND USER-SPECIFIC PANEL
// ======================================================

async function sendTestingPanel(
  channel,
  guild,
  guildData
) {
  const highTier =
    guildData.testingType ===
    "high_tier_testing";

  const embed =
    new EmbedBuilder()
      .setTitle(
        `${highTier ? "👑" : "🎟️"} ${guildData.setupName}`
      )
      .setDescription(
        highTier
          ? `👑 **HIGH TIER TESTING**\n\n` +
              `You can only select a kit where you already have **LT3**.\n\n` +
              `Select your kit below.`
          : `🎟️ **TIER TESTING**\n\n` +
              `Select the kit you want to test below.`
      )
      .setColor(
        highTier
          ? 0xff3b30
          : 0xffc107
      );

  await channel.send({
    embeds: [embed],

    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(
            highTier
              ? "open_kit:high"
              : "open_kit:normal"
          )
          .setPlaceholder(
            highTier
              ? "👑 Select your LT3 kit"
              : "🎯 Select a kit"
          )
          .addOptions(
            Object.entries(
              KITS
            ).map(
              ([
                value,
                kit,
              ]) => ({
                label:
                  kit.name,
                value,
                emoji:
                  kit.emoji,
                description:
                  kit.format,
              })
            )
          )
      ),
    ],
  });
}

// ======================================================
// TICKET CATEGORY
// ======================================================

async function getOrCreateTicketCategory(
  guild,
  guildData
) {
  let category;

  if (
    guildData.ticketCategoryId
  ) {
    category =
      guild.channels.cache.get(
        guildData.ticketCategoryId
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

      type:
        ChannelType.GuildCategory,

      permissionOverwrites: [
        {
          id:
            guild.roles
              .everyone.id,

          deny: [
            PermissionFlagsBits.ViewChannel,
          ],
        },

        ...guildData.testerRoles.map(
          (roleId) => ({
            id: roleId,

            allow: [
              PermissionFlagsBits.ViewChannel,
            ],
          })
        ),

        ...guildData.ticketRoles.map(
          (roleId) => ({
            id: roleId,

            allow: [
              PermissionFlagsBits.ViewChannel,
            ],
          })
        ),
      ],
    });

  guildData.ticketCategoryId =
    category.id;

  saveDatabase();

  return category;
}

// ======================================================
// UPDATE CATEGORY PERMISSIONS
// ======================================================

async function updateCategoryPermissions(
  guild,
  guildData,
  category
) {
  await category.permissionOverwrites
    .edit(
      guild.roles.everyone.id,
      {
        ViewChannel: false,
      }
    )
    .catch(() => {});

  for (const roleId of [
    ...guildData.testerRoles,
    ...guildData.ticketRoles,
  ]) {
    await category.permissionOverwrites
      .edit(
        roleId,
        {
          ViewChannel: true,
        }
      )
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
// CREATE TICKET
// ======================================================

async function createTestingTicket(
  interaction,
  kitKey,
  region,
  highTier = false
) {
  const guild =
    interaction.guild;

  const user =
    interaction.user;

  const guildData =
    getGuildData(
      guild.id
    );

  const kit =
    getKit(kitKey);

  const regionData =
    getRegion(region);

  // HIGH TIER MUST HAVE LT3
  if (highTier) {
    const member =
      await guild.members
        .fetch(user.id)
        .catch(() => null);

    if (
      !member ||
      !playerHasTier(
        member,
        guildData,
        kitKey,
        "LT3"
      )
    ) {
      return {
        error:
          `❌ You cannot open a high-tier ticket for **${kit.name}** because you do not have **${kit.name} LT3**.`,
      };
    }
  }

  const category =
    await getOrCreateTicketCategory(
      guild,
      guildData
    );

  await updateCategoryPermissions(
    guild,
    guildData,
    category
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
      id:
        guild.roles
          .everyone.id,

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

    ...guildData.testerRoles.map(
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

    ...guildData.ticketRoles.map(
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
        `${
          highTier
            ? "high"
            : "test"
        }-${kitKey}-${user.username}`
      ),

      type:
        ChannelType.GuildText,

      parent:
        category.id,

      topic:
        `TIERTEST:${user.id}:${kitKey}:${region}:${highTier ? "high" : "normal"}`,

      permissionOverwrites:
        overwrites,
    });

  // ====================================================
  // BUTTONS
  // ====================================================

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        `close_ticket:${user.id}`
      )
      .setLabel(
        "Close Ticket"
      )
      .setEmoji("🔒")
      .setStyle(
        ButtonStyle.Danger
      );

  const infoButton =
    new ButtonBuilder()
      .setCustomId(
        `ticket_info:${user.id}`
      )
      .setLabel(
        "Testing Info"
      )
      .setEmoji("📋")
      .setStyle(
        ButtonStyle.Secondary
      );

  // ====================================================
  // ROLE NOTIFICATIONS
  // ====================================================

  const notifyMentions =
    guildData.notifyRoles
      .filter(
        (roleId) =>
          guild.roles.cache.has(
            roleId
          )
      )
      .map(
        (roleId) =>
          `<@&${roleId}>`
      );

  const testerMentions =
    guildData.testerRoles
      .filter(
        (roleId) =>
          guild.roles.cache.has(
            roleId
          )
      )
      .map(
        (roleId) =>
          `<@&${roleId}>`
      );

  const ticketMentions =
    guildData.ticketRoles
      .filter(
        (roleId) =>
          guild.roles.cache.has(
            roleId
          )
      )
      .map(
        (roleId) =>
          `<@&${roleId}>`
      );

  const roleMentions = [
    ...testerMentions,
    ...ticketMentions,
    ...notifyMentions,
  ];

  const uniqueRoleMentions =
    [
      ...new Set(
        roleMentions
      ),
    ];

  const mentionContent =
    uniqueRoleMentions.length >
    0
      ? uniqueRoleMentions.join(
          " "
        )
      : "";

  // ====================================================
  // TICKET EMBED
  // ====================================================

  const ticketEmbed =
    new EmbedBuilder()
      .setTitle(
        `${highTier ? "👑" : kit.emoji} ${kit.name} ${
          highTier
            ? "High Tier"
            : "Tier"
        } Test`
      )
      .setDescription(
        `👤 **Player:** <@${user.id}>\n` +
          `🎮 **Discord:** ${user.tag}\n` +
          `${regionData.emoji} **Region:** ${regionData.name}\n` +
          `⚔️ **Format:** ${kit.format}\n\n` +
          getTestingInstructions(
            kitKey
          )
      )
      .setColor(
        highTier
          ? 0xff3b30
          : 0xffc107
      )
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
      `🎫 **New ${
        highTier
          ? "High Tier"
          : "Tier"
      } Test Ticket**\n` +
      `<@${user.id}> has opened a ${
        kit.emoji
      } **${kit.name}** test.`,

    embeds: [
      ticketEmbed,
    ],

    allowedMentions: {
      users: [user.id],

      roles:
        uniqueRoleMentions.map(
          (mention) =>
            mention.replace(
              /<@&|>/g,
              ""
            )
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
  testerCount,
}) {
  const command =
    new SlashCommandBuilder()
      .setName(name)
      .setDescription(
        description
      )

      // USER
      .addUserOption(
        (option) =>
          option
            .setName("user")
            .setDescription(
              "Player who was tested"
            )
            .setRequired(
              true
            )
      )

      // GAMERTAG
      .addStringOption(
        (option) =>
          option
            .setName("gmtag")
            .setDescription(
              "Minecraft gamertag"
            )
            .setRequired(
              true
            )
      )

      // REGION
      .addStringOption(
        (option) =>
          option
            .setName("region")
            .setDescription(
              "Player region"
            )
            .setRequired(
              true
            )
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

      // PREVIOUS
      .addStringOption(
        (option) =>
          option
            .setName(
              "previous"
            )
            .setDescription(
              "Player's previous tier"
            )
            .setRequired(
              true
            )
            .addChoices(
              ...previousTiers.map(
                (tier) => ({
                  name:
                    tier,
                  value:
                    tier,
                })
              )
            )
      )

      // TIER
      .addStringOption(
        (option) =>
          option
            .setName(
              "tier"
            )
            .setDescription(
              "Earned tier"
            )
            .setRequired(
              true
            )
            .addChoices(
              ...resultTiers.map(
                (tier) => ({
                  name:
                    tier,
                  value:
                    tier,
                })
              )
            )
      );

  // TESTER 1
  command.addUserOption(
    (option) =>
      option
        .setName(
          "tester1"
        )
        .setDescription(
          "Tester"
        )
        .setRequired(
          true
        )
  );

  // SCORE 1
  command.addStringOption(
    (option) =>
      option
        .setName(
          "score1"
        )
        .setDescription(
          "Tester score, e.g. 2-1"
        )
        .setRequired(
          true
        )
  );

  // HIGH RESULT TESTER 2
  if (
    testerCount === 2
  ) {
    command.addUserOption(
      (option) =>
        option
          .setName(
            "tester2"
          )
          .setDescription(
            "Second tester"
          )
          .setRequired(
            true
          )
    );

    command.addStringOption(
      (option) =>
        option
          .setName(
            "score2"
          )
          .setDescription(
            "Second tester score"
          )
          .setRequired(
            true
          )
    );
  }

  // KIT
  command.addStringOption(
    (option) =>
      option
        .setName("kit")
        .setDescription(
          "Kit tested"
        )
        .setRequired(
          true
        )
        .addChoices(
          ...Object.entries(
            KITS
          ).map(
            ([
              value,
              kit,
            ]) => ({
              name:
                `${kit.emoji} ${kit.name}`,
              value,
            })
          )
        )
  );

  // SKIN
  command.addStringOption(
    (option) =>
      option
        .setName("skin")
        .setDescription(
          "Optional NameMC skin URL or skin ID"
        )
        .setRequired(
          false
        )
  );

  return command;
}

// ======================================================
// RESULT EMBED
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
  tester2,
  score2,
  skin,
}) {
  const kit =
    getKit(kitKey);

  const regionData =
    getRegion(region);

  let statusText;

  if (
    previous !==
      "No Record" &&
    previous !== tier &&
    isPromotion(
      previous,
      tier
    )
  ) {
    statusText =
      `🏆 **EARNED RANK ${tier}**`;
  } else if (
    previous === tier
  ) {
    statusText =
      `🔄 **RETAINED RANK ${tier}**`;
  } else {
    statusText =
      `🏆 **EARNED RANK ${tier}**`;
  }

  const finalScore1 =
    cleanText(score1);

  const finalScore2 =
    tester2
      ? cleanText(score2)
      : "";

  let testerSection =
    `🧪 **TESTER & SCORE**\n\n` +
    `👤 **Tester:** ${tester1}\n` +
    `⚔️ **Score:** **${finalScore1}**\n`;

  if (tester2) {
    testerSection +=
      `\n👤 **Tester 2:** ${tester2}\n` +
      `⚔️ **Score 2:** **${finalScore2}**\n`;
  }

  const description =
    `👤 **Player:** ${user}\n` +
    `🎮 **GMTAG:** \`${gmtag}\`\n` +
    `${regionData.emoji} **Region:** ${regionData.name}\n\n` +
    `📊 **Previous Tier:** **${previous}**\n\n` +
    `# ${statusText}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    testerSection +
    `\n━━━━━━━━━━━━━━━━━━━━`;

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
          ? 0xff3b30
          : 0xffc107
      )

      .addFields(
        {
          name:
            "🎯 Kit",
          value:
            `${kit.emoji} **${kit.name}**`,
          inline:
            false,
        },
        {
          name:
            "🏆 Earned Rank",
          value:
            `**${kit.name} ${tier}**`,
          inline:
            false,
        },
        {
          name:
            "⚔️ Format",
          value:
            `**${kit.format}**`,
          inline:
            false,
        }
      )

      .setFooter({
        text:
          `${interaction.guild.name} • Union Tier Testing`,
      })

      .setTimestamp();

  // LARGE SKIN IMAGE
  embed.setImage(
    getSkinUrl(
      skin
    )
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
          "Create or update the Union Tier Testing system"
        )

        .addStringOption(
          (option) =>
            option
              .setName(
                "name"
              )
              .setDescription(
                "Name shown on the testing panel"
              )
              .setRequired(
                true
              )
        )

        .addStringOption(
          (option) =>
            option
              .setName(
                "type"
              )
              .setDescription(
                "Choose the testing system"
              )
              .setRequired(
                true
              )
              .addChoices(
                {
                  name:
                    "⚔️ Tier Testing",
                  value:
                    "tier_testing",
                },
                {
                  name:
                    "👑 High Tier Testing",
                  value:
                    "high_tier_testing",
                }
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "tester1"
              )
              .setDescription(
                "Main tester role"
              )
              .setRequired(
                true
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "tester2"
              )
              .setDescription(
                "Additional tester role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "tester3"
              )
              .setDescription(
                "Additional tester role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "tester4"
              )
              .setDescription(
                "Additional tester role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "tester5"
              )
              .setDescription(
                "Additional tester role"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "notify1"
              )
              .setDescription(
                "Role to notify"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "notify2"
              )
              .setDescription(
                "Role to notify"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "notify3"
              )
              .setDescription(
                "Role to notify"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "notify4"
              )
              .setDescription(
                "Role to notify"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "notify5"
              )
              .setDescription(
                "Role to notify"
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
        .setName(
          "addrole"
        )
        .setDescription(
          "Add roles to bot permissions"
        )

        .addStringOption(
          (option) =>
            option
              .setName(
                "type"
              )
              .setDescription(
                "Choose what the roles can do"
              )
              .setRequired(
                true
              )
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
                }
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName(
                "role1"
              )
              .setDescription(
                "First role"
              )
              .setRequired(
                true
              )
        )

        .addRoleOption(
          (option) =>
            option.setName(
              "role2"
            )
        )

        .addRoleOption(
          (option) =>
            option.setName(
              "role3"
            )
        )

        .addRoleOption(
          (option) =>
            option.setName(
              "role4"
            )
        )

        .addRoleOption(
          (option) =>
            option.setName(
              "role5"
            )
        )

        .addRoleOption(
          (option) =>
            option.setName(
              "role6"
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
        .setName(
          "generaterole"
        )
        .setDescription(
          "Generate all Union Tier kit/tier roles"
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
        .setName(
          "welcome"
        )
        .setDescription(
          "Configure welcome messages"
        )

        .addChannelOption(
          (option) =>
            option
              .setName(
                "channel"
              )
              .setDescription(
                "Welcome channel"
              )
              .addChannelTypes(
                ChannelType.GuildText
              )
              .setRequired(
                true
              )
        )

        .addStringOption(
          (option) =>
            option
              .setName(
                "message"
              )
              .setDescription(
                "Use {user}, {username}, {server}, {count}"
              )
              .setRequired(
                true
              )
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
        .setName(
          "farewell"
        )
        .setDescription(
          "Configure farewell messages"
        )

        .addChannelOption(
          (option) =>
            option
              .setName(
                "channel"
              )
              .setDescription(
                "Farewell channel"
              )
              .addChannelTypes(
                ChannelType.GuildText
              )
              .setRequired(
                true
              )
        )

        .addStringOption(
          (option) =>
            option
              .setName(
                "message"
              )
              .setDescription(
                "Use {user}, {username}, {server}, {count}"
              )
              .setRequired(
                true
              )
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
        .setName(
          "message"
        )
        .setDescription(
          "Send a message through the bot"
        )

        .addChannelOption(
          (option) =>
            option
              .setName(
                "channel"
              )
              .setDescription(
                "Channel to send the message"
              )
              .addChannelTypes(
                ChannelType.GuildText
              )
              .setRequired(
                true
              )
        )

        .addStringOption(
          (option) =>
            option
              .setName(
                "text"
              )
              .setDescription(
                "Message to send"
              )
              .setRequired(
                true
              )
        )
    );

    // ==================================================
    // RESULT
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
      })
    );

    // ==================================================
    // HIGH RESULTS
    // ==================================================

    commands.push(
      buildResultCommand({
        name:
          "highresults",

        description:
          "Post a high tier testing result",

        previousTiers:
          HIGH_PREVIOUS_TIERS,

        resultTiers:
          HIGH_TIERS,

        testerCount:
          2,
      })
    );

    // ==================================================
    // REGISTER
    // ==================================================

    const rest =
      new REST({
        version:
          "10",
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
          body:
            commands.map(
              (command) =>
                command.toJSON()
            ),
        }
      );

      console.log(
        "✅ Slash commands registered."
      );

      console.log(
        "✅ /addrole = Message / Results / Ticket"
      );

      console.log(
        "✅ Results roles can use /result + /highresults"
      );

      console.log(
        "✅ /generaterole creates all kit/tier roles"
      );

      console.log(
        "✅ Sword = Best of 6"
      );

      console.log(
        "✅ Other kits = Best of 3"
      );

      console.log(
        "✅ High tier requires kit-specific LT3"
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
            ephemeral:
              true,
          });
        }

        const guild =
          interaction.guild;

        const guildData =
          getGuildData(
            guild.id
          );

        const name =
          interaction.options.getString(
            "name"
          );

        const type =
          interaction.options.getString(
            "type"
          );

        const testerRoles = [
          "tester1",
          "tester2",
          "tester3",
          "tester4",
          "tester5",
        ]
          .map(
            (key) =>
              interaction.options.getRole(
                key
              )
          )
          .filter(
            (role) =>
              role
          );

        const notifyRoles = [
          "notify1",
          "notify2",
          "notify3",
          "notify4",
          "notify5",
        ]
          .map(
            (key) =>
              interaction.options.getRole(
                key
              )
          )
          .filter(
            (role) =>
              role
          );

        guildData.setupName =
          name;

        guildData.testingType =
          type;

        guildData.testerRoles =
          testerRoles.map(
            (role) =>
              role.id
          );

        guildData.notifyRoles =
          notifyRoles.map(
            (role) =>
              role.id
          );

        saveDatabase();

        const category =
          await getOrCreateTicketCategory(
            guild,
            guildData
          );

        await updateCategoryPermissions(
          guild,
          guildData,
          category
        );

        await sendTestingPanel(
          interaction.channel,
          guild,
          guildData
        );

        return interaction.reply({
          content:
            `✅ **${name}** setup complete!\n\n` +
            `📋 **Testing type:** ${
              type ===
              "high_tier_testing"
                ? "👑 High Tier Testing"
                : "⚔️ Tier Testing"
            }\n` +
            `🧪 **Tester roles:** ${testerRoles.length}\n` +
            `🔔 **Notification roles:** ${notifyRoles.length}\n` +
            `📁 **Ticket category:** ${category.name}\n\n` +
            `🏆 **/result:** normal tier results\n` +
            `👑 **/highresults:** high tier results\n` +
            `🔐 High tier requires the player's kit-specific LT3 role.`,

          ephemeral:
            true,
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
            ephemeral:
              true,
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
          .map(
            (key) =>
              interaction.options.getRole(
                key
              )
          )
          .filter(
            (role) =>
              role
          );

        if (
          type ===
          "message"
        ) {
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

            ephemeral:
              true,
          });
        }

        // RESULTS = BOTH RESULT COMMANDS
        if (
          type ===
          "results"
        ) {
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
              `✅ Added ${roles.length} role(s) to **/result AND /highresults** permission.`,

            ephemeral:
              true,
          });
        }

        // TICKET
        if (
          type ===
          "ticket"
        ) {
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

          saveDatabase();

          const category =
            await getOrCreateTicketCategory(
              interaction.guild,
              guildData
            );

          await updateCategoryPermissions(
            interaction.guild,
            guildData,
            category
          );

          return interaction.reply({
            content:
              `✅ Added ${roles.length} role(s) to **Ticket Staff**.\n\n` +
              `🎫 They can now view testing tickets and close them.`,

            ephemeral:
              true,
          });
        }

        return interaction.reply({
          content:
            "❌ Invalid role type.",
          ephemeral:
            true,
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
            ephemeral:
              true,
          });
        }

        await interaction.deferReply({
          ephemeral:
            true,
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
            `🆕 **Created:** ${result.created.length}\n` +
            `📦 **Already existed:** ${result.existing.length}\n\n` +
            `There are **${Object.keys(KITS).length * ALL_TIERS.length}** kit/tier roles in total.\n\n` +
            `Example:\n` +
            `💎 **Dia SMP LT5**\n` +
            `💎 **Dia SMP HT4**\n` +
            `💎 **Dia SMP LT3**\n` +
            `💎 **Dia SMP HT1**`,
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
          ephemeral:
            true,
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
          ephemeral:
            true,
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
            ephemeral:
              true,
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
          content:
            text,
        });

        return interaction.reply({
          content:
            `✅ Message sent to ${channel}.`,
          ephemeral:
            true,
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
            ephemeral:
              true,
          });
        }

        const user =
          interaction.options.getUser(
            "user"
          );

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(
              () => null
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
              "❌ Invalid previous tier for `/result`.",
            ephemeral:
              true,
          });
        }

        if (
          !NORMAL_TIERS.includes(
            tier
          )
        ) {
          return interaction.reply({
            content:
              "❌ `/result` can only give LT3, HT4, LT4, HT5 or LT5.",
            ephemeral:
              true,
          });
        }

        if (
          !score1 ||
          score1.trim() ===
            ""
        ) {
          return interaction.reply({
            content:
              "❌ Score is required.",
            ephemeral:
              true,
          });
        }

        // ==================================================
        // GIVE KIT/TIER ROLE
        // ==================================================

        let roleMessage =
          "";

        if (member) {
          const roleResult =
            await giveEarnedTierRole(
              member,
              guildData,
              kitKey,
              tier
            );

          if (
            roleResult.success
          ) {
            roleMessage =
              `\n🏷️ **Role given:** ${roleResult.role}`;
          } else {
            roleMessage =
              `\n⚠️ ${roleResult.reason}`;
          }
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
          embeds: [
            embed,
          ],
        });

        return interaction.reply({
          content:
            `✅ **Tier result posted!**\n\n` +
            `👤 **Player:** ${user}\n` +
            `📊 **Previous Tier:** ${previous}\n` +
            `🏆 **EARNED RANK:** ${kitKey ? getKit(kitKey).name : ""} ${tier}\n` +
            `🧪 **Tester:** ${tester1}\n` +
            `⚔️ **Score:** ${score1}` +
            roleMessage,

          ephemeral:
            true,
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
            ephemeral:
              true,
          });
        }

        const user =
          interaction.options.getUser(
            "user"
          );

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(
              () => null
            );

        if (!member) {
          return interaction.reply({
            content:
              "❌ I couldn't find that player in the server.",
            ephemeral:
              true,
          });
        }

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

        // ==================================================
        // HIGH TIER MUST BE LT3 IN THAT KIT
        // ==================================================

        if (
          !playerHasTier(
            member,
            guildData,
            kitKey,
            "LT3"
          )
        ) {
          const eligibleKits =
            getPlayerLT3Kits(
              member,
              guildData
            );

          const eligibleText =
            eligibleKits.length >
            0
              ? eligibleKits
                  .map(
                    (key) =>
                      `${getKit(key).emoji} ${getKit(key).name}`
                  )
                  .join(
                    ", "
                  )
              : "None";

          return interaction.reply({
            content:
              `❌ **High tier testing is locked for this kit.**\n\n` +
              `The player must have **${getKit(kitKey).name} LT3** before they can receive a high-tier result in that kit.\n\n` +
              `🎯 **Eligible kits for this player:** ${eligibleText}`,
            ephemeral:
              true,
          });
        }

        if (
          previous !==
          "LT3"
        ) {
          return interaction.reply({
            content:
              "❌ `/highresults` can only use **LT3** as the previous tier.",
            ephemeral:
              true,
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
            ephemeral:
              true,
          });
        }

        if (
          !score1 ||
          score1.trim() ===
            ""
        ) {
          return interaction.reply({
            content:
              "❌ Score 1 is required.",
            ephemeral:
              true,
          });
        }

        if (
          !score2 ||
          score2.trim() ===
            ""
        ) {
          return interaction.reply({
            content:
              "❌ Score 2 is required.",
            ephemeral:
              true,
          });
        }

        // ==================================================
        // GIVE HIGH TIER ROLE
        // ==================================================

        const roleResult =
          await giveEarnedTierRole(
            member,
            guildData,
            kitKey,
            tier
          );

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
            tester2,
            score2,
            skin,
          });

        await interaction.channel.send({
          embeds: [
            embed,
          ],
        });

        return interaction.reply({
          content:
            `✅ **High tier result posted!**\n\n` +
            `👤 **Player:** ${user}\n` +
            `🎯 **Kit:** ${getKit(kitKey).emoji} ${getKit(kitKey).name}\n` +
            `📊 **Previous Tier:** LT3\n` +
            `🏆 **EARNED RANK:** ${getKit(kitKey).name} ${tier}\n` +
            `🧪 **Tester 1:** ${tester1}\n` +
            `⚔️ **Score 1:** ${score1}\n` +
            `🧪 **Tester 2:** ${tester2}\n` +
            `⚔️ **Score 2:** ${score2}\n\n` +
            (
              roleResult.success
                ? `🏷️ **Role given:** ${roleResult.role}`
                : `⚠️ ${roleResult.reason}`
            ),

          ephemeral:
            true,
        });
      }

      // ==================================================
      // OPEN KIT MENU
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        (
          interaction.customId ===
            "open_kit:normal" ||
          interaction.customId ===
            "open_kit:high"
        )
      ) {
        const highTier =
          interaction.customId.endsWith(
            ":high"
          );

        const kitKey =
          interaction.values[0];

        if (
          kitKey ===
          "none"
        ) {
          return interaction.reply({
            content:
              "❌ You don't have an LT3 kit available for high tier testing.",
            ephemeral:
              true,
          });
        }

        const guildData =
          getGuildData(
            interaction.guild.id
          );

        // HIGH PANEL
        if (highTier) {
          const member =
            await interaction.guild.members
              .fetch(
                interaction.user.id
              )
              .catch(
                () => null
              );

          if (
            !member ||
            !playerHasTier(
              member,
              guildData,
              kitKey,
              "LT3"
            )
          ) {
            return interaction.reply({
              content:
                `❌ You need **${getKit(kitKey).name} LT3** to use high tier testing for this kit.`,
              ephemeral:
                true,
            });
          }
        }

        if (
          !client.pendingRequests
        ) {
          client.pendingRequests =
            new Map();
        }

        const requestKey =
          `${interaction.guild.id}:${interaction.user.id}`;

        client.pendingRequests.set(
          requestKey,
          {
            kit:
              kitKey,

            highTier,

            expires:
              Date.now() +
              5 *
                60 *
                1000,
          }
        );

        return interaction.reply({
          content:
            `${getKit(kitKey).emoji} **${getKit(kitKey).name} selected.**\n\n` +
            `Now select your region:`,

          components: [
            new ActionRowBuilder().addComponents(
              buildRegionMenu(
                highTier
              )
            ),
          ],

          ephemeral:
            true,
        });
      }

      // ==================================================
      // OLD REQUEST KIT SUPPORT
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        (
          interaction.customId ===
            "request_kit" ||
          interaction.customId ===
            "request_kit:normal" ||
          interaction.customId ===
            "request_kit:high"
        )
      ) {
        const highTier =
          interaction.customId.endsWith(
            ":high"
          );

        const kitKey =
          interaction.values[0];

        if (
          kitKey ===
          "none"
        ) {
          return interaction.reply({
            content:
              "❌ No eligible kit.",
            ephemeral:
              true,
          });
        }

        const guildData =
          getGuildData(
            interaction.guild.id
          );

        if (highTier) {
          const member =
            await interaction.guild.members
              .fetch(
                interaction.user.id
              )
              .catch(
                () => null
              );

          if (
            !member ||
            !playerHasTier(
              member,
              guildData,
              kitKey,
              "LT3"
            )
          ) {
            return interaction.reply({
              content:
                `❌ You need **${getKit(kitKey).name} LT3**.`,
              ephemeral:
                true,
            });
          }
        }

        if (
          !client.pendingRequests
        ) {
          client.pendingRequests =
            new Map();
        }

        const requestKey =
          `${interaction.guild.id}:${interaction.user.id}`;

        client.pendingRequests.set(
          requestKey,
          {
            kit:
              kitKey,

            highTier,

            expires:
              Date.now() +
              5 *
                60 *
                1000,
          }
        );

        return interaction.reply({
          content:
            `${getKit(kitKey).emoji} **${getKit(kitKey).name} selected.**\n\n` +
            `Now select your region:`,

          components: [
            new ActionRowBuilder().addComponents(
              buildRegionMenu(
                highTier
              )
            ),
          ],

          ephemeral:
            true,
        });
      }

      // ==================================================
      // REGION SELECT
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        (
          interaction.customId ===
            "request_region" ||
          interaction.customId ===
            "request_region:normal" ||
          interaction.customId ===
            "request_region:high"
        )
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

        const highTier =
          pending.highTier ||
          interaction.customId.endsWith(
            ":high"
          );

        const result =
          await createTestingTicket(
            interaction,
            kitKey,
            region,
            highTier
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
              `⚠️ You already have an active testing ticket:\n${result.existing}`,

            components: [],
          });
        }

        const ticket =
          result.ticket;

        return interaction.update({
          content:
            `✅ **Your ${
              highTier
                ? "high tier "
                : ""
            }testing ticket has been created!**\n\n` +
            `🎯 **Kit:** ${getKit(kitKey).emoji} ${getKit(kitKey).name}\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n` +
            `⚔️ **Format:** ${getKit(kitKey).format}\n\n` +
            `🔒 The ticket is private.\n` +
            `🧪 Configured testers and ticket staff can access it.\n\n` +
            `🎫 ${ticket}`,

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
        const playerId =
          interaction.customId.split(
            ":"
          )[1];

        const parts =
          (
            interaction.channel.topic ||
            ""
          ).split(
            ":"
          );

        const kitKey =
          parts[2];

        const region =
          parts[3];

        return interaction.reply({
          content:
            `📋 **Tier Test Information**\n\n` +
            `👤 **Player:** <@${playerId}>\n` +
            `🎯 **Kit:** ${getKit(kitKey).emoji} ${getKit(kitKey).name}\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n` +
            `⚔️ **Format:** ${getKit(kitKey).format}\n\n` +
            getTestingInstructions(
              kitKey
            ),

          ephemeral:
            true,
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

        if (
          !canManageTickets(
            interaction.member,
            guildData
          )
        ) {
          return interaction.reply({
            content:
              "❌ Only testers or configured Ticket Staff can close tickets.",
            ephemeral:
              true,
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
              .catch(
                () => {}
              );
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

            ephemeral:
              true,
          })
          .catch(
            () => {}
          );
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
        embeds: [
          embed,
        ],
      })
      .catch(
        () => {}
      );
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
        embeds: [
          embed,
        ],
      })
      .catch(
        () => {}
      );
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

client.login(
  TOKEN
);
