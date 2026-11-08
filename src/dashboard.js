const express=require('express'),session=require('express-session'),SQLiteStore=require('connect-sqlite3')(session),path=require('node:path');
const {db}=require('./database');
function startDashboard(client){
 const app=express(),port=Number(process.env.DASHBOARD_PORT||3000),base=(process.env.DASHBOARD_URL||`http://localhost:${port}`).replace(/\/$/,'');
 app.set('trust proxy',1);app.use(express.json());app.use(session({store:new SQLiteStore({db:'sessions.sqlite',dir:path.join(process.cwd(),'data')}),secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:base.startsWith('https://'),maxAge:86400000}}));app.use(express.static(path.join(process.cwd(),'public')));
 const auth=(q,s,n)=>q.session.user?n():s.status(401).json({error:'Não autenticado'});
 const guildFor=q=>q.session.user.guilds.find(g=>client.guilds.cache.has(g.id));
 app.get('/auth/discord',(q,s)=>{const p=new URLSearchParams({client_id:process.env.CLIENT_ID,redirect_uri:base+'/auth/callback',response_type:'code',scope:'identify guilds'});s.redirect('https://discord.com/oauth2/authorize?'+p);});
 app.get('/auth/callback',async(q,s)=>{try{const r=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code:q.query.code,redirect_uri:base+'/auth/callback'})}),tok=await r.json();if(!tok.access_token)return s.redirect('/?error=oauth');const h={Authorization:`Bearer ${tok.access_token}`},[ur,gr]=await Promise.all([fetch('https://discord.com/api/users/@me',{headers:h}),fetch('https://discord.com/api/users/@me/guilds',{headers:h})]),u=await ur.json(),gs=await gr.json();q.session.user={id:u.id,username:u.username,guilds:Array.isArray(gs)?gs.filter(g=>g.owner||(BigInt(g.permissions)&8n)===8n):[]};s.redirect('/');}catch(e){console.error(e);s.redirect('/?error=oauth');}});
 app.get('/api/me',auth,(q,s)=>s.json({user:q.session.user}));
 app.get('/api/dashboard',auth,(q,s)=>{const x=guildFor(q);if(!x)return s.json({guild:null,stats:{}});const g=client.guilds.cache.get(x.id),u=db.prepare('SELECT COUNT(*) registered,COALESCE(SUM(xp),0) xp,COALESCE(SUM(coins),0) coins FROM users WHERE guild_id=?').get(g.id),t=db.prepare("SELECT COUNT(*) n FROM tickets WHERE guild_id=? AND status='open'").get(g.id).n,ranking=db.prepare('SELECT user_id,coins,level FROM users WHERE guild_id=? ORDER BY coins DESC LIMIT 10').all(g.id),logs=db.prepare('SELECT * FROM moderation_logs WHERE guild_id=? ORDER BY id DESC LIMIT 10').all(g.id);s.json({guild:{id:g.id,name:g.name,icon:g.iconURL()},stats:{members:g.memberCount,registered:u.registered,xp:u.xp,coins:u.coins,tickets:t,ranking,logs}});});
 app.get('/api/moderation',auth,(q,s)=>{const g=guildFor(q);s.json({logs:g?db.prepare('SELECT * FROM moderation_logs WHERE guild_id=? ORDER BY id DESC LIMIT 50').all(g.id):[]});});
 app.get('/api/tickets',auth,(q,s)=>{const g=guildFor(q);s.json({tickets:g?db.prepare('SELECT * FROM tickets WHERE guild_id=? ORDER BY id DESC LIMIT 50').all(g.id):[]});});
 app.get('/api/shop',auth,(q,s)=>{const g=guildFor(q);s.json({items:g?db.prepare('SELECT * FROM shop_items WHERE guild_id=? ORDER BY id DESC').all(g.id):[]});});
 app.post('/auth/logout',(q,s)=>q.session.destroy(()=>s.json({ok:true})));
 app.listen(port,'0.0.0.0',()=>console.log(`CENTRAL SYSTEM Dashboard: ${base}`));
}
module.exports={startDashboard};
