# Supabase – template de e-mail de **convite** (obrigatório para o app)

## Por que isso existe

O link padrão do Supabase (`{{ .ConfirmationURL }}`) leva o usuário a `…/auth/v1/verify` e, em seguida, redireciona para o seu app com **`?code=…`** (fluxo **PKCE**).

Nesse fluxo, o servidor de Auth exige **`auth_code` + `code_verifier`** na troca do código por sessão. O **verificador PKCE só existe no navegador que iniciou o fluxo** — e o convite é criado pelo **admin no servidor**, sem esse par. Por isso, **trocar só o `code` no cliente sempre falha** e o usuário cai em *“Não foi possível validar o link de acesso…”*.

A solução suportada pelo app é o usuário abrir um link que traga **`token_hash`** na URL; a página `/auth/invite` chama `verifyOtp({ token_hash, type: 'invite' })`, que **não depende de PKCE**.

## O que fazer no painel Supabase

1. **Authentication → Email Templates → Invite user** (ou nome equivalente).
2. No corpo do e-mail, **substitua** o botão que usa só `{{ .ConfirmationURL }}` por um link **direto** para o app, por exemplo:

```html
<p>Você foi convidado para acessar o Diário de Obra Digital.</p>
<p>
  <a href="{{ .SiteURL }}/auth/invite?token_hash={{ .TokenHash }}&type=invite">
    Aceitar convite e definir senha
  </a>
</p>
```

3. Garanta que **Site URL** em **Authentication → URL Configuration** seja exatamente a URL pública do app (a mesma ideia de `NEXT_PUBLIC_SITE_URL`), para que `{{ .SiteURL }}` aponte para o domínio correto.
4. Mantenha **`/auth/invite`** nas **Redirect URLs** (já necessário para outros fluxos); veja também [SUPABASE_REDIRECT_URLS.md](./SUPABASE_REDIRECT_URLS.md).

## Depois de alterar o template

Envie um **novo** convite (links antigos podem continuar usando o fluxo antigo com `?code=`).

## Referência de variáveis

Documentação Supabase: [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates).

Variáveis úteis neste fluxo: `{{ .SiteURL }}`, `{{ .TokenHash }}`, `{{ .Email }}`, etc. O app espera **`type=invite`** na query quando usar `token_hash` para convite.
