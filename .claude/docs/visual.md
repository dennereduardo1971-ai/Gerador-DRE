> Leia antes de criar ou alterar QUALQUER componente `.jsx` ou tocar em `App.css`.

# Sistema visual ("Razão")

A referência é o papel de razão contábil (green-bar paper): daí o
neutro verde-acinzentado e a listra de linha alternada nas tabelas.
Duas regras que não devem ser desfeitas sem motivo:

1. **A cor de marca (índigo) nunca é verde nem vermelha.** Verde e
   vermelho pertencem ao dado — saldo, resultado, diferença que não
   fecha. Se um dia a marca virar verde, a semântica contábil da tela
   deixa de funcionar.
2. **Mono (`Spline Sans Mono`) é só para código de conta.** Valores em
   R$ e percentuais usam Archivo com `font-variant-numeric: tabular-nums`
   (verificado: Archivo tem a feature `tnum`; NÃO tem `zero`, então não
   adianta pedir zero cortado). Mono em coluna de valor engorda a tabela
   e dá cara de editor de código.

## O casco: topo de contexto e menu lateral

Três peças: faixa fixa no topo, menu lateral que recolhe, conteúdo.

O topo carrega **contexto, não apresentação**. Existia ali um parágrafo
explicando o app; um parágrafo se lê uma vez e depois é ruído permanente.
No lugar entraram três selos (`ctx-chip`) que dizem o tempo todo as três
coisas que mudam o que está na tela — qual arquivo, qual período, qual
fonte — e cada um leva à tela que muda aquilo.

O menu recolhe para um trilho de 64px só com ícones, e a escolha fica em
`localStorage` (é preferência de quem usa, não estado do arquivo: não
entra na sessão em IndexedDB, que é só para dado de cliente). No celular
ele vira **gaveta**, não faixa rolável: a faixa cabia, mas com quatorze
itens obrigava a arrastar às cegas, e o que estava fora da vista não
existia.

O único movimento do casco é um fade de 0.2s ao trocar de aba, e a
largura do menu animando ao recolher. Nada mais anima — número que o olho
precisa ler não se mexe.

## Texto longo mora em `<details class="explica">`

Regra desta interface: **a primeira coisa visível numa tela é o que fazer,
não a explicação de por quê.** O texto que explica consequência, formato
de arquivo ou fundamento contábil continua no app, fechado, atrás de um
`<summary>` de três a cinco palavras.

Uma exceção, e não é estilo: a instrução de token fine-grained em
`SincronizacaoGitHub.jsx` fica **aberta**. É aviso de consequência, lido
por quem está prestes a clicar — esconder um aviso desses é o oposto de
"fácil de entender".

## O canal (elemento de assinatura)

`Eixo.jsx` exporta duas primitivas puramente visuais:

- **`Canal`** — a coluna de cascata dentro da própria DRE. Cada linha
  desenha seu segmento começando onde o subtotal anterior parou:
  deduções e custos andam para a esquerda a partir do saldo corrente,
  adições para a direita. O fundo pálido é o nível ANTES da linha (sem
  ele a mordida vermelha flutua no vazio). Subtotais desenham barra
  cheia do zero até o valor.
- **`Balanca`** — o mesmo eixo espelhado, usado em Conferir (débito ×
  crédito). Os dois braços são índigo neutro; **o único trecho vermelho é
  o excesso de um lado sobre o outro**, ou seja, literalmente o que não
  fecha. Ela já serviu também ao Balanço (Ativo × Passivo + PL) e
  continua genérica o bastante para qualquer par que precise fechar.

Os números da cascata são calculados em `montarLinhas()` dentro de
`EtapaDRE.jsx`, percorrendo a demonstração em ordem — e **cada subtotal
reancora no valor autoritativo vindo de `montarDRE`**, nunca numa soma
própria. Isso é de propósito: o desenho não pode divergir do número
impresso ao lado se algum grupo for exibido condicionalmente.

Uma tentação a evitar: já existiu uma barrinha de variação divergente ao
lado da variação percentual mês a mês (hoje no bloco de cima da
Comparativa) e ela foi removida. Com uma variação atípica (+424% num mês)
a escala compartilhada esmaga todas as outras e as barras viram slivers
invisíveis — o número já dizia tudo.

## Piso de qualidade

Responsivo até 390px (o menu vira gaveta; tabelas com descrição textual
viram cartões empilhados via `.tabela-cartao` + `data-rotulo`, e a célula
`.desc` empilha rótulo sobre conteúdo em vez de dividir em duas colunas;
tabelas curtas e numéricas rolam na horizontal), foco de teclado visível em todo
interativo, `prefers-reduced-motion` respeitado, `@media print`
preservando só a demonstração. A dropzone é operável por teclado
(Enter/Espaço) e os `<select>` de grupo e checkboxes de tabela têm
`aria-label` próprio, porque o cabeçalho da coluna sozinho não nomeia
o controle.

