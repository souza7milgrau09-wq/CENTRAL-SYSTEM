
require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Partials
} = require('discord.js');

const { handle } = require('./commands');
const { db, ensureUser } = require('./database');
const { startDashboard } = require('./dashboard');

// ==========================================
// VERIFICAÇÃO DAS VARIÁVEIS
// ==========================================

for (const k of ['DISCORD_TOKEN', 'CLIENT_ID', 'SESSION_SECRET']) {
    if (!process.env[k]) {
        console.error(`[ERRO] Falta a variável ${k}`);
        process.exit(1);
    }
}

console.log('[CENTRAL] Iniciando aplicação...');

// ==========================================
// CLIENTE DISCORD
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel
    ]
});

const spam = new Map();
const joins = new Map();

// ==========================================
// DIAGNÓSTICO DO DISCORD
// ==========================================

client.on('debug', message => {
    console.log('[DEBUG DISCORD]', message);
});

client.on('warn', message => {
    console.warn('[AVISO DISCORD]', message);
});

client.on('error', error => {
    console.error('[ERRO DISCORD]', error);
});

client.on('shardError', error => {
    console.error('[ERRO SHARD]', error);
});

client.on('shardDisconnect', (event, id) => {
    console.error(
        '[DISCONNECT]',
        'Shard:', id,
        'Código:', event.code,
        'Motivo:', event.reason
    );
});

client.on('shardReconnecting', id => {
    console.log('[RECONNECT] Shard:', id);
});

client.on('shardResume', (id, replayedEvents) => {
    console.log(
        '[RESUME] Shard:',
        id,
        'Eventos recuperados:',
        replayedEvents
    );
});

// ==========================================
// DASHBOARD
// ==========================================

console.log('[TESTE] Iniciando dashboard...');

try {
    startDashboard(client);
    console.log('[TESTE] Dashboard iniciado com sucesso.');
} catch (error) {
    console.error('[ERRO] Falha ao iniciar dashboard:', error);
    process.exit(1);
}

// ==========================================
// BOT ONLINE
// ==========================================

client.once('ready', () => {
    console.log('');
    console.log('========================================');
    console.log(`[CENTRAL] ${client.user.tag} ONLINE!`);
    console.log(`[CENTRAL] ID: ${client.user.id}`);
    console.log(`[CENTRAL] Servidores: ${client.guilds.cache.size}`);
    console.log('========================================');
    console.log('');
});

// ==========================================
// INTERAÇÕES
// ==========================================

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

// ==========================================
// ENTRADA DE MEMBROS
// ==========================================

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

// ==========================================
// XP E ANTI-SPAM
// ==========================================

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
        ).run(
            xp,
            level,
            message.guild.id,
            message.author.id
        );

        if (level > user.level) {
            message.channel.send(
                `🎉 ${message.author}, você alcançou o nível ${level}!`
            ).catch(() => {});
        }

    } catch (error) {
        console.error('[ERRO] MessageCreate:', error);
    }
});

// ==========================================
// CONEXÃO COM DISCORD
// ==========================================

console.log('[CENTRAL] Chamando conexão com Discord...');
console.log('[TESTE] Verificando acesso ao Discord...');

fetch('https://discord.com/api/v10/gateway', {
    signal: AbortSignal.timeout(15000)
})
    .then(async response => {
        console.log('[TESTE HTTP] Status:', response.status);
        console.log('[TESTE HTTP] Resposta:', await response.text());
    })
    .catch(error => {
        console.error('[TESTE HTTP] Falha:', error.message);
    });
    
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('[CENTRAL] Login solicitado com sucesso!');
    })
    .catch(error => {
        console.error('[LOGIN ERRO]', error);
    });

// ==========================================
// ERROS GERAIS
// ==========================================

process.on('unhandledRejection', error => {
    console.error('[ERRO] Promise rejeitada:', error);
});

process.on('uncaughtException', error => {
    console.error('[ERRO] Exceção não tratada:', error);
    process.exit(1);
});
