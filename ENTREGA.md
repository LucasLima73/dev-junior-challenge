# Entrega — Lucas Lima

## Como rodar

### Opção 1 — Docker (recomendado, um comando só)

Com Docker instalado, na raiz do repositório:

```bash
docker compose up
```

Isso sobe `mock-service` (porta 4000), `api` (porta 3000) e `web` (porta 5173).
Abra `http://localhost:5173`, digite um CPF de teste (ex.: `111.111.111-11`) e
clique em "Fazer check-in". O serviço `db` (PostgreSQL) também sobe, mas não é
usado pela aplicação — ver seção "Onde guardei os dados".

### Opção 2 — sem Docker (3 terminais)

Pré-requisito: Node.js 20+ (testei com Node 26).

```bash
# 1) Serviço de cadastro (mock) — http://localhost:4000
cd mock-service && npm install && npm start

# 2) API NestJS — http://localhost:3000
cd api && npm install && npm run start:dev

# 3) Front-end React — http://localhost:5173
cd web && npm install && npm run dev
```

Configuração opcional (já há valores padrão): `CADASTRO_URL` na api (padrão
`http://localhost:4000`), `PORT` na api (padrão `3000`) e `VITE_API_URL` no
front (padrão `http://localhost:3000`, ver `web/.env.example`).

Testes da API: `cd api && npm test` (unitários) e `npm run test:e2e` (e2e dos
endpoints). Documentação interativa da API (Swagger): `http://localhost:3000/docs`.

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/checkins` | Body `{ "cpf": "11111111111" }` (aceita máscara). Consulta o cadastro e registra a chegada. 201 com o check-in; 400 se o CPF não tiver 11 dígitos; 404 se o CPF não existir no cadastro; 409 se o paciente já fez check-in hoje; 502 se o cadastro estiver fora do ar. |
| GET | `/checkins` | Lista a fila **do dia**, em ordem de chegada. |

## O que foi feito

- **API (NestJS + TypeScript):** módulo `cadastro` (consome o `mock-service`
  via `HttpService`/axios, com timeout) e módulo `checkin` (controller,
  service, DTO). O CPF aceita máscara (`111.111.111-11`), é normalizado e
  validado (11 dígitos — não valido o dígito verificador real, porque os CPFs
  de teste do `mock-service` são sequências repetidas que não passariam numa
  validação de CPF de verdade).
- **Erros claros:** CPF com formato inválido → 400; CPF inexistente no
  cadastro → 404 ("CPF não encontrado no cadastro de pacientes"); cadastro
  fora do ar/timeout → 502; paciente que já fez check-in hoje → 409
  ("Paciente já fez check-in hoje").
- **Fila do dia:** `GET /checkins` devolve só os check-ins de hoje; quando o
  dia vira, a fila "zera" sozinha (segue o fuso do servidor).
- **Front-end (React + Vite + TypeScript):** formulário de CPF com máscara
  (o botão só habilita com 11 dígitos), mensagem de sucesso/erro após o
  envio, e lista da fila com posição, nome e horário de chegada. A fila
  atualiza na hora após um check-in e também sozinha a cada 5s (polling),
  para a recepção ver check-ins feitos em outro totem sem recarregar a
  página.
- **Documentação da API:** Swagger em `/docs`.
- **Docker:** `docker compose up` sobe os quatro serviços de uma vez
  (`mock-service`, `api`, `web`, `db`).
- **Testes (13, Vitest):**
  - `CadastroService` (4): paciente encontrado (200), CPF inexistente (404),
    serviço fora do ar e resposta 500 inesperada (ambos virando 502).
  - `CheckinService` (5): registra com o nome do cadastro, não registra se o
    CPF não existe, mantém a ordem de chegada, bloqueia check-in duplicado no
    mesmo dia e lista só os check-ins de hoje (relógio simulado).
  - e2e dos endpoints (4), com o cadastro simulado: criar + listar em ordem
    de chegada, 404 para CPF inexistente (sem entrar na fila), 400 para CPF
    inválido e 409 para check-in duplicado.

## Onde guardei os dados

**Em memória** (um array dentro do `CheckinService`). Optei por memória
porque o desafio deixa claro que é um caminho válido para o júnior e eu
preferi usar o tempo disponível para cobrir bem a regra de negócio (fila do
dia, check-in duplicado, erros claros) e os testes, em vez de adicionar um
ORM/migrations. O `docker-compose.yml` já sobe um PostgreSQL (`db`), mas ele
não é usado pela aplicação — fica disponível caso eu plugue persistência
depois. A fila é perdida quando a API reinicia.

## Decisões e dificuldades

- Separei a chamada ao serviço externo (`CadastroService`) da regra do
  check-in (`CheckinService`), para a regra de negócio não depender de HTTP
  e poder ser testada com o cadastro "simulado".
- Usei `HttpService` do `@nestjs/axios` (em vez de `fetch` nativo) com
  `timeout` explícito: sem isso, uma trava no `mock-service` deixaria o
  check-in pendente indefinidamente.
- Validação de CPF com um decorator customizado (`@IsCpfFormat`) em vez de
  checar o dígito verificador de verdade — os CPFs de teste do
  `mock-service` (`11111111111`, etc.) são sequências repetidas que
  reprovariam numa validação real.
- Bloqueei um segundo check-in do mesmo paciente no mesmo dia (409), por ser
  o comportamento mais sensato num totem de recepção; não encontrei essa
  regra explícita no enunciado, então documentei a decisão aqui para poder
  discutir se a recepção preferir outro comportamento.
- Adicionei Swagger (`/docs`) e CORS global — não eram pedidos, mas custam
  pouco e deixam a API mais fácil de explorar/integrar.
- No `docker-compose.yml`, o `VITE_API_URL` do `web` aponta para
  `http://localhost:3000` (não `http://api:3000`): quem faz as chamadas é o
  navegador do usuário, fora da rede interna do compose, então o nome de
  serviço não resolveria.

## O que faria com mais tempo

- Persistir em PostgreSQL (o banco já está no `docker-compose.yml`), com
  Prisma ou TypeORM, mantendo a mesma interface do `CheckinService` para não
  precisar tocar no controller.
- Testes do front-end (React Testing Library) para o formulário e a lista.
- Um indicador visual de carregamento na fila enquanto a API responde.
- Paginação/filtro na fila, para o caso de crescer muito ao longo do dia.
- Rota para marcar um check-in como atendido (hoje a fila só cresce).
