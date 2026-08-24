> Leia antes de mexer em `sessao.js`, `perfil.js` ou no que "Limpar tudo" apaga.

# Persistência e perfil

`sessao.js` guarda a sessão inteira (razão, mapeamento, classificações,
empresa/CNPJ, filtros) em **IndexedDB** — não localStorage, que é
síncrono e não aguenta o volume do razão. Duas sutilezas que não devem
ser desfeitas:

- A gravação só começa depois que a restauração termina
  (`sessaoCarregada`). Sem essa trava, o estado vazio do primeiro render
  sobrescreve a sessão salva e o usuário perde tudo justamente ao abrir.
- Como isso deixa dado financeiro real no disco da máquina — e o Denner
  usa PC de empresa —, **"Limpar tudo" tem que continuar sendo um botão
  visível**, não uma opção escondida.

`perfil.js` serializa o mapa conta → grupo num arquivo JSON (versão 2:
leva junto a categoria do CPC 51 por conta, a política de atividade
principal e as MPDA; perfis versão 1 continuam sendo lidos). Ele guarda
**só decisões e nomes de conta, nunca valores** — de propósito, para
poder ser versionado ou compartilhado sem carregar número de cliente
nenhum. Ao carregar, `cobertura()` responde "esse perfil serve para este
razão?" antes de aplicar. Contas vindas do perfil entram como `tocadas`
(manuais), porque é o que elas são: alguém já decidiu antes.

