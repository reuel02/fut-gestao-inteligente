# Supabase · Gestão Inteligente

Todo o banco vive no schema **`fut`**.

## 1. Rodar os scripts

No **SQL Editor** do Supabase, execute os arquivos de `migrations/` na ordem:

| # | Arquivo | O que faz |
|---|---------|-----------|
| 1 | `..._01_tables.sql` | Tipos e tabelas (perfis, pedidos, jogadores, peladas, presença, times, partidas, eventos) |
| 2 | `..._02_auth_functions.sql` | Admin único, trigger de perfil, RPCs (`request_join`, `review_join_request`, `set_keeper`, `save_draw`) |
| 3 | `..._03_rls.sql` | Permissões e Row Level Security |
| 4 | `..._04_storage.sql` | Bucket `avatars` para fotos de perfil |
| 5 | `..._05_views_realtime.sql` | View `player_stats` e Realtime |
| 6 | `..._06_membership_type.sql` | Separação Mensalista vs Avulso (se já rodou 01-05) |

(Ou, com a CLI: `supabase link` + `supabase db push`.)

## 2. Expor o schema na API

**Project Settings → Data API → Exposed schemas** → adicione `fut`.

## 3. Autenticação

**Authentication → Providers → Email**: mantenha **Confirm email ligado**.
O admin é identificado por `ferreirareuel3@gmail.com` **com e-mail confirmado**
(`fut.admin_email()` / `fut.is_admin()`). Crie a conta do admin primeiro.

## 4. Variáveis do app

Copie `.env.example` para `.env` na raiz do projeto e preencha com a URL e a
chave `anon` (Project Settings → API).

## Fluxo de acesso

1. Jogador cria conta (e-mail + senha) → o trigger cria o `fut.profiles`.
2. Pede entrada (`fut.request_join`) → fica **pendente**.
3. Admin aprova (`fut.review_join_request`) e define a nota → vira `fut.players`.
4. Só então o app libera as telas. A nota só é alterável pelo admin.
