# V6.4.47 — Economia autoritativa experimental

- API autenticada: POST /game/state, /game/fish, /game/sell, /game/bless.
- Capturas e recompensas sorteadas pelo servidor; cliente não escolhe XP, moedas nem raridade.
- Intervalo mínimo de 12 segundos entre capturas, mochila limitada a 100.
- Venda de peixes por ID único; mesma captura não pode ser vendida duas vezes.
- XP máximo 1.000.000, nível máximo 100, 4.140 XP até nível 10.
- Bênçãos experimentais de XP e moedas, custo 50 moedas e duração de 10 minutos.

**ATENÇÃO:** Esta API é um protótipo isolado. O jogo existente ainda usa progresso local e não está integrado a estes endpoints. Não é anticheat completo: persistência JSON não é adequada para produção, RNG/cooldowns requerem revisão de balanceamento, e faltam proteção contra bots, HTTPS, banco transacional, auditoria, migração e testes de carga. Não publique como economia real até integrar o cliente e substituir o armazenamento.
