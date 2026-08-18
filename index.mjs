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

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing from .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

const DATA_FILE = path.join(process.cwd(), "data.json");

/*
==================================================
DEFAULT SKIN
==================================================
Your NameMC skin:
https://namemc.com/skin/6cc743790519ce59

Large 3D body render is used automatically whenever
the skin option is empty.
==================================================
*/

const DEFAULT_SKIN_URL =
  "https://s.namemc.com/3d/skin/body.png?id=6cc743790519ce59&model=classic&theta=30&phi=21&time=90&width=600&height=800";

const DEFAULT_SKIN_PAGE =
  "https://namemc.com/skin/6cc743790519ce59";

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
    database = { guilds: {} };
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

/*
==================================================
KITS
==================================================
Sword = Best of 6
Everything else = Best of 3
==================================================
*/

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

/*
==================================================
REGIONS
==================================================
*/

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

/*
==================================================
TIERS
==================================================
*/

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

const HIGH_ROLE_TIERS = [
  "LT3",
  "HT3",
  "HT2",
  "LT1",
  "HT1",
];

const NORMAL_PREVIOUS_TIERS = [
  "No Record",
  ...ALL_TIERS,
];

/*
Higher number = better tier.
*/

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

/*
==================================================
GUILD DATA
==================================================
*/

function getGuildData(guildId) {
  if (!database.guilds[guildId]) {
    database.guilds[guildId] = {
      setupName: "Union Tier Testing",

      testerRoles: [],
      notifyRoles: [],

      messageRoles: [],
      resultRoles: [],

      ticketCategoryId: "",
      highTicketCategoryId: "",

      /*
      High-tier access roles per kit.

      Example:

      dia_smp:
      LT3 = role ID
      HT3 = role ID
      HT2 = role ID
      LT1 = role ID
      HT1 = role ID
      */

      highRoles: {},

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

  if (typeof data.ticketCategoryId !== "string") {
    data.ticketCategoryId = "";
  }

  if (typeof data.highTicketCategoryId !== "string") {
    data.highTicketCategoryId = "";
  }

  if (!data.highRoles || typeof data.highRoles !== "object") {
    data.highRoles = {};
  }

  if (!data.welcome || typeof data.welcome !== "object") {
    data.welcome = {};
  }

  if (!data.farewell || typeof data.farewell !== "object") {
    data.farewell = {};
  }

  for (const kitKey of Object.keys(KITS)) {
    if (
      !data.highRoles[kitKey] ||
      typeof data.highRoles[kitKey] !== "object"
    ) {
      data.highRoles[kitKey] = {
        LT3: "",
        HT3: "",
        HT2: "",
        LT1: "",
        HT1: "",
      };
    }

    for (const tier of HIGH_ROLE_TIERS) {
      if (
        typeof data.highRoles[kitKey][tier] !== "string"
      ) {
        data.highRoles[kitKey][tier] = "";
      }
    }
  }

  return data;
}

/*
==================================================
HELPERS
==================================================
*/

function getKit(key) {
  return KITS[key] || null;
}

function getRegion(key) {
  return REGIONS[key] || null;
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

/*
==================================================
PERMISSIONS
==================================================
*/

function isTester(member, guildData) {
  if (!member) return false;

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  return guildData.testerRoles.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

function canUseResults(member, guildData) {
  if (!member) return false;

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  if (isTester(member, guildData)) {
    return true;
  }

  return guildData.resultRoles.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

function canUseMessage(member, guildData) {
  if (!member) return false;

  if (
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  return guildData.messageRoles.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

/*
==================================================
TIER COMPARISON
==================================================
*/

function isBetterTier(previous, current) {
  if (!previous || previous === "No Record") {
    return false;
  }

  return (
    TIER_RANK[current] >
    TIER_RANK[previous]
  );
}

function isDemotion(previous, current) {
  if (!previous || previous === "No Record") {
    return false;
  }

  return (
    TIER_RANK[current] <
    TIER_RANK[previous]
  );
}

/*
==================================================
SKIN
==================================================
*/

function normalizeSkinUrl(value) {
  /*
  No skin supplied:
  ALWAYS use your default skin.
  */

  if (!value || !String(value).trim()) {
    return DEFAULT_SKIN_URL;
  }

  let url = String(value).trim();

  /*
  If someone enters:

  https://namemc.com/skin/6cc743790519ce59

  automatically convert it into a large body render.
  */

  const nameMcMatch = url.match(
    /namemc\.com\/skin\/([a-zA-Z0-9]+)(?:\?.*)?$/i
  );

  if (nameMcMatch) {
    return (
      "https://s.namemc.com/3d/skin/body.png" +
      `?id=${nameMcMatch[1]}` +
      "&model=classic" +
      "&theta=30" +
      "&phi=21" +
      "&time=90" +
      "&width=600" +
      "&height=800"
    );
  }

  /*
  If a NameMC image ID is supplied.
  */

  const imageMatch = url.match(
    /s\.namemc\.com\/i\/([a-zA-Z0-9]+)\.png/i
  );

  if (imageMatch) {
    return (
      "https://s.namemc.com/3d/skin/body.png" +
      `?id=${imageMatch[1]}` +
      "&model=classic" +
      "&theta=30" +
      "&phi=21" +
      "&time=90" +
      "&width=600" +
      "&height=800"
    );
  }

  return url;
}

/*
==================================================
HIGH-TIER ROLE ACCESS
==================================================
*/

function getHighRolesForKit(
  guildData,
  kitKey
) {
  return (
    guildData.highRoles?.[kitKey] || {
      LT3: "",
      HT3: "",
      HT2: "",
      LT1: "",
      HT1: "",
    }
  );
}

function hasHighKitAccess(
  member,
  guildData,
  kitKey
) {
  if (!member) return false;

  /*
  Testers can always make and view
  high-tier tickets.
  */

  if (isTester(member, guildData)) {
    return true;
  }

  const roles =
    getHighRolesForKit(
      guildData,
      kitKey
    );

  return HIGH_ROLE_TIERS.some(
    (tier) => {
      const roleId = roles[tier];

      return (
        roleId &&
        member.roles.cache.has(roleId)
      );
    }
  );
}

function getEligibleHighKits(
  member,
  guildData
) {
  return Object.keys(KITS).filter(
    (kitKey) =>
      hasHighKitAccess(
        member,
        guildData,
        kitKey
      )
  );
}

function highRoleLabel(
  guild,
  roleId
) {
  if (!roleId) {
    return "Not configured";
  }

  const role =
    guild.roles.cache.get(roleId);

  return role
    ? role.toString()
    : "Deleted role";
}

/*
==================================================
TESTING INSTRUCTIONS
==================================================
*/

function getTestingInstructions(
  kitKey,
  high = false
) {
  const kit = getKit(kitKey);

  if (!kit) {
    return "❌ Unknown kit.";
  }

  return (
    `${high ? "👑 **HIGH TIER TESTING**" : "🧪 **TESTING INSTRUCTIONS**"}\n\n` +

    `${kit.emoji} **${kit.name}**\n` +

    `⚔️ **Format:** ${kit.format}\n` +

    `🔢 **Rounds:** ${kit.rounds}\n\n` +

    `━━━━━━━━━━━━━━━━━━━━\n\n` +

    `📌 **Testing Rules**\n` +

    `• The tester decides where the test will be done.\n` +

    `• Complete ${kit.format} using the selected kit.\n` +

    `• Make sure both players are ready before starting.\n` +

    `• Follow the tester's instructions during the test.`
  );
}

/*
==================================================
KIT MENU
==================================================
*/

function buildKitMenu(
  customId = "request_kit",
  kits = Object.keys(KITS),
  placeholder = "🎯 Select a kit"
) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addOptions(
      kits.map((kitKey) => {
        const kit = KITS[kitKey];

        return {
          label: kit.name,
          value: kitKey,
          emoji: kit.emoji,
          description:
            kitKey === "sword"
              ? "Best of 6 • 6 rounds"
              : "Best of 3 • 3 rounds",
        };
      })
    );
}

function buildRegionMenu(customId) {
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

/*
==================================================
NORMAL PANEL
==================================================
*/

function buildNormalPanel(
  guildData
) {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          `🎟️ ${guildData.setupName}`
        )
        .setDescription(
          `Select the kit you want to test.\n\n` +

          `**1.** Select your kit\n` +

          `**2.** Select your region\n` +

          `**3.** A private testing ticket will be created\n` +

          `**4.** Configured testers can access it\n` +

          `**5.** Follow the testing instructions\n\n` +

          `🔒 **Your ticket is private.**`
        )
        .setColor(0xffc107),
    ],

    components: [
      new ActionRowBuilder().addComponents(
        buildKitMenu()
      ),
    ],
  };
}

/*
==================================================
HIGH-TIER PANEL
==================================================
*/

function buildHighPanel(
  guildData
) {
  const embed =
    new EmbedBuilder()
      .setTitle(
        "👑 HIGH TIER TESTING"
      )
      .setDescription(
        `Welcome to **High Tier Testing**.\n\n` +

        `You must already have an **LT3 or higher role for the kit** you want to test.\n\n` +

        `You can ONLY select kits where you currently have one of these roles:\n` +

        `🏆 **LT3 • HT3 • HT2 • LT1 • HT1**\n\n` +

        `🧪 **Testers:** Configured testers can view and create every high-tier ticket.\n\n` +

        `📌 **The tester decides where the test will be done.**`
      )
      .setColor(0xff3030);

  const components = [];

  /*
  Show all configured kits on the panel.

  The actual access check happens when
  the player selects a kit.
  */

  const configuredKits =
    Object.keys(KITS).filter(
      (kitKey) =>
        HIGH_ROLE_TIERS.some(
          (tier) =>
            getHighRolesForKit(
              guildData,
              kitKey
            )[tier]
        )
    );

  if (configuredKits.length) {
    components.push(
      new ActionRowBuilder().addComponents(
        buildKitMenu(
          "high_request_kit",
          configuredKits,
          "👑 Select an eligible kit"
        )
      )
    );
  }

  return {
    embeds: [embed],
    components,
  };
}

/*
==================================================
CATEGORIES
==================================================
*/

async function getOrCreateCategory(
  guild,
  guildData,
  high = false
) {
  const idKey = high
    ? "highTicketCategoryId"
    : "ticketCategoryId";

  let category =
    guild.channels.cache.get(
      guildData[idKey]
    );

  if (
    category &&
    category.type ===
      ChannelType.GuildCategory
  ) {
    return category;
  }

  category =
    await guild.channels.create({
      name: high
        ? "HIGH TICKETS"
        : "TEST TICKETS",

      type:
        ChannelType.GuildCategory,

      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,

          deny: [
            PermissionFlagsBits.ViewChannel,
          ],
        },

        ...guildData.testerRoles.map(
          (roleId) => ({
            id: roleId,

            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          })
        ),
      ],
    });

  guildData[idKey] =
    category.id;

  saveDatabase();

  return category;
}

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

  /*
  Testers can always see high tickets
  and normal tickets.
  */

  for (
    const roleId of guildData.testerRoles
  ) {
    await category.permissionOverwrites
      .edit(
        roleId,
        {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        }
      )
      .catch(() => {});
  }
}

/*
==================================================
FIND EXISTING TICKET
==================================================
*/

function findPlayerTicket(
  guild,
  categoryId,
  userId,
  high = false
) {
  const prefix = high
    ? `HIGHTEST:${userId}:`
    : `TIERTEST:${userId}:`;

  return guild.channels.cache.find(
    (channel) =>
      channel.parentId === categoryId &&
      channel.type === ChannelType.GuildText &&
      typeof channel.topic === "string" &&
      channel.topic.startsWith(prefix)
  );
}

/*
==================================================
CREATE TICKET
==================================================
*/

async function createTestingTicket(
  interaction,
  kitKey,
  region,
  high = false
) {
  const guild =
    interaction.guild;

  const user =
    interaction.user;

  const guildData =
    getGuildData(guild.id);

  const kit =
    getKit(kitKey);

  const regionData =
    getRegion(region);

  if (!kit || !regionData) {
    return {
      error:
        "❌ Invalid kit or region.",
    };
  }

  /*
  High tier players MUST have
  LT3 or higher for this exact kit.

  Testers bypass this requirement.
  */

  if (
    high &&
    !hasHighKitAccess(
      interaction.member,
      guildData,
      kitKey
    )
  ) {
    return {
      error:
        `❌ You do not have **LT3 or higher** for ${kit.name}.`,
    };
  }

  const category =
    await getOrCreateCategory(
      guild,
      guildData,
      high
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
      user.id,
      high
    );

  if (existing) {
    return {
      existing,
    };
  }

  const prefix = high
    ? "HIGHTEST"
    : "TIERTEST";

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

    /*
    Configured testers can see every ticket.
    */

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
  ];

  const channel =
    await guild.channels.create({
      name: makeChannelName(
        `${high ? "high" : "test"}-${kitKey}-${user.username}`
      ),

      type:
        ChannelType.GuildText,

      parent: category.id,

      topic:
        `${prefix}:${user.id}:${kitKey}:${region}`,

      permissionOverwrites:
        overwrites,
    });

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        `close_ticket:${high ? "high" : "normal"}`
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
        `ticket_info:${high ? "high" : "normal"}`
      )
      .setLabel(
        "Testing Info"
      )
      .setEmoji("📋")
      .setStyle(
        ButtonStyle.Secondary
      );

  const testerMentions =
    guildData.testerRoles
      .filter((roleId) =>
        guild.roles.cache.has(roleId)
      )
      .map(
        (roleId) =>
          `<@&${roleId}>`
      );

  const notifyMentions =
    guildData.notifyRoles
      .filter((roleId) =>
        guild.roles.cache.has(roleId)
      )
      .map(
        (roleId) =>
          `<@&${roleId}>`
      );

  const roleMentions =
    [
      ...new Set([
        ...testerMentions,
        ...notifyMentions,
      ]),
    ];

  const ticketEmbed =
    new EmbedBuilder()
      .setTitle(
        high
          ? `👑 ${kit.name} HIGH TIER TEST`
          : `${kit.emoji} ${kit.name} TIER TEST`
      )
      .setDescription(
        `👤 **Player:** <@${user.id}>\n` +

        `🎮 **Discord:** ${user.tag}\n` +

        `${regionData.emoji} **Region:** ${regionData.name}\n\n` +

        (
          high
            ? `👑 **High Tier Requirement:** LT3 or higher for ${kit.name}\n\n`
            : ""
        ) +

        getTestingInstructions(
          kitKey,
          high
        )
      )
      .setColor(
        high
          ? 0xff3030
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
      `${roleMentions.join(" ")}\n\n` +

      `${high ? "👑" : "🎫"} **New ${high ? "High Tier" : "Tier Test"} Ticket**\n` +

      `<@${user.id}> has opened a ${kit.emoji} **${kit.name}** ${high ? "high tier" : "tier"} test.`,

    embeds: [
      ticketEmbed,
    ],

    allowedMentions: {
      users: [
        user.id,
      ],

      roles:
        guildData.testerRoles
          .concat(
            guildData.notifyRoles
          ),
    },

    components: [
      new ActionRowBuilder()
        .addComponents(
          closeButton,
          infoButton
        ),
    ],
  });

  return {
    ticket: channel,
  };
}

/*
==================================================
RESULT COMMAND OPTIONS
==================================================
*/

function addResultCommandOptions(
  command,
  {
    high = false,
  } = {}
) {
  command
    .addUserOption(
      (option) =>
        option
          .setName("user")
          .setDescription(
            "Player who was tested"
          )
          .setRequired(true)
    )

    .addStringOption(
      (option) =>
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
            "Previous tier"
          )
          .setRequired(true)

          .addChoices(
            ...NORMAL_PREVIOUS_TIERS.map(
              (tier) => ({
                name: tier,
                value: tier,
              })
            )
          )
    );

    command.addStringOption(
      (option) =>
        option
          .setName("tier")
          .setDescription(
            "New earned tier"
          )
          .setRequired(true)

          .addChoices(
            ...NORMAL_TIERS.map(
              (tier) => ({
                name: tier,
                value: tier,
              })
            )
          )
    );
  } else {
    command.addStringOption(
      (option) =>
        option
          .setName("tier")
          .setDescription(
            "High tier result"
          )
          .setRequired(true)

          .addChoices(
            {
              name:
                "❌ FAILED HT3 TEST",
              value:
                "FAILED_HT3",
            },

            ...HIGH_TIERS.map(
              (tier) => ({
                name:
                  `✅ PASSED ${tier} TEST`,
                value: tier,
              })
            )
          )
    );
  }

  command
    .addUserOption(
      (option) =>
        option
          .setName("tester1")
          .setDescription(
            "Tester 1"
          )
          .setRequired(true)
    )

    .addStringOption(
      (option) =>
        option
          .setName("score1")
          .setDescription(
            "Tester 1 vs player score"
          )
          .setRequired(true)
    );

  if (high) {
    command
      .addUserOption(
        (option) =>
          option
            .setName("tester2")
            .setDescription(
              "Tester 2"
            )
            .setRequired(true)
      )

      .addStringOption(
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
          ...Object.entries(
            KITS
          ).map(
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
          "Optional skin URL. Empty = default UNION skin."
        )
        .setRequired(false)
  );

  return command;
}

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
// BOT TOKEN
// ======================================================
// Put your bot token between the quotes.
const TOKEN = "PASTE_YOUR_BOT_TOKEN_HERE";

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
    console.error("Database load error:", error);

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
    console.error("Database save error:", error);
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

      normalCategoryId: "",
      highCategoryId: "",

      // Keeps old database compatible.
      ticketCategoryId: "",

      // {
      //   sword: {
      //     LT3: roleId,
      //     HT3: roleId,
      //     LT2: roleId,
      //     HT2: roleId,
      //     LT1: roleId,
      //     HT1: roleId
      //   }
      // }
      highTierRoles: {},

      // Generated roles:
      // {
      //   sword: {
      //     LT5: roleId,
      //     HT5: roleId,
      //     ...
      //   }
      // }
      tierRoles: {},

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

  if (!data.highTierRoles || typeof data.highTierRoles !== "object") {
    data.highTierRoles = {};
  }

  if (!data.tierRoles || typeof data.tierRoles !== "object") {
    data.tierRoles = {};
  }

  if (typeof data.normalCategoryId !== "string") {
    data.normalCategoryId = "";
  }

  if (typeof data.highCategoryId !== "string") {
    data.highCategoryId = "";
  }

  if (typeof data.ticketCategoryId !== "string") {
    data.ticketCategoryId = "";
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
  },

  axe: {
    name: "Axe",
    emoji: "🪓",
    rounds: 3,
  },

  uhc: {
    name: "UHC",
    emoji: "🛡️",
    rounds: 3,
  },

  dia_smp: {
    name: "Dia SMP",
    emoji: "💎",
    rounds: 3,
  },

  neth_pot: {
    name: "Neth Pot",
    emoji: "🔥",
    rounds: 3,
  },

  mace: {
    name: "Mace",
    emoji: "🔨",
    rounds: 3,
  },

  spear_mace: {
    name: "Spear Mace",
    emoji: "⚔️",
    rounds: 3,
  },

  crystal: {
    name: "Crystal",
    emoji: "💠",
    rounds: 3,
  },

  cart: {
    name: "Cart",
    emoji: "🛒",
    rounds: 3,
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

// Normal results
const NORMAL_TIERS = [
  "LT5",
  "HT5",
  "LT4",
  "HT4",
  "LT3",
];

// High results
const HIGH_TIERS = [
  "HT3",
  "LT2",
  "HT2",
  "LT1",
  "HT1",
];

// Every tier
const ALL_TIERS = [
  "LT5",
  "HT5",
  "LT4",
  "HT4",
  "LT3",
  "HT3",
  "LT2",
  "HT2",
  "LT1",
  "HT1",
];

// High-tier eligibility roles.
// A player with ANY of these for a kit can request high tier.
const HIGH_ELIGIBILITY_TIERS = [
  "LT3",
  "HT3",
  "LT2",
  "HT2",
  "LT1",
  "HT1",
];

// Previous tiers for normal results
const NORMAL_PREVIOUS_TIERS = [
  "No Record",
  ...ALL_TIERS,
];

// High testing starts from LT3.
const HIGH_PREVIOUS_TIERS = [
  "LT3",
];

// Used to determine promotion / demotion.
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

// Your NameMC skin:
// https://namemc.com/skin/6cc743790519ce59

const DEFAULT_SKIN =
  "https://s.namemc.com/3d/skin/body.png?id=6cc743790519ce59&model=classic&theta=30&phi=21&time=90&width=600&height=800";

// ======================================================
// HELPERS
// ======================================================

function getKit(key) {
  return KITS[key] || null;
}

function getRegion(key) {
  return REGIONS[key] || null;
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
  return String(name)
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

// ======================================================
// SKIN URL
// ======================================================

function getSkinUrl(skin) {
  if (!skin || String(skin).trim() === "") {
    return DEFAULT_SKIN;
  }

  const value = String(skin).trim();

  // If user pastes:
  // https://namemc.com/skin/xxxxxxxx
  // automatically convert it to a large 3D render.
  const match = value.match(
    /namemc\.com\/skin\/([a-f0-9]{16})/i
  );

  if (match) {
    return (
      "https://s.namemc.com/3d/skin/body.png" +
      `?id=${match[1]}` +
      "&model=classic" +
      "&theta=30" +
      "&phi=21" +
      "&time=90" +
      "&width=600" +
      "&height=800"
    );
  }

  // If a direct NameMC image was pasted,
  // use it directly.
  if (
    value.includes("s.namemc.com/i/")
  ) {
    return value;
  }

  return value;
}

// ======================================================
// TESTER PERMISSIONS
// ======================================================

function isTester(member, guildData) {
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
      member.roles.cache.has(roleId)
  );
}

// ======================================================
// RESULT ROLE PERMISSION
// ======================================================

// Roles added with:
// /addrole type: Results
// can use BOTH /result AND /highresults.

function canUseResults(member, guildData) {
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

  if (isTester(member, guildData)) {
    return true;
  }

  return guildData.resultRoles.some(
    (roleId) =>
      member.roles.cache.has(roleId)
  );
}

function canUseMessage(member, guildData) {
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
      member.roles.cache.has(roleId)
  );
}

// ======================================================
// HIGH TIER ROLE CHECK
// ======================================================

function getHighTierRoleMap(
  guildData,
  kitKey
) {
  if (
    !guildData.highTierRoles[kitKey]
  ) {
    guildData.highTierRoles[kitKey] = {};
  }

  return guildData.highTierRoles[kitKey];
}

function hasHighTierAccess(
  member,
  guildData,
  kitKey
) {
  // Testers can use every high kit.
  if (isTester(member, guildData)) {
    return true;
  }

  const roleMap =
    getHighTierRoleMap(
      guildData,
      kitKey
    );

  return HIGH_ELIGIBILITY_TIERS.some(
    (tier) => {
      const roleId = roleMap[tier];

      return (
        roleId &&
        member.roles.cache.has(roleId)
      );
    }
  );
}

function getEligibleHighKits(
  member,
  guildData
) {
  const kits = [];

  for (const [key, kit] of Object.entries(
    KITS
  )) {
    if (
      hasHighTierAccess(
        member,
        guildData,
        key
      )
    ) {
      kits.push({
        key,
        kit,
      });
    }
  }

  return kits;
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
    return "❌ Unknown kit.";
  }

  const format =
    kit.rounds === 6
      ? "Best of 6"
      : "Best of 3";

  if (high) {
    return (
      `🧪 **HIGH TIER TESTING**\n\n` +
      `${kit.emoji} **Kit:** ${kit.name}\n` +
      `⚔️ **Format:** ${format}\n` +
      `🔢 **Rounds:** ${kit.rounds}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📌 **Testing Rules:**\n` +
      `• The tester decides where the test will be done.\n` +
      `• Complete the ${format} using the selected kit.\n` +
      `• Both players must be ready before starting.\n` +
      `• Follow the tester's instructions during the test.`
    );
  }

  return (
    `🧪 **Testing Instructions**\n\n` +
    `${kit.emoji} **Kit:** ${kit.name}\n` +
    `⚔️ **Format:** ${format}\n` +
    `🔢 **Rounds:** ${kit.rounds}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📌 **Testing Rules:**\n` +
    `• The tester decides where the test will be done.\n` +
    `• Complete the ${format} using the selected kit.\n` +
    `• Both players must be ready before starting.\n` +
    `• Follow the tester's instructions during the test.`
  );
}

// ======================================================
// NORMAL KIT MENU
// ======================================================

function buildNormalKitMenu() {
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
            kit.rounds === 6
              ? "Best of 6"
              : "Best of 3",
        })
      )
    );
}

// ======================================================
// REGION MENU
// ======================================================

function buildRegionMenu(
  customId = "request_region"
) {
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
  guildData
) {
  const eligible =
    getEligibleHighKits(
      member,
      guildData
    );

  return new StringSelectMenuBuilder()
    .setCustomId("high_kit")
    .setPlaceholder(
      "👑 Select your eligible high-tier kit"
    )
    .addOptions(
      eligible.map(
        ({ key, kit }) => ({
          label: kit.name,
          value: key,
          emoji: kit.emoji,
          description:
            "You are eligible for this kit",
        })
      )
    );
}

// ======================================================
// NORMAL REQUEST PANEL
// ======================================================

function buildRequestPanel(
  guildData
) {
  const embed = new EmbedBuilder()
    .setTitle(
      `🎟️ ${guildData.setupName}`
    )
    .setDescription(
      `Select the kit you want to test.\n\n` +
      `**1.** Select your kit\n` +
      `**2.** Select your region\n` +
      `**3.** A private testing ticket will be created\n` +
      `**4.** Configured testers can access it\n` +
      `**5.** The tester decides where the test is done\n\n` +
      `🗡️ **Sword:** Best of 6\n` +
      `🎯 **All other kits:** Best of 3`
    )
    .setColor(0xffc107);

  return {
    embeds: [embed],

    components: [
      new ActionRowBuilder().addComponents(
        buildNormalKitMenu()
      ),
    ],
  };
}

// ======================================================
// HIGH REQUEST PANEL
// ======================================================

function buildHighRequestPanel(
  guildData
) {
  const embed = new EmbedBuilder()
    .setTitle(
      "👑 HIGH TIER TESTING"
    )
    .setDescription(
      `Welcome to **High Tier Testing**.\n\n` +
      `You must already have an **LT3 or higher role** for the kit you want to test.\n\n` +
      `You can ONLY select kits where you currently have one of these roles:\n` +
      `🏆 LT3\n` +
      `🏆 HT3\n` +
      `🏆 LT2\n` +
      `🏆 HT2\n` +
      `🏆 LT1\n` +
      `🏆 HT1\n\n` +
      `🗡️ **Sword:** Best of 6\n` +
      `🎯 **All other kits:** Best of 3\n\n` +
      `📌 The tester decides where the test will be done.\n\n` +
      `⚠️ Testers can access every high-tier kit.`
    )
    .setColor(0xff3030);

  const button =
    new ButtonBuilder()
      .setCustomId(
        "start_high_test"
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
// CATEGORY
// ======================================================

async function getOrCreateCategory(
  guild,
  guildData,
  high = false
) {
  const property = high
    ? "highCategoryId"
    : "normalCategoryId";

  let category = null;

  if (guildData[property]) {
    category =
      guild.channels.cache.get(
        guildData[property]
      );
  }

  if (
    category &&
    category.type ===
      ChannelType.GuildCategory
  ) {
    return category;
  }

  const categoryName = high
    ? "HIGH TICKETS"
    : "TEST TICKETS";

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
      ],
    },
  ];

  // Testers can always see the category.
  for (const roleId of guildData.testerRoles) {
    if (guild.roles.cache.has(roleId)) {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
        ],
      });
    }
  }

  category =
    await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites:
        overwrites,
    });

  guildData[property] =
    category.id;

  // Keep old field working.
  if (!high) {
    guildData.ticketCategoryId =
      category.id;
  }

  saveDatabase();

  return category;
}

// ======================================================
// CATEGORY PERMISSIONS
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

  for (const roleId of guildData.testerRoles) {
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
  userId,
  high = false
) {
  const prefix = high
    ? `HIGHTIERTEST:${userId}:`
    : `TIERTEST:${userId}:`;

  return guild.channels.cache.find(
    (channel) =>
      channel.parentId === categoryId &&
      channel.type ===
        ChannelType.GuildText &&
      typeof channel.topic ===
        "string" &&
      channel.topic.startsWith(prefix)
  );
}

// ======================================================
// CREATE NORMAL TICKET
// ======================================================

async function createNormalTicket(
  interaction,
  kitKey,
  region
) {
  const guild =
    interaction.guild;

  const user =
    interaction.user;

  const guildData =
    getGuildData(guild.id);

  const kit =
    getKit(kitKey);

  const regionData =
    getRegion(region);

  if (!kit) {
    throw new Error(
      `Invalid kit: ${kitKey}`
    );
  }

  if (!regionData) {
    throw new Error(
      `Invalid region: ${region}`
    );
  }

  const category =
    await getOrCreateCategory(
      guild,
      guildData,
      false
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
      user.id,
      false
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
  ];

  const channel =
    await guild.channels.create({
      name: makeChannelName(
        `test-${kitKey}-${user.username}`
      ),

      type: ChannelType.GuildText,

      parent: category.id,

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

  const testerMentions =
    guildData.testerRoles
      .filter((id) =>
        guild.roles.cache.has(id)
      )
      .map((id) => `<@&${id}>`);

  const notifyMentions =
    guildData.notifyRoles
      .filter((id) =>
        guild.roles.cache.has(id)
      )
      .map((id) => `<@&${id}>`);

  const mentions = [
    ...new Set([
      ...testerMentions,
      ...notifyMentions,
    ]),
  ];

  const ticketEmbed =
    new EmbedBuilder()
      .setTitle(
        `${kit.emoji} ${kit.name} Tier Test`
      )
      .setDescription(
        `👤 **Player:** <@${user.id}>\n` +
        `🎮 **Discord:** ${user.tag}\n` +
        `${regionData.emoji} **Region:** ${regionData.name}\n\n` +
        getTestingInstructions(
          kitKey,
          false
        )
      )
      .setColor(0xffc107)
      .setThumbnail(
        user.displayAvatarURL({
          size: 512,
        })
      )
      .setFooter({
        text:
          `${guild.name} • Union Tier Testing`,
      })
      .setTimestamp();

  await channel.send({
    content:
      `${mentions.join(" ")}\n\n` +
      `🎫 **New Tier Test Ticket**\n` +
      `<@${user.id}> has opened a ${kit.emoji} **${kit.name}** test.`,

    embeds: [ticketEmbed],

    allowedMentions: {
      users: [user.id],
      roles: mentions.map(
        (x) =>
          x.replace(/<@&|>/g, "")
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
// CREATE HIGH TIER TICKET
// ======================================================

async function createHighTicket(
  interaction,
  kitKey,
  region
) {
  const guild =
    interaction.guild;

  const user =
    interaction.user;

  const guildData =
    getGuildData(guild.id);

  const kit =
    getKit(kitKey);

  const regionData =
    getRegion(region);

  if (!kit) {
    throw new Error(
      `Invalid kit: ${kitKey}`
    );
  }

  if (!regionData) {
    throw new Error(
      `Invalid region: ${region}`
    );
  }

  // Player must have the correct
  // LT3+ kit role unless tester.
  if (
    !hasHighTierAccess(
      interaction.member,
      guildData,
      kitKey
    )
  ) {
    return {
      denied: true,
    };
  }

  const category =
    await getOrCreateCategory(
      guild,
      guildData,
      true
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
      user.id,
      true
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

    // Player sees ONLY their ticket.
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },

    // Testers see all high tickets.
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
  ];

  const channel =
    await guild.channels.create({
      name: makeChannelName(
        `high-${kitKey}-${user.username}`
      ),

      type: ChannelType.GuildText,

      parent: category.id,

      topic:
        `HIGHTIERTEST:${user.id}:${kitKey}:${region}`,

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

  const testerMentions =
    guildData.testerRoles
      .filter((id) =>
        guild.roles.cache.has(id)
      )
      .map((id) => `<@&${id}>`);

  const notifyMentions =
    guildData.notifyRoles
      .filter((id) =>
        guild.roles.cache.has(id)
      )
      .map((id) => `<@&${id}>`);

  const mentions = [
    ...new Set([
      ...testerMentions,
      ...notifyMentions,
    ]),
  ];

  const ticketEmbed =
    new EmbedBuilder()
      .setTitle(
        `👑 HIGH TIER • ${kit.emoji} ${kit.name}`
      )
      .setDescription(
        `👤 **Player:** <@${user.id}>\n` +
        `🎮 **Discord:** ${user.tag}\n` +
        `${regionData.emoji} **Region:** ${regionData.name}\n\n` +
        `🏆 **High Tier Eligibility:** Confirmed\n\n` +
        getTestingInstructions(
          kitKey,
          true
        )
      )
      .setColor(0xff3030)
      .setThumbnail(
        user.displayAvatarURL({
          size: 512,
        })
      )
      .setFooter({
        text:
          `${guild.name} • High Tier Testing`,
      })
      .setTimestamp();

  await channel.send({
    content:
      `${mentions.join(" ")}\n\n` +
      `👑 **NEW HIGH TIER TEST TICKET**\n` +
      `<@${user.id}> has opened a ${kit.emoji} **${kit.name} HIGH TIER** test.`,

    embeds: [ticketEmbed],

    allowedMentions: {
      users: [user.id],
      roles: mentions.map(
        (x) =>
          x.replace(/<@&|>/g, "")
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
      .setDescription(
        description
      )

      .addUserOption(
        (option) =>
          option
            .setName("user")
            .setDescription(
              "Player who was tested"
            )
            .setRequired(true)
      )

      .addStringOption(
        (option) =>
          option
            .setName("gmtag")
            .setDescription(
              "Minecraft gamertag"
            )
            .setRequired(true)
      )

      .addStringOption(
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
      )

      .addStringOption(
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
      )

      .addStringOption(
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
                      name: "HT3",
                      value: "HT3",
                    },
                    {
                      name: "LT2",
                      value: "LT2",
                    },
                    {
                      name: "HT2",
                      value: "HT2",
                    },
                    {
                      name: "LT1",
                      value: "LT1",
                    },
                    {
                      name: "HT1",
                      value: "HT1",
                    },
                    {
                      name:
                        "❌ Failed HT3 Test",
                      value: "FAILED",
                    },
                  ]
                : resultTiers.map(
                    (tier) => ({
                      name: tier,
                      value: tier,
                    })
                  ))
            )
      )

      .addUserOption(
        (option) =>
          option
            .setName("tester1")
            .setDescription(
              "Tester 1"
            )
            .setRequired(true)
      )

      .addStringOption(
        (option) =>
          option
            .setName("score1")
            .setDescription(
              "Tester 1 score"
            )
            .setRequired(true)
      )

      .addStringOption(
        (option) =>
          option
            .setName("kit")
            .setDescription(
              "Kit tested"
            )
            .setRequired(true)
            .addChoices(
              ...Object.entries(
                KITS
              ).map(
                ([value, kit]) => ({
                  name:
                    `${kit.emoji} ${kit.name}`,
                  value,
                })
              )
            )
      )

      .addStringOption(
        (option) =>
          option
            .setName("skin")
            .setDescription(
              "Optional skin URL"
            )
            .setRequired(false)
      );

  if (high) {
    command.addUserOption(
      (option) =>
        option
          .setName("tester2")
          .setDescription(
            "Tester 2"
          )
          .setRequired(true)
    );

    command.addStringOption(
      (option) =>
        option
          .setName("score2")
          .setDescription(
            "Tester 2 score"
          )
          .setRequired(true)
    );
  }

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
  const kit =
    getKit(kitKey);

  const regionData =
    getRegion(region);

  let statusText;

  if (
    previous === "No Record"
  ) {
    statusText =
      `# 🏆 EARNED RANK ${tier}`;
  } else if (
    isPromotion(previous, tier)
  ) {
    statusText =
      `# 🎉 PROMOTED TO ${tier}`;
  } else if (
    isDemotion(previous, tier)
  ) {
    statusText =
      `# 📉 DEMOTED TO ${tier}`;
  } else if (
    previous === tier
  ) {
    statusText =
      `# 🔄 RETAINED ${tier}`;
  } else {
    statusText =
      `# 🏆 EARNED RANK ${tier}`;
  }

  const embed =
    new EmbedBuilder()
      .setTitle(
        "🏆 UNION TIERS"
      )
      .setDescription(
        `👤 **Player:** ${user}\n` +
        `🎮 **GMTAG:** \`${gmtag}\`\n` +
        `${regionData.emoji} **Region:** ${regionData.name}\n\n` +
        `📊 **Previous Tier:** **${previous}**\n\n` +
        `${statusText}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🧪 **TESTER & SCORE**\n\n` +
        `👤 **Tester:** ${tester1}\n` +
        `⚔️ **Score:** **${cleanText(score1)}**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━`
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
          inline: false,
        },
        {
          name: "🏆 Earned Rank",
          value:
            `**${tier}**`,
          inline: false,
        },
        {
          name: "⚔️ Format",
          value:
            kit.rounds === 6
              ? "Best of 6"
              : "Best of 3",
          inline: false,
        }
      )
      .setThumbnail(
        user.displayAvatarURL({
          size: 512,
        })
      )
      .setImage(
        getSkinUrl(skin)
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

  const passed =
    tier !== "FAILED";

  let tierText;

  if (passed) {
    tierText =
      `🏆 **PASSED ${tier} TEST**`;
  } else {
    tierText =
      `❌ **FAILED HT3 TEST**`;
  }

  const embed =
    new EmbedBuilder()
      .setTitle(
        "👑 UNION TIERS • HIGH TIER"
      )
      .setDescription(
        `👤 **Name:** ${user.username}\n` +
        `🎮 **GMTAG:** \`${gmtag}\`\n\n` +
        `🧪 **Tester 1 vs Player**\n` +
        `⚔️ **Score:** ${cleanText(score1)}\n\n` +
        `🧪 **Tester 2 vs Player**\n` +
        `⚔️ **Score:** ${cleanText(score2)}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${tierText}`
      )
      .setColor(
        passed
          ? 0xff3030
          : 0x555555
      )
      .addFields({
        name: "🎯 Kit",
        value:
          `${kit.emoji} **${kit.name}**`,
        inline: false,
      })
      .setImage(
        getSkinUrl(skin)
      )
      .setFooter({
        text:
          `${interaction.guild.name} • High Tier Testing`,
      })
      .setTimestamp();

  return embed;
}

// ======================================================
// APPLY TIER ROLE
// ======================================================

async function applyTierRole({
  guild,
  userId,
  kitKey,
  tier,
}) {
  if (!ALL_TIERS.includes(tier)) {
    return {
      success: false,
      reason:
        "Tier does not receive a role.",
    };
  }

  const guildData =
    getGuildData(guild.id);

  const member =
    await guild.members
      .fetch(userId)
      .catch(() => null);

  if (!member) {
    return {
      success: false,
      reason:
        "Could not find player.",
    };
  }

  const roleMap =
    guildData.tierRoles[kitKey];

  if (!roleMap) {
    return {
      success: false,
      reason:
        "Roles have not been generated yet. Use /generaterole.",
    };
  }

  const newRoleId =
    roleMap[tier];

  if (!newRoleId) {
    return {
      success: false,
      reason:
        `The ${getKit(kitKey).name} ${tier} role does not exist yet.`,
    };
  }

  // Remove ALL tier roles for this kit.
  for (const oldTier of ALL_TIERS) {
    const oldRoleId =
      roleMap[oldTier];

    if (
      oldRoleId &&
      member.roles.cache.has(
        oldRoleId
      )
    ) {
      await member.roles.remove(
        oldRoleId
      ).catch(() => {});
    }
  }

  // Add the new role.
  const role =
    guild.roles.cache.get(
      newRoleId
    );

  if (!role) {
    return {
      success: false,
      reason:
        "Generated role could not be found.",
    };
  }

  try {
    await member.roles.add(
      role
    );

    return {
      success: true,
      role,
    };
  } catch (error) {
    console.error(
      "Role assignment error:",
      error
    );

    return {
      success: false,
      reason:
        "Bot could not assign the role. Make sure the bot's highest role is above the generated tier roles.",
    };
  }
}

// ======================================================
// GENERATE ALL TIER ROLES
// ======================================================

async function generateAllTierRoles(
  guild
) {
  const guildData =
    getGuildData(guild.id);

  let created = 0;
  let existing = 0;

  for (const [
    kitKey,
    kit,
  ] of Object.entries(KITS)) {
    if (
      !guildData.tierRoles[kitKey]
    ) {
      guildData.tierRoles[kitKey] =
        {};
    }

    for (const tier of ALL_TIERS) {
      const currentRoleId =
        guildData.tierRoles[
          kitKey
        ][tier];

      let role =
        currentRoleId
          ? guild.roles.cache.get(
              currentRoleId
            )
          : null;

      if (role) {
        existing++;
        continue;
      }

      const roleName =
        `${kit.name} ${tier}`;

      role =
        guild.roles.cache.find(
          (r) =>
            r.name === roleName
        );

      if (role) {
        guildData.tierRoles[
          kitKey
        ][tier] = role.id;

        existing++;
        continue;
      }

      try {
        role =
          await guild.roles.create({
            name: roleName,
            reason:
              "UNION Tiers generated tier role",
          });

        guildData.tierRoles[
          kitKey
        ][tier] = role.id;

        created++;

        // Small delay to avoid hammering Discord.
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              250
            )
        );
      } catch (error) {
        console.error(
          `Could not create ${roleName}:`,
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
// COMMAND REGISTRATION
// ======================================================

client.once(
  "ready",
  async () => {
    console.log(
      `✅ Logged in as ${client.user.tag}`
    );

    const commands = [];

    // ==================================================
    // SETUP
    // ==================================================

    const setupCommand =
      new SlashCommandBuilder()
        .setName("setup")
        .setDescription(
          "Configure UNION Tiers"
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
              .setName("type")
              .setDescription(
                "Normal or High Tier Testing"
              )
              .setRequired(true)
              .addChoices(
                {
                  name:
                    "🏆 Normal Tier Testing",
                  value:
                    "normal",
                },
                {
                  name:
                    "👑 High Tier Testing",
                  value:
                    "high",
                }
              )
        )

        // TESTERS
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
                "Tester role 2"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("tester3")
              .setDescription(
                "Tester role 3"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("tester4")
              .setDescription(
                "Tester role 4"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("tester5")
              .setDescription(
                "Tester role 5"
              )
        )

        // NOTIFY
        .addRoleOption(
          (option) =>
            option
              .setName("notify1")
              .setDescription(
                "Notification role 1"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify2")
              .setDescription(
                "Notification role 2"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify3")
              .setDescription(
                "Notification role 3"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify4")
              .setDescription(
                "Notification role 4"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify5")
              .setDescription(
                "Notification role 5"
              )
        )

        // HIGH TIER KIT
        .addStringOption(
          (option) =>
            option
              .setName("high_kit")
              .setDescription(
                "Kit to configure high-tier roles for"
              )
              .addChoices(
                ...Object.entries(
                  KITS
                ).map(
                  ([value, kit]) => ({
                    name:
                      `${kit.emoji} ${kit.name}`,
                    value,
                  })
                )
              )
        )

        // HIGH TIER ROLES
        .addRoleOption(
          (option) =>
            option
              .setName("high_lt3")
              .setDescription(
                "LT3 role for selected high-tier kit"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("high_ht3")
              .setDescription(
                "HT3 role for selected high-tier kit"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("high_lt2")
              .setDescription(
                "LT2 role for selected high-tier kit"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("high_ht2")
              .setDescription(
                "HT2 role for selected high-tier kit"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("high_lt1")
              .setDescription(
                "LT1 role for selected high-tier kit"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("high_ht1")
              .setDescription(
                "HT1 role for selected high-tier kit"
              )
        )

        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator
        );

    commands.push(
      setupCommand
    );

    // ==================================================
    // ADD ROLE
    // ==================================================

    commands.push(
      new SlashCommandBuilder()
        .setName("addrole")
        .setDescription(
          "Give roles permission to use a bot command"
        )

        .addStringOption(
          (option) =>
            option
              .setName("type")
              .setDescription(
                "Command permission"
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
          "Generate every kit tier role"
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
                "Channel to send message"
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
                "Message"
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
          "Post a normal tier result",
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
          "Post a high tier result",
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
        "✅ /result = normal results"
      );

      console.log(
        "✅ /highresults = high results"
      );

      console.log(
        "✅ /addrole Results = both result commands"
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
        "✅ High tickets = HIGH TICKETS category"
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
          .filter(Boolean);

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
          .filter(Boolean);

        data.setupName =
          name;

        data.testerRoles =
          testerRoles.map(
            (role) =>
              role.id
          );

        data.notifyRoles =
          notifyRoles.map(
            (role) =>
              role.id
          );

        saveDatabase();

        // ================================================
        // NORMAL SETUP
        // ================================================

        if (type === "normal") {
          const category =
            await getOrCreateCategory(
              guild,
              data,
              false
            );

          await updateCategoryPermissions(
            guild,
            data,
            category
          );

          await interaction.channel.send(
            buildRequestPanel(
              data
            )
          );

          return interaction.reply({
            content:
              `✅ **Normal Tier Testing setup complete!**\n\n` +
              `🧪 Testers: ${testerRoles.length}\n` +
              `🔔 Notify roles: ${notifyRoles.length}\n` +
              `📁 Category: ${category.name}\n\n` +
              `🗡️ Sword: **Best of 6**\n` +
              `🎯 Other kits: **Best of 3**`,
            ephemeral: true,
          });
        }

        // ================================================
        // HIGH SETUP
        // ================================================

        const highKit =
          interaction.options.getString(
            "high_kit"
          );

        if (!highKit) {
          return interaction.reply({
            content:
              "❌ For High Tier Testing, you must select `high_kit`.",
            ephemeral: true,
          });
        }

        const kit =
          getKit(highKit);

        if (!kit) {
          return interaction.reply({
            content:
              "❌ Invalid high-tier kit.",
            ephemeral: true,
          });
        }

        const roleMap =
          getHighTierRoleMap(
            data,
            highKit
          );

        const highRoleOptions = {
          LT3: "high_lt3",
          HT3: "high_ht3",
          LT2: "high_lt2",
          HT2: "high_ht2",
          LT1: "high_lt1",
          HT1: "high_ht1",
        };

        let configured =
          0;

        for (
          const [tier, optionName]
          of Object.entries(
            highRoleOptions
          )
        ) {
          const role =
            interaction.options.getRole(
              optionName
            );

          if (role) {
            roleMap[tier] =
              role.id;

            configured++;
          }
        }

        data.highTierRoles[
          highKit
        ] = roleMap;

        saveDatabase();

        const category =
          await getOrCreateCategory(
            guild,
            data,
            true
          );

        await updateCategoryPermissions(
          guild,
          data,
          category
        );

        await interaction.channel.send(
          buildHighRequestPanel(
            data
          )
        );

        return interaction.reply({
          content:
            `✅ **High Tier Testing setup complete for ${kit.name}!**\n\n` +
            `👑 High Tier category: ${category.name}\n` +
            `🧪 Testers: ${testerRoles.length}\n` +
            `🏆 High-tier eligibility roles configured: ${configured}/6\n\n` +
            `Players with the configured **LT3 or higher role for ${kit.name}** can request that high-tier kit.\n` +
            `🧪 Testers can access every high-tier kit.`,
          ephemeral: true,
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
          .map(
            (key) =>
              interaction.options.getRole(
                key
              )
          )
          .filter(Boolean);

        if (
          type === "message"
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
              `✅ Added ${roles.length} role(s) to **/message** permission.`,
            ephemeral: true,
          });
        }

        if (
          type === "results"
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
              `✅ Added ${roles.length} role(s) to **/result AND /highresults** permission.`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            "❌ Invalid permission type.",
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
            `🆕 Created: **${result.created}**\n` +
            `♻️ Already existed: **${result.existing}**\n\n` +
            `Each kit now has:\n` +
            `LT5 • HT5 • LT4 • HT4 • LT3 • HT3 • LT2 • HT2 • LT1 • HT1\n\n` +
            `⚠️ Make sure the bot's highest role is ABOVE these roles.`,
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
              "❌ Invalid normal result tier.",
            ephemeral: true,
          });
        }

        if (!getKit(kitKey)) {
          return interaction.reply({
            content:
              "❌ Invalid kit. Please select a kit from the menu.",
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

        // ================================================
        // AUTOMATIC ROLE
        // ================================================

        const roleResult =
          await applyTierRole({
            guild:
              interaction.guild,
            userId:
              user.id,
            kitKey,
            tier,
          });

        let roleMessage =
          "";

        if (
          roleResult.success
        ) {
          roleMessage =
            `\n🏆 Added role: **${roleResult.role.name}**`;
        } else {
          roleMessage =
            `\n⚠️ Role: ${roleResult.reason}`;
        }

        return interaction.reply({
          content:
            `✅ **Tier result posted!**\n\n` +
            `👤 **Player:** ${user}\n` +
            `📊 **Previous Tier:** ${previous}\n` +
            `🏆 **Earned Rank:** ${tier}` +
            roleMessage,
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

        if (
          previous !== "LT3"
        ) {
          return interaction.reply({
            content:
              "❌ High Tier Testing starts from **LT3**.",
            ephemeral: true,
          });
        }

        if (
          !HIGH_TIERS.includes(
            tier
          ) &&
          tier !== "FAILED"
        ) {
          return interaction.reply({
            content:
              "❌ Invalid high-tier result.",
            ephemeral: true,
          });
        }

        if (!getKit(kitKey)) {
          return interaction.reply({
            content:
              "❌ Invalid kit.",
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

        // ================================================
        // PASSED HIGH TIER
        // ================================================

        if (
          tier !== "FAILED"
        ) {
          const roleResult =
            await applyTierRole({
              guild:
                interaction.guild,
              userId:
                user.id,
              kitKey,
              tier,
            });

          let roleMessage =
            "";

          if (
            roleResult.success
          ) {
            roleMessage =
              `\n🏆 Added role: **${roleResult.role.name}**`;
          } else {
            roleMessage =
              `\n⚠️ Role: ${roleResult.reason}`;
          }

          return interaction.reply({
            content:
              `✅ **High tier result posted!**\n\n` +
              `👤 **Name:** ${user.username}\n` +
              `🏆 **PASSED ${tier} TEST**` +
              roleMessage,
            ephemeral: true,
          });
        }

        // ================================================
        // FAILED
        // ================================================

        return interaction.reply({
          content:
            `❌ **High tier result posted — FAILED HT3 TEST.**\n\n` +
            `👤 **Name:** ${user.username}\n` +
            `🎮 **GMTAG:** ${gmtag}\n` +
            `❌ No new high-tier role was assigned.`,
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
              "❌ That kit no longer exists.",
            ephemeral: true,
          });
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
            kit: kitKey,
            high: false,
            expires:
              Date.now() +
              5 * 60 * 1000,
          }
        );

        return interaction.reply({
          content:
            `${kit.emoji} **${kit.name} selected.**\n\n` +
            `⚔️ Format: **${
              kit.rounds === 6
                ? "Best of 6"
                : "Best of 3"
            }**\n\n` +
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
            Date.now() ||
          pending.high
        ) {
          return interaction.update({
            content:
              "❌ Your request expired. Select a kit again.",
            components: [],
          });
        }

        const region =
          interaction.values[0];

        const result =
          await createNormalTicket(
            interaction,
            pending.kit,
            region
          );

        client.pendingRequests.delete(
          requestKey
        );

        if (
          result.existing
        ) {
          return interaction.update({
            content:
              `⚠️ You already have an active testing ticket:\n${result.existing}`,
            components: [],
          });
        }

        return interaction.update({
          content:
            `✅ **Your testing ticket has been created!**\n\n` +
            `🎯 **Kit:** ${
              getKit(
                pending.kit
              ).emoji
            } ${
              getKit(
                pending.kit
              ).name
            }\n` +
            `🌎 **Region:** ${
              getRegion(
                region
              ).emoji
            } ${region}\n\n` +
            `📌 **The tester decides where the test will be done.**\n\n` +
            `🎫 ${result.ticket}`,
          components: [],
        });
      }

      // ==================================================
      // START HIGH TEST
      // ==================================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          "start_high_test"
      ) {
        const data =
          getGuildData(
            interaction.guild.id
          );

        const eligible =
          getEligibleHighKits(
            interaction.member,
            data
          );

        if (
          eligible.length === 0
        ) {
          return interaction.reply({
            content:
              `❌ **You cannot access High Tier Testing yet.**\n\n` +
              `You need an **LT3 or higher role for at least one kit**.\n\n` +
              `Example: **Dia SMP LT3**`,
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            `👑 **Select the kit you want to High Tier test:**`,
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
          "high_kit"
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
          return interaction.reply({
            content:
              "❌ Invalid kit.",
            ephemeral: true,
          });
        }

        if (
          !hasHighTierAccess(
            interaction.member,
            data,
            kitKey
          )
        ) {
          return interaction.reply({
            content:
              `❌ You do not have an **LT3 or higher role for ${kit.name}**.`,
            ephemeral: true,
          });
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
            kit: kitKey,
            high: true,
            expires:
              Date.now() +
              5 * 60 * 1000,
          }
        );

        return interaction.reply({
          content:
            `👑 ${kit.emoji} **${kit.name} High Tier selected.**\n\n` +
            `⚔️ Format: **${
              kit.rounds === 6
                ? "Best of 6"
                : "Best of 3"
            }**\n\n` +
            `Now select your region:`,
          components: [
            new ActionRowBuilder().addComponents(
              buildRegionMenu(
                "high_region"
              )
            ),
          ],
          ephemeral: true,
        });
      }

      // ==================================================
      // HIGH REGION
      // ==================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "high_region"
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
            Date.now() ||
          !pending.high
        ) {
          return interaction.update({
            content:
              "❌ Your high-tier request expired. Start again.",
            components: [],
          });
        }

        const data =
          getGuildData(
            interaction.guild.id
          );

        if (
          !hasHighTierAccess(
            interaction.member,
            data,
            pending.kit
          )
        ) {
          client.pendingRequests.delete(
            requestKey
          );

          return interaction.update({
            content:
              "❌ You no longer have the required high-tier role for this kit.",
            components: [],
          });
        }

        const region =
          interaction.values[0];

        const result =
          await createHighTicket(
            interaction,
            pending.kit,
            region
          );

        client.pendingRequests.delete(
          requestKey
        );

        if (
          result.denied
        ) {
          return interaction.update({
            content:
              "❌ You are not eligible for this high-tier kit.",
            components: [],
          });
        }

        if (
          result.existing
        ) {
          return interaction.update({
            content:
              `⚠️ You already have an active high-tier ticket:\n${result.existing}`,
            components: [],
          });
        }

        return interaction.update({
          content:
            `👑 **High Tier Ticket Created!**\n\n` +
            `🎯 **Kit:** ${
              getKit(
                pending.kit
              ).emoji
            } ${
              getKit(
                pending.kit
              ).name
            }\n` +
            `🌎 **Region:** ${region}\n\n` +
            `📌 **The tester decides where the test will be done.**\n` +
            `🧪 Configured testers can view and test this ticket.\n\n` +
            `🎫 ${result.ticket}`,
          components: [],
        });
      }

      // ==================================================
      // TICKET INFO
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

        const topic =
          interaction.channel.topic ||
          "";

        const parts =
          topic.split(":");

        const high =
          topic.startsWith(
            "HIGHTIERTEST:"
          );

        const kitKey =
          parts[2];

        const region =
          parts[3];

        const kit =
          getKit(kitKey);

        if (!kit) {
          return interaction.reply({
            content:
              "❌ This ticket has an invalid kit ID.",
            ephemeral: true,
          });
        }

        return interaction.reply({
          content:
            `${high ? "👑 **HIGH TIER TEST**" : "🏆 **TIER TEST**"}\n\n` +
            `👤 **Player:** <@${playerId}>\n` +
            `🎯 **Kit:** ${kit.emoji} ${kit.name}\n` +
            `🌎 **Region:** ${region}\n\n` +
            getTestingInstructions(
              kitKey,
              high
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
        const data =
          getGuildData(
            interaction.guild.id
          );

        if (
          !isTester(
            interaction.member,
            data
          )
        ) {
          return interaction.reply({
            content:
              "❌ Only configured testers can close tickets.",
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
        .setDescription(
          message
        )
        .setThumbnail(
          member.user.displayAvatarURL({
            size: 512,
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
            size: 512,
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
