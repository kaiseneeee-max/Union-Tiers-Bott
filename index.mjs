import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";
import fs from "fs";

const TOKEN = process.env.DISCORD_TOKEN;
const FILE = "./data.json";

/* =========================
   DEFAULT UNION SKIN
========================= */
const DEFAULT_SKIN =
  "https://render.namemc.com/skin/3d/body.png?skin=6cc743790519ce59&model=normal&theta=20&phi=0&width=700&height=900";

/* =========================
   KITS
========================= */
const KITS = {
  sword: ["Sword", "🗡️", 6],
  axe: ["Axe", "🪓", 3],
  uhc: ["UHC", "🛡️", 3],
  dia_smp: ["Dia SMP", "💎", 3],
  neth_pot: ["Neth Pot", "🔥", 3],
  mace: ["Mace", "🔨", 3],
  spear_mace: ["Spear Mace", "⚔️", 3],
  crystal: ["Crystal", "💠", 3],
  cart: ["Cart", "🛒", 3]
};

/* =========================
   REGIONS
========================= */
const REGIONS = {
  AS: ["AS", "🌏"],
  EU: ["EU", "🌍"],
  NA: ["NA", "🌎"],
  OC: ["OC", "🌊"]
};

/* =========================
   TIERS
========================= */
const TIERS = [
  "LT5",
  "HT5",
  "LT4",
  "HT4",
  "LT3",
  "HT3",
  "LT2",
  "HT2",
  "LT1",
  "HT1"
];

const HIGH = [
  "HT3",
  "LT2",
  "HT2",
  "LT1",
  "HT1"
];

const HIGH_ACCESS = [
  "LT3",
  "HT3",
  "LT2",
  "HT2",
  "LT1",
  "HT1"
];

const RANK = Object.fromEntries(
  TIERS.map((tier, index) => [tier, index + 1])
);

/* =========================
   DATABASE
========================= */
let db = { guilds: {} };

try {
  if (fs.existsSync(FILE)) {
    db = JSON.parse(fs.readFileSync(FILE, "utf8"));
  }
} catch {
  db = { guilds: {} };
}

function save() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function getGuildData(guildId) {
  let d = db.guilds[guildId];

  if (!d) {
    d = db.guilds[guildId] = {
      setupName: "Union Tier Testing",
      testerRoles: [],
      ticketRoles: [],
      resultRoles: [],
      ticketCategoryId: "",
      highCategoryId: "",
      highAccessRoles: {},
      generatedTierRoles: {}
    };
  }

  d.testerRoles ??= [];
  d.ticketRoles ??= [];
  d.resultRoles ??= [];
  d.highAccessRoles ??= {};
  d.generatedTierRoles ??= {};

  return d;
}

/* =========================
   HELPERS
========================= */
const kit = k => KITS[k];
const kitName = k => KITS[k]?.[0] || "Unknown Kit";
const kitEmoji = k => KITS[k]?.[1] || "🎮";
const kitRounds = k => KITS[k]?.[2] || 3;

function isAdmin(member) {
  return member.permissions?.has(PermissionFlagsBits.Administrator);
}

function hasRoles(member, ids) {
  return ids.some(id => member.roles.cache.has(id));
}

function isTester(member, d) {
  return isAdmin(member) || hasRoles(member, d.testerRoles);
}

function canUseResults(member, d) {
  return (
    isAdmin(member) ||
    isTester(member, d) ||
    hasRoles(member, d.resultRoles)
  );
}

function canUseTicket(member, d) {
  return (
    isAdmin(member) ||
    isTester(member, d) ||
    hasRoles(member, d.ticketRoles)
  );
}

function highRoles(d, kitKey) {
  return Array.isArray(d.highAccessRoles[kitKey])
    ? d.highAccessRoles[kitKey]
    : [];
}

function canHighTest(member, d, kitKey) {
  return (
    isAdmin(member) ||
    isTester(member, d) ||
    hasRoles(member, highRoles(d, kitKey))
  );
}

function roleMention(id) {
  return `<@&${id}>`;
}

/* =========================
   MENUS
========================= */
function kitMenu(id, placeholder) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(id)
      .setPlaceholder(placeholder)
      .addOptions(
        Object.entries(KITS).map(([value, x]) => ({
          label: x[0],
          value,
          emoji: x[1],
          description: x[2] === 6 ? "Best of 6" : "Best of 3"
        }))
      )
  );
}

function regionMenu(id) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(id)
      .setPlaceholder("🌎 Select region")
      .addOptions(
        Object.entries(REGIONS).map(([value, x]) => ({
          label: x[0],
          value,
          emoji: x[1]
        }))
      )
  );
}

/* =========================
   TEST INFORMATION
========================= */
function instructions(kitKey) {
  return (
    `${kitEmoji(kitKey)} **${kitName(kitKey)}**\n` +
    `⚔️ **Format:** ${
      kitRounds(kitKey) === 6 ? "Best of 6" : "Best of 3"
    }\n` +
    `🔢 **Rounds:** ${kitRounds(kitKey)}\n` +
    `📌 **Tester decides where the test will be done.**`
  );
}

/* =========================
   CATEGORIES
========================= */
async function getCategory(guild, d, high = false) {
  const field = high ? "highCategoryId" : "ticketCategoryId";
  const name = high ? "HIGH TICKETS" : "TEST TICKETS";

  let category =
    d[field] && guild.channels.cache.get(d[field]);

  if (
    !category ||
    category.type !== ChannelType.GuildCategory
  ) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });
  }

  d[field] = category.id;

  await category.permissionOverwrites
    .edit(guild.roles.everyone.id, {
      ViewChannel: false
    })
    .catch(() => {});

  for (const id of d.testerRoles) {
    await category.permissionOverwrites
      .edit(id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      })
      .catch(() => {});
  }

  if (high) {
    const roles = [
      ...new Set(
        Object.values(d.highAccessRoles).flat()
      )
    ];

    for (const id of roles) {
      await category.permissionOverwrites
        .edit(id, {
          ViewChannel: true
        })
        .catch(() => {});
    }
  }

  save();
  return category;
}

/* =========================
   CREATE TICKET
========================= */
async function createTicket(
  interaction,
  kitKey,
  region,
  high = false
) {
  const d = getGuildData(interaction.guild.id);

  if (!kit(kitKey) || !REGIONS[region]) {
    return { error: "Invalid kit." };
  }

  if (
    high &&
    !canHighTest(
      interaction.member,
      d,
      kitKey
    )
  ) {
    return {
      error:
        "You are not eligible for this kit."
    };
  }

  const category = await getCategory(
    interaction.guild,
    d,
    high
  );

  const prefix =
    `${high ? "HIGHTIER" : "TIERTEST"}:` +
    `${interaction.user.id}:`;

  const existing =
    interaction.guild.channels.cache.find(
      channel =>
        channel.parentId === category.id &&
        channel.topic?.startsWith(prefix)
    );

  if (existing) {
    return { existing };
  }

  const accessRoles = high
    ? [
        ...new Set([
          ...d.testerRoles,
          ...highRoles(d, kitKey)
        ])
      ]
    : [...d.testerRoles];

  const overwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles
      ]
    }
  ];

  for (const id of accessRoles) {
    overwrites.push({
      id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles
      ]
    });
  }

  const channel =
    await interaction.guild.channels.create({
      name:
        `${high ? "high" : "test"}-${kitKey}-${interaction.user.username}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .slice(0, 90),

      type: ChannelType.GuildText,

      parent: category.id,

      topic:
        `${high ? "HIGHTIER" : "TIERTEST"}:` +
        `${interaction.user.id}:${kitKey}:${region}`,

      permissionOverwrites: overwrites
    });

  const closeButton =
    new ButtonBuilder()
      .setCustomId(
        `close:${high ? "high" : "normal"}`
      )
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger);

  const infoButton =
    new ButtonBuilder()
      .setCustomId("ticket_info")
      .setLabel("Testing Info")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary);

  const mentions = [
    ...new Set([
      ...d.testerRoles,
      ...(high ? highRoles(d, kitKey) : []),
      ...d.ticketRoles
    ])
  ]
    .filter(id =>
      interaction.guild.roles.cache.has(id)
    )
    .map(roleMention);

  const embed =
    new EmbedBuilder()
      .setTitle(
        high
          ? "👑 HIGH TIER TESTING"
          : "🎟️ NEW TIER TEST TICKET"
      )
      .setDescription(
        `${kitEmoji(kitKey)} **${kitName(kitKey)} Tier Test**\n\n` +

        `👤 **Player:** ${interaction.user}\n` +

        `🎮 **Discord:** ${interaction.user.username}\n` +

        `${REGIONS[region][1]} **Region:** ${region}\n` +

        `⚔️ **Format:** ${
          kitRounds(kitKey) === 6
            ? "Best of 6"
            : "Best of 3"
        }\n\n` +

        `🧪 **Testing Instructions**\n` +

        `${instructions(kitKey)}\n\n` +

        `━━━━━━━━━━━━━━━━━━━━\n` +

        `📌 **Testing Rules**\n` +

        `• Tester decides where the test is done.\n` +
        `• Complete the required rounds.\n` +
        `• Both players must be ready before starting.\n` +
        `• Follow the tester's instructions.`
      )
      .setColor(
        high ? 0xff3030 : 0xffc107
      )
      .setThumbnail(
        interaction.user.displayAvatarURL({
          size: 256
        })
      )
      .setFooter({
        text:
          "UNION TIERS • Union Tier Testing"
      });

  await channel.send({
    content:
      `${mentions.join(" ")}\n` +
      `🎫 **${
        high ? "New High Tier" : "New Tier"
      } Test Ticket**\n` +
      `<@${interaction.user.id}> has opened a ` +
      `${kitEmoji(kitKey)} **${kitName(
        kitKey
      )}** test.`,

    embeds: [embed],

    components: [
      new ActionRowBuilder().addComponents(
        closeButton,
        infoButton
      )
    ]
  });

  return { channel };
}

/* =========================
   NORMAL PANEL
========================= */
function normalPanel(d) {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`🎟️ ${d.setupName}`)
        .setDescription(
          "Select your kit, then select your region.\n\n" +
          "🔒 A private testing ticket will be created.\n" +
          "📌 The tester decides where the test is done."
        )
        .setColor(0xffc107)
    ],

    components: [
      kitMenu(
        "normal_kit",
        "🎯 Select a kit"
      )
    ]
  };
}

/* =========================
   HIGH TIER PANEL
========================= */
function highPanel(d) {
  const lines =
    Object.entries(KITS)
      .map(([key, x]) => {
        const roles = highRoles(d, key);

        return (
          `${x[1]} **${x[0]}:** ` +
          (
            roles.length
              ? roles.map(roleMention).join(", ")
              : "❌ Not configured"
          )
        );
      })
      .join("\n");

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("👑 HIGH TIER TESTING")
        .setDescription(
          "You must already have an **LT3-or-above role** " +
          "for the kit you want to test.\n\n" +

          lines +

          "\n\n" +

          "You can ONLY select kits where you have " +
          "one of the configured roles.\n\n" +

          "📌 Tester decides where the test will be done."
        )
        .setColor(0xff3030)
    ],

    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("high_start")
          .setLabel("Start High Tier Test")
          .setEmoji("👑")
          .setStyle(ButtonStyle.Danger)
      )
    ]
  };
}

/* =========================
   HIGH SETUP PANEL
========================= */
function highSetupPanel(d) {
  const menu =
    new StringSelectMenuBuilder()
      .setCustomId("high_config_kit")
      .setPlaceholder("⚙️ Select a kit")
      .addOptions(
        Object.entries(KITS).map(
          ([value, x]) => ({
            label: x[0],
            value,
            emoji: x[1],
            description:
              "Select up to 6 LT3+ access roles"
          })
        )
      );

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("⚙️ HIGH TIER SETUP")
        .setDescription(
          "Select a kit and choose the roles " +
          "allowed to request High Tier Testing.\n\n" +

          "Recommended roles:\n" +
          "🏆 LT3\n" +
          "🏆 HT3\n" +
          "🏆 LT2\n" +
          "🏆 HT2\n" +
          "🏆 LT1\n" +
          "🏆 HT1\n\n" +

          "You can select multiple roles for each kit.\n\n" +

          "Configured roles can request/view the " +
          "appropriate High Tier tickets.\n\n" +

          "Normal tester roles can view and test ALL " +
          "High Tier tickets."
        )
        .setColor(0xff3030)
    ],

    components: [
      new ActionRowBuilder().addComponents(
        menu
      ),

      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("high_post")
          .setLabel("Post High Testing Panel")
          .setEmoji("📢")
          .setStyle(ButtonStyle.Danger)
      )
    ]
  };
}

/* =========================
   RESULT COMMAND
========================= */
function resultCommand() {
  return new SlashCommandBuilder()
    .setName("result")
    .setDescription(
      "Post a normal tier result"
    )

    .addUserOption(o =>
      o.setName("user")
        .setDescription("Player")
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("gmtag")
        .setDescription("Minecraft gamertag")
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("region")
        .setDescription("Region")
        .setRequired(true)
        .addChoices(
          ...Object.keys(REGIONS).map(
            x => ({
              name: x,
              value: x
            })
          )
        )
    )

    .addStringOption(o =>
      o.setName("previous")
        .setDescription("Previous tier")
        .setRequired(true)
        .addChoices(
          {
            name: "No Record",
            value: "No Record"
          },
          ...TIERS.map(
            x => ({
              name: x,
              value: x
            })
          )
        )
    )

    .addStringOption(o =>
      o.setName("tier")
        .setDescription("Earned tier")
        .setRequired(true)
        .addChoices(
          ...TIERS.map(
            x => ({
              name: x,
              value: x
            })
          )
        )
    )

    .addUserOption(o =>
      o.setName("tester1")
        .setDescription("Tester 1")
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("score1")
        .setDescription("Score")
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("kit")
        .setDescription("Kit")
        .setRequired(true)
        .addChoices(
          ...Object.entries(KITS).map(
            ([v, x]) => ({
              name: x[0],
              value: v
            })
          )
        )
    )

    .addStringOption(o =>
      o.setName("skin")
        .setDescription(
          "Skin URL. Leave empty for UNION default skin."
        )
        .setRequired(false)
    );
}

/* =========================
   HIGH RESULTS COMMAND
========================= */
function highResultsCommand() {
  return new SlashCommandBuilder()
    .setName("highresults")
    .setDescription(
      "Post a high tier result"
    )

    .addUserOption(o =>
      o.setName("user")
        .setDescription("Player")
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("gmtag")
        .setDescription("Minecraft gamertag")
        .setRequired(true)
    )

    .addUserOption(o =>
      o.setName("tester1")
        .setDescription("Tester 1")
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("score1")
        .setDescription(
          "Tester 1 vs Player score"
        )
        .setRequired(true)
    )

    .addUserOption(o =>
      o.setName("tester2")
        .setDescription("Tester 2")
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("score2")
        .setDescription(
          "Tester 2 vs Player score"
        )
        .setRequired(true)
    )

    .addStringOption(o =>
      o.setName("tier")
        .setDescription("High tier result")
        .setRequired(true)
        .addChoices(
          ...HIGH.map(
            x => ({
              name: x,
              value: x
            })
          ),
          {
            name: "FAILED HT3 TEST",
            value: "FAILED"
          }
        )
    )

    .addStringOption(o =>
      o.setName("kit")
        .setDescription("Kit")
        .setRequired(true)
        .addChoices(
          ...Object.entries(KITS).map(
            ([v, x]) => ({
              name: x[0],
              value: v
            })
          )
        )
    )

    .addStringOption(o =>
      o.setName("skin")
        .setDescription(
          "Skin URL. Leave empty for UNION default skin."
        )
        .setRequired(false)
    );
}

/* =========================
   GENERATE ALL ROLES
========================= */
async function generateTierRoles(guild, d) {
  let created = 0;

  for (const [kitKey, x] of Object.entries(KITS)) {
    d.generatedTierRoles[kitKey] ??= {};

    for (const tier of TIERS) {
      let role =
        d.generatedTierRoles[kitKey][tier]
          ? guild.roles.cache.get(
              d.generatedTierRoles[kitKey][tier]
            )
          : null;

      if (!role) {
        role =
          guild.roles.cache.find(
            r =>
              r.name ===
              `${x[0]} ${tier}`
          ) ||
          await guild.roles.create({
            name:
              `${x[0]} ${tier}`,
            reason:
              "UNION Tiers generated tier role"
          });
      }

      d.generatedTierRoles[kitKey][tier] =
        role.id;

      created++;
    }
  }

  save();

  return created;
}

/* =========================
   ASSIGN KIT TIER ROLE
========================= */
async function assignKitTierRole(
  member,
  d,
  kitKey,
  tier
) {
  const id =
    d.generatedTierRoles?.[kitKey]?.[tier];

  if (!id) return null;

  const role =
    member.guild.roles.cache.get(id);

  if (!role) return null;

  await member.roles
    .add(role)
    .catch(() => {});

  return role;
}

/* =========================
   COMMANDS
========================= */
const commands = [

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription(
      "Set up UNION Tiers"
    )

    .addStringOption(o =>
      o.setName("type")
        .setDescription("Setup type")
        .setRequired(true)
        .addChoices(
          {
            name: "🎟️ Tier Testing",
            value: "tier"
          },
          {
            name: "👑 High Tier Testing",
            value: "high"
          }
        )
    )

    .addStringOption(o =>
      o.setName("name")
        .setDescription(
          "Testing panel name"
        )
        .setRequired(false)
    )

    .addRoleOption(o =>
      o.setName("tester1")
        .setDescription(
          "Tester role 1"
        )
        .setRequired(false)
    )

    .addRoleOption(o =>
      o.setName("tester2")
        .setDescription(
          "Tester role 2"
        )
        .setRequired(false)
    )

    .addRoleOption(o =>
      o.setName("tester3")
        .setDescription(
          "Tester role 3"
        )
        .setRequired(false)
    )

    .addRoleOption(o =>
      o.setName("tester4")
        .setDescription(
          "Tester role 4"
        )
        .setRequired(false)
    )

    .addRoleOption(o =>
      o.setName("tester5")
        .setDescription(
          "Tester role 5"
        )
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("addrole")
    .setDescription(
      "Add a bot access role"
    )

    .addStringOption(o =>
      o.setName("type")
        .setDescription(
          "Access type"
        )
        .setRequired(true)
        .addChoices(
          {
            name: "🎫 Ticket Access",
            value: "ticket"
          },
          {
            name: "🏆 Results Access",
            value: "results"
          }
        )
    )

    .addRoleOption(o =>
      o.setName("role")
        .setDescription(
          "Role to add"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("generaterole")
    .setDescription(
      "Generate all kit tier roles"
    ),

  resultCommand(),
  highResultsCommand()
];

/* =========================
   CLIENT
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* =========================
   REGISTER COMMANDS
========================= */
client.once("ready", async () => {
  const rest =
    new REST({
      version: "10"
    }).setToken(TOKEN);

  for (const guild of client.guilds.cache.values()) {
    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        guild.id
      ),
      {
        body: commands.map(
          command => command.toJSON()
        )
      }
    );
  }

  console.log(
    `✅ ${client.user.tag} is online`
  );
});

/* =========================
   INTERACTIONS
========================= */
client.on(
  "interactionCreate",
  async interaction => {

    try {

      const d =
        getGuildData(
          interaction.guild.id
        );

      /* =====================
         SLASH COMMANDS
      ===================== */
      if (
        interaction.isChatInputCommand()
      ) {

        /* SETUP */
        if (
          interaction.commandName ===
          "setup"
        ) {

          if (
            !isAdmin(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                "❌ Administrator only.",
              ephemeral: true
            });
          }

          const type =
            interaction.options.getString(
              "type"
            );

          const name =
            interaction.options.getString(
              "name"
            );

          if (name) {
            d.setupName = name;
          }

          const testerRoles =
            [1, 2, 3, 4, 5]
              .map(number =>
                interaction.options.getRole(
                  `tester${number}`
                )?.id
              )
              .filter(Boolean);

          if (testerRoles.length) {
            d.testerRoles = [
              ...new Set(
                testerRoles
              )
            ];
          }

          save();

          if (type === "tier") {

            await interaction.reply({
              content:
                "✅ **Tier Testing setup saved.**",
              ephemeral: true
            });

            return interaction.channel.send(
              normalPanel(d)
            );
          }

          await interaction.reply({
            content:
              "✅ **High Tier Testing setup opened.**\n\n" +
              "Configure every kit below.",
            ephemeral: true
          });

          return interaction.channel.send(
            highSetupPanel(d)
          );
        }

        /* ADDROLE */
        if (
          interaction.commandName ===
          "addrole"
        ) {

          if (
            !isAdmin(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                "❌ Administrator only.",
              ephemeral: true
            });
          }

          const type =
            interaction.options.getString(
              "type"
            );

          const role =
            interaction.options.getRole(
              "role"
            );

          if (type === "results") {

            d.resultRoles = [
              ...new Set([
                ...d.resultRoles,
                role.id
              ])
            ];

          } else {

            d.ticketRoles = [
              ...new Set([
                ...d.ticketRoles,
                role.id
              ])
            ];
          }

          save();

          return interaction.reply({
            content:
              `✅ ${role} added to **${
                type === "results"
                  ? "Results Access"
                  : "Ticket Access"
              }**.\n\n` +
              (
                type === "results"
                  ? "This role can now use `/result` and `/highresults`."
                  : "This role can view normal tickets."
              ),
            ephemeral: true
          });
        }

        /* GENERATE ROLES */
        if (
          interaction.commandName ===
          "generaterole"
        ) {

          if (
            !isAdmin(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                "❌ Administrator only.",
              ephemeral: true
            });
          }

          const amount =
            await generateTierRoles(
              interaction.guild,
              d
            );

          return interaction.reply({
            content:
              `✅ Generated/verified **${amount} kit-tier roles**.\n\n` +
              "Example:\n" +
              "`Dia SMP LT5`\n" +
              "`Dia SMP HT5`\n" +
              "`Dia SMP LT4`\n" +
              "`Dia SMP HT4`\n" +
              "`Dia SMP LT3`\n" +
              "`Dia SMP HT3`\n" +
              "`Dia SMP LT2`\n" +
              "`Dia SMP HT2`\n" +
              "`Dia SMP LT1`\n" +
              "`Dia SMP HT1`",
            ephemeral: true
          });
        }

        /* RESULTS */
        if (
          interaction.commandName ===
            "result" ||
          interaction.commandName ===
            "highresults"
        ) {

          if (
            !canUseResults(
              interaction.member,
              d
            )
          ) {
            return interaction.reply({
              content:
                "❌ You do not have Results access.",
              ephemeral: true
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

          const kitKey =
            interaction.options.getString(
              "kit"
            );

          const skin =
            interaction.options.getString(
              "skin"
            ) || DEFAULT_SKIN;

          /* NORMAL RESULT */
          if (
            interaction.commandName ===
            "result"
          ) {

            const previous =
              interaction.options.getString(
                "previous"
              );

            const tier =
              interaction.options.getString(
                "tier"
              );

            const region =
              interaction.options.getString(
                "region"
              );

            const tester1 =
              interaction.options.getUser(
                "tester1"
              );

            const score =
              interaction.options.getString(
                "score1"
              );

            const demoted =
              previous !== "No Record" &&
              RANK[tier] <
                RANK[previous];

            const status =
              demoted
                ? `📉 **DEMOTED TO ${tier}**`
                : `🏆 **EARNED RANK ${tier}**`;

            const embed =
              new EmbedBuilder()
                .setTitle(
                  "🏆 UNION TIERS"
                )

                .setDescription(
                  `👤 **Player:** ${user}\n` +
                  `🎮 **GMTAG:** \`${gmtag}\`\n` +
                  `${REGIONS[region][1]} **Region:** ${region}\n\n` +

                  `📊 **Previous Tier:** **${previous}**\n\n` +

                  `${status}\n\n` +

                  `━━━━━━━━━━━━━━━━━━━━\n\n` +

                  `🧪 **TESTER & SCORE**\n\n` +

                  `👤 **Tester:** ${tester1}\n` +
                  `⚔️ **Score:** **${score}**\n\n` +

                  `━━━━━━━━━━━━━━━━━━━━\n\n` +

                  `🎯 **Kit:** ${kitEmoji(
                    kitKey
                  )} ${kitName(kitKey)}\n` +

                  `🏆 **Earned Rank:** **${tier}**`
                )

                .setColor(
                  demoted
                    ? 0xff3030
                    : 0xffc107
                )

                /*
                   BIG DEFAULT SKIN
                */
                .setImage(skin)

                .setFooter({
                  text:
                    "UNION TIERS • Union Tier Testing"
                })

                .setTimestamp();

            await interaction.channel.send({
              embeds: [embed]
            });

            const member =
              await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

            let role = null;

            if (member) {
              role =
                await assignKitTierRole(
                  member,
                  d,
                  kitKey,
                  tier
                );
            }

            return interaction.reply({
              content:
                `✅ **Result posted!**\n\n` +
                (
                  role
                    ? `🎭 **Assigned:** ${role}`
                    : "⚠️ Run `/generaterole` first if the Kit Tier role has not been created."
                ),
              ephemeral: true
            });
          }

          /* HIGH RESULT */
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

          const passed =
            tier !== "FAILED";

          const highTierText =
            passed
              ? `PASSED ${tier}`
              : "FAILED HT3 TEST";

          const embed =
            new EmbedBuilder()
              .setTitle(
                "👑 UNION TIERS • HIGH RESULT"
              )

              .setDescription(
                `👤 **Name:** ${user}\n` +
                `🎮 **GMTAG:** \`${gmtag}\`\n\n` +

                `🧪 **Tester 1 vs Player**\n` +
                `${tester1} **Score:** ${score1}\n\n` +

                `🧪 **Tester 2 vs Player**\n` +
                `${tester2} **Score:** ${score2}\n\n` +

                `🏆 **Tier:** **${highTierText}**`
              )

              .setColor(
                passed
                  ? 0xffc107
                  : 0xff3030
              )

              .setImage(skin)

              .setFooter({
                text:
                  "UNION TIERS • Union Tier Testing"
              })

              .setTimestamp();

          await interaction.channel.send({
            embeds: [embed]
          });

          let role = null;

          if (passed) {

            const member =
              await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

            if (member) {
              role =
                await assignKitTierRole(
                  member,
                  d,
                  kitKey,
                  tier
                );
            }
          }

          return interaction.reply({
            content:
              `✅ **High Tier result posted!**\n\n` +
              (
                role
                  ? `🎭 **Assigned:** ${role}`
                  : passed
                    ? "⚠️ Run `/generaterole` if the Kit Tier role does not exist."
                    : "❌ No tier role assigned because the player failed."
              ),
            ephemeral: true
          });
        }
      }

      /* =====================
         BUTTONS
      ===================== */
      if (
        interaction.isButton()
      ) {

        /* START HIGH TEST */
        if (
          interaction.customId ===
          "high_start"
        ) {

          const eligible =
            Object.keys(KITS)
              .filter(
                k =>
                  canHighTest(
                    interaction.member,
                    d,
                    k
                  )
              );

          if (!eligible.length) {
            return interaction.reply({
              content:
                "❌ **You cannot access High Tier Testing yet.**\n\n" +
                "You need an **LT3-or-above role** " +
                "for at least one configured kit.",
              ephemeral: true
            });
          }

          return interaction.reply({
            content:
              "👑 **HIGH TIER TESTING**\n\n" +
              "Select a kit where you currently have LT3+ access.",

            components: [
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId(
                    "high_kit"
                  )
                  .setPlaceholder(
                    "👑 Select eligible kit"
                  )
                  .addOptions(
                    eligible.map(
                      k => ({
                        label:
                          kitName(k),
                        value: k,
                        emoji:
                          kitEmoji(k),
                        description:
                          "You have LT3+ access"
                      })
                    )
                  )
              )
            ],

            ephemeral: true
          });
        }

        /* POST HIGH PANEL */
        if (
          interaction.customId ===
          "high_post"
        ) {

          if (
            !isAdmin(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                "❌ Administrator only.",
              ephemeral: true
            });
          }

          await interaction.channel.send(
            highPanel(d)
          );

          return interaction.reply({
            content:
              "✅ High Tier Testing panel posted.",
            ephemeral: true
          });
        }

        /* TICKET INFO */
        if (
          interaction.customId ===
          "ticket_info"
        ) {

          const parts =
            (
              interaction.channel.topic ||
              ""
            ).split(":");

          const high =
            parts[0] ===
            "HIGHTIER";

          const player =
            parts[1];

          const kitKey =
            parts[2];

          const region =
            parts[3];

          return interaction.reply({
            content:
              `📋 **${
                high
                  ? "High Tier"
                  : "Tier"
              } Test Information**\n\n` +

              `👤 **Player:** <@${player}>\n` +
              `🎯 **Kit:** ${kitEmoji(
                kitKey
              )} ${kitName(kitKey)}\n` +
              `🌎 **Region:** ${region}\n\n` +

              instructions(kitKey),

            ephemeral: true
          });
        }

        /* CLOSE TICKET */
        if (
          interaction.customId.startsWith(
            "close:"
          )
        ) {

          if (
            !isTester(
              interaction.member,
              d
            )
          ) {
            return interaction.reply({
              content:
                "❌ Only configured testers can close tickets.",
              ephemeral: true
            });
          }

          await interaction.reply(
            "🔒 Closing ticket in **3 seconds**..."
          );

          setTimeout(() => {
            interaction.channel
              .delete()
              .catch(() => {});
          }, 3000);

          return;
        }
      }

      /* =====================
         SELECT MENUS
      ===================== */
      if (
        interaction.isStringSelectMenu()
      ) {

        /* NORMAL KIT */
        if (
          interaction.customId ===
          "normal_kit"
        ) {

          const k =
            interaction.values[0];

          client.pending ??=
            new Map();

          client.pending.set(
            `normal:${interaction.guild.id}:${interaction.user.id}`,
            k
          );

          return interaction.reply({
            content:
              `${kitEmoji(k)} **${kitName(k)} selected.**\n\n` +
              "Now select your region.",

            components: [
              regionMenu(
                "normal_region"
              )
            ],

            ephemeral: true
          });
        }

        /* HIGH KIT */
        if (
          interaction.customId ===
          "high_kit"
        ) {

          const k =
            interaction.values[0];

          if (
            !canHighTest(
              interaction.member,
              d,
              k
            )
          ) {
            return interaction.reply({
              content:
                "❌ You do not have LT3+ access for that specific kit.",
              ephemeral: true
            });
          }

          client.pending ??=
            new Map();

          client.pending.set(
            `high:${interaction.guild.id}:${interaction.user.id}`,
            k
          );

          return interaction.reply({
            content:
              `${kitEmoji(k)} **${kitName(k)} selected.**\n\n` +
              "Now select your region.",

            components: [
              regionMenu(
                "high_region"
              )
            ],

            ephemeral: true
          });
        }

        /* NORMAL REGION */
        if (
          interaction.customId ===
          "normal_region"
        ) {

          const key =
            `normal:${interaction.guild.id}:${interaction.user.id}`;

          const k =
            client.pending?.get(key);

          if (!k) {
            return interaction.update({
              content:
                "❌ Request expired. Start again.",
              components: []
            });
          }

          client.pending.delete(key);

          const result =
            await createTicket(
              interaction,
              k,
              interaction.values[0],
              false
            );

          if (result.existing) {
            return interaction.update({
              content:
                `⚠️ You already have a ticket: ${result.existing}`,
              components: []
            });
          }

          if (result.error) {
            return interaction.update({
              content:
                `❌ ${result.error}`,
              components: []
            });
          }

          return interaction.update({
            content:
              `✅ **Tier Test ticket created!**\n\n` +
              `🎯 **Kit:** ${kitEmoji(k)} ${kitName(k)}\n` +
              `🌎 **Region:** ${interaction.values[0]}\n` +
              `🎫 ${result.channel}`,

            components: []
          });
        }

        /* HIGH REGION */
        if (
          interaction.customId ===
          "high_region"
        ) {

          const key =
            `high:${interaction.guild.id}:${interaction.user.id}`;

          const k =
            client.pending?.get(key);

          if (!k) {
            return interaction.update({
              content:
                "❌ Request expired. Start again.",
              components: []
            });
          }

          client.pending.delete(key);

          const result =
            await createTicket(
              interaction,
              k,
              interaction.values[0],
              true
            );

          if (result.existing) {
            return interaction.update({
              content:
                `⚠️ You already have a High Tier ticket: ${result.existing}`,
              components: []
            });
          }

          if (result.error) {
            return interaction.update({
              content:
                `❌ ${result.error}`,
              components: []
            });
          }

          return interaction.update({
            content:
              `✅ **High Tier Test ticket created!**\n\n` +
              `👑 **Kit:** ${kitEmoji(k)} ${kitName(k)}\n` +
              `🌎 **Region:** ${interaction.values[0]}\n` +
              `🎫 ${result.channel}`,

            components: []
          });
        }

        /* HIGH CONFIG KIT */
        if (
          interaction.customId ===
          "high_config_kit"
        ) {

          if (
            !isAdmin(
              interaction.member
            )
          ) {
            return interaction.reply({
              content:
                "❌ Administrator only.",
              ephemeral: true
            });
          }

          const k =
            interaction.values[0];

          const roleMenu =
            new RoleSelectMenuBuilder()
              .setCustomId(
                `high_roles:${k}`
              )
              .setPlaceholder(
                `Select up to 6 LT3+ roles for ${kitName(k)}`
              )
              .setMinValues(0)
              .setMaxValues(6);

          return interaction.reply({
            content:
              `⚙️ **${kitName(k)} High Tier Setup**\n\n` +

              "Select the roles that can request " +
              "High Tier Testing for this kit.\n\n" +

              "Recommended:\n" +
              "LT3 • HT3 • LT2 • HT2 • LT1 • HT1\n\n" +

              "You can select multiple roles.\n" +
              "Selecting none resets this kit.",

            components: [
              new ActionRowBuilder().addComponents(
                roleMenu
              )
            ],

            ephemeral: true
          });
        }
      }

      /* =====================
         ROLE SELECT
      ===================== */
      if (
        interaction.isRoleSelectMenu() &&
        interaction.customId.startsWith(
          "high_roles:"
        )
      ) {

        if (
          !isAdmin(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              "❌ Administrator only.",
            ephemeral: true
          });
        }

        const kitKey =
          interaction.customId.split(
            ":"
          )[1];

        d.highAccessRoles[kitKey] =
          interaction.values.slice(0, 6);

        save();

        await getCategory(
          interaction.guild,
          d,
          true
        );

        return interaction.update({
          content:
            `✅ **${kitName(
              kitKey
            )}** High Tier access roles updated.\n\n` +

            (
              d.highAccessRoles[kitKey].length
                ? d.highAccessRoles[
                    kitKey
                  ]
                    .map(roleMention)
                    .join(", ")
                : "❌ None — kit reset."
            ),

          components: []
        });
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
        await interaction.reply({
          content:
            "❌ Something went wrong. Check the bot console.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

/* =========================
   LOGIN
========================= */
client.login(TOKEN);
