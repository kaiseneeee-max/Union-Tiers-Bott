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

const PREVIOUS_TIERS = [
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
// This is a large Steve body image used when the user
// does not provide a skin.
//
// ======================================================

const DEFAULT_SKIN =
  "https://mc-heads.net/body/Steve/1000.png";

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

function makeChannelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

// ======================================================
// PERMISSION HELPERS
// ======================================================

function hasRoleFromList(member, roleIds) {
  if (!member) {
    return false;
  }

  return roleIds.some((roleId) =>
    member.roles.cache.has(roleId)
  );
}

// ======================================================
// TESTER
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

  return hasRoleFromList(
    member,
    guildData.testerRoles
  );
}

// ======================================================
// RESULT PERMISSION
// ======================================================

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

  return hasRoleFromList(
    member,
    guildData.resultRoles
  );
}

// ======================================================
// TICKET PERMISSION
// ======================================================

function canManageTickets(member, guildData) {
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

  return hasRoleFromList(
    member,
    guildData.ticketRoles
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

  return hasRoleFromList(
    member,
    guildData.messageRoles
  );
}

// ======================================================
// TESTING INSTRUCTIONS
// ======================================================

function getTestingInstructions(kitKey) {
  const kit = getKit(kitKey);

  const roundText =
    kit.rounds === 6
      ? "**Best of 6**"
      : "**Best of 3**";

  return (
    `🧪 **Testing Instructions**\n\n` +
    `${kit.emoji} **${kit.name}**\n\n` +
    `🏆 **Format:** ${roundText}\n` +
    `⚔️ **Rounds:** ${kit.rounds}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📌 **Testing Rules:**\n` +
    `• The tester decides where the test takes place.\n` +
    `• Use the selected kit for every round.\n` +
    `• Complete the required number of rounds.\n` +
    `• Make sure both players are ready before starting.\n` +
    `• The tester decides when the test is complete.`
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
          description:
            kit.rounds === 6
              ? "Best of 6"
              : "Best of 3",
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
          description:
            `Player region: ${region.name}`,
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
        `**5.** The tester decides where the test happens\n\n` +
        `🗡️ **Sword:** Best of 6\n` +
        `🎮 **Other kits:** Best of 3\n\n` +
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
// TICKET CATEGORY
// ======================================================

async function getOrCreateTicketCategory(
  guild,
  guildData
) {
  let category;

  if (guildData.ticketCategoryId) {
    category =
      guild.channels.cache.get(
        guildData.ticketCategoryId
      );
  }

  if (
    category &&
    category.type === ChannelType.GuildCategory
  ) {
    return category;
  }

  const visibleRoles = [
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

      ...visibleRoles.map((roleId) => ({
        id: roleId,

        allow: [
          PermissionFlagsBits.ViewChannel,
        ],
      })),
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
    .edit(guild.roles.everyone.id, {
      ViewChannel: false,
    })
    .catch(() => {});

  const visibleRoles = [
    ...new Set([
      ...guildData.testerRoles,
      ...guildData.ticketRoles,
    ]),
  ];

  for (const roleId of visibleRoles) {
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
// CREATE TESTING TICKET
// ======================================================

async function createTestingTicket(
  interaction,
  kitKey,
  region
) {
  const guild = interaction.guild;

  const user = interaction.user;

  const guildData =
    getGuildData(guild.id);

  const kit = getKit(kitKey);

  const regionData =
    getRegion(region);

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

  const ticketMentions =
    guildData.ticketRoles
      .filter((roleId) =>
        guild.roles.cache.has(roleId)
      )
      .map(
        (roleId) => `<@&${roleId}>`
      );

  const roleMentions = [
    ...testerMentions,
    ...ticketMentions,
    ...notifyMentions,
  ];

  const uniqueRoleMentions =
    [...new Set(roleMentions)];

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
          getTestingInstructions(
            kitKey
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
  resultTiers,
  testerCount,
}) {
  const command =
    new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)

      // USER
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription(
            "Player who was tested"
          )
          .setRequired(true)
      )

      // GMTAG
      .addStringOption((option) =>
        option
          .setName("gmtag")
          .setDescription(
            "Minecraft gamertag"
          )
          .setRequired(true)
      )

      // REGION
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

      // PREVIOUS
      .addStringOption((option) =>
        option
          .setName("previous")
          .setDescription(
            "Player's previous tier"
          )
          .setRequired(true)
          .addChoices(
            ...PREVIOUS_TIERS.map(
              (tier) => ({
                name: tier,
                value: tier,
              })
            )
          )
      )

      // TIER
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

      // TESTER 1
      .addUserOption((option) =>
        option
          .setName("tester1")
          .setDescription(
            "Tester"
          )
          .setRequired(true)
      )

      // SCORE 1
      .addStringOption((option) =>
        option
          .setName("score1")
          .setDescription(
            "Tester score, e.g. 3-2"
          )
          .setRequired(true)
      );

  // ====================================================
  // TESTER 2 FOR HIGH RESULTS
  // ====================================================

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
            "Second tester score, e.g. 3-1"
          )
          .setRequired(true)
    );
  }

  // ====================================================
  // KIT
  // ====================================================

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

  // ====================================================
  // SKIN
  // ====================================================

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
// SKIN URL
// ======================================================

function getSkinUrl(gmtag, skin) {
  if (
    skin &&
    skin.trim() !== ""
  ) {
    return skin.trim();
  }

  if (
    gmtag &&
    gmtag.trim() !== ""
  ) {
    return `https://mc-heads.net/body/${encodeURIComponent(
      gmtag.trim()
    )}/1000.png`;
  }

  return DEFAULT_SKIN;
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

  const promoted =
    isPromotion(
      previous,
      tier
    );

  let statusText;

  if (promoted) {
    statusText =
      `🎉 **PROMOTED**`;
  } else if (
    previous === tier
  ) {
    statusText =
      `🔄 **RETAINED**`;
  } else {
    statusText =
      `🏆 **RANKED**`;
  }

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

    `# 🏆 EARNED RANK: ${tier}\n\n` +

    `${statusText}\n\n` +

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
        }
      )

      .setThumbnail(
        user.displayAvatarURL({
          size: 256,
        })
      )

      .setImage(
        getSkinUrl(
          gmtag,
          skin
        )
      )

      .setFooter({
        text:
          `${interaction.guild.name} • Union Tier Testing`,
      })

      .setTimestamp();

  return embed;
}

// ======================================================
// AUTOMATIC TIER ROLE
// ======================================================
//
// Role format:
// Dia SMP LT5
// Dia SMP HT5
// Dia SMP LT4
// ...
// Dia SMP HT1
//
// Same for every kit.
//
// ======================================================

async function getOrCreateTierRole(
  guild,
  kitKey,
  tier
) {
  const kit =
    getKit(kitKey);

  const roleName =
    `${kit.name} ${tier}`;

  let role =
    guild.roles.cache.find(
      (r) =>
        r.name.toLowerCase() ===
        roleName.toLowerCase()
    );

  if (role) {
    return role;
  }

  try {
    role =
      await guild.roles.create({
        name: roleName,

        reason:
          `Union Tiers automatic tier role: ${roleName}`,
      });

    console.log(
      `✅ Created role: ${roleName}`
    );

    return role;
  } catch (error) {
    console.error(
      `❌ Could not create role ${roleName}:`,
      error
    );

    return null;
  }
}

// ======================================================
// REMOVE OLD KIT TIER ROLES
// ======================================================

async function removeOldKitTierRoles(
  member,
  kitKey,
  currentTier
) {
  const kit =
    getKit(kitKey);

  const rolePrefix =
    `${kit.name} `;

  const rolesToRemove =
    member.roles.cache.filter(
      (role) => {
        if (
          !role.name.startsWith(
            rolePrefix
          )
        ) {
          return false;
        }

        const tier =
          role.name.slice(
            rolePrefix.length
          );

        return (
          ALL_TIERS.includes(tier) &&
          tier !== currentTier
        );
      }
    );

  for (
    const [, role] of rolesToRemove
  ) {
    await member.roles
      .remove(
        role.id,
        `Updating ${kit.name} tier`
      )
      .catch((error) => {
        console.error(
          `❌ Could not remove role ${role.name}:`,
          error
        );
      });
  }
}

// ======================================================
// GIVE EARNED TIER ROLE
// ======================================================

async function giveTierRole(
  guild,
  userId,
  kitKey,
  tier
) {
  try {
    const member =
      await guild.members.fetch(
        userId
      );

    if (!member) {
      return {
        success: false,
        role: null,
      };
    }

    const role =
      await getOrCreateTierRole(
        guild,
        kitKey,
        tier
      );

    if (!role) {
      return {
        success: false,
        role: null,
      };
    }

    await removeOldKitTierRoles(
      member,
      kitKey,
      tier
    );

    await member.roles.add(
      role.id,
      `Earned ${tier} in ${getKit(kitKey).name}`
    );

    return {
      success: true,
      role,
    };
  } catch (error) {
    console.error(
      "❌ Tier role assignment error:",
      error
    );

    return {
      success: false,
      role: null,
    };
  }
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
              .setName("name")
              .setDescription(
                "Name shown on the testing panel"
              )
              .setRequired(true)
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
                "Role to notify when a ticket opens"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify2")
              .setDescription(
                "Role to notify when a ticket opens"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify3")
              .setDescription(
                "Role to notify when a ticket opens"
              )
        )

        .addRoleOption(
          (option) =>
            option
              .setName("notify4")
              .setDescription(
                "Role to notify when a ticket opens"
              )
        )

        .addRoleOption(
          (option) =>
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
          "Add roles to bot permissions"
        )

        .addStringOption(
          (option) =>
            option
              .setName("type")
              .setDescription(
                "Choose the permission"
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
    // RESULT
    // ==================================================

    commands.push(
      buildResultCommand({
        name: "result",

        description:
          "Post a LT3 and below tier result",

        resultTiers:
          NORMAL_TIERS,

        testerCount: 1,
      })
    );

    // ==================================================
    // HIGH RESULTS
    // ==================================================

    commands.push(
      buildResultCommand({
        name: "highresults",

        description:
          "Post a HT3 and above tier result",

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
        "✅ Slash commands registered."
      );

      console.log(
        "✅ /addrole = message, results, ticket"
      );

      console.log(
        "✅ Results roles can use /result and /highresults"
      );

      console.log(
        "✅ Ticket roles can view and close tickets"
      );

      console.log(
        "✅ Sword = Best of 6"
      );

      console.log(
        "✅ Other kits = Best of 3"
      );

      console.log(
        "✅ Automatic kit tier roles enabled"
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
            `🎫 **Ticket permission roles:** ${guildData.ticketRoles.length}\n` +
            `📁 **Ticket category:** ${category.name}\n\n` +
            `🗡️ **Sword:** Best of 6\n` +
            `🎮 **Other kits:** Best of 3\n\n` +
            `🏆 Tier roles will automatically be assigned after results.`,

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

        // ==================================================
        // MESSAGE
        // ==================================================

        if (type === "message") {
          for (
            const role of roles
          ) {
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
          for (
            const role of roles
          ) {
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
              `✅ Added ${roles.length} role(s) to **/result** and **/highresults** permission.`,

            ephemeral: true,
          });
        }

        // ==================================================
        // TICKET
        // ==================================================

        if (type === "ticket") {
          for (
            const role of roles
          ) {
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
              `✅ Added ${roles.length} role(s) to **ticket permission**.\n\n` +
              `🎫 They can now **view and close player tickets**.`,

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
        interaction.commandName === "welcome"
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
        interaction.commandName === "farewell"
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
        interaction.commandName === "message"
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
        interaction.commandName === "result"
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
        // AUTOMATIC ROLE
        // ==================================================

        const roleResult =
          await giveTierRole(
            interaction.guild,
            user.id,
            kitKey,
            tier
          );

        let roleText =
          roleResult.success &&
          roleResult.role
            ? `\n🎖️ **Role Given:** ${roleResult.role}`
            : `\n⚠️ **Tier role could not be assigned.** Make sure the bot's role is above the tier roles.`;

        return interaction.reply({
          content:
            `✅ **Tier result posted!**\n\n` +
            `👤 **Player:** ${user}\n` +
            `📊 **Previous Tier:** ${previous}\n` +
            `🏆 **EARNED RANK:** ${tier}\n` +
            `🎯 **Kit:** ${getKit(kitKey).name}\n` +
            `🧪 **Tester:** ${tester1}\n` +
            `⚔️ **Score:** ${score1}` +
            roleText,

          ephemeral: true,
        });
      }

      // ==================================================
      // HIGH RESULTS
      // ==================================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "highresults"
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
        // AUTOMATIC ROLE
        // ==================================================

        const roleResult =
          await giveTierRole(
            interaction.guild,
            user.id,
            kitKey,
            tier
          );

        let roleText =
          roleResult.success &&
          roleResult.role
            ? `\n🎖️ **Role Given:** ${roleResult.role}`
            : `\n⚠️ **Tier role could not be assigned.** Make sure the bot's role is above the tier roles.`;

        return interaction.reply({
          content:
            `✅ **High tier result posted!**\n\n` +
            `👤 **Player:** ${user}\n` +
            `📊 **Previous Tier:** ${previous}\n` +
            `🏆 **EARNED RANK:** ${tier}\n` +
            `🎯 **Kit:** ${getKit(kitKey).name}\n` +
            `🧪 **Tester 1:** ${tester1}\n` +
            `⚔️ **Score 1:** ${score1}\n` +
            `🧪 **Tester 2:** ${tester2}\n` +
            `⚔️ **Score 2:** ${score2}` +
            roleText,

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
            `🎯 **Kit:** ${getKit(kitKey).emoji} ${getKit(kitKey).name}\n` +
            `🌎 **Region:** ${getRegion(region).emoji} ${region}\n\n` +
            `🧪 The tester decides where the test takes place.\n` +
            `🔒 The ticket is private.\n\n` +
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

        if (
          !canManageTickets(
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
