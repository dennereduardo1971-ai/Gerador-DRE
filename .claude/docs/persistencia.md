> Leia antes de mexer em `sessao.js`, `perfil.js` ou no que "Limpar tudo" apaga.

# Persistência e perfil

`sessao.js` guarda a sessão inteira (balancetes carregados, classificações,
empresa/CNPJ, filtros) em **IndexedDB** — não localStorage, que é
síncrono e não aguenta o volume de vários meses de contas. Duas sutilezas que não devem
ser desfeitas:

- A gravação só começa depois que a restauração termina (`carregada`, em
  `useSessao`). Sem essa trava, o estado vazio do primeiro render
  sobrescreve a sessão salva e o usuário perde tudo justamente ao abrir.
- **O efeito que grava NÃO tem lista de dependências**, e isso é
  deliberado: ele roda a cada render e reagenda o mesmo timeout de
  800 ms, então a gravação acontece 800 ms depois que os renders param.
  A versão anterior listava dezessete dependências à mão, e a armadilha
  era acrescentar um estado novo e esquecer de listá-lo — um campo que
  nunca era salvo, sem erro nenhum.
- **Cada hook de domínio é dono da própria fatia**: devolve
  `sessao = { dados, vazio, restaurar, limpar }` e `useSessao` só junta.
  Assunto novo entra sem mexer em três lugares.
- Como isso deixa dado financeiro real no disco da máquina — e o Denner
  usa PC de empresa —, **"Limpar tudo" tem que continuar sendo um botão
  visível**, não uma opção escondida.

`perfil.js` serializa o mapa conta → grupo num arquivo JSON (versão 3:
leva também os PARÂMETROS fiscais — regime, alíquotas, adesão ao PROUNI e
o mapa de qual conta é PIS, COFINS ou ISS; **prejuízo fiscal e base
negativa de CSLL ficam de fora**, porque são valores de uma empresa
identificada e o perfil precisa poder ser versionado; versão 2:
leva junto a categoria do CPC 51 por conta, a política de atividade
principal e as MPDA; perfis versão 1 continuam sendo lidos). Ele guarda
**só decisões e nomes de conta, nunca valores** — de propósito, para
poder ser versionado ou compartilhado sem carregar número de cliente
nenhum. Ao carregar, `cobertura()` responde "esse perfil serve para este
balancete?" antes de aplicar. Contas vindas do perfil entram como `tocadas`
(manuais), porque é o que elas são: alguém já decidiu antes.

