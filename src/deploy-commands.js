require('dotenv').config();const {REST,Routes}=require('discord.js');const {commands}=require('./commands');
if(!process.env.DISCORD_TOKEN||!process.env.CLIENT_ID)throw new Error('Configure DISCORD_TOKEN e CLIENT_ID no .env');
const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
(async()=>{try{const route=process.env.GUILD_ID?Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID):Routes.applicationCommands(process.env.CLIENT_ID);await rest.put(route,{body:commands});console.log('Comandos publicados.');}catch(e){console.error(e);process.exitCode=1;}})();
