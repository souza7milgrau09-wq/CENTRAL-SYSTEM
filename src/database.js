const Database=require('better-sqlite3');
const fs=require('node:fs');
fs.mkdirSync('data',{recursive:true});
const db=new Database('data/central.sqlite');
db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(guild_id TEXT NOT NULL,user_id TEXT NOT NULL,xp INTEGER DEFAULT 0,level INTEGER DEFAULT 0,coins INTEGER DEFAULT 0,last_daily INTEGER DEFAULT 0,warnings INTEGER DEFAULT 0,PRIMARY KEY(guild_id,user_id));
CREATE TABLE IF NOT EXISTS transactions(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,from_user TEXT,to_user TEXT,amount INTEGER,reason TEXT,created_at INTEGER DEFAULT(unixepoch()));
CREATE TABLE IF NOT EXISTS moderation_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,target_id TEXT,moderator_id TEXT,action TEXT,reason TEXT,created_at INTEGER DEFAULT(unixepoch()));
CREATE TABLE IF NOT EXISTS guild_settings(guild_id TEXT PRIMARY KEY,welcome_channel_id TEXT,log_channel_id TEXT,support_role_id TEXT,anti_spam INTEGER DEFAULT 1,anti_raid INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS tickets(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,channel_id TEXT UNIQUE,user_id TEXT,status TEXT DEFAULT 'open',claimed_by TEXT,created_at INTEGER DEFAULT(unixepoch()),closed_at INTEGER);
CREATE TABLE IF NOT EXISTS shop_items(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,name TEXT,description TEXT,price INTEGER,role_id TEXT,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS inventory(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,user_id TEXT,item_id INTEGER,created_at INTEGER DEFAULT(unixepoch()));
CREATE TABLE IF NOT EXISTS suggestions(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,channel_id TEXT,message_id TEXT,user_id TEXT,text TEXT,status TEXT DEFAULT 'pending',created_at INTEGER DEFAULT(unixepoch()));
CREATE TABLE IF NOT EXISTS polls(id INTEGER PRIMARY KEY AUTOINCREMENT,guild_id TEXT,channel_id TEXT,message_id TEXT,question TEXT,created_at INTEGER DEFAULT(unixepoch()));
CREATE TABLE IF NOT EXISTS autoroles(guild_id TEXT PRIMARY KEY,role_id TEXT);
`);
const ensureUser=db.prepare('INSERT INTO users(guild_id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING');
module.exports={db,ensureUser};
