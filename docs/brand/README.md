# Identidade visual

O símbolo do InfraObserver é um **anel aberto com um ponto verde na abertura**: o anel representa a observação contínua do parque de máquinas, e o ponto é o endpoint enviando sinal (online).

<p>
  <img src="logo-horizontal.svg" alt="InfraObserver, versão para fundo claro" width="360" />
</p>

## Arquivos

| Arquivo | Uso |
|---|---|
| `logo-horizontal.svg` / `.png` | Símbolo + nome em fundo claro (documentos, slides) |
| `logo-horizontal-branco.svg` / `.png` | Símbolo + nome em fundo escuro |
| `logo-simbolo.svg` | Só o símbolo, fundo claro |
| `logo-simbolo-branco.svg` | Só o símbolo, fundo escuro |
| `logo-simbolo-512.png` | Avatar (GitHub, redes) |

O favicon fica em `frontend/public/` (`favicon.svg`, `favicon.ico` com 16, 32 e 48 px e `apple-touch-icon.png`). No dashboard, o símbolo é o componente `BrandMark` (`frontend/src/components/BrandMark.tsx`), que desenha o anel com a cor do texto.

## Cores

| Cor | Hex | Uso |
|---|---|---|
| Azul-marinho | `#0F1B2D` | Anel e nome em fundo claro |
| Verde de sinal | `#1FA971` | Ponto do símbolo |
| Verde escuro | `#12805A` | Fundos verdes com o símbolo em branco |
| Branco | `#FFFFFF` | Anel e nome em fundo escuro |

## Tipografia

IBM Plex Sans: "Infra" em SemiBold (600) e "Observer" em Regular (400). Nos SVG, o nome já está convertido em curvas e não depende da fonte instalada. A fonte é distribuída pela SIL Open Font License.

## Interface do dashboard

O dashboard usa a mesma fonte (IBM Plex Sans, empacotada pelo `@fontsource-variable/ibm-plex-sans`) e um tema escuro derivado das cores da marca. As cores ficam em `frontend/src/index.css`, que redefine as escalas `slate` e `cyan` do Tailwind; os componentes usam essas classes e herdam a paleta.

| Cor | Hex | Uso |
|---|---|---|
| Fundo | `#07111E` | Fundo da aplicação |
| Painel | `#0F1D31` | Cartões e barra lateral, com transparência e desfoque |
| Verde de sinal | `#1FA971` | Luz do fundo e status online |
| Verde-água | `#1BC0AB` | Ações, seleção e foco |
| Âmbar | `#F5B342` | Alertas e disco no gráfico |

Os efeitos (luzes do fundo, radar do cabeçalho, brilho dos cartões que segue o cursor, entrada das seções) param para quem ativou "reduzir movimento" no sistema. O símbolo no dashboard só se desenha uma vez ao abrir a página: o desenho final é o logo original.

## Regras de uso

- Deixe em volta do logo um espaço livre de pelo menos metade da altura do símbolo.
- Não use o logo horizontal com menos de 120 px de largura; abaixo disso, use só o símbolo.
- Não altere as proporções, as cores nem a posição do ponto, e não aplique sombras ou degradês.
