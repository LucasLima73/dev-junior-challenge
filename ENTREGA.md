# Entrega — Lucas Lima

## Como rodar

### Opção 1 — Docker (recomendado, um comando só)

Com Docker instalado, na raiz do repositório:

```bash
docker compose up
```

Isso sobe `mock-service` (porta 4000), `db`/PostgreSQL (porta 5432), `api`
(porta 3000, só depois do banco ficar saudável) e `web` (porta 5173). Abra
`http://localhost:5173`, digite um CPF de teste (ex.: `111.111.111-11`) e
clique em "Fazer check-in".

### Opção 2 — sem Docker

Pré-requisito: Node.js 20+ (testei com Node 26) e um PostgreSQL acessível em
`localhost:5432` com usuário/senha/banco `desafio`/`desafio`/`checkin` (é o
mesmo que o `docker-compose.yml` já define). O jeito mais simples de ter isso
sem instalar Postgres na máquina é subir só o banco do compose:

```bash
docker compose up -d db
```

Com o banco no ar, em 3 terminais na raiz do repositório:

```bash
# 1) Serviço de cadastro (mock) — http://localhost:4000
cd mock-service && npm install && npm start

# 2) API NestJS — http://localhost:3000
cd api && npm install && npm run start:dev

# 3) Front-end React — http://localhost:5173
cd web && npm install && npm run dev
```

Configuração opcional (já há valores padrão que casam com o `docker-compose.yml`):
`CADASTRO_URL` e `DATABASE_URL` na api, `PORT` na api (padrão `3000`) e
`VITE_API_URL` no front (padrão `http://localhost:3000`, ver `web/.env.example`).

Testes: `cd api && npm test && npm run test:e2e` (API, não precisam do
Postgres — ver "Decisões e dificuldades") e `cd web && npm test` (front).
Documentação interativa da API (Swagger): `http://localhost:3000/docs`.

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/checkins` | Body `{ "cpf": "11111111111" }` (aceita máscara). Consulta o cadastro e registra a chegada. 201 com o check-in; 400 se o CPF não tiver 11 dígitos; 404 se o CPF não existir no cadastro; 409 se o paciente já tiver um check-in **pendente** hoje; 502 se o cadastro estiver fora do ar. |
| GET | `/checkins` | Lista a fila do dia. Query params opcionais: `status` (`pendentes` padrão, `atendidos` ou `todos`), `pagina` e `tamanhoPagina` (sem eles, devolve tudo). Resposta: `{ "itens": [...], "total": N }`. |
| PATCH | `/checkins/:id/atendido` | Marca o check-in como atendido (some da listagem de `pendentes`). 404 se o id não existir (ou já tiver sido atendido); 400 se o id não for um UUID válido. |

## O que foi feito

- **API (NestJS + TypeScript):** módulo `cadastro` (consome o `mock-service`
  via `HttpService`/axios, com timeout) e módulo `checkin` (controller,
  service, repositório, DTOs). O CPF aceita máscara, é normalizado e
  validado (11 dígitos — não valido o dígito verificador real, porque os
  CPFs de teste do `mock-service` são sequências repetidas que não
  passariam numa validação de CPF de verdade).
- **Erros claros:** CPF com formato inválido → 400; CPF inexistente no
  cadastro → 404; cadastro fora do ar/timeout → 502; paciente com check-in
  pendente hoje → 409; id de atendimento mal formado → 400; id não
  encontrado → 404.
- **Persistência em PostgreSQL** via TypeORM, atrás de uma interface
  `CheckinRepository` (ver "Onde guardei os dados").
- **Fila do dia, paginação e status:** `GET /checkins` filtra por hoje e por
  `status` (pendentes/atendidos/todos), com paginação opcional.
- **Atender um check-in:** `PATCH /checkins/:id/atendido` marca como
  atendido; ele sai da fila de pendentes, então a fila não só cresce.
- **Front-end (React + Vite + TypeScript):** formulário de CPF com máscara,
  mensagem de sucesso/erro, lista da fila com posição/nome/horário, filtro de
  status, paginação e botão "Atender" por paciente. Indicador de "Carregando
  fila..." na primeira busca de cada troca de filtro/página. A fila também
  atualiza sozinha a cada 5s (polling), para ver check-ins feitos em outro
  totem sem recarregar.
- **Testes — 30 no total:**
  - API, 13 unitários (Vitest): `CadastroService` (4: paciente encontrado,
    CPF inexistente, serviço fora do ar, erro 5xx inesperado — os dois
    últimos virando 502) e `CheckinService` (9: cria com o nome do cadastro,
    não registra se o CPF não existe, mantém ordem de chegada, bloqueia
    duplicado pendente, permite novo check-in após atendido, lista só hoje,
    atender remove da fila de pendentes, 404 ao atender id inexistente,
    pagina a listagem).
  - API, 8 e2e (Vitest + Supertest): todo o contrato HTTP (criar, listar,
    404, 400, 409, atender, 404/400 de id, paginação), com um
    `CheckinRepository` fake no lugar do Postgres.
  - Front, 9 (Vitest + React Testing Library): `CheckinForm` (máscara, botão
    só habilita com 11 dígitos, sucesso chama callback e limpa o campo, erro
    da API aparece na tela) e `CheckinQueue` (carregando, vazio, ordem da
    lista, clique em "Atender", botão escondido fora da fila de pendentes).
- **CI (GitHub Actions):** lint + build + testes da api, lint + testes +
  build do web, a cada push/PR.
- **Documentação da API:** Swagger em `/docs`.
- **Docker:** `docker compose up` sobe os quatro serviços de uma vez, com a
  api esperando o Postgres ficar saudável antes de conectar.

## Onde guardei os dados

**PostgreSQL**, via TypeORM. O `CheckinService` depende de uma interface
`CheckinRepository` (criar / listar por intervalo de data com filtro e
paginação / marcar como atendido) — não conhece SQL nem Postgres. A única
implementação real é `PostgresCheckinRepository`; nos testes uso um "fake"
simples da mesma interface, então a regra de negócio é testada sem precisar
de banco. Comecei em memória (documentado numa versão anterior deste
arquivo) e troquei para Postgres quando sobrou tempo, sem precisar tocar no
controller — só o módulo mudou de qual implementação injetar.

Usei `synchronize: true` do TypeORM (cria as tabelas a partir das entities)
em vez de migrations, por ser um banco só para esse desafio; numa aplicação
real eu usaria migrations versionadas.

## Decisões e dificuldades

- Separei a chamada ao serviço externo (`CadastroService`) da regra do
  check-in (`CheckinService`), para a regra de negócio não depender de HTTP
  nem de Postgres e poder ser testada com dublês dos dois.
- Escolhi **TypeORM** em vez de Prisma: o driver `pg` é JavaScript puro, sem
  binário nativo por plataforma, o que evita um problema comum do Prisma em
  imagem Alpine (binary target errado/faltando). Menos risco de a imagem
  buildar local e falhar só no container.
- **Bug que achei testando contra Postgres de verdade antes de subir:**
  `PATCH /checkins/id-qualquer/atendido` com um id que não é UUID dava 500
  em vez de 404 — o Postgres rejeita a query com erro de sintaxe antes da
  minha lógica de "não encontrado" rodar. Resolvi com `ParseUUIDPipe` no
  controller (400 para id malformado, 404 só para UUID válido não
  encontrado). Não teria achado isso só com os testes unitários (o
  repositório fake não reproduz esse erro do driver real).
- Os testes e2e **não** sobem o `AppModule` completo (que conectaria no
  Postgres de verdade); montei um módulo de teste só com
  `CheckinController` + `CheckinService` + fakes. Assim o CI não precisa de
  um Postgres rodando, e os testes continuam rápidos.
- A trava de duplicidade (409) olha só check-ins **pendentes**: se o
  paciente já foi atendido hoje e precisar voltar, pode fazer check-in de
  novo.
- Usei `HttpService` do `@nestjs/axios` com `timeout` explícito na chamada
  ao `mock-service`: sem isso, uma trava no serviço externo deixaria o
  check-in pendente indefinidamente.
- Validação de CPF com um decorator customizado (`@IsCpfFormat`) em vez de
  checar o dígito verificador de verdade — os CPFs de teste do
  `mock-service` são sequências repetidas que reprovariam numa validação
  real.
- Adicionei Swagger (`/docs`), CORS global e CI — não eram pedidos, mas
  custam pouco e deixam o projeto mais fácil de explorar e de confiar.
- No `docker-compose.yml`, o `VITE_API_URL` do `web` aponta para
  `http://localhost:3000` (não `http://api:3000`): quem faz as chamadas é o
  navegador do usuário, fora da rede interna do compose.
- No CI, troquei `npm ci` por `npm install`: um peer dependency do
  `vite-tsconfig-paths` (usado só no `vitest.config.ts`) ainda não suporta o
  TypeScript 6 que o projeto usa, e `npm ci` é mais estrito com isso do que
  o `npm install` (que tolera, como no meu ambiente local).

## O que faria com mais tempo

- Migrations versionadas em vez de `synchronize: true`.
- Um teste de integração do `PostgresCheckinRepository` contra um Postgres
  real (hoje só testei isso manualmente, rodando o compose).
- Atualização da fila em tempo real (WebSocket/SSE) em vez de polling a
  cada 5s.
- Autenticação simples para a tela da recepção.
- Desfazer um "atender" por engano (hoje não tem como reverter).
