import type { LocalizedNote } from "@/lib/release-notes";

/** Keyed by version; one entry for every RELEASE_NOTES version, same line counts. */
export const PT_NOTES: Record<string, LocalizedNote> = {
  "0.4.1": {
    headline: "Partilhar um look ficou mais simples, e as peças removidas podem sair de vez.",
    added: ["Criar ligação agora copia a ligação por ti", "Elimina de vez uma peça removida na página dela"],
    fixed: ["Copiar agora mostra Copiado no próprio botão", "Mostrar marcas explica quando as tuas peças ainda não têm marca"],
  },
  "0.4.0": {
    headline: "Partilha os teus looks, adiciona peças em lote e traz peças de volta.",
    added: [
      "Partilha um look como story, publicação ou ligação",
      "Adiciona várias peças de uma vez a partir das tuas fotos",
      "Repõe uma peça removida a partir de Peças removidas",
      "Apaga a foto original de uma peça; o recorte fica nos teus looks",
    ],
    fixed: ["Agora só se podem adicionar fotos ao teu roupeiro"],
  },
  "0.3.9": {
    headline: "Os reembolsos do Pro são agora tratados de forma limpa do início ao fim.",
    added: ["Uma subscrição Pro reembolsada termina de imediato — sem mais cobranças"],
    fixed: ["Um reembolso já não deixa uma subscrição ativa"],
  },
  "0.3.8": {
    headline: "O Fitcheck Pro chegou — todas as funcionalidades, ao mês ou ao ano.",
    added: ["Passa a Pro ao mês ou ao ano, e gere ou cancela quando quiseres"],
    fixed: ["As definições da tua conta estão ainda mais protegidas"],
  },
  "0.3.7": {
    headline: "Trabalho discreto nos bastidores para manter os teus dados seguros.",
    added: ["Cada atualização verifica agora que as alterações à base de dados chegaram"],
    fixed: ["Uma alteração à base de dados já não pode perder-se sem darmos conta"],
  },
  "0.3.6": {
    headline: "Remover uma peça diz-te agora exatamente o que acontece.",
    added: ["Remover uma peça pergunta primeiro e explica o que fica e o que não fica"],
    fixed: ["O aviso de cookies já não tapa o botão de voltar"],
  },
  "0.3.5": {
    headline: "Eliminar a conta ficou mais fiável nos bastidores.",
    added: ["Se a eliminação da tua conta falhar, ficamos a saber de imediato"],
    fixed: ["Uma eliminação falhada diz-nos agora exatamente que passo corrigir"],
  },
  "0.3.4": {
    headline: "As tuas cópias de segurança trazem agora tudo de volta — fotos incluídas.",
    added: ["A recuperação de uma cópia de segurança é agora testada do início ao fim"],
    fixed: ["Uma cópia recuperada devolve o acesso às tuas fotos", "Os novos registos funcionam logo após uma recuperação"],
  },
  "0.3.3": {
    headline: "Eliminar a tua conta já não deixa nada para trás.",
    added: ["A eliminação da conta verifica duas vezes que não fica nenhuma foto"],
    fixed: [
      "Uma foto a carregar noutro dispositivo durante a eliminação também sai",
      "Uma cópia recuperada já não guarda fotos de uma conta eliminada",
    ],
  },
  "0.3.2": {
    headline: "A tua conta, a tua decisão — a eliminação está agora nas Definições.",
    added: [
      "Elimina a tua conta e os dados ativos diretamente nas Definições",
      "O Fitcheck guarda agora cópias de segurança encriptadas para imprevistos",
    ],
    fixed: ["Uma cópia recuperada já não pode trazer de volta uma conta eliminada"],
  },
  "0.3.1": {
    headline: "Recortes mais limpos, e Rodar onde o consegues ver.",
    added: ["O botão Rodar está agora na foto, para a veres rodar"],
    fixed: [
      "Os espaços entre a manga e o corpo já não saem como manchas brancas",
      "Tirar de novo já não parece um botão de rodar",
      "Este cartão aparece após uma atualização também na app do ecrã inicial",
    ],
  },
  "0.3.0": {
    headline: "Adicionar roupa é mais rápido, e ela fica na posição certa.",
    added: [
      "A remoção do fundo demora menos de um segundo — e descarrega 5× menos",
      "Foto de lado? Endireitamo-la por ti — e há um botão Rodar",
      "Privacidade e termos em linguagem clara, ligados onde importam",
    ],
    fixed: ["A roupa branca em fundos claros já não perde as margens", "Bainhas de calças e punhos mantêm a forma no recorte"],
  },
  "0.2.0": {
    headline: "Os teus looks ficaram mais inteligentes.",
    added: [
      "Vestidos e macacões — uma peça inteira é agora um look completo",
      "Malas, relógios e um segundo acessório podem entrar num look",
      "Os conjuntos pesam tecido contra tecido: linho com lã, seda com pele",
      "Os sapatos são avaliados com o que usas com eles, não sozinhos",
    ],
    fixed: [
      "Um vestido já não leva ténis quando pedia algo mais elegante",
      "Ténis com fato só quando isso resulta mesmo",
      "Uma mala ou um relógio que repete uma cor é finalmente notado",
      "Duas malhas pesadas juntas já não passam por boa ideia",
    ],
  },
};
