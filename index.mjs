const {
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
    StringSelectMenuOptionBuilder,
    SlashCommandBuilder,
    REST,
    Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   UNION TIERS
   Discord.js v14
   Uses DISCORD_TOKEN ONLY
   ========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN is missing.");
    process.exit(1);
}

/* =========================================================
   CLIENT
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
   DATABASE
   ========================================================= */

const DATA_FILE = path.join(__dirname, "data.json");

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, JSON.stringify({
                guilds: {}
            }, null, 2));
        }

        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch (err) {
        console.error("Database error:", err);
        return { guilds: {} };
    }
}

let db = loadData();

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function guildData(guildId) {
    if (!db.guilds[guildId]) {
        db.guilds[guildId] = {
            setupName: "UNION TIERS",

            ticketCategoryId: null,
            highTicketCategoryId: null,

            requestChannelId: null,
            highRequestChannelId: null,

            waitlistCategoryId: null,

            testerRoles: [],
            ticketRoles: [],
            messageRoles: [],

            welcome: {
                channelId: null,
                message: "Welcome {user} to UNION TIERS!"
            },

            farewell: {
                channelId: null,
                message: "Goodbye {user}!"
            },

            kits: {},

            tickets: {},

            waitlists: {},

            generatedRoles: {}
        };

        saveData();
    }

    return db.guilds[guildId];
}

/* =========================================================
   KITS
   ========================================================= */

const KITS = {
    sword: {
        name: "Sword",
        emoji: "⚔️",
        rounds: 6
    },

    uhc: {
        name: "UHC",
        emoji: "❤️",
        rounds: 3
    },

    "dia-smp": {
        name: "Dia SMP",
        emoji: "💎",
        rounds: 3
    },

    "neth-pot": {
        name: "Neth Pot",
        emoji: "🧪",
        rounds: 3
    },

    mace: {
        name: "Mace",
        emoji: "🔨",
        rounds: 3
    },

    "spear-mace": {
        name: "Spear Mace",
        emoji: "🔱",
        rounds: 3
    },

    crystal: {
        name: "Crystal",
        emoji: "💠",
        rounds: 3
    },

    cart: {
        name: "Cart",
        emoji: "🛒",
        rounds: 3
    },

    axe: {
        name: "Axe",
        emoji: "🪓",
        rounds: 3
    }
};

const KIT_CHOICES = Object.entries(KITS).map(([value, kit]) => ({
    name: kit.name,
    value
}));

/* =========================================================
   REGIONS
   ========================================================= */

const REGIONS = {
    AS: "🌏",
    EU: "🌍",
    NA: "🌎",
    OC: "🌊"
};

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

const PREVIOUS_TIERS = [
    "No Record",
    ...TIERS
];

const NORMAL_TIERS = [
    "LT5",
    "HT5",
    "LT4",
    "HT4",
    "LT3"
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

/* =========================================================
   DEFAULT SKIN
   ========================================================= */

const DEFAULT_SKIN =
    "https://mc-heads.net/body/6cc743790519ce59/300";

/* =========================================================
   HELPERS
   ========================================================= */

function safeName(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 90);
}

function isOwner(member) {
    return member.id === member.guild.ownerId;
}

function hasRole(member, roleIds = []) {
    return roleIds.some(id => member.roles.cache.has(id));
}

function isStaff(member) {
    const data = guildData(member.guild.id);

    return (
        isOwner(member) ||
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
        hasRole(member, data.testerRoles)
    );
}

function canUseTickets(member) {
    const data = guildData(member.guild.id);

    return (
        isOwner(member) ||
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        hasRole(member, data.ticketRoles)
    );
}

function canUseMessage(member) {
    const data = guildData(member.guild.id);

    return (
        isOwner(member) ||
        member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        hasRole(member, data.messageRoles)
    );
}

function tierRoleName(kitKey, tier) {
    return `${KITS[kitKey].name} • ${tier}`;
}

function highRoleKey(kitKey, tier) {
    return `${kitKey}_${tier}`;
}

function getKitConfig(data, kitKey) {
    if (!data.kits[kitKey]) {
        data.kits[kitKey] = {
            highRoles: {
                LT3: null,
                HT3: null,
                HT2: null,
                LT1: null,
                HT1: null
            }
        };
    }

    return data.kits[kitKey];
}

function regionText(region) {
    return `${REGIONS[region] || "🌐"} ${region}`;
}

function replaceUser(message, user) {
    return message
        .replaceAll("{user}", `<@${user.id}>`)
        .replaceAll("{username}", user.username)
        .replaceAll("{tag}", user.tag || user.username);
}

function channelMention(id) {
    return id ? `<#${id}>` : "Not configured";
}

/* =========================================================
   ROLE HELPERS
   ========================================================= */

async function findOrCreateRole(guild, name) {
    let role = guild.roles.cache.find(
        r => r.name === name
    );

    if (role) return role;

    role = await guild.roles.create({
        name,
        reason: "UNION TIERS role generation"
    });

    return role;
}

/* =========================================================
   GENERATE ALL KIT TIER ROLES
   ========================================================= */

async function generateAllRoles(guild) {
    const data = guildData(guild.id);

    let created = 0;

    for (const kitKey of Object.keys(KITS)) {
        for (const tier of TIERS) {
            const name = tierRoleName(kitKey, tier);

            const role = await findOrCreateRole(guild, name);

            if (!data.generatedRoles[kitKey]) {
                data.generatedRoles[kitKey] = {};
            }

            if (!data.generatedRoles[kitKey][tier]) {
                data.generatedRoles[kitKey][tier] = role.id;
                created++;
            }
        }
    }

    saveData();

    return created;
}

/* =========================================================
   HIGH TIER ELIGIBILITY
   ========================================================= */

function canRequestHigh(member, kitKey) {
    const data = guildData(member.guild.id);
    const config = getKitConfig(data, kitKey);

    const roles = [
        config.highRoles.LT3,
        config.highRoles.HT3,
        config.highRoles.HT2,
        config.highRoles.LT1,
        config.highRoles.HT1
    ].filter(Boolean);

    if (roles.length === 0) {
        return false;
    }

    return hasRole(member, roles);
}

/* =========================================================
   TICKET CATEGORY
   ========================================================= */

async function getOrCreateCategory(guild, high = false) {
    const data = guildData(guild.id);

    const storedId = high
        ? data.highTicketCategoryId
        : data.ticketCategoryId;

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
        name: high ? "HIGH TIER TEST TICKETS" : "TEST TICKETS",
        type: ChannelType.GuildCategory
    });

    if (high) {
        data.highTicketCategoryId = category.id;
    } else {
        data.ticketCategoryId = category.id;
    }

    saveData();

    return category;
}

/* =========================================================
   REQUEST CHANNELS
   ========================================================= */

async function getOrCreateRequestChannel(guild, high = false) {
    const data = guildData(guild.id);

    const storedId = high
        ? data.highRequestChannelId
        : data.requestChannelId;

    if (storedId) {
        const existing = guild.channels.cache.get(storedId);

        if (existing) return existing;
    }

    const channel = await guild.channels.create({
        name: high ? "🔥・high-request-test" : "🧪・request-test",
        type: ChannelType.GuildText
    });

    if (high) {
        data.highRequestChannelId = channel.id;
    } else {
        data.requestChannelId = channel.id;
    }

    saveData();

    return channel;
}

/* =========================================================
   REQUEST EMBEDS
   ========================================================= */

function normalRequestEmbed(data) {
    return new EmbedBuilder()
        .setTitle(`${data.setupName}`)
        .setDescription(
            [
                "## 🧪 Tier Testing",
                "",
                "Click the button below to request a tier test.",
                "",
                "**Available Kits**",
                Object.values(KITS)
                    .map(k => `${k.emoji} ${k.name}`)
                    .join("\n"),
                "",
                "A tester will accept your request and create your test ticket."
            ].join("\n")
        )
        .setColor(0xffd21f);
}

function highRequestEmbed(data) {
    return new EmbedBuilder()
        .setTitle(`${data.setupName}`)
        .setDescription(
            [
                "## 👑 High Tier Testing",
                "",
                "High tier testing is available for players who have the required tier role for the selected kit.",
                "",
                "**High Tiers**",
                "HT3 • LT2 • HT2 • LT1 • HT1",
                "",
                "Select a kit below to start a high tier request."
            ].join("\n")
        )
        .setColor(0xdd2638);
}

/* =========================================================
   REQUEST BUTTONS
   ========================================================= */

function normalRequestButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("normal_request")
                .setLabel("Start Tier Test")
                .setEmoji("🧪")
                .setStyle(ButtonStyle.Primary)
        )
    ];
}

function highRequestButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("high_request")
                .setLabel("Start High Tier Test")
                .setEmoji("👑")
                .setStyle(ButtonStyle.Danger)
        )
    ];
}

/* =========================================================
   KIT SELECT MENU
   ========================================================= */

function kitMenu(type) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(`${type}_kit_select`)
        .setPlaceholder("Select a kit");

    for (const [key, kit] of Object.entries(KITS)) {
        menu.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(kit.name)
                .setValue(key)
                .setEmoji(kit.emoji)
                .setDescription(
                    key === "sword"
                        ? "Best of 6"
                        : "Best of 3"
                )
        );
    }

    return [
        new ActionRowBuilder().addComponents(menu)
    ];
}

/* =========================================================
   CREATE TICKET
   ========================================================= */

async function createTicket(interaction, kitKey, high = false) {
    const guild = interaction.guild;
    const member = interaction.member;
    const user = interaction.user;
    const data = guildData(guild.id);

    const existing = Object.entries(data.tickets).find(
        ([, ticket]) =>
            ticket.userId === user.id &&
            ticket.high === high &&
            guild.channels.cache.has(ticket.channelId)
    );

    if (existing) {
        return interaction.reply({
            content: `❌ You already have an open ${high ? "high tier" : "tier"} ticket: <#${existing[1].channelId}>`,
            ephemeral: true
        });
    }

    if (high && !canRequestHigh(member, kitKey)) {
        return interaction.reply({
            content:
                `❌ You do not have the required role to request a high tier ${KITS[kitKey].name} test.`,
            ephemeral: true
        });
    }

    const category = await getOrCreateCategory(guild, high);

    const channelName =
        `${high ? "high-" : "test-"}${safeName(user.username)}-${kitKey}`;

    const permissionOverwrites = [
        {
            id: guild.id,
            deny: [
                PermissionsBitField.Flags.ViewChannel
            ]
        },

        {
            id: user.id,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
            ]
        }
    ];

    for (const roleId of data.testerRoles) {
        permissionOverwrites.push({
            id: roleId,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
            ]
        });
    }

    for (const roleId of data.ticketRoles) {
        permissionOverwrites.push({
            id: roleId,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
            ]
        });
    }

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites
    });

    data.tickets[channel.id] = {
        channelId: channel.id,
        userId: user.id,
        kit: kitKey,
        region: null,
        high,
        acceptedBy: null,
        createdAt: Date.now()
    };

    saveData();

    const embed = new EmbedBuilder()
        .setTitle(
            `${high ? "👑 HIGH TIER" : "🧪 TIER"} TEST TICKET`
        )
        .setColor(high ? 0xdd2638 : 0xffd21f)
        .setThumbnail(user.displayAvatarURL())
        .setDescription(
            [
                `### Player`,
                `<@${user.id}>`,
                "",
                `**Kit:** ${KITS[kitKey].emoji} ${KITS[kitKey].name}`,
                `**Rounds:** Best of ${KITS[kitKey].rounds}`,
                `**Type:** ${high ? "High Tier" : "Normal Tier"}`,
                "",
                "**Testing Instructions**",
                "• Wait for a tester to accept the ticket.",
                "• Follow the tester's instructions.",
                "• Do not leave the ticket while being tested.",
                "",
                high
                    ? "**High Tier Requirement:** HT3 or above eligibility role."
                    : "A tester will begin your test shortly."
            ].join("\n")
        );

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`claim_ticket:${channel.id}`)
            .setLabel("Accept Test")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId(`close_ticket:${channel.id}`)
            .setLabel("Close")
            .setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
        content: `<@${user.id}>`,
        embeds: [embed],
        components: [buttons]
    });

    await interaction.reply({
        content: `✅ Your test ticket has been created: ${channel}`,
        ephemeral: true
    });
}

/* =========================================================
   CLOSE TICKET
   ========================================================= */

async function closeTicket(interaction, channelId) {
    const data = guildData(interaction.guild.id);
    const ticket = data.tickets[channelId];

    if (!ticket) {
        return interaction.reply({
            content: "❌ This is not a UNION TIERS test ticket.",
            ephemeral: true
        });
    }

    if (
        !isStaff(interaction.member) &&
        !canUseTickets(interaction.member)
    ) {
        return interaction.reply({
            content: "❌ You do not have permission to close tickets.",
            ephemeral: true
        });
    }

    delete data.tickets[channelId];
    saveData();

    await interaction.reply("🔒 Closing ticket...");

    setTimeout(async () => {
        const channel = interaction.guild.channels.cache.get(channelId);

        if (channel) {
            await channel.delete().catch(() => {});
        }
    }, 1500);
}

/* =========================================================
   ACCEPT TICKET
   ========================================================= */

async function claimTicket(interaction, channelId) {
    const data = guildData(interaction.guild.id);
    const ticket = data.tickets[channelId];

    if (!ticket) {
        return interaction.reply({
            content: "❌ Ticket not found.",
            ephemeral: true
        });
    }

    if (!isStaff(interaction.member)) {
        return interaction.reply({
            content: "❌ Only configured testers/staff can accept tests.",
            ephemeral: true
        });
    }

    if (ticket.acceptedBy) {
        return interaction.reply({
            content:
                `❌ This test is already accepted by <@${ticket.acceptedBy}>.`,
            ephemeral: true
        });
    }

    ticket.acceptedBy = interaction.user.id;

    saveData();

    await interaction.reply({
        content:
            `✅ <@${interaction.user.id}> accepted this test.\n` +
            `**Player:** <@${ticket.userId}>\n` +
            `**Kit:** ${KITS[ticket.kit].emoji} ${KITS[ticket.kit].name}\n` +
            `**Rounds:** Best of ${KITS[ticket.kit].rounds}`
    });
}

/* =========================================================
   RESULT EMBED
   ========================================================= */

function resultEmbed({
    guild,
    user,
    gmtag,
    region,
    kit,
    previous,
    tier,
    tester1,
    score1,
    tester2,
    score2,
    skin
}) {
    const rankChange =
        TIER_RANK[tier] -
        (previous === "No Record" ? 0 : TIER_RANK[previous]);

    let status = "RANKED";

    if (previous === "No Record") {
        status = "NEW RANK";
    } else if (rankChange > 0) {
        status = "PROMOTED";
    } else if (rankChange === 0) {
        status = "RETAINED";
    } else {
        status = "DEMOTED";
    }

    const embed = new EmbedBuilder()
        .setTitle("🏆 TIER TESTING RESULT")
        .setColor(0xffd21f)
        .setThumbnail(user.displayAvatarURL())
        .setDescription(
            [
                `## ${user.username}`,
                "",
                `**Status:** ${status}`,
                `**Tier:** ${tier}`,
                ""
            ].join("\n")
        )
        .addFields(
            {
                name: "👤 Player",
                value: `<@${user.id}>`,
                inline: true
            },
            {
                name: "🎮 GMTAG",
                value: gmtag,
                inline: true
            },
            {
                name: "🌍 Region",
                value: regionText(region),
                inline: true
            },
            {
                name: `${KITS[kit].emoji} Kit`,
                value: KITS[kit].name,
                inline: true
            },
            {
                name: "📊 Previous Tier",
                value: previous,
                inline: true
            },
            {
                name: "🏆 New Tier",
                value: tier,
                inline: true
            },
            {
                name: "🧪 Tester 1",
                value: `<@${tester1}>`,
                inline: true
            },
            {
                name: "📈 Score 1",
                value: score1,
                inline: true
            }
        );

    if (tester2 && score2) {
        embed.addFields(
            {
                name: "🧪 Tester 2",
                value: `<@${tester2}>`,
                inline: true
            },
            {
                name: "📈 Score 2",
                value: score2,
                inline: true
            }
        );
    }

    if (skin) {
        embed.setImage(skin);
    }

    embed.setFooter({
        text: `${guild.name} • UNION TIERS`
    });

    return embed;
}

/* =========================================================
   HIGH RESULT EMBED
   ========================================================= */

function highResultEmbed({
    guild,
    user,
    gmtag,
    region,
    kit,
    previous,
    tier,
    tester1,
    score1,
    tester2,
    score2,
    skin
}) {
    const pass =
        TIER_RANK[tier] >= TIER_RANK.HT3;

    const embed = new EmbedBuilder()
        .setTitle("👑 HIGH TIER RESULT")
        .setColor(pass ? 0xdd2638 : 0x555555)
        .setThumbnail(user.displayAvatarURL())
        .setDescription(
            [
                `## ${user.username}`,
                "",
                `**High Tier Status:** ${pass ? "✅ PASSED" : "❌ FAILED"}`,
                `**Tier:** ${tier}`,
                ""
            ].join("\n")
        )
        .addFields(
            {
                name: "👤 Player",
                value: `<@${user.id}>`,
                inline: true
            },
            {
                name: "🎮 GMTAG",
                value: gmtag,
                inline: true
            },
            {
                name: "🌍 Region",
                value: regionText(region),
                inline: true
            },
            {
                name: `${KITS[kit].emoji} Kit`,
                value: KITS[kit].name,
                inline: true
            },
            {
                name: "📊 Previous Tier",
                value: previous,
                inline: true
            },
            {
                name: "👑 New Tier",
                value: tier,
                inline: true
            },
            {
                name: "🧪 Tester 1",
                value: `<@${tester1}>`,
                inline: true
            },
            {
                name: "⚔️ Score 1",
                value: score1,
                inline: true
            }
        );

    if (tester2 && score2) {
        embed.addFields(
            {
                name: "🧪 Tester 2",
                value: `<@${tester2}>`,
                inline: true
            },
            {
                name: "⚔️ Score 2",
                value: score2,
                inline: true
            }
        );
    }

    embed.setImage(skin || DEFAULT_SKIN);

    embed.setFooter({
        text: `${guild.name} • UNION TIERS`
    });

    return embed;
}

/* =========================================================
   APPLY TIER ROLE
   ========================================================= */

async function applyTierRole(member, kitKey, tier) {
    const data = guildData(member.guild.id);

    const roleId =
        data.generatedRoles?.[kitKey]?.[tier];

    if (!roleId) {
        return;
    }

    const newRole = member.guild.roles.cache.get(roleId);

    if (!newRole) {
        return;
    }

    const rolesToRemove = [];

    for (const oldTier of TIERS) {
        const oldId =
            data.generatedRoles?.[kitKey]?.[oldTier];

        if (
            oldId &&
            oldId !== roleId &&
            member.roles.cache.has(oldId)
        ) {
            rolesToRemove.push(oldId);
        }
    }

    if (rolesToRemove.length) {
        await member.roles.remove(rolesToRemove).catch(() => {});
    }

    await member.roles.add(newRole).catch(() => {});
}

/* =========================================================
   COMMANDS
   ========================================================= */

function buildCommands() {

    const commands = [];

    /* SETUP */

    commands.push(
        new SlashCommandBuilder()
            .setName("setup")
            .setDescription("Create or update the UNION Tiers testing system")
            .addStringOption(option =>
                option
                    .setName("name")
                    .setDescription("Name of the tier system")
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName("kit")
                    .setDescription("Configure high-tier access for a kit")
                    .addChoices(...KIT_CHOICES)
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option
                    .setName("lt3")
                    .setDescription("LT3 role for this kit")
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option
                    .setName("ht3")
                    .setDescription("HT3 role for this kit")
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option
                    .setName("ht2")
                    .setDescription("HT2 role for this kit")
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option
                    .setName("lt1")
                    .setDescription("LT1 role for this kit")
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option
                    .setName("ht1")
                    .setDescription("HT1 role for this kit")
                    .setRequired(false)
            )
    );

    /* WELCOME */

    commands.push(
        new SlashCommandBuilder()
            .setName("welcome")
            .setDescription("Configure welcome messages")
            .addChannelOption(option =>
                option
                    .setName("channel")
                    .setDescription("Welcome channel")
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("message")
                    .setDescription("Welcome message")
                    .setRequired(true)
            )
    );

    /* FAREWELL */

    commands.push(
        new SlashCommandBuilder()
            .setName("farewell")
            .setDescription("Configure farewell messages")
            .addChannelOption(option =>
                option
                    .setName("channel")
                    .setDescription("Farewell channel")
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("message")
                    .setDescription("Farewell message")
                    .setRequired(true)
            )
    );

    /* ADD ROLE */

    commands.push(
        new SlashCommandBuilder()
            .setName("addrole")
            .setDescription("Give a role access to bot ticket features")
            .addRoleOption(option =>
                option
                    .setName("ticket")
                    .setDescription("Role allowed to view and close tickets")
                    .setRequired(false)
            )
    );

    /* ADD ROLE MESSAGE */

    commands.push(
        new SlashCommandBuilder()
            .setName("addrolemessage")
            .setDescription("Give a role permission to use /message")
            .addRoleOption(option =>
                option
                    .setName("role")
                    .setDescription("Role allowed to use /message")
                    .setRequired(true)
            )
    );

    /* MESSAGE */

    commands.push(
        new SlashCommandBuilder()
            .setName("message")
            .setDescription("Send a message through the bot")
            .addChannelOption(option =>
                option
                    .setName("channel")
                    .setDescription("Channel to send the message")
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("content")
                    .setDescription("Message content")
                    .setRequired(true)
            )
    );

    /* GENERATE ROLE */

    commands.push(
        new SlashCommandBuilder()
            .setName("generaterole")
            .setDescription("Generate all UNION Tiers kit and tier roles")
    );

    /* RESULT */

    commands.push(
        new SlashCommandBuilder()
            .setName("result")
            .setDescription("Post an LT3 and below tier result")
            .addUserOption(option =>
                option
                    .setName("user")
                    .setDescription("Player")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("gmtag")
                    .setDescription("Minecraft gamertag")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("region")
                    .setDescription("Player region")
                    .addChoices(
                        { name: "🌏 AS", value: "AS" },
                        { name: "🌍 EU", value: "EU" },
                        { name: "🌎 NA", value: "NA" },
                        { name: "🌊 OC", value: "OC" }
                    )
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("kit")
                    .setDescription("Test kit")
                    .addChoices(...KIT_CHOICES)
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("previous")
                    .setDescription("Previous tier")
                    .addChoices(
                        PREVIOUS_TIERS.map(x => ({
                            name: x,
                            value: x
                        }))
                    )
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("tier")
                    .setDescription("New tier")
                    .addChoices(
                        NORMAL_TIERS.map(x => ({
                            name: x,
                            value: x
                        }))
                    )
                    .setRequired(true)
            )
            .addUserOption(option =>
                option
                    .setName("tester1")
                    .setDescription("Main tester")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("score1")
                    .setDescription("Tester 1 score")
                    .setRequired(true)
            )
            .addUserOption(option =>
                option
                    .setName("tester2")
                    .setDescription("Second tester")
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName("score2")
                    .setDescription("Tester 2 score")
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName("skin")
                    .setDescription("Skin image URL")
                    .setRequired(false)
            )
    );

    /* HIGH RESULTS */

    commands.push(
        new SlashCommandBuilder()
            .setName("highresults")
            .setDescription("Post an HT3 and above tier result")
            .addUserOption(option =>
                option
                    .setName("user")
                    .setDescription("Player")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("gmtag")
                    .setDescription("Minecraft gamertag")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("region")
                    .setDescription("Player region")
                    .addChoices(
                        { name: "🌏 AS", value: "AS" },
                        { name: "🌍 EU", value: "EU" },
                        { name: "🌎 NA", value: "NA" },
                        { name: "🌊 OC", value: "OC" }
                    )
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("kit")
                    .setDescription("Test kit")
                    .addChoices(...KIT_CHOICES)
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("previous")
                    .setDescription("Previous tier")
                    .addChoices(
                        { name: "LT3", value: "LT3" }
                    )
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("tier")
                    .setDescription("High tier")
                    .addChoices(
                        HIGH_TIERS.map(x => ({
                            name: x,
                            value: x
                        }))
                    )
                    .setRequired(true)
            )
            .addUserOption(option =>
                option
                    .setName("tester1")
                    .setDescription("Main tester")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("score1")
                    .setDescription("Tester 1 score")
                    .setRequired(true)
            )
            .addUserOption(option =>
                option
                    .setName("tester2")
                    .setDescription("Second tester")
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName("score2")
                    .setDescription("Tester 2 score")
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName("skin")
                    .setDescription("Skin image URL")
                    .setRequired(false)
            )
    );

    return commands;
}

/* =========================================================
   REGISTER COMMANDS
   ========================================================= */

async function registerCommands() {

    /*
       IMPORTANT:

       We DO NOT use CLIENT_ID.

       client.user.id is automatically the application ID.
    */

    const commands = buildCommands().map(command =>
        command.toJSON()
    );

    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    try {

        console.log("🔄 Registering UNION TIERS commands...");

        await rest.put(
            Routes.applicationCommands(client.user.id),
            {
                body: commands
            }
        );

        console.log(
            `✅ Registered ${commands.length} unique slash commands.`
        );

    } catch (error) {
        console.error(
            "❌ Failed to register commands:",
            error
        );
    }
}

/* =========================================================
   READY
   ========================================================= */

client.once("ready", async () => {

    console.log("=================================");
    console.log("      UNION TIERS ONLINE");
    console.log("=================================");
    console.log(`Bot: ${client.user.tag}`);
    console.log(`Servers: ${client.guilds.cache.size}`);

    await registerCommands();

    client.user.setPresence({
        activities: [
            {
                name: "UNION TIERS",
                type: 0
            }
        ],
        status: "online"
    });
});

/* =========================================================
   SLASH COMMAND HANDLER
   ========================================================= */

client.on("interactionCreate", async interaction => {

    try {

        /* =====================================================
           BUTTONS
           ===================================================== */

        if (interaction.isButton()) {

            /* NORMAL REQUEST */

            if (interaction.customId === "normal_request") {

                return interaction.reply({
                    content: "Select the kit you want to test:",
                    components: kitMenu("normal"),
                    ephemeral: true
                });
            }

            /* HIGH REQUEST */

            if (interaction.customId === "high_request") {

                return interaction.reply({
                    content: "Select the kit you want to high-tier test:",
                    components: kitMenu("high"),
                    ephemeral: true
                });
            }

            /* CLAIM */

            if (interaction.customId.startsWith("claim_ticket:")) {

                const channelId =
                    interaction.customId.split(":")[1];

                return claimTicket(
                    interaction,
                    channelId
                );
            }

            /* CLOSE */

            if (interaction.customId.startsWith("close_ticket:")) {

                const channelId =
                    interaction.customId.split(":")[1];

                return closeTicket(
                    interaction,
                    channelId
                );
            }

            return;
        }

        /* =====================================================
           SELECT MENUS
           ===================================================== */

        if (interaction.isStringSelectMenu()) {

            if (
                interaction.customId ===
                "normal_kit_select"
            ) {

                const kit =
                    interaction.values[0];

                return createTicket(
                    interaction,
                    kit,
                    false
                );
            }

            if (
                interaction.customId ===
                "high_kit_select"
            ) {

                const kit =
                    interaction.values[0];

                if (
                    !canRequestHigh(
                        interaction.member,
                        kit
                    )
                ) {

                    return interaction.reply({
                        content:
                            `❌ You do not have the required high-tier role for **${KITS[kit].name}**.`,
                        ephemeral: true
                    });
                }

                return createTicket(
                    interaction,
                    kit,
                    true
                );
            }

            return;
        }

        /* =====================================================
           SLASH COMMANDS
           ===================================================== */

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command =
            interaction.commandName;

        const guild =
            interaction.guild;

        if (!guild) {
            return interaction.reply({
                content: "❌ This command can only be used inside a server.",
                ephemeral: true
            });
        }

        const member =
            interaction.member;

        const data =
            guildData(guild.id);

        /* =====================================================
           SETUP
           ===================================================== */

        if (command === "setup") {

            if (!isOwner(member) &&
                !member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )) {

                return interaction.reply({
                    content: "❌ Only the server owner or administrator can use /setup.",
                    ephemeral: true
                });
            }

            const name =
                interaction.options.getString("name");

            const kit =
                interaction.options.getString("kit");

            if (name) {
                data.setupName = name;
            }

            if (kit) {

                const config =
                    getKitConfig(data, kit);

                const lt3 =
                    interaction.options.getRole("lt3");

                const ht3 =
                    interaction.options.getRole("ht3");

                const ht2 =
                    interaction.options.getRole("ht2");

                const lt1 =
                    interaction.options.getRole("lt1");

                const ht1 =
                    interaction.options.getRole("ht1");

                if (lt3) config.highRoles.LT3 = lt3.id;
                if (ht3) config.highRoles.HT3 = ht3.id;
                if (ht2) config.highRoles.HT2 = ht2.id;
                if (lt1) config.highRoles.LT1 = lt1.id;
                if (ht1) config.highRoles.HT1 = ht1.id;
            }

            const category =
                await getOrCreateCategory(
                    guild,
                    false
                );

            const highCategory =
                await getOrCreateCategory(
                    guild,
                    true
                );

            const request =
                await getOrCreateRequestChannel(
                    guild,
                    false
                );

            const highRequest =
                await getOrCreateRequestChannel(
                    guild,
                    true
                );

            /*
               Send request messages if channels are empty.
            */

            if (request) {

                const messages =
                    await request.messages.fetch({
                        limit: 20
                    });

                const hasPanel =
                    messages.some(m =>
                        m.author.id === client.user.id &&
                        m.components.length > 0
                    );

                if (!hasPanel) {

                    await request.send({
                        embeds: [
                            normalRequestEmbed(data)
                        ],
                        components:
                            normalRequestButtons()
                    });
                }
            }

            if (highRequest) {

                const messages =
                    await highRequest.messages.fetch({
                        limit: 20
                    });

                const hasPanel =
                    messages.some(m =>
                        m.author.id === client.user.id &&
                        m.components.length > 0
                    );

                if (!hasPanel) {

                    await highRequest.send({
                        embeds: [
                            highRequestEmbed(data)
                        ],
                        components:
                            highRequestButtons()
                    });
                }
            }

            saveData();

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("⚙️ UNION TIERS SETUP")
                        .setColor(0xffd21f)
                        .setDescription(
                            [
                                "✅ UNION TIERS has been configured.",
                                "",
                                `**Name:** ${data.setupName}`,
                                "",
                                "**Normal Tickets:**",
                                channelMention(category.id),
                                "",
                                "**High Tier Tickets:**",
                                channelMention(highCategory.id),
                                "",
                                "**Request Channel:**",
                                channelMention(request.id),
                                "",
                                "**High Request Channel:**",
                                channelMention(highRequest.id),
                                "",
                                kit
                                    ? `**Configured Kit:** ${KITS[kit].name}`
                                    : "**High-tier kit roles:** Use `/setup` with a kit to configure them."
                            ].join("\n")
                        )
                ],
                ephemeral: true
            });
        }

        /* =====================================================
           WELCOME
           ===================================================== */

        if (command === "welcome") {

            if (!isStaff(member)) {

                return interaction.reply({
                    content: "❌ You do not have permission to configure welcome messages.",
                    ephemeral: true
                });
            }

            const channel =
                interaction.options.getChannel("channel");

            const message =
                interaction.options.getString("message");

            data.welcome.channelId =
                channel.id;

            data.welcome.message =
                message;

            saveData();

            return interaction.reply({
                content:
                    `✅ Welcome message configured for ${channel}.`,
                ephemeral: true
            });
        }

        /* =====================================================
           FAREWELL
           ===================================================== */

        if (command === "farewell") {

            if (!isStaff(member)) {

                return interaction.reply({
                    content: "❌ You do not have permission to configure farewell messages.",
                    ephemeral: true
                });
            }

            const channel =
                interaction.options.getChannel("channel");

            const message =
                interaction.options.getString("message");

            data.farewell.channelId =
                channel.id;

            data.farewell.message =
                message;

            saveData();

            return interaction.reply({
                content:
                    `✅ Farewell message configured for ${channel}.`,
                ephemeral: true
            });
        }

        /* =====================================================
           ADD ROLE
           ===================================================== */

        if (command === "addrole") {

            if (!isOwner(member) &&
                !member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )) {

                return interaction.reply({
                    content: "❌ Only the owner/administrator can use /addrole.",
                    ephemeral: true
                });
            }

            const role =
                interaction.options.getRole("ticket");

            if (!role) {

                return interaction.reply({
                    content:
                        "❌ Choose a role using the **ticket** option.",
                    ephemeral: true
                });
            }

            if (!data.ticketRoles.includes(role.id)) {

                data.ticketRoles.push(role.id);
            }

            saveData();

            return interaction.reply({
                content:
                    `✅ ${role} can now view and close test tickets.`,
                ephemeral: true
            });
        }

        /* =====================================================
           ADD MESSAGE ROLE
           ===================================================== */

        if (command === "addrolemessage") {

            if (!isOwner(member) &&
                !member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )) {

                return interaction.reply({
                    content:
                        "❌ Only the owner/administrator can use this.",
                    ephemeral: true
                });
            }

            const role =
                interaction.options.getRole("role");

            if (!data.messageRoles.includes(role.id)) {

                data.messageRoles.push(role.id);
            }

            saveData();

            return interaction.reply({
                content:
                    `✅ ${role} can now use /message.`,
                ephemeral: true
            });
        }

        /* =====================================================
           MESSAGE
           ===================================================== */

        if (command === "message") {

            if (!canUseMessage(member)) {

                return interaction.reply({
                    content:
                        "❌ You do not have permission to use /message.",
                    ephemeral: true
                });
            }

            const channel =
                interaction.options.getChannel("channel");

            const content =
                interaction.options.getString("content");

            await channel.send({
                content
            });

            return interaction.reply({
                content:
                    `✅ Message sent to ${channel}.`,
                ephemeral: true
            });
        }

        /* =====================================================
           GENERATE ROLE
           ===================================================== */

        if (command === "generaterole") {

            if (!isStaff(member)) {

                return interaction.reply({
                    content:
                        "❌ You do not have permission to generate roles.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({
                ephemeral: true
            });

            const created =
                await generateAllRoles(guild);

            return interaction.editReply({
                content:
                    `✅ Kit/tier roles generated.\n\n**New roles created:** ${created}\n**Kits:** ${Object.keys(KITS).length}\n**Tiers per kit:** ${TIERS.length}`
            });
        }

        /* =====================================================
           NORMAL RESULT
           ===================================================== */

        if (command === "result") {

            if (!isStaff(member)) {

                return interaction.reply({
                    content:
                        "❌ You do not have permission to post results.",
                    ephemeral: true
                });
            }

            const user =
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

            const tester1 =
                interaction.options.getUser("tester1");

            const score1 =
                interaction.options.getString("score1");

            const tester2 =
                interaction.options.getUser("tester2");

            const score2 =
                interaction.options.getString("score2");

            const skin =
                interaction.options.getString("skin");

            const player =
                await guild.members
                    .fetch(user.id)
                    .catch(() => null);

            if (player) {

                await applyTierRole(
                    player,
                    kit,
                    tier
                );
            }

            const embed =
                resultEmbed({
                    guild,
                    user,
                    gmtag,
                    region,
                    kit,
                    previous,
                    tier,
                    tester1: tester1.id,
                    score1,
                    tester2: tester2?.id,
                    score2,
                    skin: skin || DEFAULT_SKIN
                });

            await interaction.channel.send({
                embeds: [embed]
            });

            return interaction.reply({
                content:
                    "✅ Tier result posted.",
                ephemeral: true
            });
        }

        /* =====================================================
           HIGH RESULT
           ===================================================== */

        if (command === "highresults") {

            if (!isStaff(member)) {

                return interaction.reply({
                    content:
                        "❌ You do not have permission to post high tier results.",
                    ephemeral: true
                });
            }

            const user =
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

            const tester1 =
                interaction.options.getUser("tester1");

            const score1 =
                interaction.options.getString("score1");

            const tester2 =
                interaction.options.getUser("tester2");

            const score2 =
                interaction.options.getString("score2");

            const skin =
                interaction.options.getString("skin");

            const player =
                await guild.members
                    .fetch(user.id)
                    .catch(() => null);

            if (player) {

                await applyTierRole(
                    player,
                    kit,
                    tier
                );
            }

            const embed =
                highResultEmbed({
                    guild,
                    user,
                    gmtag,
                    region,
                    kit,
                    previous,
                    tier,
                    tester1: tester1.id,
                    score1,
                    tester2: tester2?.id,
                    score2,
                    skin: skin || DEFAULT_SKIN
                });

            await interaction.channel.send({
                embeds: [embed]
            });

            return interaction.reply({
                content:
                    "✅ High tier result posted.",
                ephemeral: true
            });
        }

    } catch (error) {

        console.error(
            "Interaction error:",
            error
        );

        if (interaction.replied ||
            interaction.deferred) {

            await interaction.followUp({
                content:
                    "❌ An error occurred while processing the command.",
                ephemeral: true
            }).catch(() => {});

        } else {

            await interaction.reply({
                content:
                    "❌ An error occurred while processing the command.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});

/* =========================================================
   MEMBER JOIN
   ========================================================= */

client.on("guildMemberAdd", async member => {

    try {

        const data =
            guildData(member.guild.id);

        if (!data.welcome.channelId) {
            return;
        }

        const channel =
            member.guild.channels.cache.get(
                data.welcome.channelId
            );

        if (!channel) return;

        await channel.send({
            content:
                replaceUser(
                    data.welcome.message,
                    member.user
                ),
            embeds: [
                new EmbedBuilder()
                    .setTitle(`👋 Welcome to ${data.setupName}`)
                    .setDescription(
                        `Welcome ${member}!\n\nEnjoy your time in **${data.setupName}**.`
                    )
                    .setThumbnail(
                        member.displayAvatarURL()
                    )
                    .setColor(0xffd21f)
            ]
        });

    } catch (err) {

        console.error(
            "Welcome error:",
            err
        );
    }
});

/* =========================================================
   MEMBER LEAVE
   ========================================================= */

client.on("guildMemberRemove", async member => {

    try {

        const data =
            guildData(member.guild.id);

        if (!data.farewell.channelId) {
            return;
        }

        const channel =
            member.guild.channels.cache.get(
                data.farewell.channelId
            );

        if (!channel) return;

        await channel.send({
            content:
                replaceUser(
                    data.farewell.message,
                    member.user
                )
        });

    } catch (err) {

        console.error(
            "Farewell error:",
            err
        );
    }
});

/* =========================================================
   LOGIN
   ========================================================= */

client.login(TOKEN);
