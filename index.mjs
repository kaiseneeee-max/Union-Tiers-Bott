import "dotenv/config";
import fs from "node:fs";
import {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  Events
} from "discord.js";

/* =========================================================
   UNION TIERS BOT
   ONE FILE
   ONLY DISCORD_TOKEN IS REQUIRED
   ========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing from your environment.");
  process.exit(1);
}

/* =========================================================
   CLIENT
   ========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User]
});

/* =========================================================
   DATABASE
   ========================================================= */

const DB_FILE = "./data.json";

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const db = loadDB();

function guildData(guildId) {
  if (!db[guildId]) {
    db[guildId] = {
      setupName: "Union Tier Testing",

      testerRoles: [],
      ticketRoles: [],
      resultRoles: [],
      messageRoles: [],

      ticketCategoryId: null,
      highTicketCategoryId: null,

      requestChannelId: null,
      highRequestChannelId: null,

      welcome: {
        channelId: null,
        message: null
      },

      farewell: {
        channelId: null,
        message: null
      },

      highRoles: {},

      playerTiers: {}
    };

    saveDB();
  }

  return db[guildId];
}

/* =========================================================
   KITS
   ========================================================= */

const KITS = {
  sword: {
    name: "Sword",
    emoji: "⚔️",
    rounds: 6,
    format: "Best of 6"
  },

  uhc: {
    name: "UHC",
    emoji: "🛡️",
    rounds: 3,
    format: "Best of 3"
  },

  diasmp: {
    name: "Dia SMP",
    emoji: "💎",
    rounds: 3,
    format: "Best of 3"
  },

  nethpot: {
    name: "Neth Pot",
    emoji: "🧪",
    rounds: 3,
    format: "Best of 3"
  },

  mace: {
    name: "Mace",
    emoji: "🔨",
    rounds: 3,
    format: "Best of 3"
  },

  spearmace: {
    name: "Spear Mace",
    emoji: "🔱",
    rounds: 3,
    format: "Best of 3"
  },

  crystal: {
    name: "Crystal",
    emoji: "💥",
    rounds: 3,
    format: "Best of 3"
  },

  cart: {
    name: "Cart",
    emoji: "🛒",
    rounds: 3,
    format: "Best of 3"
  }
};

const KIT_KEYS = Object.keys(KITS);

/* =========================================================
   TIERS
   ========================================================= */

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

const HIGH_TIERS = [
  "HT3",
  "LT2",
  "HT2",
  "LT1",
  "HT1"
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
  HT1: 10
};

/*
  High-tier access roles per kit:

  LT3
  HT3
  HT2
  LT1
  HT1

  Example:

  Dia SMP LT3
  Dia SMP HT3
  Dia SMP HT2
  Dia SMP LT1
  Dia SMP HT1
*/

const HIGH_ROLE_KEYS = ["LT3", "HT3", "HT2", "LT1", "HT1"];

/* =========================================================
   DEFAULT SKIN
   =========================================================

   Your NameMC skin:

   https://namemc.com/skin/6cc743790519ce59

   Large 3D render.
*/

const DEFAULT_SKIN =
  "https://s.namemc.com/3d/skin/body.png?id=6cc743790519ce59&model=classic&theta=30&phi=21&time=90&width=600&height=800";

/* =========================================================
   HELPERS
   ========================================================= */

function getKit(key) {
  return KITS[key];
}

function kitName(key) {
  return KITS[key]?.name ?? key;
}

function kitEmoji(key) {
  return KITS[key]?.emoji ?? "🎮";
}

function formatKitRoleName(kitKey, tier) {
  return `${kitName(kitKey)} ${tier}`;
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function hasAnyRole(member, roleIds = []) {
  if (!member) return false;

  return roleIds.some((id) => member.roles.cache.has(id));
}

function isTester(member, guildConfig) {
  return (
    isAdmin(member) ||
    hasAnyRole(member, guildConfig.testerRoles)
  );
}

function canUseResults(member, guildConfig) {
  return (
    isAdmin(member) ||
    isTester(member, guildConfig) ||
    hasAnyRole(member, guildConfig.resultRoles)
  );
}

function canUseMessage(member, guildConfig) {
  return (
    isAdmin(member) ||
    isTester(member) ||
    hasAnyRole(member, guildConfig.messageRoles)
  );
}

function saveGuild() {
  saveDB();
}

function safeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
}

function getPreviousTier(member, kitKey, guildConfig) {
  const configuredRoles = guildConfig.highRoles?.[kitKey] || {};

  for (const tier of TIERS) {
    const roleId = guildConfig.playerTiers?.[kitKey]?.[tier];

    if (roleId && member.roles.cache.has(roleId)) {
      return tier;
    }

    if (configuredRoles[tier] && member.roles.cache.has(configuredRoles[tier])) {
      return tier;
    }
  }

  return "No Record";
}

function getStatus(previous, current) {
  if (!previous || previous === "No Record") {
    return "EARNED";
  }

  if (!TIER_RANK[previous] || !TIER_RANK[current]) {
    return "EARNED";
  }

  if (TIER_RANK[current] > TIER_RANK[previous]) {
    return "PROMOTED";
  }

  if (TIER_RANK[current] < TIER_RANK[previous]) {
    return "DEMOTED";
  }

  return "RETAINED";
}

function parseSkinInput(input) {
  if (!input || !input.trim()) {
    return DEFAULT_SKIN;
  }

  const value = input.trim();

  /*
    NameMC page:
    https://namemc.com/skin/6cc743790519ce59
  */

  const match = value.match(
    /namemc\.com\/skin\/([a-f0-9]{16,64})/i
  );

  if (match) {
    return `https://s.namemc.com/3d/skin/body.png?id=${match[1]}&model=classic&theta=30&phi=21&time=90&width=600&height=800`;
  }

  /*
    Direct NameMC skin ID
  */

  if (/^[a-f0-9]{16,64}$/i.test(value)) {
    return `https://s.namemc.com/3d/skin/body.png?id=${value}&model=classic&theta=30&phi=21&time=90&width=600&height=800`;
  }

  /*
    Direct image URL
  */

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return DEFAULT_SKIN;
}

function getScoreText(score) {
  if (!score) return "N/A";
  return score;
}

/* =========================================================
   ROLE HELPERS
   ========================================================= */

async function getOrCreateRole(guild, roleName) {
  let role = guild.roles.cache.find(
    (r) => r.name.toLowerCase() === roleName.toLowerCase()
  );

  if (role) return role;

  role = await guild.roles.create({
    name: roleName,
    reason: "Union Tiers generated tier role"
  });

  return role;
}

async function removeKitTierRoles(member, kitKey) {
  const guildConfig = guildData(member.guild.id);

  for (const tier of TIERS) {
    const roleId = guildConfig.playerTiers?.[kitKey]?.[tier];

    if (!roleId) continue;

    const role = member.guild.roles.cache.get(roleId);

    if (role && member.roles.cache.has(role.id)) {
      try {
        await member.roles.remove(role);
      } catch {}
    }
  }
}

async function assignTierRole(member, kitKey, tier) {
  const guild = member.guild;
  const config = guildData(guild.id);

  if (!config.playerTiers[kitKey]) {
    config.playerTiers[kitKey] = {};
  }

  const roleName = formatKitRoleName(kitKey, tier);

  const role = await getOrCreateRole(guild, roleName);

  config.playerTiers[kitKey][tier] = role.id;

  await removeKitTierRoles(member, kitKey);

  try {
    await member.roles.add(role);
  } catch (error) {
    console.error("Could not assign tier role:", error);
  }

  saveGuild();

  return role;
}

/* =========================================================
   HIGH-TIER ACCESS
   ========================================================= */

function getHighRoleForTier(config, kitKey, tier) {
  return config.highRoles?.[kitKey]?.[tier] || null;
}

function canHighTestKit(member, kitKey, config) {
  const roles = config.highRoles?.[kitKey];

  if (!roles) return false;

  return HIGH_ROLE_KEYS.some((tier) => {
    const roleId = roles[tier];

    return roleId && member.roles.cache.has(roleId);
  });
}

function getHighEligibleKits(member, config) {
  return KIT_KEYS.filter((kitKey) =>
    canHighTestKit(member, kitKey, config)
  );
}

/* =========================================================
   CHANNEL CATEGORIES
   ========================================================= */

async function getOrCreateCategory(guild, name, storedId) {
  if (storedId) {
    const existing = guild.channels.cache.get(storedId);

    if (
      existing &&
      existing.type === ChannelType.GuildCategory
    ) {
      return existing;
    }
  }

  const category = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory
  });

  return category;
}

async function ensureTicketCategories(guild) {
  const config = guildData(guild.id);

  const normal = await getOrCreateCategory(
    guild,
    "TEST TICKETS",
    config.ticketCategoryId
  );

  const high = await getOrCreateCategory(
    guild,
    "HIGH TICKETS",
    config.highTicketCategoryId
  );

  config.ticketCategoryId = normal.id;
  config.highTicketCategoryId = high.id;

  saveGuild();

  return {
    normal,
    high
  };
}

/* =========================================================
   REQUEST PANELS
   ========================================================= */

function normalRequestEmbed(config) {
  return new EmbedBuilder()
    .setColor(0xFFD000)
    .setTitle("🏆 UNION TIERS")
    .setDescription(
      `Welcome to **${config.setupName}**.\n\n` +
      "Click the button below to request a Tier Test.\n\n" +
      "🎮 Select your kit\n" +
      "🌍 Select your region\n" +
      "⚔️ The tester decides where the test will be done.\n\n" +
      "All kits are **Best of 3** except Sword, which is **Best of 6**."
    );
}

function highRequestEmbed(config) {
  return new EmbedBuilder()
    .setColor(0xE60000)
    .setTitle("👑 HIGH TIER TESTING")
    .setDescription(
      `Welcome to **${config.setupName} High Tier Testing**.\n\n` +
      "You must already have **LT3 or higher** in the kit you want to test.\n\n" +
      "You can ONLY select kits where you currently have one of these roles:\n\n" +
      "🏆 LT3\n" +
      "🏆 HT3\n" +
      "🏆 HT2\n" +
      "🏆 LT1\n" +
      "🏆 HT1\n\n" +
      "⚔️ The tester decides where the test will be done.\n\n" +
      "⚠️ You cannot request a High Tier Test without the required role for that kit."
    );
}

function normalPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("start_normal_test")
      .setLabel("Start Tier Test")
      .setEmoji("🏆")
      .setStyle(ButtonStyle.Primary)
  );
}

function highPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("start_high_test")
      .setLabel("Start High Tier Test")
      .setEmoji("👑")
      .setStyle(ButtonStyle.Danger)
  );
}

/* =========================================================
   COMMANDS
   ========================================================= */

const commands = [

  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Set up Union Tiers")
    .addSubcommand((sub) =>
      sub
        .setName("tester")
        .setDescription("Set the tester role")
        .addRoleOption((o) =>
          o
            .setName("role")
            .setDescription("Tester role")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("high")
        .setDescription("Configure High Tier roles for a kit")
        .addStringOption((o) =>
          o
            .setName("kit")
            .setDescription("Kit")
            .setRequired(true)
            .addChoices(
              ...KIT_KEYS.map((key) => ({
                name: KITS[key].name,
                value: key
              }))
            )
        )
        .addRoleOption((o) =>
          o
            .setName("lt3")
            .setDescription("LT3 role for this kit")
            .setRequired(true)
        )
        .addRoleOption((o) =>
          o
            .setName("ht3")
            .setDescription("HT3 role for this kit")
            .setRequired(true)
        )
        .addRoleOption((o) =>
          o
            .setName("ht2")
            .setDescription("HT2 role for this kit")
            .setRequired(true)
        )
        .addRoleOption((o) =>
          o
            .setName("lt1")
            .setDescription("LT1 role for this kit")
            .setRequired(true)
        )
        .addRoleOption((o) =>
          o
            .setName("ht1")
            .setDescription("HT1 role for this kit")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("name")
        .setDescription("Change the setup name")
        .addStringOption((o) =>
          o
            .setName("name")
            .setDescription("Setup name")
            .setRequired(true)
            .setMaxLength(100)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Create the normal Tier Test panel")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("highpanel")
        .setDescription("Create the High Tier Test panel")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("addrole")
    .setDescription("Add a role to a bot permission")
    .addSubcommand((sub) =>
      sub
        .setName("results")
        .setDescription("Allow a role to use /results and /highresults")
        .addRoleOption((o) =>
          o
            .setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("ticket")
        .setDescription("Allow a role to view/close normal tickets")
        .addRoleOption((o) =>
          o
            .setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("message")
        .setDescription("Allow a role to use /message")
        .addRoleOption((o) =>
          o
            .setName("role")
            .setDescription("Role")
            .setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("generaterole")
    .setDescription("Generate every kit tier role"),

  new SlashCommandBuilder()
    .setName("results")
    .setDescription("Post a normal Tier Test result")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("Player")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("gmtag")
        .setDescription("Minecraft gamertag")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("region")
        .setDescription("Region")
        .setRequired(true)
        .addChoices(
          { name: "🌏 AS", value: "AS" },
          { name: "🌍 EU", value: "EU" },
          { name: "🌎 NA", value: "NA" },
          { name: "🌊 OC", value: "OC" }
        )
    )
    .addStringOption((o) =>
      o
        .setName("kit")
        .setDescription("Kit")
        .setRequired(true)
        .addChoices(
          ...KIT_KEYS.map((key) => ({
            name: KITS[key].name,
            value: key
          }))
        )
    )
    .addStringOption((o) =>
      o
        .setName("previous")
        .setDescription("Previous tier")
        .setRequired(true)
        .addChoices(
          { name: "No Record", value: "No Record" },
          ...TIERS.map((tier) => ({
            name: tier,
            value: tier
          }))
        )
    )
    .addStringOption((o) =>
      o
        .setName("tier")
        .setDescription("Earned tier")
        .setRequired(true)
        .addChoices(
          ...TIERS.map((tier) => ({
            name: tier,
            value: tier
          }))
        )
    )
    .addStringOption((o) =>
      o
        .setName("score1")
        .setDescription("Tester 1 score")
        .setRequired(true)
    )
    .addUserOption((o) =>
      o
        .setName("tester2")
        .setDescription("Optional second tester")
        .setRequired(false)
    )
    .addStringOption((o) =>
      o
        .setName("score2")
        .setDescription("Optional second score")
        .setRequired(false)
    )
    .addStringOption((o) =>
      o
        .setName("skin")
        .setDescription("NameMC skin URL/ID, optional")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("highresults")
    .setDescription("Post a High Tier result")
    .addUserOption((o) =>
      o
        .setName("user")
        .setDescription("Player")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("gmtag")
        .setDescription("Minecraft gamertag")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("tester1")
        .setDescription("Tester 1")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("score1")
        .setDescription("Tester 1 vs Player score")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("tester2")
        .setDescription("Tester 2")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("score2")
        .setDescription("Tester 2 vs Player score")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("kit")
        .setDescription("Kit")
        .setRequired(true)
        .addChoices(
          ...KIT_KEYS.map((key) => ({
            name: KITS[key].name,
            value: key
          }))
        )
    )
    .addStringOption((o) =>
      o
        .setName("tier")
        .setDescription("High Tier result")
        .setRequired(true)
        .addChoices(
          { name: "PASSED HT3", value: "HT3" },
          { name: "PASSED LT2", value: "LT2" },
          { name: "PASSED HT2", value: "HT2" },
          { name: "PASSED LT1", value: "LT1" },
          { name: "PASSED HT1", value: "HT1" },
          { name: "FAILED HT3", value: "FAILED HT3" }
        )
    )
    .addStringOption((o) =>
      o
        .setName("skin")
        .setDescription("NameMC skin URL/ID, optional")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Set the welcome message")
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Welcome channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("message")
        .setDescription("Welcome message")
        .setRequired(true)
        .setMaxLength(2000)
    ),

  new SlashCommandBuilder()
    .setName("farewell")
    .setDescription("Set the farewell message")
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Farewell channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("message")
        .setDescription("Farewell message")
        .setRequired(true)
        .setMaxLength(2000)
    ),

  new SlashCommandBuilder()
    .setName("message")
    .setDescription("Send a bot message")
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("message")
        .setDescription("Message")
        .setRequired(true)
        .setMaxLength(2000)
    )
].map((command) => command.toJSON());

/* =========================================================
   READY
   ========================================================= */

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);

  /*
    IMPORTANT:
    Commands are registered through the logged-in client.

    NO CLIENT ID IS NEEDED.
  */

  try {
    await readyClient.application.commands.set(commands);

    console.log("✅ Slash commands registered.");
  } catch (error) {
    console.error("❌ Could not register slash commands:", error);
  }
});

/* =========================================================
   INTERACTION HANDLER
   ========================================================= */

client.on(Events.InteractionCreate, async (interaction) => {
  try {

    /* =====================================================
       SLASH COMMANDS
       ===================================================== */

    if (interaction.isChatInputCommand()) {

      const guild = interaction.guild;

      if (!guild) {
        return interaction.reply({
          content: "❌ This command can only be used in a server.",
          ephemeral: true
        });
      }

      const member = await guild.members.fetch(interaction.user.id);
      const config = guildData(guild.id);

      /* ===================================================
         SETUP
         =================================================== */

      if (interaction.commandName === "setup") {

        if (!isAdmin(member)) {
          return interaction.reply({
            content: "❌ Only server administrators can use /setup.",
            ephemeral: true
          });
        }

        const sub = interaction.options.getSubcommand();

        /* -----------------------------------------------
           TESTER
           ----------------------------------------------- */

        if (sub === "tester") {

          const role = interaction.options.getRole("role");

          if (!config.testerRoles.includes(role.id)) {
            config.testerRoles.push(role.id);
          }

          saveGuild();

          return interaction.reply({
            content:
              `✅ ${role} is now a **Tester role**.\n\n` +
              "Testers can:\n" +
              "• View normal tickets\n" +
              "• View High Tier tickets\n" +
              "• Create tests\n" +
              "• Test players\n" +
              "• Use result commands",
            ephemeral: false
          });
        }

        /* -----------------------------------------------
           HIGH
           ----------------------------------------------- */

        if (sub === "high") {

          const kit = interaction.options.getString("kit");

          const lt3 = interaction.options.getRole("lt3");
          const ht3 = interaction.options.getRole("ht3");
          const ht2 = interaction.options.getRole("ht2");
          const lt1 = interaction.options.getRole("lt1");
          const ht1 = interaction.options.getRole("ht1");

          if (!config.highRoles[kit]) {
            config.highRoles[kit] = {};
          }

          config.highRoles[kit] = {
            LT3: lt3.id,
            HT3: ht3.id,
            HT2: ht2.id,
            LT2: null,
            LT1: lt1.id,
            HT1: ht1.id
          };

          saveGuild();

          return interaction.reply({
            content:
              `✅ High Tier roles configured for **${kitName(kit)}**.\n\n` +
              `🏆 LT3 → ${lt3}\n` +
              `🏆 HT3 → ${ht3}\n` +
              `🏆 HT2 → ${ht2}\n` +
              `🏆 LT1 → ${lt1}\n` +
              `🏆 HT1 → ${ht1}\n\n` +
              "Players can request a High Tier Test for this kit only if they have one of these roles.",
            ephemeral: false
          });
        }

        /* -----------------------------------------------
           NAME
           ----------------------------------------------- */

        if (sub === "name") {

          config.setupName =
            interaction.options.getString("name");

          saveGuild();

          return interaction.reply({
            content:
              `✅ Setup name changed to **${config.setupName}**.`,
            ephemeral: true
          });
        }

        /* -----------------------------------------------
           NORMAL PANEL
           ----------------------------------------------- */

        if (sub === "panel") {

          const channel =
            interaction.options.getChannel("channel");

          const message = await channel.send({
            embeds: [normalRequestEmbed(config)],
            components: [normalPanelButtons()]
          });

          config.requestChannelId = message.id;

          saveGuild();

          return interaction.reply({
            content:
              `✅ Normal Tier Testing panel created in ${channel}.`,
            ephemeral: true
          });
        }

        /* -----------------------------------------------
           HIGH PANEL
           ----------------------------------------------- */

        if (sub === "highpanel") {

          const channel =
            interaction.options.getChannel("channel");

          const message = await channel.send({
            embeds: [highRequestEmbed(config)],
            components: [highPanelButtons()]
          });

          config.highRequestChannelId = message.id;

          saveGuild();

          return interaction.reply({
            content:
              `✅ High Tier Testing panel created in ${channel}.`,
            ephemeral: true
          });
        }
      }

      /* ===================================================
         ADDROLE
         =================================================== */

      if (interaction.commandName === "addrole") {

        if (!isAdmin(member)) {
          return interaction.reply({
            content:
              "❌ Only administrators can use /addrole.",
            ephemeral: true
          });
        }

        const sub = interaction.options.getSubcommand();
        const role = interaction.options.getRole("role");

        if (sub === "results") {

          if (!config.resultRoles.includes(role.id)) {
            config.resultRoles.push(role.id);
          }

          saveGuild();

          return interaction.reply({
            content:
              `✅ ${role} can now use **/results** and **/highresults**.`,
            ephemeral: false
          });
        }

        if (sub === "ticket") {

          if (!config.ticketRoles.includes(role.id)) {
            config.ticketRoles.push(role.id);
          }

          saveGuild();

          return interaction.reply({
            content:
              `✅ ${role} can now view and close normal testing tickets.`,
            ephemeral: false
          });
        }

        if (sub === "message") {

          if (!config.messageRoles.includes(role.id)) {
            config.messageRoles.push(role.id);
          }

          saveGuild();

          return interaction.reply({
            content:
              `✅ ${role} can now use **/message**.`,
            ephemeral: false
          });
        }
      }

      /* ===================================================
         GENERATE ROLES
         =================================================== */

      if (interaction.commandName === "generaterole") {

        if (!isAdmin(member)) {
          return interaction.reply({
            content:
              "❌ Only administrators can use /generaterole.",
            ephemeral: true
          });
        }

        await interaction.deferReply();

        let created = 0;

        for (const kitKey of KIT_KEYS) {

          if (!config.playerTiers[kitKey]) {
            config.playerTiers[kitKey] = {};
          }

          for (const tier of TIERS) {

            const roleName =
              formatKitRoleName(kitKey, tier);

            let role = guild.roles.cache.find(
              (r) =>
                r.name.toLowerCase() ===
                roleName.toLowerCase()
            );

            if (!role) {
              role = await guild.roles.create({
                name: roleName,
                reason:
                  "Union Tiers /generaterole"
              });

              created++;
            }

            config.playerTiers[kitKey][tier] =
              role.id;
          }
        }

        saveGuild();

        return interaction.editReply(
          `✅ **Role generation complete.**\n\n` +
          `🎮 Kits: ${KIT_KEYS.length}\n` +
          `🏆 Tiers per kit: ${TIERS.length}\n` +
          `📊 Roles created: ${created}\n\n` +
          "Example roles:\n" +
          "• Dia SMP LT5\n" +
          "• Dia SMP HT5\n" +
          "• Dia SMP LT4\n" +
          "• Dia SMP HT4\n" +
          "• Dia SMP LT3\n" +
          "• Dia SMP HT3\n" +
          "• Dia SMP LT2\n" +
          "• Dia SMP HT2\n" +
          "• Dia SMP LT1\n" +
          "• Dia SMP HT1"
        );
      }

      /* ===================================================
         RESULTS
         =================================================== */

      if (interaction.commandName === "results") {

        if (!canUseResults(member, config)) {
          return interaction.reply({
            content:
              "❌ You do not have permission to use /results.",
            ephemeral: true
          });
        }

        const player =
          interaction.options.getUser("user");

        const gmtag =
          interaction.options.getString("gmtag");

        const region =
          interaction.options.getString("region");

        const kit =
          interaction.options.getString("kit");

        const previous =
          interaction.options.getString("previous");

        const tier =
          interaction.options.getString("tier");

        const score1 =
          interaction.options.getString("score1");

        const tester2 =
          interaction.options.getUser("tester2");

        const score2 =
          interaction.options.getString("score2");

        const skin =
          parseSkinInput(
            interaction.options.getString("skin")
          );

        const playerMember =
          await guild.members.fetch(player.id).catch(() => null);

        let status = getStatus(previous, tier);

        if (playerMember) {
          await assignTierRole(
            playerMember,
            kit,
            tier
          );
        }

        const tester1 = interaction.user;

        const scoreText = tester2
          ? `${score1} / ${score2}`
          : score1;

        const embed =
          new EmbedBuilder()
            .setColor(
              status === "DEMOTED"
                ? 0xE60000
                : status === "PROMOTED"
                ? 0x00C853
                : 0xFFD000
            )
            .setTitle("🏆 UNION TIERS")
            .addFields(
              {
                name: "👤 Player",
                value: `${player}`,
                inline: false
              },
              {
                name: "🎮 GMTAG",
                value: gmtag,
                inline: false
              },
              {
                name: "🌍 Region",
                value: region,
                inline: false
              },
              {
                name: "📊 Previous Tier",
                value: previous,
                inline: false
              },
              {
                name: "🏆 RESULT",
                value:
                  `🏆 **${status}**\n` +
                  `**EARNED RANK ${tier}**`,
                inline: false
              },
              {
                name: "🧪 TESTER & SCORE",
                value:
                  `👤 Tester: ${tester1}\n` +
                  `⚔️ Score: ${scoreText}` +
                  (
                    tester2
                      ? `\n👤 Tester 2: ${tester2}`
                      : ""
                  ),
                inline: false
              },
              {
                name: "🎯 Kit",
                value:
                  `${kitEmoji(kit)} ${kitName(kit)}`,
                inline: false
              },
              {
                name: "🏆 Earned Rank",
                value: tier,
                inline: false
              },
              {
                name: "⚔️ Format",
                value: KITS[kit].format,
                inline: false
              }
            )
            .setImage(skin)
            .setFooter({
              text:
                `${config.setupName} • ${kitName(kit)} Tier Testing`
            })
            .setTimestamp();

        await interaction.reply({
          embeds: [embed]
        });

        return;
      }

      /* ===================================================
         HIGH RESULTS
         =================================================== */

      if (interaction.commandName === "highresults") {

        if (!canUseResults(member, config)) {
          return interaction.reply({
            content:
              "❌ You do not have permission to use /highresults.",
            ephemeral: true
          });
        }

        const player =
          interaction.options.getUser("user");

        const gmtag =
          interaction.options.getString("gmtag");

        const tester1 =
          interaction.options.getString("tester1");

        const score1 =
          interaction.options.getString("score1");

        const tester2 =
          interaction.options.getString("tester2");

        const score2 =
          interaction.options.getString("score2");

        const kit =
          interaction.options.getString("kit");

        const tier =
          interaction.options.getString("tier");

        const skin =
          parseSkinInput(
            interaction.options.getString("skin")
          );

        const passed =
          tier !== "FAILED HT3";

        /*
          If FAILED HT3:
          - Do NOT assign a new role
          - Result simply says FAILED HT3
        */

        if (passed) {

          const playerMember =
            await guild.members.fetch(player.id)
              .catch(() => null);

          if (playerMember) {
            await assignTierRole(
              playerMember,
              kit,
              tier
            );
          }
        }

        const embed =
          new EmbedBuilder()
            .setColor(
              passed
                ? 0x00C853
                : 0xE60000
            )
            .setTitle("👑 HIGH TIER TESTING")
            .addFields(
              {
                name: "👤 Name",
                value: `${player}`,
                inline: false
              },
              {
                name: "🎮 GMTAG",
                value: gmtag,
                inline: false
              },
              {
                name: "🧪 Tester 1",
                value:
                  `${tester1} vs Player\n` +
                  `Score: ${getScoreText(score1)}`,
                inline: false
              },
              {
                name: "🧪 Tester 2",
                value:
                  `${tester2} vs Player\n` +
                  `Score: ${getScoreText(score2)}`,
                inline: false
              },
              {
                name: "🏆 Tier",
                value:
                  passed
                    ? `PASSED ${tier}`
                    : "FAILED HT3 TEST",
                inline: false
              }
            )
            .setImage(skin)
            .setFooter({
              text:
                `${config.setupName} • High Tier Testing`
            })
            .setTimestamp();

        return interaction.reply({
          embeds: [embed]
        });
      }

      /* ===================================================
         WELCOME
         =================================================== */

      if (interaction.commandName === "welcome") {

        if (!isAdmin(member)) {
          return interaction.reply({
            content:
              "❌ Only administrators can use /welcome.",
            ephemeral: true
          });
        }

        const channel =
          interaction.options.getChannel("channel");

        const message =
          interaction.options.getString("message");

        config.welcome.channelId = channel.id;
        config.welcome.message = message;

        saveGuild();

        return interaction.reply({
          content:
            `✅ Welcome message configured for ${channel}.`,
          ephemeral: true
        });
      }

      /* ===================================================
         FAREWELL
         =================================================== */

      if (interaction.commandName === "farewell") {

        if (!isAdmin(member)) {
          return interaction.reply({
            content:
              "❌ Only administrators can use /farewell.",
            ephemeral: true
          });
        }

        const channel =
          interaction.options.getChannel("channel");

        const message =
          interaction.options.getString("message");

        config.farewell.channelId = channel.id;
        config.farewell.message = message;

        saveGuild();

        return interaction.reply({
          content:
            `✅ Farewell message configured for ${channel}.`,
          ephemeral: true
        });
      }

      /* ===================================================
         MESSAGE
         =================================================== */

      if (interaction.commandName === "message") {

        if (!canUseMessage(member, config)) {
          return interaction.reply({
            content:
              "❌ You do not have permission to use /message.",
            ephemeral: true
          });
        }

        const channel =
          interaction.options.getChannel("channel");

        const message =
          interaction.options.getString("message");

        await channel.send({
          content: message
        });

        return interaction.reply({
          content:
            `✅ Message sent to ${channel}.`,
          ephemeral: true
        });
      }
    }

    /* =====================================================
       NORMAL TEST BUTTON
       ===================================================== */

    if (
      interaction.isButton() &&
      interaction.customId === "start_normal_test"
    ) {

      const guild = interaction.guild;
      const member =
        await guild.members.fetch(interaction.user.id);

      const menu =
        new StringSelectMenuBuilder()
          .setCustomId("normal_kit_select")
          .setPlaceholder("🎮 Select your kit")
          .addOptions(
            KIT_KEYS.map((key) => ({
              label: KITS[key].name,
              value: key,
              emoji: KITS[key].emoji,
              description: KITS[key].format
            }))
          );

      return interaction.reply({
        content: "🎮 Select the kit you want to test:",
        components: [
          new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
      });
    }

    /* =====================================================
       NORMAL KIT SELECT
       ===================================================== */

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "normal_kit_select"
    ) {

      const kit = interaction.values[0];

      if (!KITS[kit]) {
        return interaction.update({
          content:
            "❌ Invalid kit.",
          components: []
        });
      }

      const regionMenu =
        new StringSelectMenuBuilder()
          .setCustomId(`normal_region_select:${kit}`)
          .setPlaceholder("🌍 Select your region")
          .addOptions(
            {
              label: "AS",
              value: "AS",
              emoji: "🌏"
            },
            {
              label: "EU",
              value: "EU",
              emoji: "🌍"
            },
            {
              label: "NA",
              value: "NA",
              emoji: "🌎"
            },
            {
              label: "OC",
              value: "OC",
              emoji: "🌊"
            }
          );

      return interaction.update({
        content:
          `🎮 Kit selected: **${kitName(kit)}**\n\n🌍 Now select your region:`,
        components: [
          new ActionRowBuilder().addComponents(regionMenu)
        ]
      });
    }

    /* =====================================================
       NORMAL REGION SELECT -> CREATE TICKET
       ===================================================== */

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith(
        "normal_region_select:"
      )
    ) {

      const kit =
        interaction.customId.split(":")[1];

      const region =
        interaction.values[0];

      const guild =
        interaction.guild;

      const member =
        await guild.members.fetch(
          interaction.user.id
        );

      const config =
        guildData(guild.id);

      const categories =
        await ensureTicketCategories(guild);

      const existing =
        guild.channels.cache.find(
          (channel) =>
            channel.topic &&
            channel.topic.includes(
              `TIERTEST:${member.id}:${kit}`
            )
        );

      if (existing) {
        return interaction.update({
          content:
            `❌ You already have a **${kitName(kit)}** ticket: ${existing}`,
          components: []
        });
      }

      const permissionOverwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: member.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ];

      const testerRoles = [
        ...config.testerRoles,
        ...config.ticketRoles
      ];

      for (const roleId of testerRoles) {

        permissionOverwrites.push({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      const channel =
        await guild.channels.create({
          name:
            `test-${safeName(member.user.username)}-${kit}`,
          type: ChannelType.GuildText,
          parent: categories.normal.id,
          topic:
            `TIERTEST:${member.id}:${kit}:${region}`,
          permissionOverwrites
        });

      const embed =
        new EmbedBuilder()
          .setColor(0xFFD000)
          .setTitle(
            `${kitEmoji(kit)} ${kitName(kit)} Tier Test`
          )
          .setDescription(
            `🎫 ${member} has opened a **${kitName(kit)}** test.`
          )
          .addFields(
            {
              name: "👤 Player",
              value: `${member}`,
              inline: false
            },
            {
              name: "🎮 Discord",
              value: member.user.username,
              inline: false
            },
            {
              name: "🌍 Region",
              value: region,
              inline: false
            },
            {
              name: "⚔️ Format",
              value: KITS[kit].format,
              inline: false
            },
            {
              name: "🎯 Kit",
              value:
                `${kitEmoji(kit)} ${kitName(kit)}`,
              inline: false
            },
            {
              name: "🔢 Rounds",
              value:
                String(KITS[kit].rounds),
              inline: false
            },
            {
              name: "📌 Testing Rules",
              value:
                "• The tester decides where the test will be done.\n" +
                `• Complete ${KITS[kit].format}.\n` +
                "• Make sure both players are ready.\n" +
                "• Follow the tester's instructions."
            }
          )
          .setThumbnail(
            member.user.displayAvatarURL({
              size: 512
            })
          )
          .setFooter({
            text:
              `${config.setupName} • Tier Testing`
          });

      const buttons =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId("testing_info")
            .setLabel("Testing Info")
            .setEmoji("📋")
            .setStyle(ButtonStyle.Secondary)
        );

      await channel.send({
        content:
          `${member} ${config.testerRoles
            .map((id) => `<@&${id}>`)
            .join(" ")}`,
        embeds: [embed],
        components: [buttons]
      });

      return interaction.update({
        content:
          `✅ Your **${kitName(kit)}** test ticket has been created: ${channel}`,
        components: []
      });
    }

    /* =====================================================
       HIGH TEST BUTTON
       ===================================================== */

    if (
      interaction.isButton() &&
      interaction.customId === "start_high_test"
    ) {

      const guild =
        interaction.guild;

      const member =
        await guild.members.fetch(
          interaction.user.id
        );

      const config =
        guildData(guild.id);

      const eligible =
        getHighEligibleKits(member, config);

      if (!eligible.length) {
        return interaction.reply({
          content:
            "❌ You cannot access High Tier Testing yet.\n\n" +
            "You need an **LT3 or higher role for at least one kit**.\n\n" +
            "Example:\n" +
            "🏆 Dia SMP LT3",
          ephemeral: true
        });
      }

      const menu =
        new StringSelectMenuBuilder()
          .setCustomId("high_kit_select")
          .setPlaceholder(
            "👑 Select a kit you have LT3+ in"
          )
          .addOptions(
            eligible.map((kit) => ({
              label: KITS[kit].name,
              value: kit,
              emoji: KITS[kit].emoji,
              description:
                "You have LT3 or higher in this kit"
            }))
          );

      return interaction.reply({
        content:
          "👑 **High Tier Testing**\n\n" +
          "You can ONLY select a kit where you currently have LT3 or higher.",
        components: [
          new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
      });
    }

    /* =====================================================
       HIGH KIT SELECT
       ===================================================== */

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "high_kit_select"
    ) {

      const kit =
        interaction.values[0];

      const guild =
        interaction.guild;

      const member =
        await guild.members.fetch(
          interaction.user.id
        );

      const config =
        guildData(guild.id);

      if (!canHighTestKit(member, kit, config)) {
        return interaction.update({
          content:
            "❌ You do not have LT3 or higher for that kit.",
          components: []
        });
      }

      const regionMenu =
        new StringSelectMenuBuilder()
          .setCustomId(`high_region_select:${kit}`)
          .setPlaceholder("🌍 Select your region")
          .addOptions(
            {
              label: "AS",
              value: "AS",
              emoji: "🌏"
            },
            {
              label: "EU",
              value: "EU",
              emoji: "🌍"
            },
            {
              label: "NA",
              value: "NA",
              emoji: "🌎"
            },
            {
              label: "OC",
              value: "OC",
              emoji: "🌊"
            }
          );

      return interaction.update({
        content:
          `👑 Kit: **${kitName(kit)}**\n\n🌍 Select your region:`,
        components: [
          new ActionRowBuilder().addComponents(regionMenu)
        ]
      });
    }

    /* =====================================================
       HIGH REGION SELECT -> CREATE HIGH TICKET
       ===================================================== */

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith(
        "high_region_select:"
      )
    ) {

      const kit =
        interaction.customId.split(":")[1];

      const region =
        interaction.values[0];

      const guild =
        interaction.guild;

      const member =
        await guild.members.fetch(
          interaction.user.id
        );

      const config =
        guildData(guild.id);

      if (!canHighTestKit(member, kit, config)) {
        return interaction.update({
          content:
            "❌ You no longer have LT3 or higher for this kit.",
          components: []
        });
      }

      const categories =
        await ensureTicketCategories(guild);

      const existing =
        guild.channels.cache.find(
          (channel) =>
            channel.topic &&
            channel.topic.includes(
              `HIGHTEST:${member.id}:${kit}`
            )
        );

      if (existing) {
        return interaction.update({
          content:
            `❌ You already have a High Tier ticket: ${existing}`,
          components: []
        });
      }

      const permissionOverwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: member.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ];

      /*
        Testers can view and test ALL High Tier tickets.
      */

      for (const roleId of config.testerRoles) {

        permissionOverwrites.push({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      const channel =
        await guild.channels.create({
          name:
            `high-${safeName(member.user.username)}-${kit}`,
          type: ChannelType.GuildText,
          parent: categories.high.id,
          topic:
            `HIGHTEST:${member.id}:${kit}:${region}`,
          permissionOverwrites
        });

      const embed =
        new EmbedBuilder()
          .setColor(0xE60000)
          .setTitle(
            `👑 HIGH TIER TESTING`
          )
          .setDescription(
            `🎫 ${member} has opened a **High Tier ${kitName(kit)} test**.`
          )
          .addFields(
            {
              name: "👤 Player",
              value: `${member}`,
              inline: false
            },
            {
              name: "🎮 GMTAG",
              value:
                "Player will provide their Minecraft gamertag in the result.",
              inline: false
            },
            {
              name: "🌍 Region",
              value: region,
              inline: false
            },
            {
              name: "🎯 Kit",
              value:
                `${kitEmoji(kit)} ${kitName(kit)}`,
              inline: false
            },
            {
              name: "🏆 Required Rank",
              value:
                "LT3 or higher in this kit",
              inline: false
            },
            {
              name: "⚔️ Format",
              value:
                KITS[kit].format,
              inline: false
            },
            {
              name: "🔢 Rounds",
              value:
                String(KITS[kit].rounds),
              inline: false
            },
            {
              name: "📌 High Tier Rules",
              value:
                "• The tester decides where the test will be done.\n" +
                `• Complete ${KITS[kit].format}.\n` +
                "• Two testers should be used for High Tier results.\n" +
                "• Follow the testers' instructions."
            }
          )
          .setThumbnail(
            member.user.displayAvatarURL({
              size: 512
            })
          )
          .setFooter({
            text:
              `${config.setupName} • High Tier Testing`
          });

      const buttons =
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId("testing_info")
            .setLabel("Testing Info")
            .setEmoji("📋")
            .setStyle(ButtonStyle.Secondary)
        );

      await channel.send({
        content:
          `${member} ${config.testerRoles
            .map((id) => `<@&${id}>`)
            .join(" ")}`,
        embeds: [embed],
        components: [buttons]
      });

      return interaction.update({
        content:
          `✅ Your **High Tier ${kitName(kit)}** ticket has been created: ${channel}`,
        components: []
      });
    }

    /* =====================================================
       TESTING INFO
       ===================================================== */

    if (
      interaction.isButton() &&
      interaction.customId === "testing_info"
    ) {

      const channel =
        interaction.channel;

      const topic =
        channel?.topic || "";

      if (topic.startsWith("HIGHTEST:")) {

        const parts =
          topic.split(":");

        const kit =
          parts[2];

        return interaction.reply({
          content:
            `👑 **HIGH TIER TESTING**\n\n` +
            `${kitEmoji(kit)} Kit: **${kitName(kit)}**\n` +
            `⚔️ Format: **${KITS[kit].format}**\n` +
            `🔢 Rounds: **${KITS[kit].rounds}**\n\n` +
            "📌 The tester decides where the test will be done.",
          ephemeral: true
        });
      }

      if (topic.startsWith("TIERTEST:")) {

        const parts =
          topic.split(":");

        const kit =
          parts[2];

        return interaction.reply({
          content:
            `🎯 **TIER TESTING**\n\n` +
            `${kitEmoji(kit)} Kit: **${kitName(kit)}**\n` +
            `⚔️ Format: **${KITS[kit].format}**\n` +
            `🔢 Rounds: **${KITS[kit].rounds}**\n\n` +
            "📌 The tester decides where the test will be done.",
          ephemeral: true
        });
      }
    }

    /* =====================================================
       CLOSE TICKET
       ===================================================== */

    if (
      interaction.isButton() &&
      interaction.customId === "close_ticket"
    ) {

      const guild =
        interaction.guild;

      const member =
        await guild.members.fetch(
          interaction.user.id
        );

      const config =
        guildData(guild.id);

      const channel =
        interaction.channel;

      const topic =
        channel?.topic || "";

      let allowed = false;

      /*
        Ticket owner can close their own ticket.
      */

      if (
        topic.startsWith("TIERTEST:") ||
        topic.startsWith("HIGHTEST:")
      ) {

        const ownerId =
          topic.split(":")[1];

        if (ownerId === member.id) {
          allowed = true;
        }
      }

      /*
        Testers/admins can close.
      */

      if (isTester(member, config)) {
        allowed = true;
      }

      /*
        Normal ticket permission roles.
      */

      if (
        hasAnyRole(
          member,
          config.ticketRoles
        )
      ) {
        allowed = true;
      }

      if (!allowed) {
        return interaction.reply({
          content:
            "❌ You cannot close this ticket.",
          ephemeral: true
        });
      }

      await interaction.reply({
        content:
          "🔒 Ticket will be deleted in 5 seconds."
      });

      setTimeout(async () => {
        try {
          await channel.delete(
            "Union Tiers ticket closed"
          );
        } catch {}
      }, 5000);
    }

  } catch (error) {

    console.error(
      "❌ Interaction error:",
      error
    );

    if (interaction.replied || interaction.deferred) {

      await interaction.followUp({
        content:
          "❌ An error occurred while processing this.",
        ephemeral: true
      }).catch(() => {});

    } else {

      await interaction.reply({
        content:
          "❌ An error occurred while processing this.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

/* =========================================================
   MEMBER JOIN
   ========================================================= */

client.on(
  Events.GuildMemberAdd,
  async (member) => {

    const config =
      guildData(member.guild.id);

    const channelId =
      config.welcome?.channelId;

    const message =
      config.welcome?.message;

    if (!channelId || !message) return;

    const channel =
      member.guild.channels.cache.get(channelId);

    if (!channel) return;

    const finalMessage =
      message
        .replaceAll(
          "{user}",
          `${member}`
        )
        .replaceAll(
          "{username}",
          member.user.username
        );

    const embed =
      new EmbedBuilder()
        .setColor(0xFFD000)
        .setDescription(finalMessage)
        .setThumbnail(
          member.user.displayAvatarURL({
            size: 512
          })
        );

    await channel.send({
      embeds: [embed]
    }).catch(() => {});
  }
);

/* =========================================================
   MEMBER LEAVE
   ========================================================= */

client.on(
  Events.GuildMemberRemove,
  async (member) => {

    const config =
      guildData(member.guild.id);

    const channelId =
      config.farewell?.channelId;

    const message =
      config.farewell?.message;

    if (!channelId || !message) return;

    const channel =
      member.guild.channels.cache.get(channelId);

    if (!channel) return;

    const finalMessage =
      message
        .replaceAll(
          "{user}",
          `${member.user}`
        )
        .replaceAll(
          "{username}",
          member.user.username
        );

    const embed =
      new EmbedBuilder()
        .setColor(0xE60000)
        .setDescription(finalMessage)
        .setThumbnail(
          member.user.displayAvatarURL({
            size: 512
          })
        );

    await channel.send({
      embeds: [embed]
    }).catch(() => {});
  }
);

/* =========================================================
   LOGIN
   ========================================================= */

client.login(TOKEN);
