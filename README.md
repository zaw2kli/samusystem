# SAMU · Painel Operacional

Sistema web para gerenciamento de funcionários e acompanhamento semanal de
produtividade. Área pública para consulta por nickname + painel
administrativo completo, com importação de planilha Excel (.xlsx) como
fonte de atualização semanal. Firebase (Auth + Firestore) é o banco oficial
— a planilha nunca é usada como fonte direta para o site público.

> Nomes, cargos e demais dados de exemplo usados neste projeto são
> meramente ilustrativos.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS + Framer Motion + lucide-react
- Firebase Authentication + Firestore
- SheetJS (`xlsx`) para leitura da planilha
- Deploy: Vercel

## 1. Instalação local

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local` com as chaves do seu projeto Firebase (veja o passo 2).

```bash
npm run dev
```

O site abre em `http://localhost:3000`. O painel administrativo fica em
`/admin/login`.

## 2. Configurar o projeto Firebase

1. Crie um projeto em https://console.firebase.google.com.
2. Ative **Authentication → Sign-in method → E-mail/senha**.
3. Ative **Firestore Database** (modo produção).
4. Em **Configurações do projeto → Geral → Seus apps**, crie um app Web e
   copie as credenciais para `.env.local`:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   ```

5. Publique as regras e os índices deste projeto (usando a Firebase CLI):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add        # selecione o projeto criado
   firebase deploy --only firestore:rules,firestore:indexes
   ```

   `firestore.rules` garante que a escrita em `employees`, `weeks`,
   `weeklyHistory`, `highlights`, `imports`, `logs` e `config` só é permitida
   para administradores autenticados — a leitura pública é liberada apenas
   onde necessário. **Isso não é opcional**: sem publicar essas regras, o
   Firestore usa as regras padrão do console, que normalmente bloqueiam tudo
   (ou, se você mudar manualmente para "modo teste", ficam abertas demais).

## 3. Criar o primeiro administrador

Por segurança, a coleção `admins` **não pode ser escrita pelo client** (veja
`firestore.rules`) — isso evita que qualquer usuário autenticado se
autopromova a administrador. Por isso o primeiro admin precisa ser criado
manualmente:

1. Em **Authentication → Users**, adicione um usuário com e-mail e senha.
2. Copie o **UID** desse usuário.
3. Em **Firestore Database**, crie manualmente um documento na coleção
   `admins` **usando esse UID como ID do documento**, com os campos:

   ```json
   {
     "nome": "Nome do administrador",
     "email": "email-usado-no-login@exemplo.com",
     "ativo": true,
     "createdAt": <timestamp atual>
   }
   ```

Administradores adicionais podem ser criados repetindo esse processo (crie o
usuário no Authentication e o documento correspondente em `admins/{uid}`).

## 4. Estrutura de dados (Firestore)

| Coleção         | Descrição                                                            |
| --------------- | --------------------------------------------------------------------- |
| `admins`        | Administradores autorizados (doc ID = UID do Firebase Auth)          |
| `employees`      | Cadastro de funcionários                                             |
| `weeks`          | Semanas (período, responsável, se está ativa)                        |
| `weeklyHistory`  | Desempenho calculado por funcionário/semana (`{employeeId}_{weekId}`) |
| `highlights`     | Destaques semanais automáticos e mensais manuais                     |
| `imports`        | Log de cada importação de planilha                                   |
| `logs`           | Log de ações administrativas                                         |
| `config`         | Configurações gerais (documento único `geral`)                       |

Os tipos completos estão em `types/index.ts`.

## 5. Fluxo de importação da planilha

Página: `/admin/importar`.

1. O admin escolhe a semana (ou cria uma nova em `/admin/semanas`).
2. Envia o `.xlsx`. O sistema tenta identificar automaticamente as colunas
   de nickname, turnos e liberações (`lib/importEngine.ts`); se não
   conseguir, mostra uma tela de mapeamento manual.
3. É feita uma **análise** (`analyzeImport`) que **não grava nada** — ela
   compara os valores da planilha (acumulados) com os valores salvos no
   Firebase e calcula a diferença (desempenho da semana), identifica novos
   funcionários, funcionários ausentes e erros (ex.: valor da planilha menor
   que o valor já salvo).
4. O admin revisa a prévia, decide quais novos funcionários criar e se
   deseja desativar os ausentes, e confirma.
5. Somente então `confirmImport` grava tudo em lote (`writeBatch`):
   atualiza `employees`, cria/atualiza `weeklyHistory` (id determinístico
   `employeeId_weekId`, então reimportar a mesma semana **atualiza** em vez
   de duplicar), recalcula o ranking e os destaques automáticos da semana
   (sem tocar nos destaques mensais/manuais) e registra o log da
   importação.

## 6. Deploy na Vercel

1. Suba o projeto para um repositório Git (GitHub/GitLab/Bitbucket).
2. Em https://vercel.com, importe o repositório.
3. Em **Environment Variables**, adicione as mesmas variáveis de
   `.env.example` com os valores do seu projeto Firebase.
4. Deploy. O build usa `next build` (já configurado em `package.json`).
5. Em **Authentication → Settings → Authorized domains** no Firebase,
   adicione o domínio gerado pela Vercel (e seu domínio customizado, se
   houver) para que o login administrativo funcione em produção.

## 7. Estrutura de pastas

```
app/                 rotas (App Router) — área pública e /admin
components/ui/        componentes reutilizáveis (Button, Card, Modal…)
components/public/     componentes da área pública
components/admin/      componentes do painel administrativo
lib/                  firebase.ts, importEngine.ts (motor de importação)
services/             funções de acesso ao Firestore/Auth por coleção
hooks/                 contexto de admin (useAdmin) e toasts (useToast)
types/                 tipos TypeScript centrais
utils/                 normalização de nick, formatação de datas/números
firestore.rules        regras de segurança
firestore.indexes.json  índices compostos necessários
```

## 8. O que ainda vale revisar antes de produção

- As regras de segurança cobrem o essencial pedido no briefing, mas vale uma
  revisão adicional (e testes com o emulador do Firestore) antes de ir para
  produção com dados reais.
- A paginação das tabelas administrativas foi mantida simples (sem paginação
  server-side) — funciona bem até algumas centenas de funcionários; para uma
  equipe muito maior, considere paginar as consultas em `services/`.
- Não há verificação de nickname duplicado no cadastro manual de
  funcionário (apenas na importação); adicione essa validação em
  `services/employees.ts` se for relevante para o seu uso.
