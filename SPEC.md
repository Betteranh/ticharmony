# SPEC — TIC Harmony

## Objectifs fonctionnels (MVP)

- Gestion de tickets : création, statuts, priorités, commentaires, pièces jointes, clôture, réouverture.
- Notifications : email + in-app (WhatsApp plus tard).
- Documentation / base de connaissances (thèmes + articles, visibilité configurable, gestion par l'admin).
- Gestion d'assets (inventaire IT par entreprise cliente : PC + matériel réseau).
- Dashboard par rôle (admin/agent/customer).
- Gestion multi-client cloisonnée dans une même plateforme.
- Support interne (équipe) et support externe (clients) dans la même application.
- Interface en français et anglais.

## Règles métier

- **Rôles** : `SUPER_ADMIN` (plateforme), `ADMIN` (gère un tenant), `AGENT` (traite les tickets), `CUSTOMER` (soumet des tickets, reçoit du support). Un utilisateur peut cumuler plusieurs rôles (`User.roles`, tableau) — en pratique un employé TIC Harmony peut être Technicien (`AGENT`) et/ou Admin (`ADMIN`) à la fois. `SUPER_ADMIN` n'est jamais combiné ni attribuable via l'UI/API (bootstrap plateforme, seed/manuel uniquement).
- **Tenants** : `INTERNAL` (équipe TIC Harmony) vs `CLIENT` (entreprise cliente). Isolation stricte par tenant via RLS PostgreSQL — un tenant ne voit jamais les données d'un autre.
- **Inscription individus** (`/signup`) :
  - Public, self-serve, réservé aux particuliers (pas de champ organisation/slug).
  - Crée un tenant mono-utilisateur, slug auto-généré depuis l'email (suffixe numérique si collision).
  - Rôle attribué : `CUSTOMER`.
  - Accès au support conditionné à un abonnement payant (pas de palier gratuit) — paiement réel pas encore intégré (voir DECISIONS.md).
- **Inscription organisations** :
  - Pas de self-serve. Provisionnées par un `SUPER_ADMIN` via `POST /api/tenants` (crée le tenant + premier `ADMIN`).
  - Contact commercial affiché sur la page signup pour les entreprises (placeholder à remplacer par les vraies coordonnées).
- **Création des employés** (page Outils → "Utilisateurs", `/users`) : au-delà du premier compte créé à l'onboarding, chaque admin ajoute lui-même les comptes de son propre tenant (`POST /api/users`, déjà scopé au tenant du demandeur). Une entreprise cliente n'ajoute que des `CUSTOMER` (pas de sélecteur de rôle, un seul admin par entreprise pour l'instant) ; TIC Harmony (tenant `INTERNAL`) ajoute des employés avec un choix combinable Technicien(`AGENT`)/Admin(`ADMIN`). Les rôles autorisés sont validés côté serveur selon le type de tenant. Pas d'invitation par email : l'admin fixe le mot de passe initial. Pas d'édition de rôle ni de désactivation de compte existant pour l'instant (créer uniquement).
- **Tickets** : statuts `OPEN → IN_PROGRESS → PENDING_CUSTOMER → RESOLVED → CLOSED`, avec possibilité de `REOPENED`. Priorités configurables. Commentaires liés à un ticket (notes internes réservées au staff, jamais visibles/notifiées au client). Modification du statut/priorité/assigné (`PATCH /tickets/:id`) réservée au staff (`ADMIN`/`AGENT`/`SUPER_ADMIN`) ; un `CUSTOMER` peut créer, consulter et commenter ses propres tickets uniquement. Pièces jointes possibles sur un commentaire (bouton trombone), stockées sur disque local côté API (pas de fournisseur cloud configuré), 10 Mo max, téléchargement uniquement via endpoint authentifié. Assignation : `AGENT` peut seulement s'assigner un ticket à lui-même (ou s'en retirer) ; réassigner à un *autre* technicien est réservé `ADMIN`/`SUPER_ADMIN` — contrôlé côté serveur, pas seulement dans l'UI.
- **Flux tickets consolidé sur `/dashboard`** : pas de page dédiée par ticket — `/dashboard` affiche la file filtrable (statut, recherche) avec création de ticket, et le détail d'un ticket sélectionné s'affiche en place (`?ticket=<id>`, lien "retour" vers la file) plutôt que par navigation vers une autre page.
- **Visibilité cross-tenant des tickets** : le staff interne (`AGENT`/`ADMIN`/`SUPER_ADMIN` du tenant `internal`) voit une file **agrégée** couvrant toutes les entreprises clientes (colonne "Entreprise"), pas seulement ses propres tickets — reflète le modèle "support interne + externe dans la même application". Un tenant `CLIENT` ne voit que ses propres tickets, sans changement. Réassignation, commentaires et pièces jointes fonctionnent cross-tenant.
- **Notifications** (in-app uniquement pour l'instant) : générées automatiquement sur assignation d'un ticket, passage au statut `RESOLVED`, et nouveau commentaire non-interne — visibles via la cloche dans l'en-tête (badge non-lues, marquage lu individuel/global). Email et WhatsApp restent hors scope actuel (voir Exclus).
- **Documentation** (menu Outils, ex-"Base de connaissances") :
  - Organisée en thèmes (`Category`) contenant des articles (`KnowledgeArticle`).
  - Visibilité par article : `INTERNAL` (staff uniquement) ou `PUBLIC` (visible aussi des clients) ; filtrage appliqué selon le rôle de l'utilisateur connecté.
  - Création/modification des thèmes et articles réservée aux rôles `ADMIN` et `SUPER_ADMIN`.
  - Contenu bilingue FR/EN, mais rédaction admin en FR uniquement pour l'instant — le champ EN est automatiquement copié depuis le FR tant qu'il n'est pas traduit à la main (voir DECISIONS.md).
- **Gestion d'assets** (menu Outils → Gestion des assets) :
  - Accessible au staff interne (`ADMIN`/`AGENT`/`SUPER_ADMIN`) uniquement, en sélectionnant d'abord une entreprise cliente (même liste que Directory).
  - Liste unique par entreprise (pas de vue "par utilisateur" séparée — Directory couvre déjà la navigation par utilisateur) : PC (`LAPTOP`/`DESKTOP`), matériel réseau (`SWITCH`/`ROUTER`/`SERVER`), `PRINTER` et `OTHER` (divers), filtrable par type et statut (`DEPLOYED`/`IN_STOCK`/`DISABLED`/`RETIRED`).
  - Assignable à un utilisateur : `LAPTOP`/`DESKTOP`/`OTHER`. Jamais assignable, seulement localisé (champ `location` libre) : `SWITCH`/`ROUTER`/`SERVER`/`PRINTER` — appliqué côté serveur (`AssetsService`), pas seulement dans l'UI.
  - Chaque asset peut avoir des notes libres (libellé/valeur, ex. mot de passe, logs), avec option "sensible" masquant la valeur par défaut dans l'UI (pas un chiffrement — voir DECISIONS.md).
  - Cliquer une ligne du tableau ouvre une consultation en lecture seule (tous champs + notes, avec révélation des notes sensibles) accessible à `ADMIN`/`AGENT`/`SUPER_ADMIN`. Création/modification (asset et notes) réservée aux rôles `ADMIN` et `SUPER_ADMIN`.
- **Annuaire** (menu Outils → Annuaire, staff `ADMIN`/`AGENT`/`SUPER_ADMIN`) : fiche par utilisateur d'une entreprise cliente, avec plusieurs onglets. Deux sont réels : "Appareils" (assets réellement assignés à la personne, via `AssetsService`, lecture seule depuis Directory — la gestion se fait dans Gestion des assets) et "Licences" (modèle `UserLicense` — nom libre avec suggestions Office 365/pCloud, email, mot de passe masqué ; ajout/suppression réservés `ADMIN`/`SUPER_ADMIN`, lecture ouverte à `AGENT`). Les autres onglets (Profil, Groupes, Authentification) restent des données de démonstration simulées (`getDirectoryMock`), pas encore branchés sur de vraies données.
- **Audit** : actions sensibles tracées (`AuditLog`).

## Inclus (MVP)

- Tickets simples, avec pièces jointes (stockage disque local).
- Multi-tenant avec isolation stricte.
- Notifications in-app (email différé — voir Hypothèses).
- Documentation (thèmes/articles) avec gestion admin (créer/modifier) et visibilité INTERNAL/PUBLIC.
- Gestion d'assets par entreprise cliente (PC + matériel réseau), avec gestion admin (créer/modifier).
- Dashboard basique par rôle.
- FR/EN.

## Exclus (pour plus tard)

- SLA avancés (escalade automatique, contrats de niveau de service — colonne `slaDueAt` présente en base mais jamais utilisée).
- Automatisations (règles, workflows).
- Notifications email et WhatsApp — canal `IN_APP` seul implémenté ; aucune infra mail dans le projet (pas de librairie, pas de SMTP configuré), fournisseur à choisir par l'utilisateur avant de construire l'envoi.
- Reporting avancé.
- Paiement réel (Stripe ou équivalent) — actuellement UI seule, pas de facturation fonctionnelle.

## Hypothèses importantes

- Le paiement des individus est un prérequis d'accès mais n'est pas encore techniquement appliqué (pas de vérification de statut d'abonnement bloquant l'accès au dashboard/tickets).
- Les coordonnées de contact affichées pour les organisations sont des placeholders, pas les vraies coordonnées de l'entreprise.
- L'isolation multi-tenant repose sur RLS PostgreSQL, pas sur un filtrage applicatif — toute nouvelle requête doit passer par le rôle applicatif restreint (`APP_DATABASE_URL`), jamais par le rôle owner (`DATABASE_URL`).
- Déploiement cible : cPanel/LWS ou VPS (contrainte d'origine) — à revalider si le stack NestJS+Next.js impose un VPS/container plutôt qu'un hébergement mutualisé classique.
- Les pièces jointes de tickets sont stockées sur le disque local du serveur API (`apps/api/uploads/`) — ne survit pas à un redéploiement/scaling sans volume partagé ; à revoir (S3/MinIO) si plusieurs instances API tournent en parallèle.
