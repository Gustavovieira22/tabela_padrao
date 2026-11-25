# FRANK · Normalizador de Tabelas

Aplicação web para **padronizar planilhas** (XLS, XLSX e CSV) direto no navegador: renomear e apagar colunas, extrair nome/sobrenome, normalizar CPF e telefone, unir colunas e exportar o resultado em CSV, XLSX, XLS ou ODS.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue-3.x-41B883?logo=vue.js&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white)

> **Privacidade:** todo o processamento do arquivo acontece no navegador (SheetJS). O servidor Node/Express apenas entrega a página — nenhuma planilha é enviada para o backend.

---

## Sumário

- [Demonstração do fluxo](#demonstração-do-fluxo)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Requisitos](#requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como usar](#como-usar)
- [Operações por coluna](#operações-por-coluna)
- [Atalhos de teclado](#atalhos-de-teclado)
- [Aba "Erros" e exportação](#aba-erros-e-exportação)
- [Scripts do npm](#scripts-do-npm)
- [Notas técnicas e limitações](#notas-técnicas-e-limitações)
- [Licença](#licença)

---

## Demonstração do fluxo

1. **Importe o arquivo** — arraste a planilha ou use o botão. A aba principal do arquivo é carregada automaticamente; se houver outras, use o seletor de abas.
2. **Trate as colunas** — no cabeçalho da tabela, use a engrenagem para renomear, limpar CPF, padronizar telefones ou unir duas colunas.
3. **Baixe o resultado** — escolha o formato (CSV, XLSX, XLS ou ODS) e exporte a versão padronizada. Valores que não puderam ser padronizados saem da planilha e são listados na aba **Erros**.

---

## Funcionalidades

- Upload por **arrastar e soltar** ou seleção de arquivo (`.xls`, `.xlsx`, `.csv`).
- Leitura de planilhas com o **SheetJS (xlsx)** e detecção automática da aba ativa do arquivo.
- **Seletor de abas** quando o arquivo possui mais de uma.
- **Prévia paginada** da tabela (10, 25, 50, 100 ou todas as linhas).
- **Renomear coluna direto no cabeçalho** (duplo clique ou menu), com validação de nome vazio/repetido.
- **Apagar coluna** com um clique.
- Operações de padronização por coluna: primeiro nome, nome + sobrenome, CPF com/sem pontuação, telefone (Meta/WhatsApp, só DDD + número, com parênteses) e **união de colunas** (concatenação sem espaço).
- **Desfazer** alterações (até 30 passos) pelo botão ou `Ctrl+Z`.
- **Controle de erros de padronização**: valores inválidos não aparecem na prévia, ficam vazios no arquivo principal e são registrados (linha, coluna, valor original, operação e motivo) na aba **Erros** do download.
- Exportação em **CSV, XLSX, XLS e ODS**; quando existem erros, o CSV é automaticamente convertido para XLSX (CSV não suporta múltiplas abas).
- Datas formatadas como `dd/mm/aaaa hh:mm` na leitura do arquivo.

---

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Backend | [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/) |
| Template engine | [EJS 6](https://ejs.co/) |
| Frontend | [Vue 3](https://vuejs.org/) (build global via CDN, Options API) |
| Planilhas | [SheetJS / xlsx 0.18.5](https://sheetjs.com/) (CDN) |
| Estilo | [Bootstrap 5.3](https://getbootstrap.com/), [Bootstrap Icons](https://icons.getbootstrap.com/) e CSS próprio |
| Fonte | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |
| Config | [dotenv](https://github.com/motdotla/dotenv) |

O projeto usa **ES Modules** (`"type": "module"` no `package.json`).

---

## Estrutura do projeto

```
tabela_padrao/
├── .env                        # Porta do servidor (PORT=3001)
├── .gitignore
├── package.json
├── README.md
└── src/
    ├── index.js                # Bootstrap do Express (middlewares, views, rotas)
    ├── controller/
    │   └── tabela.Controller.js  # Renderiza a tela principal
    ├── routes/
    │   └── tabela.Routes.js      # Rota "/" e fallback de redirecionamento
    ├── views/
    │   └── tabela.ejs            # Tela única (Vue 3 + Bootstrap)
    └── public/
        ├── css/
        │   └── tabela.css        # Estilos da aplicação
        └── js/
            ├── tabela.js         # App Vue: estado, upload, paginação, operações, export
            └── utils.js          # Transformações puras (CPF, telefone, nomes, datas)
```

---

## Requisitos

- **Node.js 18 ou superior** (o projeto usa ES Modules e `import`).
- npm 9+.

---

## Instalação e execução

```bash
# 1. Clone o repositório
git clone https://github.com/Gustavovieira22/tabela_padrao.git
cd tabela_padrao

# 2. Instale as dependências
npm install

# 3. Crie o arquivo .env (veja a seção abaixo)
#    PORT=3001

# 4. Suba o servidor
npm start
```

Acesse **http://localhost:3001**.

---

## Variáveis de ambiente

O projeto lê as configurações de um arquivo `.env` na raiz (carregado via `dotenv/config`).

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `PORT` | Sim | — (no `.env` versionado: `3001`) | Porta em que o servidor Express escuta. |

Exemplo de `.env`:

```env
PORT=3001
```

> O `.env` atual está versionado no repositório apenas com a porta de desenvolvimento. Em produção, defina as variáveis no ambiente do servidor.

---

## Como usar

1. **Envie a planilha** — arraste o arquivo para a área de upload ou clique em *Selecionar arquivo*.
2. **Escolha a aba** (se o arquivo tiver mais de uma) — a troca recarrega os dados originais daquela aba e limpa o histórico de edições.
3. **Ajuste as colunas** — use os botões do cabeçalho:
   - `lixeira` → apaga a coluna;
   - `sliders` → abre o menu de operações da coluna;
   - duplo clique no nome → renomeia no próprio cabeçalho.
4. **Desfaça se necessário** — botão *Desfazer* ou `Ctrl+Z` (um passo por vez).
5. **Exporte** — escolha o formato no rodapé da prévia e clique em *Baixar tabela padronizada*.

A paginação afeta **apenas a visualização**: as operações são aplicadas em **todas as linhas** da aba selecionada.

---

## Operações por coluna

As transformações ficam em `src/public/js/utils.js` e são aplicadas a todos os valores da coluna.

| Grupo | Operação | Resultado |
| --- | --- | --- |
| Coluna | Renomear coluna | Edita o nome no próprio cabeçalho (Enter salva, Esc cancela) |
| Nome | Só o primeiro nome | `Ana Souza Lima` → `Ana` |
| Nome | Nome e sobrenome | `Ana Souza Lima` → `Ana Souza` (ignora `de`, `da`, `do`, `das`, `dos`, `e`) |
| CPF | CPF com pontos | `12345678901` → `123.456.789-01` |
| CPF | CPF só com números | `123.456.789-01` → `12345678901` |
| Telefone | Telefone com 55 no início | Formato Meta/WhatsApp: `551199999999` |
| Telefone | Telefone só com DDD e número | Remove `55`, símbolos e o `9` extra → `1199999999` |
| Telefone | Telefone com parênteses | `(11)99999-9999` |
| Combinar | Unir colunas | Concatena com outra coluna, sem espaço, e remove a coluna escolhida |

### Regras de validação

- **Célula vazia não é erro:** permanece vazia.
- **CPF:** precisa ter exatamente 11 dígitos após remover a pontuação.
- **Telefone:** após a limpeza precisa ter exatamente 10 dígitos (DDD + número). Números com DDI `55` e/ou o `9` extra são normalizados antes da checagem.
- Valores inválidos geram um `ErroPadronizacao` (classe em `utils.js`) que alimenta a aba **Erros** do arquivo exportado.

---

## Atalhos de teclado

| Atalho | Ação |
| --- | --- |
| `Ctrl+Z` / `Cmd+Z` | Desfazer a última alteração (ignorado enquanto se digita em um campo) |
| `Enter` | Confirma o novo nome da coluna |
| `Esc` | Cancela a renomeação ou fecha o modal *Unir colunas* |
| Duplo clique no cabeçalho | Abre a edição do nome da coluna |

---

## Aba "Erros" e exportação

Quando algum valor não pode ser padronizado:

1. A célula correspondente é **esvaziada** na prévia e no arquivo principal (o valor original é mantido internamente para permitir desfazer).
2. O registro é enviado para a aba **Erros** do arquivo baixado, com as colunas:

| Linha na planilha | Coluna | Valor original | Operação | Motivo |
| --- | --- | --- | --- | --- |
| Número da linha considerando o cabeçalho | Nome da coluna | Valor que falhou | Operação aplicada | Ex.: `CPF com 9 dígito(s), esperado 11` |

Formatos disponíveis no download:

| Formato | Extensão | Observação |
| --- | --- | --- |
| CSV | `.csv` | Separador `;`. Suporta apenas uma aba. |
| Excel | `.xlsx` | Aba `Dados Padronizados` + aba `Erros`. |
| Excel 97-2003 | `.xls` | Suporta múltiplas abas. |
| LibreOffice | `.ods` | Suporta múltiplas abas. |

> Se existirem erros e o formato escolhido for CSV, o download é feito automaticamente em **XLSX** e um aviso é exibido na tela. O arquivo gerado é nomeado `tabela_padronizada.<ext>` ou `tabela_padronizada_<aba>.<ext>` quando o arquivo original possui mais de uma aba.

---

## Scripts do npm

| Script | Comando | Descrição |
| --- | --- | --- |
| `start` | `node src/index.js` | Sobe o servidor Express. |
| `test` | `echo "Error: no test specified" && exit 1` | Placeholder — ainda não há testes automatizados. |

---

## Notas técnicas e limitações

- **Processamento 100% no cliente:** o Express serve apenas a página, o CSS e o JS; o arquivo é lido com `XLSX.read()` no navegador.
- **Dependências de CDN:** Vue 3, SheetJS, Bootstrap e Bootstrap Icons são carregados por CDN na view `tabela.ejs` — é necessário acesso à internet para usar a aplicação.
- **Histórico de desfazer** limitado a 30 estados e zerado ao trocar de aba ou remover o arquivo.
- **Workbook original preservado:** trocar de aba reaplica a leitura a partir do arquivo carregado, descartando as edições feitas na aba anterior.
- **Fallback de rota:** qualquer URL diferente de `/` redireciona para a tela principal (`src/routes/tabela.Routes.js`).
- A formatação de datas depende de `cellDates: true` na leitura; datas inválidas mantêm o valor original.
- Não há persistência em banco de dados nem upload para servidor: nada é salvo após fechar a página.

---

## Licença

Distribuído sob a licença **ISC** (conforme `package.json`).
