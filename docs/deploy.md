# Deploy em produção (Azure)

Este guia descreve como o InfraObserver é publicado em produção: uma máquina virtual Linux na **Microsoft Azure** executando os containers com **Docker Compose**, atualizada automaticamente pelo **GitHub Actions** a cada merge na `main`.

## Arquitetura de produção

```mermaid
flowchart LR
    DEV["Merge na main"] --> CI["CI<br/>testes · Sonar · build"]
    CI -- "sucesso" --> CD["CD<br/>build e push das imagens"]
    CD --> GHCR[("GitHub Container<br/>Registry")]
    CD -- "SSH: pull + up" --> VM

    subgraph VM["VM Azure (Ubuntu 24.04)"]
        WEB["web<br/>Caddy + dashboard<br/>HTTPS :443"]
        API["backend<br/>API REST"]
        DB[("postgres")]
        AG["agent<br/>agente de demonstração"]
        WEB -- "/api" --> API
        API --> DB
        AG --> API
    end

    U(("Usuário")) -- "HTTPS" --> WEB
    PC["Computadores<br/>monitorados"] -- "HTTPS + token" --> WEB
```

| Serviço | Imagem | Exposto na internet |
|---|---|---|
| `web` | `ghcr.io/locatellibryann/infraobserver-web` (Caddy + build do React) | Sim: portas 80 e 443 |
| `backend` | `ghcr.io/locatellibryann/infraobserver-backend` | Não: só pela rede interna, via Caddy |
| `postgres` | `postgres:16-alpine` | Não |
| `agent` | `ghcr.io/locatellibryann/infraobserver-agent` | Não |

Decisões principais:

- **Caddy** como proxy reverso: emite e renova o certificado HTTPS (Let's Encrypt) sozinho e serve o dashboard e a API no mesmo domínio, sem precisar de CORS em produção.
- **Banco e API sem portas públicas**: só o Caddy recebe tráfego externo.
- **Migrations automáticas**: o container do backend executa `prisma migrate deploy` antes de iniciar.
- **Imagens versionadas pelo SHA do commit**: cada deploy é rastreável e pode ser revertido.
- **Agente de demonstração** rodando no próprio servidor, para o dashboard sempre ter dados.

## Ambientes

| Ambiente | Onde | Como sobe |
|---|---|---|
| Desenvolvimento | Máquina do desenvolvedor | `docker compose -f infrastructure/docker/docker-compose.yml up -d` + `npm run dev` (ver README) |
| Produção | VM na Azure | Automático, pelo workflow **CD** após o CI passar na `main` |

---

## 1. Criar a chave SSH do deploy

No seu computador (PowerShell), gere um par de chaves só para o deploy:

```powershell
ssh-keygen -t ed25519 -C "infraobserver-deploy" -f $HOME\.ssh\infraobserver_deploy
```

Deixe a senha da chave em branco (o GitHub Actions precisa usá-la sem interação). São criados dois arquivos:

- `infraobserver_deploy.pub`: chave **pública**, que vai para a Azure;
- `infraobserver_deploy`: chave **privada**, que vai para os secrets do GitHub. Nunca a compartilhe nem a versione.

## 2. Criar a máquina virtual

No [portal da Azure](https://portal.azure.com), vá em **Máquinas virtuais → Criar → Máquina virtual do Azure**:

**Aba Básico**

| Campo | Valor |
|---|---|
| Assinatura | Azure for Students |
| Grupo de recursos | Criar novo: `infraobserver-rg` |
| Nome da máquina virtual | `infraobserver-vm` |
| Região | Uma região permitida pela sua assinatura (ex.: *East US 2* ou *Brazil South*) |
| Imagem | **Ubuntu Server 24.04 LTS - x64 Gen2** |
| Tamanho | **Standard_B1ms** (1 vCPU, 2 GB de RAM) |
| Tipo de autenticação | **Chave pública SSH** |
| Nome de usuário | `azureuser` |
| Origem da chave pública SSH | **Usar chave pública existente**, colando o conteúdo de `infraobserver_deploy.pub` |
| Portas de entrada públicas | **HTTP (80), HTTPS (443) e SSH (22)** |

A assinatura Azure for Students limita as regiões disponíveis. Se aparecer um erro de política (`RequestDisallowedByAzure`), escolha outra região.

**Aba Discos:** *SSD Standard* é suficiente.

**Aba Avançado → Dados personalizados:** cole o conteúdo de [`infrastructure/azure/cloud-init.yml`](../infrastructure/azure/cloud-init.yml). Ele instala o Docker, cria a pasta `~/infraobserver` e um swap de 2 GB.

Clique em **Revisar + criar → Criar**.

## 3. Fixar o IP e criar o domínio

Depois que a VM for criada, abra o recurso **Endereço IP público** dela → **Configuração**:

1. **Atribuição:** mude para **Estático**, para o IP não mudar se a VM reiniciar.
2. **Rótulo do nome DNS:** por exemplo `infraobserver-bryann`.
3. **Salvar.**

O domínio público fica no formato:

```text
infraobserver-bryann.<região>.cloudapp.azure.com
```

## 4. Configurar o servidor

Conecte na VM:

```powershell
ssh -i $HOME\.ssh\infraobserver_deploy azureuser@infraobserver-bryann.<região>.cloudapp.azure.com
```

Confirme que o cloud-init terminou e que o Docker está instalado:

```bash
cloud-init status --wait
docker --version
docker compose version
```

Crie o arquivo de configuração de produção a partir de [`infrastructure/docker/production.env.example`](../infrastructure/docker/production.env.example):

```bash
cd ~/infraobserver
nano .env
```

Gere os segredos direto na VM:

```bash
openssl rand -hex 32                  # para POSTGRES_PASSWORD e cada token de agente
cat /proc/sys/kernel/random/uuid      # para DEMO_AGENT_ID
```

Em `SITE_ADDRESS`, coloque o domínio do passo 3, **sem** `https://`. O `DEMO_AGENT_TOKEN` precisa estar na lista `AGENT_TOKENS`.

Proteja o arquivo:

```bash
chmod 600 .env
```

## 5. Configurar o GitHub

No repositório, vá em **Settings → Environments → New environment** e crie o ambiente **`production`**.

Em **Environment secrets**, adicione:

| Secret | Valor |
|---|---|
| `VM_HOST` | o domínio do passo 3 |
| `VM_USER` | `azureuser` |
| `VM_SSH_KEY` | o conteúdo **inteiro** do arquivo `infraobserver_deploy` (chave privada), incluindo as linhas `BEGIN` e `END` |

Em **Environment variables**, adicione:

| Variável | Valor |
|---|---|
| `PRODUCTION_URL` | `https://` + o domínio do passo 3 |

Opcional: em **Deployment protection rules**, marque **Required reviewers** para exigir uma aprovação antes de cada deploy.

## 6. Primeiro deploy

O workflow **CD** roda sozinho quando o **CI** termina com sucesso na `main`. Para o primeiro deploy:

1. Abra um pull request de `develop` para `main` e faça o merge.
2. Acompanhe em **Actions**: primeiro o **CI**, depois o **CD**, com os passos *Build* (três imagens), *Deploy em produção* e *Verificar se a aplicação respondeu*.
3. Acesse o `PRODUCTION_URL`. No primeiro acesso, o Caddy pode levar alguns segundos para emitir o certificado HTTPS.

Também é possível disparar manualmente em **Actions → CD → Run workflow**, na branch `main`.

## Operação

**Ver o estado e os logs**

```bash
cd ~/infraobserver
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
cat deploy-history.log                 # versões publicadas, com data
```

**Rollback para uma versão anterior**

1. Pegue o SHA da versão boa em `deploy-history.log` ou no histórico do workflow CD.
2. Em **Actions → CD → Run workflow**, preencha **image_tag** com esse SHA.
3. O workflow pula o build e republica exatamente aquela versão.

**Conectar um computador real ao servidor**

1. Gere um token novo (`openssl rand -hex 32`) e acrescente-o em `AGENT_TOKENS` no `.env` da VM.
2. Aplique a mudança: `docker compose -f docker-compose.prod.yml up -d backend`.
3. No computador monitorado, configure o `agent/.env` com `INFRAOBSERVER_SERVER_URL=https://<domínio>` e o token novo.

**Backup do banco**

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U infraobserver infraobserver > backup-$(date +%F).sql
```

## Segurança

- O `.env` de produção só existe na VM (`chmod 600`) e nunca é versionado.
- O PostgreSQL e a API não têm portas públicas; todo o tráfego externo passa pelo Caddy, com HTTPS.
- O acesso SSH é feito só por chave, sem senha.
- As imagens rodam com usuários sem privilégios de root (`node` no backend e `agent` no agente).
- O CD usa o token temporário do próprio GitHub Actions para baixar as imagens; nenhuma credencial do registry fica salva na VM.
