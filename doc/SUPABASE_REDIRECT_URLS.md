# Supabase – URLs de redirecionamento (Auth)

No painel: **Authentication → URL Configuration**

- **Site URL**: URL pública do app (ex.: `https://dod-three.vercel.app`), alinhada a `NEXT_PUBLIC_SITE_URL` na Vercel / `.env`.

- **Redirect URLs** — inclua pelo menos:

  - `https://<seu-dominio>/auth/callback` — OAuth, recuperação de senha e fluxos que usam `?next=`.
  - `https://<seu-dominio>/auth/invite` — **convite de usuário por e-mail** (`inviteUserByEmail`); destino fixo `/definir-senha` após validar o código.
  - `https://<seu-dominio>/` — raiz do app.

Em desenvolvimento local, acrescente também `http://localhost:3000` e as mesmas rotas `/auth/callback` e `/auth/invite`.
