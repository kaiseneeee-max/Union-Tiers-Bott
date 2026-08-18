import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  REST,
  Routes
} from 'discord.js';
import fs from 'node:fs';

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  throw new Error('Missing TOKEN or CLIENT_ID in .env');
}

const DATA_FILE = './data.json';

/* =========================================================
   DEFAULT SKIN
   Your NameMC skin:
   https://namemc.com/skin/6cc743790519ce59
   ========================================================= */

const DEFAULT_SKIN =
  'https://s.namemc.com/3d/skin/body.png?id=6cc743790519ce59&model=classic&width=512&height=512';

/* =========================================================
   KITS
   Sword = Best of 6
   Everything else = Best of 3
   ========================================================= */

const KITS = {
  dia_smp: {
    name: 'Dia SMP',
    emoji: '💎',
    rounds: 3
  },

  sword: {
    name: 'Sword',
    emoji: '⚔️',
    rounds: 6
  },

  uhc: {
    name: 'UHC',
    emoji: '🛡️',
    rounds: 3
  },

  neth_pot: {
    name: 'Neth Pot',
    emoji: '🧪',
    rounds: 3
  },

  mace: {
    name: 'Mace',
    emoji: '🔨',
    rounds: 3
  },

  spear_mace: {
    name: 'Spear Mace',
    emoji: '🔱',
    rounds: 3
  },

  crystal: {
    name: 'Crystal',
    emoji: '💠',
    rounds: 3
  },

  cart: {
    name: 'Cart',
    emoji: '🛒',
    rounds: 3
  }
};

/* =========================================================
   TIERS
   ========================================================= */

const TIERS = [
  'LT5',
  'HT5',
  'LT4',
  'HT4',
  'LT3',
  'HT3',
  'LT2',
  'HT2',
  'LT1',
  'HT1'
];

const TIER_RANK = Object.fromEntries(
  TIERS.map((tier, index) => [tier, index + 1])
);

const REGIONS = ['AS', 'EU', 'NA', 'OC'];

/* =========================================================
   DATABASE
   ========================================================= */

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          guilds: {}
        },
        null,
        2
      )
    );
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  data.guilds ??= {};

  return data;
}

const db = loadData();

function saveData() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(db, null, 2)
  );
}

function guildData(guildId) {
  db.guilds[guildId] ??= {
    testerRoles: [],
    resultRoles: [],
    ticketRoles: [],

    /*
      Per-kit high-tier qualifying roles.

      Example:

      highRoles: {
        dia_smp: [
          roleID1,
          roleID2,
          roleID3
        ]
      }
    */

    highRoles: {},

    ticketCategoryId: null,
    highTicketCategoryId: null,

    normalRequestChannelId: null,
    highRequestChannelId: null
  };

  return db.guilds[guildId];
}

/* =========================================================
   HELPERS
   ========================================================= */

function kitName(kit) {
  return KITS[kit]?.name ?? kit;
}

function tierRoleName(kit, tier) {
  return `${kitName(kit)} ${tier}`;
}

function hasAnyRole(member, roleIds = []) {
  return roleIds.some(id => member.roles.cache.has(id));
}

function canUseResults(member, guildSettings) {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    hasAnyRole(member, [
      ...guildSettings.testerRoles,
      ...guildSettings.resultRoles
    ])
  );
}

function canUseTicketStaff(member, guildSettings) {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    hasAnyRole(member, [
      ...guildSettings.testerRoles,
      ...guildSettings.ticketRoles
    ])
  );
}

/* =========================================================
   SKIN
   Empty skin = YOUR DEFAULT SKIN
   ========================================================= */

function getSkinURL(input) {
  if (!input || !input.trim()) {
    return DEFAULT_SKIN;
  }

  const value = input.trim();

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (/^[0-9a-f]{16}$/i.test(value)) {
    return `https://s.namemc.com/3d/skin/body.png?id=${value}&model=classic&width=512&height=512`;
  }

  return DEFAULT_SKIN;
}

/* =========================================================
   PROMOTION / DEMOTION / RETAINED
   ========================================================= */

function getStatus(previous, current) {
  if (!previous || previous === 'No Record') {
    return '🆕 NEW RANK';
  }

  if (TIER_RANK[current] > TIER_RANK[previous]) {
    return '📈 PROMOTED';
  }

  if (TIER_RANK[current] < TIER_RANK[previous]) {
    return '📉 DEMOTED';
  }

  return '🟰 RETAINED';
}

/* =========================================================
   ROLE GENERATION
   ========================================================= */

async function getOrCreateRole(guild, name) {
  let role = guild.roles.cache.find(
    role => role.name === name
  );

  if (!role) {
    role = await guild.roles.create({
      name,
      reason: 'UNION Tiers generated tier role'
    });
  }

  return role;
}

/* =========================================================
   ASSIGN KIT TIER ROLE
   Example:
   Dia SMP LT3
   Sword HT4
   Crystal HT1
   ========================================================= */

async function assignTierRole(
  guild,
  member,
  kit,
  tier
) {
  const wantedRoleName = tierRoleName(
    kit,
    tier
  );

  const wantedRole =
    await getOrCreateRole(
      guild,
      wantedRoleName
    );

  const prefix = `${kitName(kit)} `;

  const kitTierRoles =
    guild.roles.cache.filter(role => {
      if (!role.name.startsWith(prefix)) {
        return false;
      }

      const possibleTier =
        role.name.slice(prefix.length);

      return TIERS.includes(possibleTier);
    });

  for (const role of kitTierRoles.values()) {
    if (
      role.id !== wantedRole.id &&
      member.roles.cache.has(role.id)
    ) {
      await member.roles
        .remove(role)
        .catch(() => {});
    }
  }

  await member.roles
    .add(wantedRole)
    .catch(() => {});

  return wantedRole;
}

/* =========================================================
   CATEGORY
   ========================================================= */

async function ensureCategory(
  guild,
  name,
  existingId
) {
  let category = existingId
    ? guild.channels.cache.get(existingId)
    : null;

  if (
    !category ||
    category.type !== ChannelType.GuildCategory
  ) {
    category = guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === name
    );
  }

  if (!category) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory
    });
  }

  return category;
}

/* =========================================================
   TICKET TOPIC
   ========================================================= */

function ticketTopic(
  type,
  userId,
  kit
) {
  return `UNION:${type}:${userId}:${kit}`;
}

function parseTopic(topic) {
  const parts = topic?.split(':');

  if (
    parts?.length === 4 &&
    parts[0] === 'UNION'
  ) {
    return {
      type: parts[1],
      userId: parts[2],
      kit: parts[3]
    };
  }

  return null;
}

/* =========================================================
   SLASH COMMANDS
   ========================================================= */

const commands = [

  /* ===================== GENERATE ROLE ===================== */

  new SlashCommandBuilder()
    .setName('generaterole')
    .setDescription(
      'Generate every kit tier role.'
    ),

  /* ===================== ADD ROLE ===================== */

  new SlashCommandBuilder()
    .setName('addrole')
    .setDescription(
      'Add a permission role.'
    )

    .addStringOption(option =>
      option
        .setName('type')
        .setDescription(
          'Permission type'
        )
        .setRequired(true)

        .addChoices(
          {
            name: 'Tester',
            value: 'tester'
          },
          {
            name: 'Result',
            value: 'result'
          },
          {
            name: 'Ticket',
            value: 'ticket'
          }
        )
    )

    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription(
          'Discord role'
        )
        .setRequired(true)
    ),

  /* ===================== SETUP ===================== */

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription(
      'Configure UNION Tiers.'
    )

    .addSubcommand(sub =>
      sub
        .setName('tester')
        .setDescription(
          'Add a tester role.'
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription(
              'Tester role'
            )
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('result')
        .setDescription(
          'Add a role that can use /result and /highresult.'
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription(
              'Result role'
            )
            .setRequired(true)
        )
    )

    /*
      HIGH TIER SETUP

      Up to 5 roles per kit.

      Example:

      /setup high
      kit: Dia SMP
      role1: Dia SMP LT3
      role2: Dia SMP HT3
      role3: Dia SMP LT2
      role4: Dia SMP HT2
      role5: Dia SMP LT1

      Anyone with one of those roles can request
      High Tier Testing for that kit.
    */

    .addSubcommand(sub =>
      sub
        .setName('high')
        .setDescription(
          'Configure up to 5 LT3+ roles for a kit.'
        )

        .addStringOption(option =>
          option
            .setName('kit')
            .setDescription(
              'Kit'
            )
            .setRequired(true)

            .addChoices(
              ...Object.entries(
                KITS
              ).map(
                ([value, kit]) => ({
                  name: kit.name,
                  value
                })
              )
            )
        )

        .addRoleOption(option =>
          option
            .setName('role1')
            .setDescription(
              'LT3 or higher role'
            )
            .setRequired(true)
        )

        .addRoleOption(option =>
          option
            .setName('role2')
            .setDescription(
              'Optional'
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName('role3')
            .setDescription(
              'Optional'
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName('role4')
            .setDescription(
              'Optional'
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName('role5')
            .setDescription(
              'Optional'
            )
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('normal-channel')
        .setDescription(
          'Set normal testing request channel.'
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription(
              'Channel'
            )
            .addChannelTypes(
              ChannelType.GuildText
            )
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('high-channel')
        .setDescription(
          'Set high testing request channel.'
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription(
              'Channel'
            )
            .addChannelTypes(
              ChannelType.GuildText
            )
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('ticket-category')
        .setDescription(
          'Create normal TEST TICKETS category.'
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('high-category')
        .setDescription(
          'Create HIGH TICKETS category.'
        )
    ),

  /* ===================== RESULT ===================== */

  new SlashCommandBuilder()
    .setName('result')
    .setDescription(
      'Post a normal tier result.'
    )

    .addUserOption(option =>
      option
        .setName('user')
        .setDescription(
          'Player'
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('gmtag')
        .setDescription(
          'Minecraft gamertag'
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('region')
        .setDescription(
          'Region'
        )
        .setRequired(true)

        .addChoices(
          ...REGIONS.map(region => ({
            name: region,
            value: region
          }))
        )
    )

    .addStringOption(option =>
      option
        .setName('kit')
        .setDescription(
          'Kit'
        )
        .setRequired(true)

        .addChoices(
          ...Object.entries(
            KITS
          ).map(
            ([value, kit]) => ({
              name: kit.name,
              value
            })
          )
        )
    )

    .addStringOption(option =>
      option
        .setName('previous')
        .setDescription(
          'Previous tier'
        )
        .setRequired(true)

        .addChoices(
          {
            name: 'No Record',
            value: 'No Record'
          },

          ...TIERS.map(tier => ({
            name: tier,
            value: tier
          }))
        )
    )

    .addStringOption(option =>
      option
        .setName('tier')
        .setDescription(
          'Earned tier'
        )
        .setRequired(true)

        .addChoices(
          ...TIERS.map(tier => ({
            name: tier,
            value: tier
          }))
        )
    )

    .addUserOption(option =>
      option
        .setName('tester1')
        .setDescription(
          'Tester 1'
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('score1')
        .setDescription(
          'Tester 1 score'
        )
        .setRequired(true)
    )

    .addUserOption(option =>
      option
        .setName('tester2')
        .setDescription(
          'Tester 2'
        )
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName('score2')
        .setDescription(
          'Tester 2 score'
        )
        .setRequired(false)
    )

    .addStringOption(option =>
      option
        .setName('skin')
        .setDescription(
          'Optional NameMC skin URL or skin ID'
        )
        .setRequired(false)
    ),

  /* ===================== HIGH RESULT ===================== */

  new SlashCommandBuilder()
    .setName('highresult')
    .setDescription(
      'Post a High Tier result.'
    )

    .addUserOption(option =>
      option
        .setName('user')
        .setDescription(
          'Player'
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('gmtag')
        .setDescription(
          'Minecraft gamertag'
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('kit')
        .setDescription(
          'Kit'
        )
        .setRequired(true)

        .addChoices(
          ...Object.entries(
            KITS
          ).map(
            ([value, kit]) => ({
              name: kit.name,
              value
            })
          )
        )
    )

    .addUserOption(option =>
      option
        .setName('tester1')
        .setDescription(
          'Tester 1'
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('score1')
        .setDescription(
          'Tester 1 vs player score'
        )
        .setRequired(true)
    )

    .addUserOption(option =>
      option
        .setName('tester2')
        .setDescription(
          'Tester 2'
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('score2')
        .setDescription(
          'Tester 2 vs player score'
        )
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('tier')
        .setDescription(
          'High tier tested'
        )
        .setRequired(true)

        .addChoices(
          {
            name: 'HT3',
            value: 'HT3'
          },
          {
            name: 'LT2',
            value: 'LT2'
          },
          {
            name: 'HT2',
            value: 'HT2'
          },
          {
            name: 'LT1',
            value: 'LT1'
          },
          {
            name: 'HT1',
            value: 'HT1'
          }
        )
    )

    .addStringOption(option =>
      option
        .setName('skin')
        .setDescription(
          'Optional NameMC skin URL or skin ID'
        )
        .setRequired(false)
    ),

  /* ===================== NORMAL TEST ===================== */

  new SlashCommandBuilder()
    .setName('test')
    .setDescription(
      'Open a normal tier test.'
    )

    .addStringOption(option =>
      option
        .setName('kit')
        .setDescription(
          'Kit'
        )
        .setRequired(true)

        .addChoices(
          ...Object.entries(
            KITS
          ).map(
            ([value, kit]) => ({
              name: kit.name,
              value
            })
          )
        )
    )

    .addStringOption(option =>
      option
        .setName('region')
        .setDescription(
          'Region'
        )
        .setRequired(true)

        .addChoices(
          ...REGIONS.map(region => ({
            name: region,
            value: region
          }))
        )
    ),

  /* ===================== HIGH TEST ===================== */

  new SlashCommandBuilder()
    .setName('hightest')
    .setDescription(
      'Open a High Tier Test.'
    )

    .addStringOption(option =>
      option
        .setName('kit')
        .setDescription(
          'Kit'
        )
        .setRequired(true)

        .addChoices(
          ...Object.entries(
            KITS
          ).map(
            ([value, kit]) => ({
              name: kit.name,
              value
            })
          )
        )
    )

    .addStringOption(option =>
      option
        .setName('region')
        .setDescription(
          'Region'
        )
        .setRequired(true)

        .addChoices(
          ...REGIONS.map(region => ({
            name: region,
            value: region
          }))
        )
    )

].map(command => command.toJSON());

/* =========================================================
   REGISTER COMMANDS
   ========================================================= */

const rest = new REST({
  version: '10'
}).setToken(TOKEN);

await rest.put(
  Routes.applicationCommands(CLIENT_ID),
  {
    body: commands
  }
);

/* =========================================================
   THE ONLY CLIENT DECLARATION
   This fixes your:
   "Identifier 'Client' has already been declared"
   ========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],

  partials: [
    Partials.Channel
  ]
});

/* =========================================================
   READY
   ========================================================= */

client.once(
  'ready',
  () => {
    console.log(
      `UNION Tiers online as ${client.user.tag}`
    );
  }
);

/* =========================================================
   CREATE TICKET
   ========================================================= */

async function makeTicket(
  interaction,
  type,
  kitKey,
  region
) {
  const settings =
    guildData(
      interaction.guild.id
    );

  const isHigh =
    type === 'high';

  const category =
    await ensureCategory(
      interaction.guild,

      isHigh
        ? 'HIGH TICKETS'
        : 'TEST TICKETS',

      isHigh
        ? settings.highTicketCategoryId
        : settings.ticketCategoryId
    );

  if (isHigh) {
    settings.highTicketCategoryId =
      category.id;
  } else {
    settings.ticketCategoryId =
      category.id;
  }

  saveData();

  const existing =
    interaction.guild.channels.cache.find(
      channel => {
        if (
          channel.type !==
          ChannelType.GuildText
        ) {
          return false;
        }

        const topic =
          parseTopic(
            channel.topic
          );

        return (
          topic &&
          topic.userId ===
            interaction.user.id &&
          topic.type === type
        );
      }
    );

  if (existing) {
    return interaction.reply({
      content:
        `❌ You already have a ${type} ticket: ${existing}`,
      ephemeral: true
    });
  }

  const safeName =
    interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 16) ||
    'player';

  const channel =
    await interaction.guild.channels.create({
      name:
        `${isHigh ? 'high' : 'test'}-${safeName}-${kitKey}`
          .slice(0, 100),

      type:
        ChannelType.GuildText,

      parent:
        category.id,

      topic:
        ticketTopic(
          type,
          interaction.user.id,
          kitKey
        ),

      permissionOverwrites: [

        {
          id:
            interaction.guild.roles
              .everyone.id,

          deny: [
            PermissionFlagsBits.ViewChannel
          ]
        },

        {
          id:
            interaction.user.id,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        },

        ...[
          ...settings.testerRoles,
          ...settings.ticketRoles
        ].map(roleId => ({
          id: roleId,

          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }))
      ]
    });

  const selectedKit =
    KITS[kitKey];

  const embed =
    new EmbedBuilder()
      .setColor(
        isHigh
          ? '#e63946'
          : '#ffcc00'
      )

      .setTitle(
        `${isHigh ? '👑 HIGH TIER' : '🎫'} ${selectedKit.emoji} ${selectedKit.name} Tier Test`
      )

      .setThumbnail(
        interaction.user.displayAvatarURL({
          size: 512
        })
      )

      .setDescription(
        `${isHigh ? '**HIGH TIER TESTING**' : '**TIER TESTING**'}

👤 **Player:** <@${interaction.user.id}>

🎮 **GMTAG:** ${interaction.user.username}

🌍 **Region:** ${region}

⚔️ **Format:** Best of ${
          selectedKit.rounds === 6
            ? 6
            : 3
        }

🔢 **Rounds:** ${
          selectedKit.rounds
        }

━━━━━━━━━━━━━━━━━━

📌 **Testing Rules**

• The tester decides where the test will be done.

• ${
          selectedKit.rounds === 6
            ? 'Complete Best of 6.'
            : 'Complete Best of 3.'
        }

• Both players must be ready before starting.

• Follow the tester's instructions.

• Do not leave during the test.`
      )

      .setFooter({
        text:
          'UNION TIERS • Union Tier Testing'
      });

  const row =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            `close:${type}`
          )

          .setLabel(
            '🔒 Close Ticket'
          )

          .setStyle(
            ButtonStyle.Danger
          )
      );

  const staffRoles = [
    ...new Set([
      ...settings.testerRoles,
      ...settings.ticketRoles
    ])
  ];

  await channel.send({
    content:
      staffRoles.length
        ? staffRoles
            .map(
              id => `<@&${id}>`
            )
            .join(' ')
        : undefined,

    embeds: [
      embed
    ],

    components: [
      row
    ]
  });

  return interaction.reply({
    content:
      `✅ Ticket created: ${channel}`,

    ephemeral: true
  });
}

/* =========================================================
   INTERACTIONS
   ========================================================= */

client.on(
  'interactionCreate',
  async interaction => {

    try {

      /* =====================================================
         BUTTONS
         ===================================================== */

      if (
        interaction.isButton()
      ) {

        if (
          interaction.customId
            .startsWith('close:')
        ) {

          const settings =
            guildData(
              interaction.guild.id
            );

          const topic =
            parseTopic(
              interaction.channel.topic
            );

          const isOwner =
            topic &&
            topic.userId ===
              interaction.user.id;

          if (
            !canUseTicketStaff(
              interaction.member,
              settings
            ) &&
            !isOwner
          ) {

            return interaction.reply({
              content:
                '❌ You cannot close this ticket.',
              ephemeral: true
            });
          }

          await interaction.reply(
            '🔒 Ticket closing...'
          );

          setTimeout(
            () => {
              interaction.channel
                .delete()
                .catch(() => {});
            },
            1500
          );
        }

        return;
      }

      /* =====================================================
         ONLY CHAT INPUT COMMANDS
         ===================================================== */

      if (
        !interaction.isChatInputCommand()
      ) {
        return;
      }

      const settings =
        guildData(
          interaction.guild.id
        );

      /* =====================================================
         /GENERATEROLE
         ===================================================== */

      if (
        interaction.commandName ===
        'generaterole'
      ) {

        if (
          !interaction.member.permissions.has(
            PermissionFlagsBits.ManageRoles
          )
        ) {

          return interaction.reply({
            content:
              '❌ You need **Manage Roles**.',
            ephemeral: true
          });
        }

        let count = 0;

        for (
          const kit of Object.keys(KITS)
        ) {

          for (
            const tier of TIERS
          ) {

            await getOrCreateRole(
              interaction.guild,
              tierRoleName(
                kit,
                tier
              )
            );

            count++;
          }
        }

        return interaction.reply(
          `✅ Generated/verified **${count}** kit tier roles.

Example:
💎 Dia SMP LT5
💎 Dia SMP HT5
💎 Dia SMP LT4
💎 Dia SMP HT4
💎 Dia SMP LT3
💎 Dia SMP HT3
💎 Dia SMP LT2
💎 Dia SMP HT2
💎 Dia SMP LT1
💎 Dia SMP HT1`
        );
      }

      /* =====================================================
         /ADDROLE
         ===================================================== */

      if (
        interaction.commandName ===
        'addrole'
      ) {

        if (
          !interaction.member.permissions.has(
            PermissionFlagsBits.ManageRoles
          )
        ) {

          return interaction.reply({
            content:
              '❌ You need **Manage Roles**.',
            ephemeral: true
          });
        }

        const type =
          interaction.options.getString(
            'type'
          );

        const role =
          interaction.options.getRole(
            'role'
          );

        let arrayName;

        if (
          type === 'tester'
        ) {
          arrayName =
            'testerRoles';
        }

        else if (
          type === 'result'
        ) {
          arrayName =
            'resultRoles';
        }

        else {
          arrayName =
            'ticketRoles';
        }

        if (
          !settings[arrayName]
            .includes(role.id)
        ) {

          settings[arrayName]
            .push(role.id);
        }

        saveData();

        return interaction.reply(
          `✅ ${role} was added to **${type}** permissions.

${type === 'result'
  ? 'They can now use **/result** and **/highresult**.'
  : ''}`
        );
      }

      /* =====================================================
         /SETUP
         ===================================================== */

      if (
        interaction.commandName ===
        'setup'
      ) {

        if (
          !interaction.member.permissions.has(
            PermissionFlagsBits.ManageGuild
          )
        ) {

          return interaction.reply({
            content:
              '❌ You need **Manage Server**.',
            ephemeral: true
          });
        }

        const subcommand =
          interaction.options.getSubcommand();

        /* TESTER */

        if (
          subcommand === 'tester'
        ) {

          const role =
            interaction.options.getRole(
              'role'
            );

          if (
            !settings.testerRoles
              .includes(role.id)
          ) {

            settings.testerRoles
              .push(role.id);
          }

          saveData();

          return interaction.reply(
            `✅ ${role} is now a **Tester** role.`
          );
        }

        /* RESULT */

        if (
          subcommand === 'result'
        ) {

          const role =
            interaction.options.getRole(
              'role'
            );

          if (
            !settings.resultRoles
              .includes(role.id)
          ) {

            settings.resultRoles
              .push(role.id);
          }

          saveData();

          return interaction.reply(
            `✅ ${role} can now use **/result** and **/highresult**.`
          );
        }

        /* HIGH ROLE SETUP */

        if (
          subcommand === 'high'
        ) {

          const kit =
            interaction.options.getString(
              'kit'
            );

          const roles = [];

          for (
            let i = 1;
            i <= 5;
            i++
          ) {

            const role =
              interaction.options.getRole(
                `role${i}`
              );

            if (role) {
              roles.push(
                role.id
              );
            }
          }

          settings.highRoles[kit] =
            roles;

          saveData();

          return interaction.reply(
            `👑 **High Tier Testing configured for ${kitName(kit)}**

Players can request High Tier Testing for this kit if they have one of these configured roles:

${roles
  .map(id => `• <@&${id}>`)
  .join('\n')}

Up to 5 qualifying roles are supported.`
          );
        }

        /* NORMAL CHANNEL */

        if (
          subcommand ===
          'normal-channel'
        ) {

          const channel =
            interaction.options.getChannel(
              'channel'
            );

          settings.normalRequestChannelId =
            channel.id;

          saveData();

          return interaction.reply(
            `✅ Normal testing channel set to ${channel}.`
          );
        }

        /* HIGH CHANNEL */

        if (
          subcommand ===
          'high-channel'
        ) {

          const channel =
            interaction.options.getChannel(
              'channel'
            );

          settings.highRequestChannelId =
            channel.id;

          saveData();

          return interaction.reply(
            `👑 High Tier Testing channel set to ${channel}.`
          );
        }

        /* NORMAL CATEGORY */

        if (
          subcommand ===
          'ticket-category'
        ) {

          const category =
            await ensureCategory(
              interaction.guild,
              'TEST TICKETS',
              settings.ticketCategoryId
            );

          settings.ticketCategoryId =
            category.id;

          saveData();

          return interaction.reply(
            `✅ Normal ticket category: **${category.name}**`
          );
        }

        /* HIGH CATEGORY */

        if (
          subcommand ===
          'high-category'
        ) {

          const category =
            await ensureCategory(
              interaction.guild,
              'HIGH TICKETS',
              settings.highTicketCategoryId
            );

          settings.highTicketCategoryId =
            category.id;

          saveData();

          return interaction.reply(
            `👑 High ticket category: **${category.name}**`
          );
        }
      }

      /* =====================================================
         /TEST
         ===================================================== */

      if (
        interaction.commandName ===
        'test'
      ) {

        const kit =
          interaction.options.getString(
            'kit'
          );

        const region =
          interaction.options.getString(
            'region'
          );

        return makeTicket(
          interaction,
          'normal',
          kit,
          region
        );
      }

      /* =====================================================
         /HIGHTEST

         Players:
         - MUST have configured role for selected kit

         Testers:
         - Can make high tickets
         - Can view high tickets
         - Can test high tickets
         ===================================================== */

      if (
        interaction.commandName ===
        'hightest'
      ) {

        const kit =
          interaction.options.getString(
            'kit'
          );

        const region =
          interaction.options.getString(
            'region'
          );

        const allowedRoles =
          settings.highRoles[kit] ||
          [];

        const isTester =
          canUseTicketStaff(
            interaction.member,
            settings
          );

        if (
          !isTester &&
          !hasAnyRole(
            interaction.member,
            allowedRoles
          )
        ) {

          return interaction.reply({
            content:
              `❌ You cannot access High Tier Testing for **${kitName(kit)}**.

You need one of the configured **LT3 or higher** roles for this kit.

Example:
🏆 ${kitName(kit)} LT3`,

            ephemeral: true
          });
        }

        return makeTicket(
          interaction,
          'high',
          kit,
          region
        );
      }

      /* =====================================================
         /RESULT
         ===================================================== */

      if (
        interaction.commandName ===
        'result'
      ) {

        if (
          !canUseResults(
            interaction.member,
            settings
          )
        ) {

          return interaction.reply({
            content:
              '❌ You do not have permission to use **/result**.',
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser(
            'user'
          );

        const gmtag =
          interaction.options.getString(
            'gmtag'
          );

        const region =
          interaction.options.getString(
            'region'
          );

        const kit =
          interaction.options.getString(
            'kit'
          );

        const previous =
          interaction.options.getString(
            'previous'
          );

        const tier =
          interaction.options.getString(
            'tier'
          );

        const tester1 =
          interaction.options.getUser(
            'tester1'
          );

        const score1 =
          interaction.options.getString(
            'score1'
          );

        const tester2 =
          interaction.options.getUser(
            'tester2'
          );

        const score2 =
          interaction.options.getString(
            'score2'
          );

        const skin =
          interaction.options.getString(
            'skin'
          );

        /* ASSIGN KIT-SPECIFIC ROLE */

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (member) {

          await assignTierRole(
            interaction.guild,
            member,
            kit,
            tier
          );
        }

        const status =
          getStatus(
            previous,
            tier
          );

        const selectedKit =
          KITS[kit];

        const embed =
          new EmbedBuilder()

            .setColor(
              status ===
                '📉 DEMOTED'
                ? '#e63946'
                : '#ffcc00'
            )

            .setTitle(
              '🏆 UNION TIERS'
            )

            /*
              BIG DEFAULT SKIN
            */

            .setImage(
              getSkinURL(skin)
            )

            .setDescription(
              `👤 **Player:** ${user}

🎮 **GMTAG:** ${gmtag}

🌍 **Region:** ${region}

━━━━━━━━━━━━━━━━━━

📊 **Previous Tier:** ${previous}

🏆 **EARNED RANK ${tier}**

**${status}**

━━━━━━━━━━━━━━━━━━

🧪 **TESTER & SCORE**

👤 **Tester:** ${tester1}

⚔️ **Score:** ${score1}

${
  tester2
    ? `👤 **Tester 2:** ${tester2}

⚔️ **Score:** ${score2}

`
    : ''
}

━━━━━━━━━━━━━━━━━━

🎯 **Kit**

${selectedKit.emoji} ${selectedKit.name}

🏆 **Earned Rank**

${tier}

⚔️ **Format**

Best of ${
                selectedKit.rounds === 6
                  ? 6
                  : 3
              }`
            )

            .setFooter({
              text:
                'UNION TIERS • Union Tier Testing'
            });

        return interaction.reply({
          embeds: [
            embed
          ]
        });
      }

      /* =====================================================
         /HIGHRESULT

         ONLY:
         Name
         GMTAG
         Tester 1 vs player score
         Tester 2 vs player score
         Tier
         Skin
         ===================================================== */

      if (
        interaction.commandName ===
        'highresult'
      ) {

        if (
          !canUseResults(
            interaction.member,
            settings
          )
        ) {

          return interaction.reply({
            content:
              '❌ You do not have permission to use **/highresult**.',
            ephemeral: true
          });
        }

        const user =
          interaction.options.getUser(
            'user'
          );

        const gmtag =
          interaction.options.getString(
            'gmtag'
          );

        const kit =
          interaction.options.getString(
            'kit'
          );

        const tester1 =
          interaction.options.getUser(
            'tester1'
          );

        const score1 =
          interaction.options.getString(
            'score1'
          );

        const tester2 =
          interaction.options.getUser(
            'tester2'
          );

        const score2 =
          interaction.options.getString(
            'score2'
          );

        const tier =
          interaction.options.getString(
            'tier'
          );

        const skin =
          interaction.options.getString(
            'skin'
          );

        /*
          HT3 and above = PASS

          HT3
          LT2
          HT2
          LT1
          HT1
        */

        const passed =
          TIER_RANK[tier] >=
          TIER_RANK['HT3'];

        /* ONLY GIVE ROLE WHEN PASSED */

        const member =
          await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        if (
          passed &&
          member
        ) {

          await assignTierRole(
            interaction.guild,
            member,
            kit,
            tier
          );
        }

        const embed =
          new EmbedBuilder()

            .setColor(
              passed
                ? '#ffcc00'
                : '#e63946'
            )

            .setTitle(
              '👑 HIGH TIER RESULT'
            )

            /*
              BIG DEFAULT SKIN
            */

            .setImage(
              getSkinURL(skin)
            )

            .setDescription(
              `👤 **Name:** ${user}

🎮 **GMTAG:** ${gmtag}

━━━━━━━━━━━━━━━━━━

🧪 **Tester 1**

${tester1}

⚔️ **${tester1.username} vs player**

**Score:** ${score1}

━━━━━━━━━━━━━━━━━━

🧪 **Tester 2**

${tester2}

⚔️ **${tester2.username} vs player**

**Score:** ${score2}

━━━━━━━━━━━━━━━━━━

🏆 **Tier**

${
  passed
    ? `PASSED ${tier} TEST`
    : `FAILED ${tier} TEST`
}`
            )

            .setFooter({
              text:
                'UNION TIERS • High Tier Testing'
            });

        return interaction.reply({
          embeds: [
            embed
          ]
        });
      }

    }

    catch (error) {

      console.error(
        'Interaction Error:',
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {

        await interaction.reply({
          content:
            '❌ Something went wrong. Check the console.',
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
);

/* =========================================================
   LOGIN
   ========================================================= */

client.login(TOKEN);
