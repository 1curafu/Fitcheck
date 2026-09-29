import { OPERATOR, PRIVACY_UPDATED, TERMS_UPDATED, type LegalDocument } from "../types";

export const PRIVACY_PT: LegalDocument = {
  title: "Política de Privacidade",
  updated: PRIVACY_UPDATED,
  intro:
    "Se esta tradução divergir da versão inglesa, prevalece a versão inglesa. O Fitcheck fotografa o teu roupeiro e sugere conjuntos a partir dele. Por isso guarda fotos da tua roupa e um pouco de informação sobre ti. Esta página diz exatamente o quê, porquê, quem mais lhe toca e como nos pedires para apagar tudo.",
  sections: [
    {
      id: "who-is-responsible",
      heading: "Quem é responsável",
      paragraphs: [
        `${OPERATOR.name}, a operar a partir da Suíça, é o responsável pelo tratamento dos teus dados. Para qualquer assunto desta página, escreve para ${OPERATOR.email}.`,
        "Aplica-se a lei suíça de proteção de dados (LPD). Se estiveres na UE ou no EEE, o RGPD também se aplica a ti, e cada direito indicado abaixo é teu ao abrigo de ambos.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "O que recolhemos",
      paragraphs: ["Apenas o que a app precisa para fazer o seu trabalho. Nada é recolhido para publicidade e nada é vendido."],
      bullets: [
        "A tua conta: o teu endereço de e-mail e, se iniciares sessão com o Google, o nome e a fotografia de perfil que o Google partilha.",
        "As tuas respostas ao pequeno questionário de estilo: como gostas de te vestir e o que preferes não usar.",
        "O teu roupeiro: as fotos que carregas, as versões recortadas que fazemos delas e as etiquetas que descrevem cada peça — cor, tecido, formalidade, etc. Podes editar cada etiqueta.",
        "Se uma foto que carregas te mostrar a usar a peça, guardamos essa foto tal como a tiraste. Guardamos o original apenas para que o recorte possa ser refeito mais tarde com melhores ferramentas; nunca é enviado para a IA, nunca é usado para te identificar e nunca é mostrado a ninguém além de ti. Podes apagar a foto original de qualquer peça que tenha recorte, na página dessa peça. O recorte fica nos teus looks, e um original apagado não pode servir para refazer um recorte melhor. Para as outras peças, escreve para legal@fitcheck.space e nós apagamo-la. Também podes eliminar de vez uma peça removida na página dela em Peças removidas: as fotos e os detalhes são eliminados, e os looks passados mantêm as outras peças.",
        "Os teus looks: os conjuntos que a app sugere, os que marcas como favoritos e os dias em que indicas ter usado um.",
        "A tua localização, apenas se a deres: uma cidade ou coordenadas e um fuso horário, para que o tempo nos teus looks seja o teu. Podes apagá-la nas Definições.",
        "Se subscreveres o Pro: o teu ID de cliente Stripe, o estado e a data de renovação da tua subscrição e quando confirmaste que o Pro devia começar de imediato. Os dados do cartão vão para a Stripe e a Link e nunca chegam até nós.",
        "Detalhes técnicos quando algo avaria: o erro, a página e o navegador. Não o teu nome, nem o que escreveste.",
      ],
    },
    {
      id: "sharing-a-look",
      heading: "Partilhar um look",
      paragraphs: [
        "Partilhar é sempre uma escolha tua. Partilhar imagem cria uma imagem no teu telemóvel; não guardamos nada sobre ela. Criar ligação publica um instantâneo de um look: as imagens, o nome, a frase do estilista e os nomes das peças (e as marcas, apenas se escolheres). Qualquer pessoa com a ligação pode vê-lo durante 30 dias, ou até deixares de partilhar, a partir do look ou das Definições. Não tem nome, conta nem mais nada teu, e não é indexado pelos motores de pesquisa. Eliminar a tua conta remove de imediato os teus looks partilhados. Uma imagem que publiques no Instagram, no TikTok ou noutro sítio é uma cópia que não podemos apagar. Depois de uma recuperação de emergência dos nossos sistemas, as ligações partilhadas são desativadas e têm de ser partilhadas de novo.",
      ],
    },
    {
      id: "why-we-use-it",
      heading: "Porque os usamos",
      paragraphs: [
        "Para prestar o serviço em que te registaste — etiquetar a tua roupa, criar looks, lembrar o que usaste. Ao abrigo do RGPD, trata-se da execução de um contrato.",
        "Para manter a app a funcionar e encontrar erros. Ao abrigo do RGPD, é o nosso interesse legítimo, limitado a relatórios de erros.",
        "Para te vender o Pro e mantê-lo ativo enquanto pagares. Mais uma vez um contrato, mais a contabilidade que a lei exige.",
        "Mais nada. Nenhuma definição de perfis além de estilizar o teu próprio roupeiro, nenhuma publicidade, nenhuma partilha com corretores de dados.",
      ],
    },
    {
      id: "who-else-sees-it",
      heading: "Quem mais os vê",
      paragraphs: [
        "Recorremos a um pequeno número de empresas para fazer funcionar o Fitcheck. Cada uma recebe apenas o que a sua tarefa exige e está vinculada por um acordo de tratamento de dados.",
      ],
      bullets: [
        "Supabase (UE, Frankfurt) — guarda a tua conta, as tuas fotos e tudo o que foi referido acima. Os teus dados ficam na UE.",
        "Anthropic (EUA) — a IA que etiqueta a tua roupa. Recebe a foto recortada de uma peça para a descrever, e descrições curtas em texto das peças — nunca fotos — para pensar nos conjuntos. A Anthropic não treina os seus modelos com dados enviados através da sua API.",
        "OpenWeather — recebe as tuas coordenadas para devolver uma previsão. Mais nada.",
        "Google — apenas se escolheres iniciar sessão com o Google.",
        "Resend (EUA) — envia o e-mail de início de sessão.",
        "Stripe — trata do pagamento do Pro; com a Link, os únicos que veem os dados do cartão.",
        "Link (Stripe) — vende-te o Fitcheck Pro como vendedor oficial (merchant of record): recebe o pagamento, cobra o IVA e envia os recibos, segundo os seus próprios termos e política de privacidade. Eliminar a tua conta Fitcheck cancela a subscrição; a Link e a Stripe guardam os registos de pagamento que a lei exige.",
        "Sentry (UE) — recebe relatórios de erros, para podermos corrigir o que avariou.",
        "Vercel — aloja a app e conta visualizações de página sem cookies nem qualquer identificador guardado no teu dispositivo. Como qualquer alojamento, também vê os pedidos que o teu navegador faz.",
      ],
    },
    {
      id: "data-leaving-europe",
      heading: "Dados que saem da Europa",
      paragraphs: [
        "A Anthropic, a Resend, a Google e a Stripe estão sediadas nos Estados Unidos ou tratam dados através deles. As transferências para estas empresas assentam no Quadro de Privacidade de Dados UE-EUA quando o fornecedor está certificado e, caso contrário, nas Cláusulas Contratuais-Tipo da Comissão Europeia, que a Suíça reconhece com o seu próprio aditamento. Quando o oferecem, a Google e a Stripe servem os utilizadores suíços e da UE através das suas entidades europeias.",
      ],
    },
    {
      id: "how-long-we-keep-it",
      heading: "Durante quanto tempo os guardamos",
      paragraphs: [
        "Enquanto tiveres uma conta. Elimina a tua conta nas Definições; uma eliminação bem-sucedida remove de imediato os teus dados ativos. Para apagar apenas a foto original de uma peça, ou eliminar de vez uma peça removida, usa as opções na página dessa peça. Também podes escrever para legal@fitcheck.space se precisares de ajuda com a eliminação.",
        "As cópias de segurança encriptadas podem conservar dados eliminados durante, no máximo, 30 dias antes de expirarem. Os relatórios de erros são guardados durante 90 dias. Os registos de pagamento exigidos por lei são guardados pela Link e pela Stripe durante o tempo que a lei fiscal exigir; a nossa cópia do teu estado de faturação desaparece com a tua conta.",
      ],
    },
    {
      id: "your-rights",
      heading: "Os teus direitos",
      paragraphs: [
        `Elimina a tua conta nas Definições, ou escreve para ${OPERATOR.email} se precisares de ajuda. Respondemos a outros pedidos relativos a direitos no prazo de 30 dias. Podes:`,
      ],
      bullets: [
        "Ver tudo o que guardamos sobre ti e obter uma cópia num formato de leitura automática.",
        "Corrigir o que estiver errado — a maior parte pode ser corrigida diretamente na app.",
        "Pedir que a tua conta e tudo o que contém sejam eliminados.",
        "Opor-te a qualquer tratamento baseado no interesse legítimo, ou pedir-nos que o limitemos.",
        "Apresentar queixa a uma autoridade de controlo: o Comissário Federal para a Proteção de Dados e a Informação, na Suíça, ou a autoridade do teu país da UE.",
      ],
    },
    {
      id: "cookies-and-storage-on-your-device",
      heading: "Cookies e armazenamento no teu dispositivo",
      paragraphs: [
        "O Fitcheck define apenas os cookies de que precisa para manter a tua sessão iniciada e lembrar o teu idioma. Não há cookies de publicidade nem de rastreio, e é por isso que vês um aviso em vez de um pedido de consentimento.",
        "A app também guarda algumas pequenas preferências no armazenamento do teu navegador — por exemplo, as notas de versão que já fechaste. Estas nunca saem do teu dispositivo.",
      ],
    },
    {
      id: "age",
      heading: "Idade",
      paragraphs: ["O Fitcheck destina-se a pessoas com 16 anos ou mais. Se tiveres menos de 16 anos, não cries uma conta."],
    },
    {
      id: "changes",
      heading: "Alterações",
      paragraphs: [
        "Quando esta página mudar de forma relevante, a data no topo muda e a app avisa-te na próxima visita. A versão atual está sempre em fitcheck.space/privacy.",
      ],
    },
  ],
};

export const TERMS_PT: LegalDocument = {
  title: "Termos de Serviço",
  updated: TERMS_UPDATED,
  intro:
    "Se esta tradução divergir da versão inglesa, prevalece a versão inglesa. Estes são os termos de utilização do Fitcheck. São curtos porque o acordo é simples: tu trazes o teu roupeiro, nós sugerimos o que vestir, e tu manténs o controlo sobre a tua roupa e os teus dados.",
  sections: [
    {
      id: "who-you-are-dealing-with",
      heading: "Com quem estás a lidar",
      paragraphs: [
        `O Fitcheck é explorado por ${OPERATOR.name}, ${OPERATOR.address}. Perguntas, notificações e reclamações para ${OPERATOR.email}.`,
      ],
    },
    {
      id: "your-account",
      heading: "A tua conta",
      paragraphs: [
        "Tens de ter pelo menos 16 anos para usar o Fitcheck. Mantém o controlo do e-mail com que inicias sessão; és responsável por tudo o que for feito a partir da tua conta. Uma conta por pessoa.",
      ],
    },
    {
      id: "your-clothes-your-photos",
      heading: "A tua roupa, as tuas fotos",
      paragraphs: [
        "Tudo o que carregas continua a ser teu. Dás-nos autorização para o guardar, remover o fundo, descrevê-lo com etiquetas, enviá-lo para a IA que faz a descrição e mostrá-lo de volta em conjuntos — e para mais nada. Essa autorização termina quando eliminas a peça ou a tua conta.",
        "Carrega apenas fotos que tenhas o direito de usar. O objetivo é o teu próprio roupeiro; fotos de outras pessoas, e outras pessoas, não.",
        "És responsável pelo que partilhas. Um look partilhado pode ser denunciado a partir da sua página, e o Fitcheck pode remover um look partilhado que viole estes termos.",
      ],
    },
    {
      id: "what-the-suggestions-are",
      heading: "O que são as sugestões",
      paragraphs: [
        "Os looks do Fitcheck são sugestões feitas por software a partir das etiquetas da tua roupa e do tempo. Normalmente são boas e às vezes erradas. Não são uma promessa de que um conjunto é adequado a uma ocasião, a um código de vestuário ou a ti. Vê-te ao espelho antes de saíres de casa.",
        "As etiquetas que a IA escreve para uma peça são um primeiro rascunho. Podes corrigir qualquer uma, e a app melhora quando o fazes.",
      ],
    },
    {
      id: "free-and-paid",
      heading: "Grátis e pago",
      paragraphs: [
        "O plano grátis pretende ser útil de verdade e continua grátis. O plano pago, Fitcheck Pro, acrescenta funcionalidades e levanta limites; o que inclui e quanto custa são mostrados antes da compra, e o preço inclui o IVA aplicável.",
        "O Fitcheck Pro é vendido através da Link, o serviço de vendedor oficial (merchant of record) da Stripe: a Link é o vendedor da subscrição, recebe o pagamento, cobra o IVA e envia-te recibos e faturas. O Pro custa CHF 5 por mês ou CHF 50 por ano; a app mostra o equivalente em euros ou dólares quando se aplicam, e as outras moedas são convertidas no pagamento. Todos os preços incluem IVA.",
        "O Pro renova automaticamente até cancelares. Podes cancelar a qualquer momento na app (Perfil → Gerir subscrição); o Pro continua até ao fim do período pago e não renova. Mudar entre mensal e anual tem efeito imediato, e a parte não usada do período atual é creditada no novo. Se um pagamento de renovação falhar, é tentado de novo durante cerca de duas semanas enquanto o Pro continua a funcionar; se continuar a falhar, o Pro termina. Uma subscrição por conta.",
        "Eliminar a tua conta nas Definições cancela a subscrição de imediato — antes de qualquer dado teu ser eliminado — e esta não renova. Os reembolsos seguem as regras da Link e a lei; escreve-nos para o endereço acima se algo correu mal.",
        "Se fores um consumidor na UE, tens normalmente um direito de livre resolução de 14 dias sobre uma compra. Como o Pro começa a funcionar no momento em que subscreves, pedimos-te que confirmes expressamente no pagamento que queres que comece de imediato e que aceites perder esse direito depois de começar. Sem essa confirmação, o teu direito de 14 dias mantém-se. A confirmação é a caixa de verificação no ecrã de passagem a Pro, e registamos quando a deste.",
        "Podemos alterar o preço do Pro com um aviso prévio de pelo menos 30 dias por e-mail. Se não quiseres o novo preço, cancela antes de entrar em vigor.",
      ],
    },
    {
      id: "fair-use",
      heading: "Utilização justa",
      paragraphs: [
        "Não tentes entrar nas contas de outras pessoas, sobrecarregar o serviço, copiá-lo ou usá-lo para construir um concorrente. Não carregues nada ilegal. Podemos suspender ou encerrar uma conta que faça estas coisas, e dizemos-te porquê.",
      ],
    },
    {
      id: "ending-things",
      heading: "Terminar",
      paragraphs: [
        `Podes eliminar a tua conta quando quiseres nas Definições. Uma eliminação bem-sucedida remove de imediato os teus dados ativos, enquanto as cópias de segurança encriptadas expiram no prazo de 30 dias; ${OPERATOR.email} continua disponível se precisares de ajuda. Podemos terminar o serviço ou o teu acesso com 30 dias de aviso prévio, e de imediato se violares estes termos.`,
      ],
    },
    {
      id: "what-we-are-and-are-not-responsible-for",
      heading: "Pelo que somos e não somos responsáveis",
      paragraphs: [
        "Trabalhamos para manter o Fitcheck disponível, rigoroso e seguro, mas fornecemo-lo tal como está. Na medida em que a lei o permita, não somos responsáveis por perdas resultantes de confiares numa sugestão de conjunto, da indisponibilidade do serviço ou de qualquer coisa fora do nosso controlo. Nada aqui limita a responsabilidade por dolo, negligência grave ou qualquer coisa que a lei não nos permita limitar.",
        "Se fores um consumidor, nada nestes termos te retira os direitos que a lei do teu país te dá e a que não podes renunciar.",
      ],
    },
    {
      id: "law-and-disputes",
      heading: "Lei e litígios",
      paragraphs: [
        "Aplica-se a lei suíça, e os litígios são da competência dos tribunais da sede do operador na Suíça. Se fores um consumidor na UE, manténs a proteção da lei do teu país e podes intentar uma ação nos tribunais do teu país.",
      ],
    },
    {
      id: "changes",
      heading: "Alterações",
      paragraphs: [
        "Se alterarmos estes termos de forma relevante, a data no topo muda e a app avisa-te na próxima visita. Continuar a usar o Fitcheck depois disso significa que aceitas a alteração. Se fores um subscritor Pro pagante e uma alteração for substancialmente pior para ti, pedimos-te que a confirmes ativamente antes de se aplicar, e podes em vez disso cancelar sem custos. Se não aceitares uma alteração, elimina a tua conta e não te vincularemos a ela.",
      ],
    },
  ],
};
