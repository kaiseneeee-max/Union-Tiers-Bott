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
      ticketRoles: [],

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
// DEFAULT SKIN
// ======================================================
//
// This is the skin you showed from NameMC:
//
// https://namemc.com/skin/6cc743790519ce59
//
// Direct NameMC image:
//
// https://s.namemc.com/i/6cc743790519ce59.png
//
// If Discord/NameMC ever changes the image URL, replace
// this one URL with another direct .png skin URL.
//

const DEFAULT_SKIN_URL =
  "https://s.namemc.com/i/6cc743790519ce59.png";

// ======================================================
// KITS
// ======================================================
//
// Sword = Best of 6
// Everything else = Best of 3
//

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
// HELPERS
// ======================================================

function getKit(key) {
  return (
    KITS[key] || {
      name: "Unknown Kit",
      emoji: "🎮",
      rounds: 3,
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

  return guildData.testerRoles.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

// ======================================================
// RESULTS PERMISSION
// ======================================================
//
// Tester roles OR roles added with:
// /addrole type:results
//
// These roles can use BOTH:
// /result
// /highresults
//

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

  return guildData.resultRoles.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

// ======================================================
// MESSAGE PERMISSION
// ======================================================

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

  return guildData.messageRoles.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

// ======================================================
// TICKET PERMISSION
// ======================================================

function canManageTicket(member, guildData) {
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

  return guildData.ticketRoles.some((roleId) =>
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
    `⚔️ **Format:** Best of ${kit.rounds}\n\n` +
    `📍 **Testing Location:** The tester decides where the test will take place.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📌 **Things to do:**\n` +
    `• Complete up to ${kit.rounds} rounds.\n` +
    `• The tester decides the testing world/location.\n` +
    `• Use the selected kit for every round.\n` +
    `• Make sure both players are ready before starting.`
  );
}

// ======================================================
// REQUEST PANEL
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
          description: `Best of ${kit.rounds}`,
        })
      )
    );
}

function buildRegionMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId("request_region")
    .setPlaceholder("🌎 Select your region")
    .addOptions(
      Object.entries(REGIONS).map(
        ([value, region]) => ({
          label: region.name,
          value,
          emoji: region.emoji,
          description: `Use ${region.name} for your test`,
        })
      )
    );
}

function buildRequestPanel(guildData) {
  const embed = new EmbedBuilder()
    .setTitle(`🎟️ ${guildData.setupName}`)
    .setDescription(
      `Select the kit you want to test.\n\n` +
      `**1.** Select your kit\n` +
      `**2.** Select your region\n` +
      `**3.** A private testing ticket will be created\n` +
      `**4.** Testers and configured ticket roles can access it\n` +
      `**5.** The tester decides where to test\n\n` +
      `🔒 **Your ticket is private.**\n` +
      `🧪 **Configured result roles can submit results.**`
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
// TICKET CATEGORY
// ======================================================

async function getOrCreateTicketCategory(
  guild,
  guildData
) {
  let category;

  if (guildData.ticketCategoryId) {
    category = guild.channels.cache.get(
      guildData.ticketCategoryId
    );
  }

  if (
    category &&
    category.type === ChannelType.GuildCategory
  ) {
    return category;
  }

  const ticketRoles = [
    ...new Set([
      ...guildData.testerRoles,
      ...guildData.ticketRoles,
    ]),
  ];

  category = await guild.channels.create({
    name: "TEST TICKETS",

    type: ChannelType.GuildCategory,

    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,

        deny: [
          PermissionFlagsBits.ViewChannel,
        ],
      },

      ...ticketRoles.map((roleId) => ({
        id: roleId,

        allow: [
          PermissionFlagsBits.ViewChannel,
        ],
      })),
    ],
  });

  guildData.ticketCategoryId = category.id;

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
    .edit(guild.roles.everyone.id, {
      ViewChannel: false,
    })
    .catch(() => {});

  const ticketRoles = [
    ...new Set([
      ...guildData.testerRoles,
      ...guildData.ticketRoles,
    ]),
  ];

  for (const roleId of ticketRoles) {
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
// CREATE TICKET
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
      guildData
    );

  await updateCategoryPermissions(
    guild,
    guildData,
    category
  );

  const existing = findPlayerTicket(
    guild,
    category.id,
    user.id
  );

  if (existing) {
    return {
      existing,
    };
  }

  const ticketRoles = [
    ...new Set([
      ...guildData.testerRoles,
      ...guildData.ticketRoles,
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

    ...ticketRoles.map((roleId) => ({
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

      parent: category.id,

      topic:
        `TIERTEST:${user.id}:${kitKey}:${region}`,

      permissionOverwrites: overwrites,
    });

  // ====================================================
  // BUTTONS
  // ====================================================

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        `close_ticket:${user.id}`
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

  // ====================================================
  // ROLE NOTIFICATIONS
  // ====================================================

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
    ...testerMentions,
    ...notifyMentions,
  ];

  const uniqueRoleMentions = [
    ...new Set(roleMentions),
  ];

  const mentionContent =
    uniqueRoleMentions.length > 0
      ? uniqueRoleMentions.join(" ")
      : "";

  // ====================================================
  // TICKET EMBED
  // ====================================================

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

      .addStringOption((option) =>
        option
          .setName("tier")
          .setDescription(
            "New earned tier"
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
      );

  // ====================================================
  // TESTER 1
  // ====================================================

  command.addUserOption((option) =>
    option
      .setName("tester1")
      .setDescription("Tester")
      .setRequired(true)
  );

  // ====================================================
  // SCORE 1
  // ====================================================

  command.addStringOption((option) =>
    option
      .setName("score1")
      .setDescription(
        "Tester score, e.g. 3-2"
      )
      .setRequired(true)
  );

  // ====================================================
  // HIGH RESULTS
  // ====================================================

  if (testerCount === 2) {
    command.addUserOption((option) =>
      option
        .setName("tester2")
        .setDescription(
          "Second tester"
        )
        .setRequired(true)
    );

    command.addStringOption((option) =>
      option
        .setName("score2")
        .setDescription(
          "Second tester score, e.g. 3-1"
        )
        .setRequired(true)
    );
  }

  // ====================================================
  // KIT
  // ====================================================

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

  // ====================================================
  // OPTIONAL SKIN
  // ====================================================

  command.addStringOption((option) =>
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
// GET / CREATE KIT TIER ROLE
// ======================================================

async function getOrCreateKitTierRole(
  guild,
  kitKey,
  tier
) {
  const kit = getKit(kitKey);

  const roleName =
    `${kit.name} ${tier}`;

  let role = guild.roles.cache.find(
    (r) => r.name === roleName
  );

  if (role) {
    return role;
  }

  if (
    !guild.members.me?.permissions.has(
      PermissionFlagsBits.ManageRoles
    )
  ) {
    return null;
  }

  try {
    role = await guild.roles.create({
      name: roleName,
      reason:
        `Union Tiers automatic rank role for ${roleName}`,
    });

    return role;
  } catch (error) {
    console.error(
      `Could not create role ${roleName}:`,
      error
    );

    return null;
  }
}

// ======================================================
// GIVE KIT TIER ROLE
// ======================================================

async function giveKitTierRole(
  guild,
  user,
  kitKey,
  tier
) {
  const member =
    await guild.members
      .fetch(user.id)
      .catch(() => null);

  if (!member) {
    return {
      success: false,
      reason: "Player is not in the server.",
    };
  }

  const kit = getKit(kitKey);

  const targetRole =
    await getOrCreateKitTierRole(
      guild,
      kitKey,
      tier
    );

  if (!targetRole) {
    return {
      success: false,
      reason:
        "I could not create/find the tier role.",
    };
  }

  const botMember = guild.members.me;

  if (!botMember) {
    return {
      success: false,
      reason:
        "Bot member could not be found.",
    };
  }

  if (
    targetRole.position >=
    botMember.roles.highest.position
  ) {
    return {
      success: false,
      reason:
        `The role **${targetRole.name}** is above or equal to my highest role. Move my bot role above the tier roles.`,
    };
  }

  // ====================================================
  // REMOVE OLD TIER ROLES FOR THIS KIT
  // ====================================================

  const oldRoles =
    member.roles.cache.filter(
      (role) =>
        role.name.startsWith(
          `${kit.name} `
        ) &&
        ALL_TIERS.includes(
          role.name.replace(
            `${kit.name} `,
            ""
          )
        )
    );

  for (const [, oldRole] of oldRoles) {
    if (
      oldRole.id !== targetRole.id &&
      oldRole.position <
        botMember.roles.highest.position
    ) {
      await member.roles
        .remove(
          oldRole,
          `Updated ${kit.name} tier to ${tier}`
        )
        .catch(() => {});
    }
  }

  // ====================================================
  // ADD NEW ROLE
  // ====================================================

  try {
    await member.roles.add(
      targetRole,
      `Earned ${kit.name} ${tier}`
    );

    return {
      success: true,
      role: targetRole,
    };
  } catch (error) {
    console.error(
      "Tier role assignment error:",
      error
    );

    return {
      success: false,
      reason:
        "Discord rejected the role assignment. Make sure my bot role is above the tier roles and that I have Manage Roles.",
    };
  }
}

// ======================================================
// GENERATE ALL ROLES
// ======================================================

async function generateAllRoles(guild) {
  const results = {
    created: [],
    existing: [],
    failed: [],
  };

  if (
    !guild.members.me?.permissions.has(
      PermissionFlagsBits.ManageRoles
    )
  ) {
    throw new Error(
      "The bot needs the Manage Roles permission."
    );
  }

  const botHighest =
    guild.members.me.roles.highest;

  for (const [
    kitKey,
    kit,
  ] of Object.entries(KITS)) {
    for (const tier of ALL_TIERS) {
      const roleName =
        `${kit.name} ${tier}`;

      let role = guild.roles.cache.find(
        (r) => r.name === roleName
      );

      if (role) {
        results.existing.push(
          roleName
        );
        continue;
      }

      try {
        role =
          await guild.roles.create({
            name: roleName,
            reason:
              "Union Tiers /generaterole",
          });

        if (
          role.position >=
          botHighest.position
        ) {
          results.failed.push(
            `${roleName} - move the bot role higher`
          );
        } else {
          results.created.push(
            roleName
          );
        }
      } catch (error) {
        console.error(
          `Failed creating ${roleName}:`,
          error
        );

        results.failed.push(
          roleName
        );
      }
    }
  }

  return results;
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
  const kit = getKit(kitKey);

  const regionData =
    getRegion(region);

  let testerSection =
    `🧪 **TESTER & SCORE**\n\n` +
    `👤 **Tester:** ${tester1}\n` +
    `⚔️ **Score:** **${cleanText(
      score1
    )}**\n`;

  if (tester2) {
    testerSection +=
      `\n👤 **Tester 2:** ${tester2}\n` +
      `⚔️ **Score 2:** **${cleanText(
        score2
      )}**\n`;
  }

  const description =
    `👤 **Player:** ${user}\n` +
    `🎮 **GMTAG:** \`${gmtag}\`\n` +
    `${regionData.emoji} **Region:** ${regionData.name}\n\n` +

    `📊 **Previous Tier:** **${previous}**\n\n` +

    `# 🏆 EARNED RANK ${tier}\n\n` +

    `━━━━━━━━━━━━━━━━━━━━\n\n` +

    testerSection +

    `\n━━━━━━━━━━━━━━━━━━━━`;

  const embed =
    new EmbedBuilder()
      .setTitle("🏆 UNION TIERS")

      .setDescription(description)

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
            `**Best of ${kit.rounds}**`,
          inline: false,
        }
      )

      .setImage(
        skin &&
        skin.trim() !== ""
          ? skin.trim()
          : DEFAULT_SKIN_URL
      )

      .setFooter({
        text:
          `${interaction.guild.name} • Union Tier Testing`,
      })

      .setTimestamp();

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
              "Role to notify when a ticket opens"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("notify2")
            .setDescription(
              "Role to notify when a ticket opens"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("notify3")
            .setDescription(
              "Role to notify when a ticket opens"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("notify4")
            .setDescription(
              "Role to notify when a ticket opens"
            )
        )

        .addRoleOption((option) =>
          option
            .setName("notify5")
            .setDescription(
              "Role to notify when a ticket opens"
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
          "Give roles access to bot features"
        )

        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription(
              "Choose what the roles can access"
            )
            .setRequired(true)
            .addChoices(
              {
                name: "💬 Message",
                value: "message",
              },
              {
                name: "🏆 Results",
                value: "results",
              },
              {
                name: "🎫 Ticket",
                value: "ticket",
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
    // GENERATE ROLE
    // ==================================================

    commands.push(
      new SlashCommandBuilder()
        .setName("generaterole")
        .setDescription(
          "Generate all Union Tiers kit and tier roles"
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
    // NORMAL RESULT
    // ==================================================

    commands.push(
      buildResultCommand({
        name: "result",

        description:
          "Post an LT3 and below tier testing result",

        previousTiers:
          NORMAL_PREVIOUS_TIERS,

        resultTiers:
          NORMAL_TIERS,

        testerCount: 1,
      })
    );

    // ==================================================
    // HIGH RESULT
    // ==================================================

    commands.push(
      buildResultCommand({
        name: "highresults",

        description:
          "Post an HT3 and above tier testing result",

        previousTiers:
          HIGH_PREVIOUS_TIERS,

        resultTiers:
          HIGH_TIERS,

        testerCount: 2,
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
        "✅ Slash commands registered successfully."
      );

      console.log(
        "✅ /addrole = Message / Results / Ticket"
      );

      console.log(
        "✅ Results roles can use /result AND /highresults"
      );

      console.log(
        "✅ /generaterole = creates all kit/tier roles"
      );

      console.log(
        "✅ Sword = Best of 6"
      );

      console.log(
        "✅ Other kits = Best of 3"
      );

      console.log(
        "✅ Default skin configured"
      );
    } catch (error) {
      console.error(
        "❌ Command registration error:"
      );

      console.error(error);
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
          .filter(
            (role) => role
          );

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
          .filter(
            (role) => role
          );

        guildData.setupName =
          name;

        guildData.testerRoles =
          testerRoles.map(
            (role) => role.id
          );

        guildData.notifyRoles =
          notifyRoles.map(
            (role) => role.id
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

        await interaction.channel.send(
          buildRequestPanel(
            guildData
          )
        );

        return interaction.reply({
          content:
            `✅ **${name}** setup complete!\n\n` +
            `🧪 **Tester roles:** ${testerRoles.length}\n` +
            `🔔 **Notification roles:** ${notifyRoles.length}\n` +
            `📁 **Ticket category:** ${category.name}\n\n` +
            `🏆 **/result:** LT3 and below\n` +
            `👑 **/highresults:** HT3 and above\n` +
            `⚔️ **Sword:** Best of 6\n` +
            `⚔️ **Other kits:** Best of 3\n\n` +
            `🎫 Use **/addrole type:ticket** to allow additional roles to view/close tickets.\n` +
            `🏆 Use **/addrole type:results** to allow roles to use both result commands.\n` +
            `👑 Use **/generaterole** to create all kit/tier roles.`,

          ephemeral: true,
        });
      }

      // ==================================================
      // ADD ROLE
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "addrole"
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
          getGuildData(
            guild.id
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
          .filter(
            (role) => role
          );

        if (roles.length === 0) {
          return interaction.reply({
            content:
              "❌ You must select at least one role.",
            ephemeral: true,
          });
        }

        // ==================================================
        // MESSAGE
        // ==================================================

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

        // ==================================================
        // RESULTS
        // ==================================================

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
              `✅ Added ${roles.length} role(s) to **/result AND /highresults** permission.`,

            ephemeral: true,
          });
        }

        // ==================================================
        // TICKET
        // ==================================================

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

          // Update all existing tickets too
          for (const channel of guild.channels.cache.values()) {
            if (
              channel.type ===
                ChannelType.GuildText &&
              channel.parentId ===
                category.id &&
              typeof channel.topic ===
                "string" &&
              channel.topic.startsWith(
                "TIERTEST:"
              )
            ) {
              for (const role of roles) {
                await channel.permissionOverwrites
                  .edit(role.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                  })
                  .catch(() => {});
              }
            }
          }

          return interaction.reply({
            content:
              `✅ Added ${roles.length} role(s) to **Ticket permission**.\n\n` +
              `🎫 They can now **view tickets and close tickets**.`,

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
      // GENERATE ROLES
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

        if (
          !interaction.guild.members.me?.permissions.has(
            PermissionFlagsBits.ManageRoles
          )
        ) {
          return interaction.reply({
            content:
              "❌ I need the **Manage Roles** permission first.",
            ephemeral: true,
          });
        }

        await interaction.deferReply({
          ephemeral: true,
        });

        const result =
          await generateAllRoles(
            interaction.guild
          );

        return interaction.editReply({
          content:
            `👑 **ROLE GENERATION COMPLETE**\n\n` +
            `🆕 Created: **${result.created.length}**\n` +
            `♻️ Already existed: **${result.existing.length}**\n` +
            `❌ Failed: **${result.failed.length}**\n\n` +
            `📊 Total kit/tier combinations: **${Object.keys(KITS).length * ALL_TIERS.length}**\n\n` +
            (
              result.failed.length > 0
                ? `⚠️ **Failed roles:**\n${result.failed.slice(0, 20).join("\n")}\n\n`
                : ""
            ) +
            `💡 Make sure the bot's highest role is above all generated tier roles.`,
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
              "❌ Invalid previous tier for `/result`.",
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
              "❌ `/result` can only give LT3, HT4, LT4, HT5 or LT5.",
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

        // ==================================================
        // AUTOMATIC RANK ROLE
        // ==================================================

        const roleResult =
          await giveKitTierRole(
            interaction.guild,
            user,
            kitKey,
            tier
          );

        let roleMessage = "";

        if (roleResult.success) {
          roleMessage =
            `\n🎖️ **Role given:** ${roleResult.role}`;
        } else {
          roleMessage =
            `\n⚠️ **Rank role:** ${roleResult.reason}`;
        }

        return interaction.reply({
          content:
            `✅ **Tier result posted!**\n\n` +
            `👤 **Player:** ${user}\n` +
            `📊 **Previous Tier:** ${previous}\n` +
            `🏆 **EARNED RANK:** ${tier}\n` +
            `🎯 **Kit:** ${getKit(
              kitKey
            ).name}\n` +
            `🧪 **Tester:** ${tester1}\n` +
            `⚔️ **Score:** ${score1}` +
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
          !score1 ||
          score1.trim() === ""
        ) {
          return interaction.reply({
            content:
              "❌ Score 1 is required.",
            ephemeral: true,
          });
        }

        if (
          !score2 ||
          score2.trim() === ""
        ) {
          return interaction.reply({
            content:
              "❌ Score 2 is required.",
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
            tester2,
            score2,
            skin,
          });

        await interaction.channel.send({
          embeds: [embed],
        });

        // ==================================================
        // AUTOMATIC RANK ROLE
        // ==================================================

        const roleResult =
          await giveKitTierRole(
            interaction.guild,
            user,
            kitKey,
            tier
          );

        let roleMessage = "";

        if (roleResult.success) {
          roleMessage =
            `\n🎖️ **Role given:** ${roleResult.role}`;
        } else {
          roleMessage =
            `\n⚠️ **Rank role:** ${roleResult.reason}`;
        }

        return interaction.reply({
          content:
            `✅ **High tier result posted!**\n\n` +
            `👤 **Player:** ${user}\n` +
            `📊 **Previous Tier:** ${previous}\n` +
            `🏆 **EARNED RANK:** ${tier}\n` +
            `🎯 **Kit:** ${getKit(
              kitKey
            ).name}\n` +
            `🧪 **Tester 1:** ${tester1}\n` +
            `⚔️ **Score 1:** ${score1}\n` +
            `🧪 **Tester 2:** ${tester2}\n` +
            `⚔️ **Score 2:** ${score2}` +
            roleMessage,

          ephemeral: true,
        });
      }

      // ==================================================
      // KIT SELECT
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
            `⚔️ **Format:** Best of ${kit.rounds}\n` +
            `📍 **The tester decides where the test happens.**\n\n` +
            `Now select your region:`,

          components: [
            new ActionRowBuilder().addComponents(
              buildRegionMenu()
            ),
          ],

          ephemeral: true,
        });
      }

      // ==================================================
      // REGION SELECT
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
            `✅ **Your testing ticket has been created!**\n\n` +
            `🎯 **Kit:** ${getKit(
              kitKey
            ).emoji} ${getKit(
              kitKey
            ).name}\n` +
            `🌎 **Region:** ${getRegion(
              region
            ).emoji} ${region}\n` +
            `⚔️ **Format:** Best of ${getKit(
              kitKey
            ).rounds}\n\n` +
            `📍 The tester decides where the test happens.\n` +
            `🔒 The ticket is private.\n` +
            `🧪 Testers and configured ticket roles can access it.\n\n` +
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
          ).split(":");

        const kitKey =
          parts[2];

        const region =
          parts[3];

        const kit =
          getKit(kitKey);

        return interaction.reply({
          content:
            `📋 **Tier Test Information**\n\n` +
            `👤 **Player:** <@${playerId}>\n` +
            `🎯 **Kit:** ${kit.emoji} ${kit.name}\n` +
            `🌎 **Region:** ${getRegion(
              region
            ).emoji} ${region}\n` +
            `⚔️ **Format:** Best of ${kit.rounds}\n\n` +
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

        if (
          !canManageTicket(
            interaction.member,
            guildData
          )
        ) {
          return interaction.reply({
            content:
              "❌ You don't have permission to close tickets.",
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
          member.user.displayAvatarURL(
            {
              size: 256,
            }
          )
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
          member.user.displayAvatarURL(
            {
              size: 256,
            }
          )
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
