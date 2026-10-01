import { OPERATOR, PRIVACY_UPDATED, TERMS_UPDATED, type LegalDocument } from "../types";

export const PRIVACY_FR: LegalDocument = {
  title: "Politique de confidentialité",
  updated: PRIVACY_UPDATED,
  intro:
    "Si cette traduction diffère de la version anglaise, la version anglaise prévaut. Fitcheck photographie ta garde-robe et te propose des tenues à partir d’elle. Il conserve donc des photos de tes vêtements et un peu d’informations sur toi. Cette page dit exactement quoi, pourquoi, qui d’autre y a accès et comment nous faire tout supprimer.",
  sections: [
    {
      id: "who-is-responsible",
      heading: "Qui est responsable",
      paragraphs: [
        `${OPERATOR.name}, établi en Suisse, est le responsable du traitement de tes données. Pour tout ce qui figure sur cette page, écris à ${OPERATOR.email}.`,
        "La loi suisse sur la protection des données (LPD) s’applique. Si tu te trouves dans l’UE ou l’EEE, le RGPD s’applique aussi à toi, et chaque droit listé ci-dessous t’appartient selon les deux.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "Ce que nous collectons",
      paragraphs: ["Seulement ce dont l’app a besoin pour fonctionner. Rien n’est collecté pour la publicité, et rien n’est vendu."],
      bullets: [
        "Ton compte : ton adresse e-mail et, si tu te connectes avec Google, le nom et la photo de profil que Google partage.",
        "Tes réponses au court quiz de style : ta façon de t’habiller et ce que tu préfères ne pas porter.",
        "Ta garde-robe : les photos que tu importes, les versions détourées que nous en faisons et les tags qui décrivent chaque pièce — couleur, matière, formalité, etc. Tu peux modifier chaque tag.",
        "Si une photo que tu importes te montre en train de porter la pièce, nous la conservons telle que tu l’as prise. Nous gardons l’original uniquement pour pouvoir refaire le détourage avec de meilleurs outils plus tard ; il n’est jamais envoyé à l’IA, jamais utilisé pour t’identifier et jamais montré à personne d’autre que toi. Tu peux effacer la photo originale de toute pièce qui a un détourage, depuis sa page. Le détourage reste dans tes looks, et un original effacé ne peut plus servir à refaire un meilleur détourage. Pour les autres pièces, écris à legal@fitcheck.space et nous la supprimerons. Tu peux aussi supprimer définitivement une pièce retirée depuis sa page dans Pièces retirées : ses photos et ses détails sont supprimés, et les looks passés gardent leurs autres pièces.",
        "Tes looks : les tenues proposées par l’app, celles que tu mets en favori et les jours où tu indiques en avoir porté une.",
        "Ta position, seulement si tu la donnes : une ville ou des coordonnées et un fuseau horaire, pour que la météo de tes looks soit la tienne. Tu peux l’effacer dans les Réglages.",
        "Si tu t’abonnes à Pro : ton identifiant client Stripe, le statut et la date de renouvellement de ton abonnement, et le moment où tu as confirmé que Pro devait démarrer immédiatement. Les données de carte vont à Stripe et Link et ne nous parviennent jamais.",
        "Des détails techniques quand quelque chose plante : l’erreur, la page et le navigateur. Ni ton nom, ni ce que tu as saisi.",
      ],
    },
    {
      id: "sharing-a-look",
      heading: "Partager un look",
      paragraphs: [
        "Partager est toujours ton choix. Partager l’image crée une image sur ton téléphone ; nous n’en conservons rien. Créer un lien publie un instantané d’un look : ses images, son nom, la phrase du styliste et les noms de ses pièces (et leurs marques, seulement si tu le choisis). Toute personne ayant le lien peut le voir pendant 30 jours, ou jusqu’à ce que tu arrêtes le partage, depuis le look ou depuis les Réglages. Il n’y a ni nom, ni compte, ni rien d’autre de toi dessus, et il n’est pas indexé par les moteurs de recherche. Supprimer ton compte retire aussitôt tes looks partagés. Une image que tu publies sur Instagram, TikTok ou ailleurs est une copie que nous ne pouvons pas supprimer. Après une restauration d’urgence de nos systèmes, les liens partagés sont désactivés et doivent être partagés à nouveau.",
      ],
    },
    {
      id: "contacting-support",
      heading: "Contacter le support",
      paragraphs: [
        "Si tu contactes support@fitcheck.space, nous utilisons ton adresse de réponse, le sujet choisi et ton message pour t’aider. Le formulaire ne joint ni ta garde-robe, ni ton compte, ni ta localisation. L’adresse fournie sert à répondre et ne prouve pas que le compte t’appartient.",
        "Resend livre les messages à notre boîte de support : Namecheap transfère les e-mails adressés à support@fitcheck.space vers une boîte Gmail hébergée par Google. Cloudflare Turnstile vérifie les signaux du navigateur contre le spam ; nous ne lui envoyons ni ton message ni ton adresse de réponse. L’application n’ajoute pas ton adresse IP à la vérification serveur, mais le widget peut la traiter. Cloudflare est sous-traitant pour la sécurité du site et responsable du traitement pour l’amélioration de la détection des bots.",
        "Nous supprimons les échanges clos et la corbeille de la boîte sous 90 jours après la dernière réponse. La suppression du compte ne supprime pas automatiquement les e-mails de support. Écris à legal@fitcheck.space pour demander leur effacement. Les journaux de livraison des prestataires suivent leurs propres règles de conservation.",
      ],
    },
    {
      id: "why-we-use-it",
      heading: "Pourquoi nous les utilisons",
      paragraphs: [
        "Pour répondre aux demandes de support et protéger le formulaire contre le spam. Selon le RGPD, c’est notre intérêt légitime à aider les personnes et à assurer la sécurité du service.",
        "Pour faire fonctionner le service auquel tu t’es inscrit — taguer tes vêtements, composer des looks, retenir ce que tu as porté. Au sens du RGPD, c’est l’exécution d’un contrat.",
        "Pour que l’app fonctionne et pour trouver les bugs. Au sens du RGPD, c’est notre intérêt légitime, limité aux rapports d’erreur.",
        "Pour te vendre Pro et le garder actif tant que tu paies. Encore un contrat, plus la comptabilité exigée par la loi.",
        "Rien d’autre. Aucun profilage au-delà du stylisme de ta propre garde-robe, aucune publicité, aucun partage avec des courtiers en données.",
      ],
    },
    {
      id: "who-else-sees-it",
      heading: "Qui d’autre y a accès",
      paragraphs: [
        "Nous faisons appel à un petit nombre d’entreprises pour faire tourner Fitcheck. Chacune reçoit uniquement ce dont sa tâche a besoin et est liée par un accord de traitement des données.",
      ],
      bullets: [
        "Supabase (UE, Francfort) — stocke ton compte, tes photos et tout ce qui précède. Tes données restent dans l’UE.",
        "Anthropic (USA) — l’IA qui tague tes vêtements. Elle reçoit la photo détourée d’un vêtement pour le décrire, et de courtes descriptions textuelles des pièces — jamais de photos — pour réfléchir aux tenues. Anthropic n’entraîne pas ses modèles sur les données envoyées via son API.",
        "OpenWeather — reçoit tes coordonnées pour renvoyer une prévision. Rien d’autre.",
        "Google — la connexion avec Google si tu la choisis, et Gmail, qui héberge notre boîte de support et conserve les messages que tu nous envoies.",
        "Resend (USA) — envoie les e-mails de connexion et livre à notre boîte les messages de support, avec ton adresse de réponse, le sujet et le message.",
        "Namecheap (USA) — transfère les e-mails envoyés à support@fitcheck.space, y compris ton adresse de réponse et ton message, vers cette boîte Gmail.",
        "Cloudflare Turnstile — reçoit les signaux de sécurité du navigateur sur la page de support pour vérifier le spam ; nous ne lui envoyons ni ton message ni ton adresse de réponse.",
        "Stripe — gère le paiement de Pro ; avec Link, les seuls à voir les données de carte.",
        "Link (Stripe) — te vend Fitcheck Pro en tant que vendeur officiel (merchant of record) : il encaisse ton paiement, facture la TVA et envoie les reçus, selon ses propres conditions et sa propre politique de confidentialité. Supprimer ton compte Fitcheck résilie ton abonnement ; Link et Stripe conservent les données de paiement exigées par la loi.",
        "Sentry (UE) — reçoit les rapports d’erreur, pour que nous puissions réparer ce qui a planté.",
        "Vercel — héberge l’app et compte les pages vues sans cookies ni identifiant stocké sur ton appareil. Comme tout hébergeur, il voit aussi les requêtes de ton navigateur.",
      ],
    },
    {
      id: "data-leaving-europe",
      heading: "Données hors d’Europe",
      paragraphs: [
        "Anthropic, Resend, Cloudflare, Namecheap, Google et Stripe sont établis aux États-Unis ou y traitent des données. Les transferts vers eux reposent sur le Data Privacy Framework UE–États-Unis lorsque le prestataire est certifié, et sinon sur les clauses contractuelles types de la Commission européenne, que la Suisse reconnaît avec son propre avenant. Lorsqu’ils le proposent, Google et Stripe servent les utilisateurs suisses et européens via leurs entités européennes.",
      ],
    },
    {
      id: "how-long-we-keep-it",
      heading: "Combien de temps nous les gardons",
      paragraphs: [
        "Aussi longtemps que tu as un compte. Supprime ton compte dans les Réglages ; une suppression réussie efface immédiatement tes données actives. Pour effacer seulement la photo originale d’une pièce, ou supprimer définitivement une pièce retirée, utilise les options sur la page de cette pièce. Tu peux aussi écrire à legal@fitcheck.space si tu as besoin d’aide pour une suppression.",
        "Les sauvegardes chiffrées peuvent conserver des données supprimées 30 jours au maximum avant d’expirer. Les rapports d’erreur sont conservés 90 jours. Les données de paiement exigées par la loi sont conservées par Link et Stripe aussi longtemps que le droit fiscal l’exige ; notre copie de ton statut de facturation disparaît avec ton compte.",
      ],
    },
    {
      id: "your-rights",
      heading: "Tes droits",
      paragraphs: [
        `Supprime ton compte dans les Réglages, ou écris à ${OPERATOR.email} si tu as besoin d’aide. Nous répondons aux autres demandes relatives à tes droits sous 30 jours. Tu peux :`,
      ],
      bullets: [
        "Voir tout ce que nous détenons sur toi et en obtenir une copie dans un format lisible par machine.",
        "Corriger ce qui est faux — tu peux corriger la plupart des choses toi-même, dans l’app.",
        "Faire supprimer ton compte et tout ce qu’il contient.",
        "T’opposer à tout traitement fondé sur l’intérêt légitime, ou nous demander de le limiter.",
        "Déposer une plainte auprès d’une autorité de contrôle : le Préposé fédéral à la protection des données et à la transparence en Suisse, ou l’autorité de ton pays de l’UE.",
      ],
    },
    {
      id: "cookies-and-storage-on-your-device",
      heading: "Cookies et stockage sur ton appareil",
      paragraphs: [
        "Fitcheck ne dépose que les cookies nécessaires pour garder ta session ouverte et retenir ta langue. Il n’y a aucun cookie publicitaire ni de pistage, c’est pourquoi tu vois un avis plutôt qu’une demande de consentement.",
        "L’app garde aussi quelques petites préférences dans le stockage de ton navigateur — par exemple, les notes de version que tu as déjà fermées. Elles ne quittent jamais ton appareil.",
      ],
    },
    {
      id: "age",
      heading: "Âge",
      paragraphs: ["Fitcheck s’adresse aux personnes de 16 ans et plus. Si tu es plus jeune, merci de ne pas créer de compte."],
    },
    {
      id: "changes",
      heading: "Modifications",
      paragraphs: [
        "Quand cette page change de manière importante, la date en haut change et l’app te prévient à ta prochaine visite. La version actuelle se trouve toujours sur fitcheck.space/privacy.",
      ],
    },
  ],
};

export const TERMS_FR: LegalDocument = {
  title: "Conditions d’utilisation",
  updated: TERMS_UPDATED,
  intro:
    "Si cette traduction diffère de la version anglaise, la version anglaise prévaut. Voici les conditions d’utilisation de Fitcheck. Elles sont courtes parce que le principe est simple : tu apportes ta garde-robe, nous te suggérons quoi porter, et tu gardes la main sur tes vêtements et tes données.",
  sections: [
    {
      id: "who-you-are-dealing-with",
      heading: "À qui tu as affaire",
      paragraphs: [
        `Fitcheck est exploité par ${OPERATOR.name}, ${OPERATOR.address}. Questions, notifications et réclamations : ${OPERATOR.email}.`,
      ],
    },
    {
      id: "your-account",
      heading: "Ton compte",
      paragraphs: [
        "Tu dois avoir au moins 16 ans pour utiliser Fitcheck. Garde le contrôle de ton e-mail de connexion ; tout ce qui est fait depuis ton compte relève de ta responsabilité. Un compte par personne.",
      ],
    },
    {
      id: "your-clothes-your-photos",
      heading: "Tes vêtements, tes photos",
      paragraphs: [
        "Tout ce que tu importes reste à toi. Tu nous autorises à le stocker, à en retirer l’arrière-plan, à le décrire avec des tags, à l’envoyer à l’IA qui fait la description et à te le montrer dans des tenues — et à rien d’autre. Cette autorisation prend fin quand tu supprimes la pièce ou ton compte.",
        "N’importe que des photos que tu as le droit d’utiliser. Ta propre garde-robe est tout l’intérêt ; les photos des autres, et les autres personnes, non.",
        "Tu es responsable de ce que tu partages. Un look partagé peut être signalé depuis sa page, et Fitcheck peut retirer un look partagé qui enfreint ces conditions.",
      ],
    },
    {
      id: "what-the-suggestions-are",
      heading: "Ce que sont les suggestions",
      paragraphs: [
        "Les looks de Fitcheck sont des suggestions produites par un logiciel à partir des tags de tes vêtements et de la météo. Elles sont généralement bonnes et parfois fausses. Ce n’est pas une promesse qu’une tenue convienne à une occasion, à un code vestimentaire ou à toi. Jette un œil au miroir avant de sortir.",
        "Les tags que l’IA écrit pour un vêtement sont un premier jet. Tu peux corriger chacun d’eux, et l’app s’améliore quand tu le fais.",
      ],
    },
    {
      id: "free-and-paid",
      heading: "Gratuit et payant",
      paragraphs: [
        "L’offre gratuite se veut vraiment utile et reste gratuite. L’offre payante, Fitcheck Pro, ajoute des fonctions et lève des limites ; ce qu’elle comprend et ce qu’elle coûte sont affichés avant l’achat, et le prix inclut la TVA applicable.",
        "Fitcheck Pro est vendu par Link, le service de vendeur officiel (merchant of record) de Stripe : Link vend l’abonnement, encaisse le paiement, facture la TVA et t’envoie reçus et factures. Pro coûte CHF 5 par mois ou CHF 50 par an ; l’app affiche l’équivalent en euros ou en dollars quand ils s’appliquent, et les autres devises sont converties au paiement. Tous les prix incluent la TVA.",
        "Pro se renouvelle automatiquement jusqu’à ta résiliation. Tu peux résilier à tout moment dans l’app (Profil → Gérer l’abonnement) ; Pro continue alors jusqu’à la fin de la période payée et ne se renouvelle pas. Passer du mensuel à l’annuel, ou l’inverse, prend effet immédiatement, et la partie non utilisée de la période en cours est créditée sur la nouvelle. Si un paiement de renouvellement échoue, il est retenté pendant environ deux semaines tandis que Pro continue de fonctionner ; s’il échoue encore, Pro prend fin. Un abonnement par compte.",
        "Supprimer ton compte dans les Réglages résilie ton abonnement immédiatement — avant la suppression de toute donnée — et il ne se renouvelle pas. Les remboursements suivent les règles de Link et la loi ; écris-nous à l’adresse ci-dessus si quelque chose s’est mal passé.",
        "Si tu es un consommateur dans l’UE, tu disposes normalement d’un droit de rétractation de 14 jours sur un achat. Comme Pro fonctionne dès que tu t’abonnes, nous te demandons de confirmer expressément au paiement que tu veux qu’il démarre immédiatement et d’accepter de perdre ce droit une fois qu’il a commencé. Sans cette confirmation, ton droit de 14 jours n’est pas affecté. La confirmation est la case à cocher de l’écran de passage à Pro, et nous enregistrons quand tu l’as donnée.",
        "Nous pouvons modifier le prix de Pro avec un préavis d’au moins 30 jours par e-mail. Si tu ne veux pas du nouveau prix, résilie avant qu’il ne s’applique.",
      ],
    },
    {
      id: "fair-use",
      heading: "Usage loyal",
      paragraphs: [
        "N’essaie pas de pénétrer dans les comptes d’autres personnes, de surcharger le service, de le copier ou de t’en servir pour en créer un concurrent. N’importe rien d’illégal. Nous pouvons suspendre ou fermer un compte qui fait cela, et nous te dirons pourquoi.",
      ],
    },
    {
      id: "ending-things",
      heading: "Mettre fin",
      paragraphs: [
        `Tu peux supprimer ton compte quand tu veux dans les Réglages. Une suppression réussie efface immédiatement tes données actives, tandis que les sauvegardes chiffrées expirent sous 30 jours ; ${OPERATOR.email} reste disponible si tu as besoin d’aide. Nous pouvons mettre fin au service ou à ton accès avec un préavis de 30 jours, et immédiatement si tu enfreins ces conditions.`,
      ],
    },
    {
      id: "what-we-are-and-are-not-responsible-for",
      heading: "Ce dont nous sommes responsables ou non",
      paragraphs: [
        "Nous travaillons à garder Fitcheck disponible, exact et sûr, mais nous le fournissons tel quel. Dans la mesure permise par la loi, nous ne sommes pas responsables des pertes dues au fait de te fier à une suggestion de tenue, à l’indisponibilité du service, ou à quoi que ce soit hors de notre contrôle. Rien ici ne limite la responsabilité pour faute intentionnelle, négligence grave, ou tout ce que la loi ne nous permet pas de limiter.",
        "Si tu es un consommateur, rien dans ces conditions ne te retire les droits que t’accorde la loi de ton pays et auxquels tu ne peux pas renoncer.",
      ],
    },
    {
      id: "law-and-disputes",
      heading: "Droit applicable et litiges",
      paragraphs: [
        "Le droit suisse s’applique, et les litiges relèvent des tribunaux du siège de l’exploitant en Suisse. Si tu es un consommateur dans l’UE, tu conserves la protection du droit de ton pays et tu peux saisir les tribunaux de ton pays.",
      ],
    },
    {
      id: "changes",
      heading: "Modifications",
      paragraphs: [
        "Si nous modifions ces conditions de manière importante, la date en haut change et l’app te prévient à ta prochaine visite. Continuer à utiliser Fitcheck ensuite vaut acceptation de la modification. Si tu es abonné Pro payant et qu’une modification t’est nettement défavorable, nous te demanderons de la confirmer activement avant qu’elle ne s’applique, et tu pourras plutôt résilier sans frais. Si tu n’acceptes pas une modification, supprime ton compte et nous ne t’y tiendrons pas.",
      ],
    },
  ],
};
