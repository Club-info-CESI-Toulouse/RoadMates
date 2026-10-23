# RoadMates — CLAUDE.md

Web app PWA mobile-first (aussi PC) de covoiturage **régulier** entre camarades de classe (CESI). Partie A = une classe, Partie B = toute l'école (architecture prête dès A).
Spec complète et décisions : `docs/NOTES.md` (source de vérité). Ce fichier = règles de travail + essentiel.

## Langue
- Réponses à Yoan : français, très concises (résultat en 1 à 3 lignes, pas de récap des étapes).
- UI de l'app : français. Code, variables, commits : anglais (Conventional Commits).
- Yoan développe sous **Windows + VSCode** : scripts npm multiplateformes, aucune commande bash-only dans `package.json`.

## Économie de tokens (priorité haute)
- **Ne jamais lire `docs/NOTES.md` en entier.** Lire seulement la section de la phase en cours (`Grep '^## '` puis `Read` avec offset/limit). Numéros de section indiqués par phase plus bas.
- Une phase par session. Entre deux phases : `/clear`. Si la session s'allonge : `/compact`.
- Ne pas relire un fichier déjà lu ; ne pas afficher de gros résultats (limiter les sorties, `head`, filtres).
- Chercher avec Grep/Glob avant d'ouvrir des fichiers. Modifier avec Edit (pas de réécriture complète).
- Pas de nouvelle dépendance sans vrai besoin ; préférer les fonctions natives de Next.js, Supabase et du navigateur.
- Ne pas créer de documentation supplémentaire. Seuls `CLAUDE.md` (avancement) et `docs/NOTES.md` existent.
- Sous-agents seulement si une tâche est vraiment parallélisable. Modèle le moins coûteux suffisant ; plus puissant seulement pour l'algorithme (phase 6) et la revue de sécurité RLS (phase 11).
- Vérifications ciblées : lint, typecheck et tests des fichiers touchés avant chaque push ; `npm run build` complet en fin de phase.
- Si une décision est marquée ❓ dans les notes, appliquer le défaut de la section « Défauts » ci-dessous sans demander, sauf blocage réel.

## Autonomie et git
- Dépôt GitHub + déploiement Vercel (accès déjà donné). Déploiement automatique sur push de `main`.
- **Pendant le développement des phases 1 à 11, push direct sur `main` autorisé sans demander**, à chaque unité cohérente de travail, si lint + typecheck + tests concernés passent. Commits petits et fréquents. Si le build Vercel échoue après un push, corriger tout de suite.
- **Demander d'abord à Yoan** pour : fonctionnalité hors phases 1 à 11 ou listée en « Hors périmètre » (§16), service payant, changement de stack, force push ou réécriture d'historique, suppression de branche/projet/dépôt, migration destructive sur des données réelles, changement de paramètres de production (domaines, équipes, facturation), tout ce qui exposerait des données personnelles.
- Après la fin de la phase 11 : passer en branches + pull requests.

## Stack (décidé)
- Next.js (App Router) + TypeScript strict + Tailwind CSS. Validation des entrées avec Zod.
- Supabase : Postgres, Auth, Realtime, RLS. Client via `@supabase/ssr`. Migrations versionnées dans `supabase/migrations/`.
- Carte : **MapLibre GL JS + OpenFreeMap** (styles : clair `positron` ou `liberty`, sombre `dark`). Adresses : **API Géoplateforme IGN** (`https://data.geopf.fr/geocodage/search`, 50 req/s/IP). Itinéraires : **OpenRouteService** (clé `ORS_API_KEY`, appels serveur uniquement, quotas à vérifier sur sa page de plans).
- Tout le code géo derrière **un seul module** `src/lib/geo/` (changement de fournisseur sans toucher l'app). Cache des itinéraires en base. Durées en circulation fluide, sans trafic.
- Email : service d'envoi dédié gratuit (ex. Resend) car l'envoi natif de Supabase est très limité. Push : Web Push (VAPID) avec repli email.
- PWA : manifest + service worker (librairie maintenue de type Serwist), écran de guidage d'installation pour iOS.
- Tests (Vitest) uniquement sur la logique métier : algorithme, règles de demandes, validation des horaires.
- Thèmes clair / sombre / auto (système), réglage dans Compte. Couleurs jaune et noir du CESI, extraites des logos fournis (`public/brand/`). Style minimaliste, responsive : menu du bas sur mobile, adaptation sur PC.

## Règles métier non négociables
- Inscription **@viacesi.fr** seulement (vérifiée côté serveur : trigger SQL ou Auth Hook, plus contrôle côté client). Email unique = clé du compte, jamais visible des autres. Seul le **pseudo/prénom** est affiché (non unique, modifiable).
- Inscription : email, mot de passe + confirmation, pseudo/prénom, puis **code reçu par email** pour valider.
- Trajet = modèle **récurrent** (jours, horaires, rôle conducteur/passager, places). **Occurrence** = trajet à une date, matin ou soir. Demandes, places, statuts et annulations se gèrent **par occurrence**.
- Demande : sur le trajet d'un autre utilisateur, **un seul jour, matin ou soir**, dans les deux sens. Statuts : exactement **en attente**, **acceptée**, **annulée**. Un refus = annulée. Une place est prise seulement à l'acceptation.
- Limite : **10 demandes en attente envoyées** par utilisateur, par jour et par créneau.
- Annulation auto (avec notification) quand l'occurrence est pleine ou passée. Annulation d'une demande acceptée : possible, covoitureurs prévenus, **interdite à moins de 5 min du départ du conducteur** ; la place se libère.
- Conducteur : **aucune limite de détour** (voit tout, détour affiché en km et min). Passager : **marche max réglable, défaut 9 min**, critère éliminatoire. Le **point de rendez-vous est proposé par l'algorithme** (point de l'itinéraire du conducteur minimisant la marche) et **non modifiable** par le passager.
- Horaires : départ et/ou arrivée saisis ; l'app calcule l'autre. **Souplesse avant/après** réglable par trajet, prise en compte par l'algorithme. Départ+arrivée trop proches pour la durée estimée = **blocage + alerte** (uniquement le cas « trop court »). **Aucune marge de sécurité ajoutée.**
- Avertissement « horaires estimés, hors trafic » : pop-up d'aide, cartes de proposition, envoi/acceptation d'une demande, mentions légales.
- Seul le **point de rendez-vous** est montré, jamais l'adresse d'un covoitureur.
- Tout est gratuit. Pas de paiement.

## Sécurité et données
- **Adresses chiffrées** en base (AES-256-GCM via `node:crypto`, clé `ADDRESS_ENCRYPTION_KEY` en variable d'environnement serveur, préfixe de version pour une rotation future). Déchiffrement **uniquement côté serveur** au moment du calcul (pas de PostGIS en partie A) ; ne renvoyer une adresse en clair qu'à son propriétaire. Les points de rendez-vous restent lisibles.
- Mots de passe : hachés par Supabase Auth (jamais gérés à la main).
- Aucun secret dans le code, Git ou les logs. Variables d'environnement uniquement (local `.env.local` ignoré par git + Vercel). Ne jamais afficher une valeur secrète dans le chat. Clés publiques autorisées : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SERVICE_ROLE_KEY`, `ORS_API_KEY`, `ADDRESS_ENCRYPTION_KEY`, clés Resend et VAPID privée : serveur uniquement.
- **RLS activée sur toutes les tables**, règles de visibilité centralisées en base (par groupe) pour que la Partie B soit un simple élargissement.
- HTTPS partout. Données de localisation = données personnelles : RGPD, suppression de compte effective.

## Setup Supabase guidé (début de la phase 1)
Claude Code ne peut pas cliquer dans le tableau de bord : donner à Yoan les étapes une par une, sans lui demander de coller de secrets dans le chat.
1. Yoan crée le projet Supabase (région UE, mot de passe de base généré et rangé dans son gestionnaire de mots de passe) et donne seulement l'URL et le project ref.
2. Claude Code ajoute la CLI Supabase en devDependency, `supabase init`, puis Yoan lance `supabase login` et `supabase link --project-ref <ref>` dans son terminal.
3. Auth (tableau de bord) : email activé, confirmation par **code à 6 chiffres** (template d'email avec le code), SMTP personnalisé (Resend), limites anti-abus raisonnables.
4. Les clés sont mises dans `.env.local` (par Yoan) et dans les variables Vercel (par Claude Code via son accès Vercel, sans les afficher).
5. Un seul projet Supabase (dev = prod) tant qu'il n'y a pas de vrais utilisateurs. Après la phase 11, toute migration destructive demande l'accord de Yoan et une sauvegarde.

## Défauts laissés à Claude (choix raisonnables, modifiables par Yoan)
- Bornes des curseurs : marche max 3 à 30 min (défaut 9) ; souplesse avant/après 0 à 60 min (défaut 10 avant, 5 après).
- Messagerie : un fil par paire d'utilisateurs, texte seul, pastille de non-lus, temps réel.
- Mot de passe oublié : réinitialisation par code email. Code de vérification : 6 chiffres, expire en 10 min, 5 essais maximum.
- Pas de photo de profil ni de filtres sur l'accueil en v1. Signalement/blocage et modération : Partie B.
- Préférences de notification : push activé/désactivé et email activé/désactivé.
- Stats Compte : km parcourus en covoiturage, nombre de covoiturages, nombre de covoitureurs rencontrés.

## Phases (la spec détaillée est dans `docs/NOTES.md`, sections entre parenthèses)
Chaque phase est livrable et testable seule. Cocher en fin de phase (section Avancement).
1. **Fondations** (§2, 3, 4) : projet Next.js, Vercel, Supabase (setup guidé), conventions, thèmes + couleurs CESI, modèle de données (établissement, groupe, trajet récurrent / occurrence).
2. **Authentification et profil** (§9, 14) : inscription @viacesi.fr, code email, connexion, mot de passe oublié, profil, rattachement au groupe, chiffrement des adresses.
3. **Navigation et PWA** (§5, 3) : menu 4 pages (Accueil, Messagerie, Mes trajets, Compte) en coquilles, adaptation PC, PWA installable, guide d'installation iOS.
4. **Adresses et carte** (§11, 5.4) : adresses domicile/travail/école (CESI par défaut), module `geo`, carte, autocomplétion, pose de point.
5. **Mes trajets** (§6, 8.1) : CRUD trajets récurrents, rôle, places, jours, horaires, dates facultatives, marche max, souplesse avant/après, validation « trop court ».
6. **Algorithme et Accueil** (§8, 5.1, 11) : pré-filtre, itinéraires + cache, score, point de rendez-vous proposé, horaires proposés, détour/marche affichés, page Accueil (bandeau des jours, matin/soir, cartes), pop-up d'aide, avertissement horaires. Capture de référence : `docs/reference/` (à ouvrir seulement pour cette phase).
7. **Demandes** (§7) : envoi, acceptation, annulation, refus = annulée, règle des 5 min, limite 10, annulation auto avec notification, gestion des places.
8. **Messagerie** (§5.2) : conversations temps réel, liste, non-lus.
9. **Notifications** (§10) : push PWA + repli email, préférences.
10. **Compte et statistiques** (§5.4) : stats, paramètres, thème, suppression de compte.
11. **Finition et lancement** (§14) : tests avec la vraie classe, accessibilité, performances, revue de sécurité RLS, mentions légales et RGPD. Fin = passage aux PR.

Après la phase 11 : préparation Partie B (plusieurs classes, toute l'école, modération).

## Avancement (mettre à jour en fin de phase, une ligne)
- [x] 1 · [x] 2 · [x] 3 · [x] 4 · [ ] 5 · [ ] 6 · [ ] 7 · [ ] 8 · [ ] 9 · [ ] 10 · [ ] 11
- Notes de reprise (3 lignes max) :
  - Supabase ref `rsvxhhpkbpiupmgfavud`, prod https://roadmates.vercel.app. Auth : trigger @viacesi.fr + profil auto (classe unique), codes 6 chiffres (5 essais, table `verification_attempts`), chiffrement `src/lib/crypto/address.ts`.
  - Phases 3-4 : SW natif `public/sw.js` (push à ajouter phase 9), module `src/lib/geo` (IGN ; ORS à ajouter phase 6, clé `ORS_API_KEY` absente). École par défaut : campus CESI Labège (`establishments`).
  - À faire par Yoan : test inscription réel avec son adresse @viacesi.fr.
