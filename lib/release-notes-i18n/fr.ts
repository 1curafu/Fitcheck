import type { LocalizedNote } from "@/lib/release-notes";

/** Keyed by version; one entry for every RELEASE_NOTES version, same line counts. */
export const FR_NOTES: Record<string, LocalizedNote> = {
  "0.6.0": {
    headline: "Tes réponses de style façonnent maintenant tes looks.",
    added: ["Ce que tu veux éviter reste hors de tous tes looks et voyages", "Modifie tes réponses de style à tout moment : Réglages, Profil de style", "Les nouvelles pièces sont recadrées et paraissent plus grandes dans les looks"],
    fixed: ["Changer tes occasions actualise tout de suite les looks du jour"],
  },
  "0.5.1": {
    headline: "Petites corrections et améliorations.",
    added: [],
    fixed: ["Quelques petites corrections pour que tout fonctionne bien"],
  },
  "0.5.0": {
    headline: "Fitcheck parle désormais dix langues.",
    added: ["Utilise Fitcheck en français, anglais, allemand, italien et plus encore", "Choisis ta langue dans un petit menu sur l’accueil ou dans les Réglages", "Tes looks, la météo et le détail des pièces s’affichent dans ta langue", "Les looks passés s’affichent dans ta langue ; l’original est conservé"],
    fixed: ["Le texte d’accueil ne touche plus les boutons de connexion", "Les noms d’occasion longs tiennent sur une ligne"],
  },
  "0.4.1": {
    headline: "Partager un look est plus fluide, et les pièces retirées peuvent partir.",
    added: ["Créer un lien copie désormais le lien pour toi", "Supprime définitivement une pièce retirée depuis sa page"],
    fixed: ["Copier affiche maintenant Copié sur le bouton", "Afficher les marques explique quand tes pièces n’ont pas de marque"],
  },
  "0.4.0": {
    headline: "Partage tes looks, ajoute des pièces par lots et fais revenir des pièces.",
    added: [
      "Partage un look en story, en publication ou en lien",
      "Ajoute plusieurs pièces d’un coup depuis tes photos",
      "Remets une pièce retirée depuis Pièces retirées",
      "Efface la photo originale d’une pièce ; son détourage reste dans tes looks",
    ],
    fixed: ["Seules des photos peuvent désormais être ajoutées à ta garde-robe"],
  },
  "0.3.9": {
    headline: "Les remboursements Pro sont désormais gérés proprement de bout en bout.",
    added: ["Un abonnement Pro remboursé s’arrête tout de suite — sans autre prélèvement"],
    fixed: ["Un remboursement ne laisse plus un abonnement actif"],
  },
  "0.3.8": {
    headline: "Fitcheck Pro est là — toutes les fonctions, au mois ou à l’année.",
    added: ["Passe à Pro au mois ou à l’année, gère-le ou résilie-le à tout moment"],
    fixed: ["Les réglages de ton compte sont encore mieux protégés"],
  },
  "0.3.7": {
    headline: "Du travail discret en coulisses pour garder tes données en sécurité.",
    added: ["Chaque mise à jour vérifie que ses changements de base de données sont arrivés"],
    fixed: ["Un changement de base de données ne peut plus disparaître sans qu’on le voie"],
  },
  "0.3.6": {
    headline: "Retirer une pièce t’explique maintenant exactement ce qui se passe.",
    added: ["Retirer une pièce demande d’abord et explique ce qui est gardé ou non"],
    fixed: ["L’avis sur les cookies ne cache plus le bouton retour"],
  },
  "0.3.5": {
    headline: "La suppression de compte est plus fiable en coulisses.",
    added: ["Si la suppression de ton compte échoue, nous le savons tout de suite"],
    fixed: ["Une suppression ratée nous indique maintenant quelle étape corriger"],
  },
  "0.3.4": {
    headline: "Tes sauvegardes restaurent désormais tout — photos comprises.",
    added: ["La restauration depuis une sauvegarde est désormais testée de bout en bout"],
    fixed: ["Une sauvegarde restaurée rend à nouveau l’accès à tes photos", "Les nouvelles inscriptions marchent juste après une restauration"],
  },
  "0.3.3": {
    headline: "Supprimer ton compte ne laisse désormais plus rien derrière.",
    added: ["La suppression de compte vérifie deux fois qu’aucune photo ne reste"],
    fixed: [
      "Une photo envoyée depuis un autre appareil pendant la suppression part aussi",
      "Une sauvegarde restaurée ne garde plus les photos d’un compte supprimé",
    ],
  },
  "0.3.2": {
    headline: "Ton compte, ta décision — la suppression est dans les Réglages.",
    added: [
      "Supprime ton compte et tes données actives directement dans les Réglages",
      "Fitcheck garde désormais des sauvegardes chiffrées en cas de problème",
    ],
    fixed: ["Une sauvegarde restaurée ne peut plus faire revenir un compte supprimé"],
  },
  "0.3.1": {
    headline: "Des détourages plus nets, et Pivoter là où tu le vois.",
    added: ["Le bouton Pivoter est maintenant sur la photo, tu la vois tourner"],
    fixed: [
      "Les espaces entre manche et corps ne ressortent plus en taches blanches",
      "Reprendre ne ressemble plus à un bouton de rotation",
      "Cette carte s’affiche aussi après une mise à jour de l’app d’accueil",
    ],
  },
  "0.3.0": {
    headline: "Ajouter des vêtements est plus rapide, et ils sont dans le bon sens.",
    added: [
      "Le détourage prend moins d’une seconde — et télécharge 5× moins",
      "Photo de travers ? Nous la redressons pour toi — et il y a un bouton Pivoter",
      "Confidentialité et conditions en langage clair, là où elles comptent",
    ],
    fixed: ["Les vêtements blancs sur fond clair ne perdent plus leurs bords", "Ourlets et poignets gardent leur forme dans le détourage"],
  },
  "0.2.0": {
    headline: "Tes looks sont devenus plus malins.",
    added: [
      "Robes et combinaisons — une pièce unique fait désormais un look complet",
      "Sacs, montres et un second accessoire peuvent rejoindre un look",
      "Les tenues pèsent matière contre matière : lin et laine, soie et cuir",
      "Les chaussures sont jugées avec ce que tu portes, pas seules",
    ],
    fixed: [
      "Une robe n’a plus de baskets quand elle demandait plus habillé",
      "Baskets avec un costume seulement quand ça marche vraiment",
      "Un sac ou une montre qui reprend une couleur est enfin remarqué",
      "Deux mailles épaisses ensemble ne passent plus pour une bonne idée",
    ],
  },
};
