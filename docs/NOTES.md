# NOTES — Application de covoiturage entre camarades de classe

> Document de brainstorm. Aucune ligne de code à ce stade.
> Objectif : servir de base au futur `CLAUDE.md` pour Claude Code.
> Légende : ✅ décidé · ❓ à décider

---

## 1. Vision

Web app **mobile-first** (aussi utilisable sur PC), installable comme une app (PWA), qui permet à des camarades de classe de s'organiser des **covoiturages réguliers** entre domicile, école et entreprise (alternance).

- ✅ Trajets **réguliers** (pas de trajets ponctuels / événements)
- ✅ Tout est **gratuit** pour l'instant (pas de paiement dans l'app)
- ✅ Interface **minimaliste**, aux couleurs du CESI
- ✅ Logo du CESI présent dans l'app (logos fournis par Yoan)
- ✅ Nom de l'app : **RoadMates**

## 2. Périmètre : Partie A puis Partie B

- **Partie A** : une seule classe. C'est la version à développer en premier.
- **Partie B** : toute l'école (et potentiellement d'autres établissements).
- ✅ **Contrainte d'architecture** : la Partie A doit être pensée pour que le passage à B soit simple.
  - Dès le départ, prévoir une notion d'**établissement** (école) et de **groupe/classe** dans la base de données, même si un seul existe au début.
  - Chaque trajet, chaque utilisateur et chaque recherche est rattaché à un groupe. En A, il n'y a qu'un groupe, en B on élargit le périmètre de visibilité.
  - Les règles de visibilité (qui voit quels trajets) doivent être centralisées à un seul endroit (règles de sécurité Supabase), pas dispersées dans le code.
  - L'école par défaut est le **CESI** mais doit rester configurable (autre école possible en B).

## 3. Stack technique

- ✅ Hébergement : **Vercel** (front) + **Supabase** (base de données, authentification, temps réel, stockage)
- ✅ Versionnement : **Git** (GitHub)
- ✅ **PWA** installable (Android/PC) + équivalent iOS (ajout à l'écran d'accueil via Safari)
- ✅ Framework (choix laissé à Claude, validé) : **Next.js (App Router) + TypeScript + Tailwind CSS**, cohérent avec Vercel et Supabase, bon support PWA et notifications push
- ✅ PostGIS non nécessaire en Partie A (le pré-filtre se fait côté serveur après déchiffrement des adresses). À réétudier pour la Partie B.
- Notes iOS : les notifications push d'une PWA sur iPhone ne fonctionnent que si l'app est ajoutée à l'écran d'accueil (iOS récent). Prévoir un écran qui guide l'utilisateur pour l'installer.

## 4. Thèmes et design

- ✅ Trois modes : **clair**, **sombre**, **automatique (suit le système)**
- ✅ Choix du thème modifiable dans la page Compte
- ✅ Couleurs inspirées du CESI : **jaune et noir** (récupérer les valeurs exactes sur les logos fournis)
- ✅ Style minimaliste : peu de couleurs, beaucoup d'espace, cartes simples
- ✅ Responsive : navigation en bas sur mobile ; sur PC, adapter la mise en page (par exemple menu latéral ou contenu centré avec largeur maximale)
- ✅ Inspiration d'interface : l'app de covoiturage fournie en capture (bandeau des jours en haut, cartes de trajets avec photo, nom, rôle, horaires, nombre de trajets en commun, bouton d'aide en haut à droite)
- ✅ Accord du CESI obtenu pour l'usage du nom et du logo

## 5. Navigation : 4 pages (menu en bas)

1. **Accueil / Trajets** : liste des jours, avec les propositions de covoiturage par jour
2. **Messagerie** : conversations internes
3. **Mes trajets** : paramétrage des trajets de chaque jour et horaires
4. **Compte** : profil, adresses, statistiques, thème, paramètres

### 5.1 Page Accueil
- Bandeau des jours (jour courant mis en avant, scroll horizontal sur les prochains jours)
- Pour chaque jour, deux blocs : **Matin (domicile → travail/école)** et **Soir (travail/école → domicile)**
- Pour chaque bloc : liste de propositions triées par compatibilité (pseudo/prénom, rôle, horaires, point de rendez-vous proposé, indicateur de compatibilité)
- Pour un conducteur, chaque proposition affiche le **détour** que cela représente (en km et en minutes). Aucune proposition n'est masquée à cause du détour : le conducteur voit tout et choisit.
- Pour un passager, chaque proposition affiche le **temps de marche** jusqu'au point de rendez-vous proposé
- ✅ Bouton **aide** en haut à droite : ouvre une pop-up de tutoriel de l'app, qui rappelle aussi que les horaires sont des estimations (voir 8.1)
- ❓ Filtres (rôle, plage horaire) : utile ou superflu pour la v1 ?

### 5.2 Page Messagerie
- ✅ Messagerie **interne** à l'app
- ❓ Conversations : un fil par paire d'utilisateurs, ou un fil par demande/trajet ?
- ❓ Fonctions v1 : texte seul, indicateur de lecture, notifications de nouveau message

### 5.3 Page Mes trajets
- Configuration des trajets pour chaque jour de la semaine et chaque horaire
- Détail dans la section 6

### 5.4 Page Compte
- ✅ Gestion du compte
- ✅ Statistiques : **nombre de km parcourus**, **nombre de covoiturages**, **nombre de covoitureurs rencontrés**
- ✅ Saisie des adresses : **domicile, travail, école** (école = CESI par défaut)
- Choix du thème, préférences de notification, suppression du compte

## 6. Trajets

### 6.1 Publication
Chaque utilisateur publie ses trajets avec :
- Point de **départ** et **arrivée** (domicile, travail ou école)
- **Horaires** : heure de **départ** et/ou heure d'**arrivée** pour chaque trajet. L'utilisateur donne celle qui compte pour lui, l'app calcule l'autre à partir de la durée estimée du trajet (voir section 8.1).
- ✅ **Souplesse horaire** : **paramétrable par chaque utilisateur**, pour chaque trajet, avec une valeur **avant** et une valeur **après** l'horaire, indépendantes (exemple : 15 min avant et 2 min après). Elle est **prise en compte par l'algorithme** dans le calcul de compatibilité.
- ❓ Bornes minimum/maximum des réglages et valeurs par défaut : à fixer au développement avec des valeurs raisonnables
- **Jours** de la semaine concernés
- **Dates facultatives** (par exemple une période de validité, ou une date précise)
- **Rôle par trajet** : conducteur (avec nombre de places) ou passager. Un même utilisateur peut donc être conducteur sur un trajet et passager sur un autre.

### 6.2 Préférences de compatibilité
- ✅ **Conducteur** : **aucune limite de détour**. On lui propose tous les passagers possibles et il choisit lui-même, en voyant le détour de chaque option.
- ✅ **Passager** : temps de **marche maximum** accepté, en minutes
- ✅ Seul le **point de rendez-vous** est affiché, **jamais l'adresse** du covoitureur
- ✅ Le **point de rendez-vous est proposé par l'algorithme**, qui cherche le point sur l'itinéraire du conducteur le plus proche du passager pour **limiter sa marche**. Le passager ne doit jamais marcher plus que son maximum.
- ✅ Le passager **ne peut pas déplacer** le point proposé : il accepte ou non la proposition telle quelle
- ✅ Marche maximum par défaut : **9 minutes**, réglable par le passager
- ✅ La marche maximum est **réglable par le passager** (curseur ou champ). ❓ Bornes minimum/maximum à fixer au développement.

## 7. Demandes et places

- ✅ Un passager peut envoyer une demande à un conducteur si le trajet a encore de la place
- ✅ Un conducteur peut aussi proposer à un passager (**fonctionnement inverse**)
- ✅ Une place est considérée **prise uniquement quand la demande est acceptée**
- ✅ Tant qu'aucune demande n'est acceptée, les demandes restent **en attente**
- ✅ **Plusieurs demandes en attente** possibles, avec une limite de **10 demandes en attente envoyées par un utilisateur pour un même jour et un même créneau (matin ou soir)**
- ✅ **Statuts d'une demande** : exactement trois : **en attente de réponse**, **acceptée**, **annulée**
- ✅ **Portée d'une demande** : une demande porte sur **le trajet d'un autre utilisateur, pour un seul jour, le matin ou le soir**. Une demande acceptée vaut **uniquement pour ce jour-là**.
  - Conséquence pour la base de données : distinguer le **trajet récurrent** (le modèle, avec ses jours et horaires) et son **occurrence** (le trajet à une date précise, matin ou soir). Les demandes, les places prises, les statuts et les annulations se gèrent **par occurrence**.
  - « Trajet passé » signifie occurrence passée.
- ✅ Les demandes en attente sont **annulées automatiquement** quand le trajet (l'occurrence) est **plein** ou **passé**, et les utilisateurs concernés en sont **prévenus**
- ✅ Un **refus** du destinataire est traité comme une **annulation** (statut « annulée »)
- ✅ **Annulation après acceptation** : possible, les covoitureurs concernés sont **prévenus**. Elle est **impossible à moins de 5 minutes du départ du conducteur**. Quand un passager annule, la place redevient disponible.
- ✅ La limite de 10 vaut pour les demandes **envoyées**, dans les deux sens (passager vers conducteur, conducteur vers passager), par jour et par créneau

## 8. Algorithme de compatibilité

- ✅ Pour chaque trajet, l'app propose les trajets les **plus compatibles** : conducteurs pour un passager, passagers pour un conducteur
- Critères prévus :
  - Compatibilité de **jours** et d'**horaires** (chevauchement des plages, avec la souplesse avant/après propre à chaque utilisateur)
  - **Marche** pour le passager ≤ son maximum en minutes (critère éliminatoire)
  - **Détour** du conducteur : **pas éliminatoire**, mais plus il est faible, mieux le trajet est classé
- Point de rendez-vous : pour chaque couple conducteur/passager, l'algorithme calcule le point de l'itinéraire du conducteur qui minimise la marche du passager, puis le propose
- Une proposition n'apparaît que si ce point respecte la marche maximum du passager
  - Places disponibles
- ❓ Score final : pondération entre horaires, détour et marche
- Approche recommandée pour limiter les appels aux services de cartes (gratuits donc limités) :
  1. **Pré-filtre en base** : éliminer les trajets trop éloignés par distance à vol d'oiseau (très rapide, gratuit)
  2. **Calcul précis d'itinéraire** uniquement pour les quelques finalistes
  3. **Mise en cache** des résultats d'itinéraire déjà calculés
  4. Recalcul seulement quand un trajet est modifié

### 8.1 Horaires proposés et avertissement

- ✅ L'app **propose des horaires** : heure de passage au point de rendez-vous, heure d'arrivée estimée. Elle les calcule à partir de l'horaire de départ et/ou d'arrivée saisi par chaque utilisateur et de la durée estimée de l'itinéraire.
- ✅ Les durées calculées **ne tiennent pas compte des bouchons ni du trafic en temps réel** (le service d'itinéraires choisi donne des durées « circulation fluide »). Les horaires peuvent donc être faux.
- ✅ L'utilisateur doit en être **clairement informé** dans l'app :
  - Dans la pop-up de tutoriel (bouton d'aide)
  - Sur les cartes de proposition, par une mention courte du type « horaires estimés, hors trafic »
  - Au moment d'envoyer ou d'accepter une demande
  - Dans les mentions légales / conditions d'utilisation
- ✅ L'app n'est qu'une **aide à l'organisation** : conducteur et passager restent responsables de confirmer l'horaire entre eux via la messagerie.
- ✅ **Horaires incohérents** : si l'utilisateur saisit à la fois un départ et une arrivée qui ne correspondent pas à la durée calculée (par exemple une arrivée trop proche du départ pour la distance), l'app **bloque l'enregistrement du trajet et affiche une alerte** expliquant le problème, avec la durée estimée
- ✅ **Pas de marge de sécurité automatique** : les horaires proposés sont les horaires calculés, sans minutes ajoutées
- ✅ On bloque **uniquement le cas « trop court »** (arrivée trop proche du départ pour la durée estimée). Un grand écart entre départ et arrivée est accepté.

## 9. Compte et inscription

- ✅ Inscription avec une adresse mail **@viacesi.fr** obligatoire
- ✅ Cette adresse sert **uniquement à recevoir des notifications** et à vérifier le compte. Elle n'est **jamais visible** par les autres utilisateurs.
- ✅ Champs à l'inscription : **adresse @viacesi.fr**, **mot de passe** + **champ de confirmation du mot de passe**, **pseudo ou prénom**
- ✅ Le **pseudo/prénom** est le seul nom affiché aux autres utilisateurs
- ✅ Parcours : après avoir rempli ces champs, l'app envoie un **code de vérification** à l'adresse mail, que l'utilisateur saisit pour valider son compte
- ✅ Connexion avec l'adresse mail et le mot de passe
- ✅ Le pseudo/prénom n'est **pas unique** : la clé d'identification est l'**adresse mail, qui doit être unique**
- ✅ Le pseudo/prénom peut être **modifié** à tout moment depuis la page Compte
- ❓ Photo de profil facultative ?
- ❓ Mot de passe oublié : réinitialisation par le même code mail
- Remarque technique : l'envoi d'emails natif de Supabase est très limité en volume. Prévoir un service d'envoi dédié avec offre gratuite (par exemple Resend), à vérifier au moment de la mise en place.
- ❓ Sécurité : limitation du nombre d'essais de code, expiration du code

## 10. Notifications

- ✅ Par email (adresse @viacesi.fr)
- ✅ **Notifications push (PWA)** en v1 **si c'est techniquement faisable**, avec un **repli par email** sinon (par exemple iPhone sans installation de l'app, ou autorisation refusée)
- Événements notifiés : nouvelle demande, demande acceptée, demande annulée, nouveau message
- ❓ Préférences de notification réglables dans Compte

## 11. Cartographie, géocodage et calcul d'itinéraires

Besoins :
- Afficher une carte et permettre de **poser un point** (point de rendez-vous)
- **Géocoder** des adresses (texte → coordonnées) avec autocomplétion
- Calculer le **temps de marche** et la **distance/durée en voiture** (détour)
- Tout cela **gratuitement**, de préférence avec des services existants

Solutions étudiées :

| Option | Carte | Adresses | Itinéraires | Coût |
|---|---|---|---|---|
| **A. Tout libre** (recommandée) | MapLibre + OpenFreeMap | API Géoplateforme (IGN) | OpenRouteService | Gratuit, clé gratuite pour le routage |
| **B. Mapbox** | Mapbox GL | Mapbox | Mapbox Directions / Matrix | Gratuit jusqu'à un quota, carte bancaire exigée |
| **C. Google Maps** | Google | Google | Google | Quotas gratuits par service, facturation à activer |
| **D. Auto-hébergé** | MapLibre + tuiles | Photon/Nominatim | OSRM ou Valhalla | Gratuit en licence mais nécessite un serveur |

Chiffres vérifiés en octobre 2026 (à revérifier avant le développement, les offres changent) :
- **OpenFreeMap** : tuiles vectorielles gratuites, sans clé ni inscription, sans limite annoncée. Service fourni « tel quel » sans garantie de disponibilité.
- **Géoplateforme IGN (géocodage)** : gratuit, spécialisé France (Base Adresse Nationale), limité à 50 requêtes par seconde et par IP.
- **OpenRouteService** : plan gratuit avec clé, plus de 8 000 requêtes par jour au total selon la page officielle des plans. Vérifier le quota exact de l'endpoint « matrice ».
- **Mapbox** : environ 50 000 chargements de carte et 100 000 requêtes d'itinéraire par mois gratuits, mais carte bancaire requise.
- **OSRM serveur de démo public** : limité à environ 1 requête par seconde, usage non commercial, aucune garantie. À utiliser seulement pour des essais, pas en production.
- **Google Maps** : depuis mars 2025, plus de crédit mensuel global de 200 $, remplacé par des quotas gratuits par service. L'API Directions est classée « Legacy ».

✅ **Décision : option A** (MapLibre + OpenFreeMap + Géoplateforme IGN + OpenRouteService). Prévoir une **couche d'abstraction** dans le code (un module unique « géo ») pour pouvoir changer de fournisseur sans réécrire l'app.

Fonctionnalités carte à prévoir :
- Carte plein écran avec thème clair et sombre
- Pose et déplacement d'un point par l'utilisateur
- Recherche d'adresse avec autocomplétion
- Affichage de l'itinéraire du conducteur et du point de rendez-vous
- Affichage du trajet à pied du passager jusqu'au point
- Respect de la vie privée : jamais l'adresse exacte du covoitureur affichée

## 12. Nom de l'app

✅ **RoadMates** (choisi). Reste à vérifier la disponibilité du nom de domaine et du nom sur les stores. Pistes écartées, pour mémoire :

- **Copilote** : évident, mais risque de confusion avec d'autres produits du même nom
- **Place Libre** : parle directement de la place dans la voiture
- **Banquette** : décalé, mémorable, évoque la place passager
- **Covoitine** : jeu de mots léger, sympathique
- **RoadMates** : anglais, évoque les camarades de route
- **CoRoute** : court, clair, facile à retenir
- **Trajet'Mates** : mélange trajet et camarades
- **Même Route** : simple, sens immédiat
- **On Roule** : familier, adapté à un public étudiant
- **Pool Class** : référence à la classe et au « carpool »

## 13. Plan de développement de la Partie A

Chaque phase doit être **livrable et testable seule**. Ne passer à la suivante qu'une fois la précédente validée.

**Phase 1 — Fondations**
- Dépôt Git, projet, déploiement automatique sur Vercel, projet Supabase
- Structure du projet, conventions, variables d'environnement
- Système de thèmes (clair, sombre, auto) et couleurs CESI
- Modèle de données de base avec établissement et groupe (préparation Partie B), et distinction entre trajet récurrent et occurrence datée

**Phase 2 — Authentification et profil**
- Inscription : mail @viacesi.fr, mot de passe + confirmation, pseudo/prénom, code de vérification par mail
- Chiffrement des adresses et hachage des mots de passe dès cette phase
- Connexion, déconnexion, mot de passe oublié
- Profil minimal et rattachement au groupe

**Phase 3 — Navigation et PWA**
- Menu du bas à 4 pages (coquilles vides) et adaptation PC
- PWA installable, icônes, écran de guidage d'installation iOS

**Phase 4 — Adresses et carte**
- Saisie des adresses domicile, travail, école (CESI par défaut)
- Module cartographique : carte, autocomplétion, pose de point

**Phase 5 — Mes trajets**
- Création, modification, suppression de trajets
- Rôle par trajet, places, jours, horaires, dates facultatives
- Préférence passager : marche max (minutes). Aucune limite de détour côté conducteur.
- Souplesse horaire réglable par trajet (valeurs avant et après l'horaire)
- Validation des horaires : blocage et alerte si départ et arrivée sont incohérents avec la durée calculée

**Phase 6 — Algorithme et page Accueil**
- Pré-filtre, calcul d'itinéraires, cache, score
- Proposition automatique du point de rendez-vous (marche minimale pour le passager)
- Affichage du détour pour le conducteur
- Calcul des horaires proposés et affichage de l'avertissement « horaires estimés, hors trafic »
- Page Accueil avec bandeau des jours, blocs matin et soir, cartes de propositions
- Pop-up d'aide et tutoriel

**Phase 7 — Demandes**
- Envoi d'une demande pour un jour précis (matin ou soir) sur le trajet d'un autre utilisateur, acceptation, annulation (impossible à moins de 5 min du départ du conducteur), refus traité comme une annulation
- Annulation automatique avec notification quand l'occurrence est pleine ou passée, limite de demandes en attente
- Gestion des places et statuts

**Phase 8 — Messagerie interne**
- Conversations en temps réel (Supabase Realtime)
- Liste des conversations et pastille de messages non lus

**Phase 9 — Notifications**
- Notifications push (PWA) avec repli par email, préférences de notification

**Phase 10 — Compte et statistiques**
- Statistiques (km parcourus, nombre de covoiturages, nombre de covoitureurs rencontrés), paramètres, suppression de compte

**Phase 11 — Finition et lancement**
- Tests avec la vraie classe, correctifs, accessibilité, performances
- Sécurité (règles d'accès Supabase revues), mentions légales et RGPD

**Préparation Partie B (après A)**
- Ouverture à plusieurs classes et à toute l'école
- Gestion des groupes, modération, signalement

## 14. Confidentialité et sécurité (à garder en tête)

- ✅ Les **adresses** (domicile, travail, école si saisie personnalisée) sont **chiffrées** dans la base de données
- ✅ Les **mots de passe** ne sont jamais stockés en clair : ils sont **hachés** par le système d'authentification de Supabase. Le hachage est à sens unique, donc plus sûr qu'un chiffrement réversible : même l'administrateur ne peut pas relire un mot de passe.
- ✅ Aucune clé, aucun secret et aucune donnée sensible dans le code source ni dans Git : tout passe par des **variables d'environnement**. Aucune donnée sensible dans les logs. Connexions toujours en **HTTPS**.
- ✅ **Tension technique résolue** : une adresse chiffrée ne peut pas servir directement au pré-filtre par distance en base. Deux approches étudiées, la 1 est retenue :
  1. Déchiffrer côté serveur au moment du calcul (simple, un peu plus lent, suffisant pour une classe en Partie A)
  2. Stocker en plus une position approximative arrondie, non chiffrée, uniquement pour le pré-filtre (à étudier pour la Partie B)
  - ✅ Décision : approche 1 (déchiffrement côté serveur) en Partie A. Les points de rendez-vous, eux, restent lisibles puisqu'ils sont affichés aux autres.
- Les adresses précises (domicile) ne sont jamais exposées aux autres utilisateurs
- L'email scolaire n'est jamais exposé
- Règles d'accès à la base (Row Level Security) obligatoires sur toutes les tables
- Données de localisation = données personnelles : prévoir mentions RGPD, suppression de compte effective, durée de conservation
- ❓ Signalement et blocage d'un utilisateur
- ❓ Modération (Partie B surtout)

## 15. Questions ouvertes à trancher

1. Bornes min/max des réglages (marche maximum, souplesse avant/après) et valeurs par défaut de la souplesse : à fixer par Claude Code avec des valeurs raisonnables
2. Disponibilité du nom de domaine et du nom RoadMates sur les stores

## 16. Hors périmètre pour l'instant

- Paiement dans l'app et partage de frais calculé
- Trajets ponctuels et événements
- Application native iOS/Android (la PWA suffit)
- Suivi GPS en temps réel pendant le trajet
- Prise en compte du trafic en temps réel (bouchons)
- Notation des utilisateurs

## 17. Évolutions issues des captures de référence

Source : `docs/references/ref-01` à `ref-10` (non versionnées : vraies adresses et noms). On reprend les fonctionnalités, pas le design, le nom, les textes ni les icônes. Les règles des sections précédentes restent valables sauf précision ici.

### A. Adresses nommées (phase 4 ; ref-01, 02, 03)
- Liste d'adresses personnelles (max 10) au lieu de domicile/travail/école.
- Chaque adresse : nom libre (« Maison », « Entreprise »…), icône au choix (au minimum maison, mallette, étoile), adresse par autocomplétion Géoplateforme, petite carte avec repère. Création, modification, suppression dans Compte > Mes adresses.
- Adresse « CESI » (étoile) créée par défaut avec le campus de l'utilisateur, à confirmer, modifiable.
- Chiffrement inchangé : texte et coordonnées chiffrés côté serveur ; nom et icône en clair. Seul le propriétaire voit ses adresses.
- Suppression d'une adresse utilisée par un trajet : avertir, proposer de réaffecter ou supprimer les trajets liés.

### B. Un trajet, plusieurs jours (phase 5 ; ref-04, 05, 06)
- **Commute** (trajet habituel) : départ ⟷ arrivée parmi les adresses nommées, rôle (conducteur + places, ou passager), marche max (passager), itinéraire (conducteur). Plusieurs commutes possibles, chacun avec son rôle.
- **Slot** : (commute, jour, sens Aller/Retour) avec ancre horaire (départ OU arrivée), souplesse avant/après, dates facultatives. Aller = matin, Retour = soir (sens inverse). Slots indépendants par jour ; occurrences datées générées comme avant.
- Écran résumé du commute : trajet, horaires de la semaine, itinéraires aller/retour.
- Édition d'un horaire = feuille modale : sélecteur d'heure, curseur à deux poignées pour la souplesse (0 à 60 min de chaque côté), puces L M M J V S D « appliquer aussi à ces jours » + raccourci « Lun–Ven ». Valider crée les jours manquants et écrase les autres après confirmation. Chaque jour reste modifiable seul. La création utilise la même feuille (une semaine en un écran).
- Validation « trop court » (§8.1) par slot.

### C. Itinéraire choisi par le conducteur (phase 5 ; ref-07)
- Par sens : « Tous les itinéraires » (défaut), « Itinéraire 1 », « 2 »… ; libellé « Via <route principale> » si extractible. Carte des alternatives, sélection en surbrillance.
- OpenRouteService : vérifier support, limites et coût en quota des alternatives. Calcul une fois à l'enregistrement, géométries stockées, recalcul seulement si le trajet change. Repli sur un seul itinéraire. Tout dans `src/lib/geo/`.
- Algorithme : « Tous » = prise en charge sur n'importe quelle alternative ; un itinéraire choisi = seul utilisé (pré-filtre, rendez-vous, détour). Choix par défaut pour tout le commute.

### D. Détail d'une proposition et demande (phases 6 et 7 ; ref-08, 09, 10)
- Page de détail depuis une carte de proposition : carte, bouton « Demander » (§7 inchangé), récap (rôle, pseudo de l'autre, nombre de trajets en commun, places occupées/total de l'occurrence), accès à la messagerie.
- « Détails des rendez-vous » : rendez-vous (prise en charge), dépose, frise Départ → Rendez-vous → Arrivée avec heures calculées et « horaires estimés, hors trafic ». Carte plein écran « Détails du trajet » avec étapes.
- Carte : pointillés = conducteur seul, trait plein d'une autre couleur = tronçon partagé ; marqueurs Départ, Rendez-vous, Dépose, Arrivée.
- Point de dépose proposé par l'algorithme, symétrique du rendez-vous (même marche max), non modifiable.
- **Confidentialité (prime sur les captures)** : le propriétaire voit son itinéraire complet ; l'autre ne voit que rendez-vous, dépose et tronçon partagé, jamais départ, arrivée ni reste de l'itinéraire.
- Pas d'édition du rendez-vous, de la dépose ni de l'heure.

### Non repris
Gains/argent, appel téléphonique, notes de satisfaction, « Masquer », mode vacances, niveaux/badges, onglets Expériences/Challenges/Favoris, invitation d'amis, photo de profil.
