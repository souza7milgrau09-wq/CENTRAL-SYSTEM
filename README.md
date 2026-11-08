# CENTRAL SYSTEM PREMIUM 3.0

Pacote de bot Discord.js v14, SQLite e dashboard web com identidade visual escura/vermelha.

## Instalação no Windows
1. Faça backup do projeto antigo e extraia esta pasta.
2. Abra a pasta no VS Code e rode `npm install`.
3. Copie `.env.example` para `.env` e preencha as credenciais do Discord.
4. No Developer Portal, habilite Server Members Intent e Message Content Intent.
5. Em OAuth2 > Redirects, cadastre `http://localhost:3000/auth/callback`.
6. Convide o bot com `bot` e `applications.commands` e as permissões necessárias.
7. Rode `npm run deploy` e depois `npm start`.
8. Abra `http://localhost:3000`.

## Comandos
/ping, /saldo, /daily, /transferir, /ranking, /loja, /loja-adicionar, /comprar, /warn, /kick, /ban, /timeout, /ticket-painel, /ticket-assumir, /config-boasvindas, /config-autorole, /sugerir, /enquete.

## Recursos
- SQLite com usuários, transações, punições, tickets, loja, inventário, sugestões e enquetes.
- XP e níveis por mensagem; daily e transferências transacionais.
- Moderação com logs; ticket privado com fechar/assumir; loja com cargo opcional.
- Boas-vindas, autorole, sugestões e enquetes por comandos.
- Anti-spam básico e alerta de entrada acelerada (anti-raid observacional).
- Dashboard OAuth Discord, estatísticas, ranking e logs.

## Limites honestos desta versão
O dashboard é principalmente de consulta: os links laterais são identidade visual, ainda não páginas de administração completas. O anti-raid apenas alerta no console; não pune automaticamente. Tickets ainda não geram transcrição HTML nem avaliação. Não há sistema de missões/conquistas, nem configuração visual completa de canais/cargos. A implementação exige testes no seu servidor e ajustes de permissões antes de uso público.

## Segurança
Nunca compartilhe `.env`, token do bot ou segredo OAuth. Em produção, use HTTPS, defina `DASHBOARD_URL` com domínio HTTPS e cadastre o callback correspondente. Faça backup de `data/central.sqlite`. Não use permissões de administrador para o bot se permissões específicas forem suficientes.
