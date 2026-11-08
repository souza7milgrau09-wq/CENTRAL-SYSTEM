
require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Partials
} = require('discord.js');

const { handle } = require('./commands');
const { db, ensureUser } = require('./database');
const { startDashboard } = require('./dashboard');

// Verifica as variáveis obrigatórias
for (const k of ['DISCORD_TOKEN', 'CLIENT_ID', 'SESSION_SECRET']) {
    if (!process.env[k]) {
        console.error(`[ERRO] Falta a variável ${k}`);
        process.exit(1);
    }
}

console.log('[CENTRAL] Iniciando aplicação...');

// Cria o cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

const spam = new Map();
const joins = new Map();

// Inicia o dashboard antes da conexão com Discord
console.log('[TESTE] Iniciando dashboard...');

try {
    startDashboard(client);
    console.log('[TESTE] Dashboard iniciado.');
} catch (error) {
    console.error('[ERRO] Falha ao iniciar dashboard:', error);
    process.exit(1);
}

// Evento de conexão do Discord
client.once('clientReady', () => {
    console.log(`[CENTRAL] ${client.user.tag} online.`);
});

// Interações dos comandos
client.on('interactionCreate', async interaction => {
    try {
        await handle(client, interaction);
    } catch (error) {
        console.error('[ERRO] Interaction:', error);

        const response = {
            content: 'Erro ao executar. Confira permissões e logs.',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response).catch(() => {});
        } else {
            await interaction.reply(response).catch(() => {});
        }
    }
});

// Entrada de membros
client.on('guildMemberAdd', async member => {
    try {
        const settings = db.prepare(
            'SELECT welcome_channel_id FROM guild_settings WHERE guild_id=?'
        ).get(member.guild.id);

        const welcomeChannel = member.guild.channels.cache.get(
            settings?.welcome_channel_id
        );

        if (welcomeChannel) {
            await welcomeChannel.send(
                `👋 Bem-vindo(a), ${member}! Você é o membro ${member.guild.memberCount}.`
            ).catch(() => {});
        }

        const autorole = db.prepare(
            'SELECT role_id FROM autoroles WHERE guild_id=?'
        ).get(member.guild.id);

        if (autorole?.role_id) {
            await member.roles.add(autorole.role_id).catch(() => {});
        }

        const now = Date.now();

        const list = (joins.get(member.guild.id) || [])
            .filter(time => now - time < 15000);

        list.push(now);
        joins.set(member.guild.id, list);

        if (list.length >= 8) {
            console.warn(
                `[ANTI-RAID] Entrada acelerada detectada em ${member.guild.name}.`
            );
        }
    } catch (error) {
        console.error('[ERRO] GuildMemberAdd:', error);
    }
});

// XP e proteção básica contra spam
client.on('messageCreate', message => {
    try {
        if (!message.guild || message.author.bot) return;

        ensureUser.run(message.guild.id, message.author.id);

        const key = `${message.guild.id}:${message.author.id}`;
        const now = Date.now();

        const messages = (spam.get(key) || [])
            .filter(time => now - time < 7000);

        messages.push(now);
        spam.set(key, messages);

        if (messages.length >= 6) {
            const settings = db.prepare(
                'SELECT anti_spam FROM guild_settings WHERE guild_id=?'
            ).get(message.guild.id);

            if (settings?.anti_spam !== 0 && message.member?.moderatable) {
                message.member.timeout(
                    60000,
                    'Anti-spam: excesso de mensagens'
                ).catch(() => {});

                message.channel.send(
                    `${message.author}, reduza a frequência de mensagens.`
                ).catch(() => {});
            }

            spam.set(key, []);
            return;
        }

        const user = db.prepare(
            'SELECT xp, level FROM users WHERE guild_id=? AND user_id=?'
        ).get(message.guild.id, message.author.id);

        if (!user) return;

        const xp = user.xp + Math.floor(Math.random() * 6) + 5;
        const level = Math.floor(Math.sqrt(xp / 100));

        db.prepare(
            'UPDATE users SET xp=?, level=? WHERE guild_id=? AND user_id=?'
        ).run(xp, level, message.guild.id, message.author.id);

        if (level > user.level) {
            message.channel.send(
                `🎉 ${message.author}, você alcançou o nível ${level}!`
            ).catch(() => {});
        }
    } catch (error) {
        console.error('[ERRO] MessageCreate:', error);
    }
});

// Conecta o bot ao Discord
console.log('[CENTRAL] Conectando ao Discord...');

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('[ERRO] Falha ao conectar ao Discord:', error);
    process.exit(1);
});

// Captura erros inesperados
process.on('unhandledRejection', error => {
    console.error('[ERRO] Promise rejeitada:', error);
});

process.on('uncaughtException', error => {
    console.error('[ERRO] Exceção não tratada:', error);
    process.exit(1);
});
