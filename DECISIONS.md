# DECISIONS — TIC Harmony

## Stack technique

**Décision** : NestJS + Prisma + PostgreSQL pour l'API, Next.js (App Router) pour le web, monorepo npm workspaces.

**Pourquoi** : besoin d'une architecture évolutive, typée bout en bout, avec un ORM outillé pour du multi-tenant (Prisma + RLS Postgres). Next.js pour le SEO du portail client et le routing i18n natif.

**Alternative rejetée** : stack orientée hébergement mutualisé cPanel/LWS (ex : PHP classique) évoquée dans le brief d'origine — écartée car moins adaptée à une architecture modulaire évolutive.

**À revoir** : cible de déploiement final (VPS/container vs mutualisé) — le stack actuel suppose plutôt un VPS/container ; à revalider avant mise en prod.

## Isolation multi-tenant

**Décision** : isolation par Row-Level Security (RLS) PostgreSQL, avec deux rôles DB distincts — un rôle owner (`DATABASE_URL`, migrations/Prisma CLI uniquement) et un rôle applicatif restreint (`APP_DATABASE_URL`, utilisé par l'app en runtime).

**Pourquoi** : le cloisonnement des données clients doit être garanti au niveau base de données, pas seulement par la logique applicative — un bug de filtrage ne doit pas pouvoir exposer les données d'un autre tenant.

**Alternative rejetée** : filtrage applicatif seul (`WHERE tenantId = ...` dans chaque requête) — trop fragile, dépend de la discipline du code partout.

## Modèle de signup à deux voies

**Décision** : les individus s'inscrivent en self-serve payant (`/signup`, rôle `CUSTOMER`, tenant mono-utilisateur auto-créé) ; les organisations sont provisionnées manuellement par un `SUPER_ADMIN` via `POST /api/tenants`.

**Pourquoi** : TIC Harmony veut vendre du support IT en direct aux particuliers tout en réservant les tenants multi-agents complets aux partenaires sous contrat, onboardés manuellement.

**Alternative rejetée** : formulaire signup unique avec champ "nom d'organisation" optionnel — écarté pour garder le flow individuel simple et éviter la création accidentelle de tenants d'entreprise non contractualisés.

**À revoir** : une fois le paiement réel intégré, décider si le blocage d'accès (pas de support sans abonnement) doit être appliqué techniquement (middleware/guard) et pas seulement énoncé en UI.

**Mise à jour (2026-07-28)** : `POST /api/tenants` a désormais une UI — bouton "Nouvelle entreprise cliente" sur la page Directory (`/directory`), visible uniquement `SUPER_ADMIN`. Placement choisi plutôt qu'une page dédiée : Directory est déjà "la page qui liste toutes les entreprises clientes" (`listClientTenants()`), donc l'endroit le plus naturel pour en ajouter une. Un petit composant client isolé (`CreateClientTenantButton`, `apps/web/src/components/directory/create-client-tenant-dialog.tsx`) est inséré dans la page serveur existante plutôt que de convertir toute la page en composant client — mirroring `LoginForm` et `CreateUserDialog` (page `/users`). Le champ "identifiant workspace" (slug) est auto-suggéré depuis le nom de l'entreprise (éditable) — c'est le tenant sous-jacent, utile pour le désambiguer en base et en cas d'email partagé entre plusieurs entreprises (voir décision "Login sans identifiant workspace obligatoire" ci-dessous), mais l'entreprise n'a normalement plus besoin de le connaître pour se connecter au quotidien. Aucun changement backend (DTO et guard déjà corrects) ; toujours aucun endpoint de suppression de tenant.

## Login sans identifiant workspace obligatoire

**Décision** (2026-07-28) : `POST /auth/login` n'exige plus `tenantSlug` (devenu optionnel dans `LoginDto`). Quand il est absent, `AuthService.findTenantsForEmail` résout le ou les tenants correspondant à l'email en bouclant sur tous les tenants (RLS oblige — pas de requête cross-tenant directe possible, même pattern que `TenantsService.findClients()` pour son `userCount`). Résultat : 0 tenant → 401 générique ; 1 tenant → connexion directe, transparente pour l'utilisateur ; plusieurs tenants (même email dans plusieurs entreprises, cas rare) → réponse `409 { requiresTenantSelection, tenants }`, et le formulaire de login affiche une étape de sélection d'espace avant de resoumettre avec le `tenantSlug` choisi. `tenantSlug` reste accepté en option pour compatibilité (login direct sans passer par la résolution).

**Pourquoi** : dans l'immense majorité des cas une personne n'appartient qu'à un seul tenant — demander un identifiant workspace à chaque connexion était de la friction pure pour ce cas courant. Décision de l'utilisateur ("je préfère une solution simple pour le client") après une question ouverte sur la nécessité réelle de ce champ.

**Sécurité** : dans le cas ambigu, le mot de passe n'est délibérément pas vérifié avant de renvoyer la liste des tenants (on ne sait pas encore contre quel compte le vérifier — chaque tenant peut avoir un mot de passe différent pour le même email). Ça révèle l'existence de plusieurs comptes pour cet email (noms d'entreprises), mais pas plus que ce qui est déjà visible via l'onboarding/signup ; le message reste générique ("Identifiants invalides") dans tous les autres cas pour ne pas confirmer qu'un email existe ou non.

**Nettoyage associé** : le cookie `workspace_slug` (posé au signup, lu par la page login pour pré-remplir un champ) a été retiré des deux côtés — devenu inutile puisque la résolution par email couvre déjà ce cas.

**À revoir** : si le volume d'entreprises clientes grandit beaucoup, la boucle cross-tenant dans `findTenantsForEmail` (une transaction par tenant) peut devenir coûteuse à chaque login sans `tenantSlug` — envisager un index/table de correspondance email→tenants si ça devient un problème de performance.

## Création des comptes employés (client et TIC Harmony)

**Décision** (2026-07-28) : au-delà de l'onboarding initial (`POST /api/tenants`, crée le tenant + son premier `ADMIN`), les comptes suivants sont créés en self-service, pas par TIC Harmony sur demande :
- **Côté entreprise cliente** : l'admin de l'entreprise crée lui-même ses employés, toujours avec le rôle `CUSTOMER` — pas de sélecteur de rôle dans le formulaire, un seul admin par entreprise pour l'instant.
- **Côté TIC Harmony** : un admin interne (tenant `INTERNAL`) crée les comptes technicien/employé, avec un choix de rôles combinables : Technicien (`AGENT`) et/ou Admin (`ADMIN`) via cases à cocher — un employé peut cumuler les deux.

**Pourquoi** : évite que TIC Harmony devienne un goulot d'étranglement à chaque mouvement RH côté client (option alternative envisagée et écartée). Réutilise `POST /api/users`, qui existait déjà côté backend (scopé au tenant du demandeur, réservé `ADMIN`) mais n'était branché sur aucune UI.

**Une seule page `/users` sert les deux publics** : comme `POST`/`GET /api/users` sont scopés au tenant du demandeur (pas de traversée cross-tenant), la même page adapte son formulaire selon qui la visite — `tenant.type` (exposé via `GET /auth/me`) détermine si le formulaire est simple (`CLIENT` → toujours `CUSTOMER`) ou à cases à cocher (`INTERNAL` → `AGENT`/`ADMIN`). Le frontend n'est qu'un affichage : `UsersService.create` valide côté serveur les rôles demandés contre une liste blanche par type de tenant, `SUPER_ADMIN` n'étant jamais attribuable via cette page (bootstrap plateforme, seed/manuel uniquement).

**Alternative rejetée** : sélecteur permettant à l'entreprise cliente de désigner un co-admin — écarté (choix utilisateur via AskUserQuestion) pour garder le formulaire client le plus simple possible ; si un deuxième admin est nécessaire un jour, TIC Harmony peut le faire à la demande.

**Portée** : uniquement créer (pas d'édition de rôles ni de désactivation de compte existant) — même choix de sobriété que pour les notes d'asset et les licences. Pas de flow d'invitation par email : l'admin fixe le mot de passe initial directement et le communique par un canal existant.

**À revoir** : édition de rôles/désactivation de compte si le besoin se confirme ; flow d'invitation par email si la distribution manuelle du mot de passe initial pose problème à l'usage.

## Rôles combinables (`User.roles`)

**Décision** (2026-07-28) : `User.role` (valeur unique) devient `User.roles UserRole[]` (tableau), pour permettre à un employé TIC Harmony de cumuler plusieurs rôles (ex. Technicien + Admin). Une seule représentation partout où un rôle est exposé (JWT, session, ticket requester/assignee/comment author, asset assignee, Directory) — pas de champ "rôle principal" séparé, pour éviter deux sources de vérité. Les vérifications de permission passent de `role === X` à `roles.includes(X)`. Les affichages qui n'ont besoin que d'une seule couleur/valeur (anneau d'avatar) prennent le rôle de plus haute précédence (`SUPER_ADMIN > ADMIN > AGENT > CUSTOMER`, purement cosmétique, pas une donnée d'autorité) via un petit helper (`primaryRole` dans `apps/web/src/components/ui/avatar.tsx`).

**Migration** : `apps/api/prisma/migrations/20260728102504_user_roles_array/`, écrite à la main (`prisma migrate dev --create-only` refuse de tourner dans cet environnement non-interactif face à l'avertissement de perte de données sur la colonne `role`) — `ADD COLUMN roles`, `UPDATE ... SET roles = ARRAY[role]`, puis `DROP COLUMN role`, pour préserver les données existantes plutôt qu'un simple renommage.

**`SUPER_ADMIN` reste un rôle de bootstrap plateforme** : jamais combinable, jamais attribuable via `POST /api/users` (voir décision "Création des comptes employés" ci-dessus) — uniquement via le seed ou une intervention manuelle en base.

**À revoir** : si le besoin d'éditer les rôles d'un compte existant (plutôt que seulement à la création) se confirme, il faudra un endpoint `PATCH` dédié avec la même validation par type de tenant.

## Paiement individus

**Décision** : pas de palier gratuit annoncé en UI, mais pas d'intégration Stripe/paiement réelle pour l'instant — uniquement le texte de la page signup a été mis à jour.

**Pourquoi** : prioriser la mise en place du flow d'inscription et du modèle de données avant l'intégration paiement, qui est un chantier à part.

**À revoir** : intégration Stripe (ou équivalent) + garde d'accès basée sur le statut d'abonnement — actuellement non planifiée dans une session précise.

## Traduction EN de la Documentation

**Décision** : quand l'admin crée/modifie un thème ou un article en ne renseignant que le français, les champs anglais (`nameEn`/`titleEn`/`bodyEn`) sont automatiquement copiés depuis le français (`apps/api/src/modules/knowledge-base/knowledge-base.service.ts`). Pas de traduction automatique via un service externe, pas d'UI de traduction manuelle EN pour l'instant.

**Pourquoi** : le schéma exige les deux langues (champs non-nullables), et l'admin ne veut rédiger qu'en français dans un premier temps (décision du 2026-07-13). Copier le FR évite d'avoir des champs EN vides ou incohérents en attendant une vraie traduction.

**Alternative rejetée** : traduction automatique via une API (DeepL, Google Translate, ou l'API Claude) générant un brouillon EN éditable — écartée pour l'instant pour éviter une dépendance externe/coût supplémentaire dès le MVP.

**À revoir** : si le besoin de vraie version anglaise devient prioritaire (ex. clients anglophones), ajouter soit une traduction automatique à la sauvegarde, soit un onglet EN éditable dans le formulaire admin.

## Menu Outils → "Documentation"

**Décision** : le lien "Base de connaissances" dans le menu Outils et le titre de la page ont été renommés en "Documentation" (identique en FR et EN).

**Pourquoi** : demande utilisateur pour coller au vocabulaire souhaité pour cette section.

**Alternative rejetée** : garder "Base de connaissances"/"Knowledge base" — écarté, l'utilisateur a explicitement demandé "Documentation".

## Gestion d'assets : structure de la page et périmètre

**Décision** : la gestion d'assets, initialement classée "hors scope MVP" dans SPEC.md, a été implémentée le 2026-07-27 à la demande de l'utilisateur. Structure retenue : sélection de l'entreprise cliente d'abord (réutilise la liste de Directory), puis une **liste unique centrée sur les assets** (pas de toggle "by users"/"by assets" séparé) couvrant PC + matériel réseau (switch/routeur/serveur), avec colonne "Assigné à / Emplacement" et filtres type/statut.

**Pourquoi** : Directory existe déjà pour la navigation par utilisateur (avec un onglet "Appareils" prévu) ; dupliquer cette vue dans Asset Management aurait ajouté un deuxième chemin de navigation sans valeur ajoutée. Une liste asset-centrique est plus simple et suffit au besoin exprimé.

**Alternative rejetée** : garder le toggle "By users"/"By assets" de la maquette de référence (ServiceDesk Simulator) — écarté car redondant avec Directory, et parce que l'utilisateur a explicitement validé l'option recommandée après consultation.

**Décision associée** : le matériel réseau (switch/routeur/serveur) n'est **jamais assignable à un utilisateur**, seulement localisé via un champ `location` texte libre. Appliqué côté serveur (`AssetsService`, constante `UNASSIGNABLE_TYPES`) : `assigneeId` est forcé à `null` pour ces types même si le payload en envoie un — pas seulement une contrainte UI.

**Pourquoi** : cohérent avec la réalité d'un parc IT (le matériel réseau appartient à un local technique, pas à une personne).

**Modèle d'accès cross-tenant** : `AssetsService` réutilise exactement le pattern déjà établi par `TenantsService` (staff interne uniquement, requête ouverte dans une transaction où `app.tenant_id` est positionné manuellement sur le tenant client ciblé) plutôt que `getTenantTx()` — nécessaire car le staff interne consulte les assets d'un tenant différent du sien.

**Permissions** : lecture ouverte à `ADMIN`/`AGENT`/`SUPER_ADMIN` (comme Directory) ; création/modification réservée à `ADMIN`/`SUPER_ADMIN` (comme la Documentation, `AGENT` exclu).

**À revoir** : pas de suppression d'asset pour l'instant (uniquement créer/modifier) ; pas de traçabilité d'historique de réassignation.

## Lien Directory ↔ Gestion des assets (onglet "Appareils")

**Décision** (2026-07-28) : l'onglet "Appareils" d'une fiche utilisateur dans Directory (`apps/web/src/components/directory/directory-view.tsx`) affiche désormais les vrais assets assignés à cette personne dans le tenant, au lieu des données 100% factices générées par `getDirectoryMock()` (`apps/web/src/lib/directory-mock.ts`, retiré). Réutilisation de `listAssets(tenantId)` (déjà utilisé par la page Gestion des assets) côté page Directory, filtrage côté client par `assignee.id === selected.id` — pas de nouvel endpoint backend, les permissions de lecture (`GET /assets/:tenantId` et `GET /tenants/:tenantId/users`) étaient déjà toutes deux `ADMIN`/`AGENT`/`SUPER_ADMIN`.

**Affichage** : par asset assigné, une carte avec modèle + tag, puis la liste complète des notes de l'asset (libellé/valeur, masquage des notes sensibles avec bouton révéler — même pattern que `AssetViewDialog`). Lien "Voir dans Gestion des assets" vers `/assets/[tenantId]`.

**Pourquoi ce format plutôt que des champs figés "nom d'utilisateur"/"mot de passe"** : le besoin exprimé par l'utilisateur était de voir modèle + nom d'utilisateur + mot de passe dans Directory. Plutôt que d'ajouter des champs dédiés sur le modèle `Asset` (ce qui aurait dupliqué/rigidifié ce que les notes libres couvrent déjà), le choix retenu (validé via AskUserQuestion) est d'afficher toutes les notes de l'asset telles que renseignées dans Gestion des assets — nom d'utilisateur/mot de passe y apparaissent naturellement si l'admin les y a saisis, sans supposer un libellé figé côté code.

**Alternative rejetée** : filtrer les notes par correspondance textuelle sur le libellé ("contient 'utilisateur'/'mot de passe'") — écarté, trop fragile (fautes de frappe, EN/FR, libellés différents).

**À revoir** : si un jour "nom d'utilisateur"/"mot de passe" doivent être garantis présents et structurés (plutôt que des notes libres optionnelles), reconsidérer des champs dédiés sur `Asset`.

## Licences réelles dans Directory (onglet "Licences")

**Décision** (2026-07-28) : l'onglet "Licences" d'une fiche utilisateur dans Directory permet désormais à l'admin d'attribuer une licence réelle (nom, email, mot de passe) à une personne, au lieu des données factices (`getDirectoryMock`/`LICENSE_CATALOG`, retirés). Nouveau modèle `UserLicense` (`name`, `email`, `password`), scopé via le tenant du `user` parent (RLS, même pattern que `asset_notes` → `assets`). Routes `POST`/`DELETE /tenants/:tenantId/users/:userId/licenses[/:licenseId]` ajoutées dans le module `tenants` existant (pas de nouveau module — `GET /tenants/:tenantId/users` embarque déjà `licenses` par utilisateur, comme `Asset` embarque ses `notes`).

**Champ "nom"** : texte libre avec suggestions `Office 365`/`pCloud` via `<datalist>` HTML (pas un enum figé) — les deux licences les plus utilisées chez TIC Harmony sont proposées en autocomplétion, mais l'admin peut saisir n'importe quel nom.

**Mot de passe** : toujours masqué par défaut avec bouton révéler (`Eye`/`EyeOff`, même pattern que les notes d'asset et l'onglet Appareils) — contrairement à `AssetNote`, pas de case "sensible" optionnelle : un mot de passe de licence est sensible par nature, donc pas de choix à laisser à l'admin. Stocké en clair en base, cohérent avec la décision déjà prise pour les notes d'asset sensibles (pas de chiffrement au repos pour l'instant, voir plus bas).

**Permissions** : lecture (avec révélation) ouverte à `ADMIN`/`AGENT`/`SUPER_ADMIN` (même niveau que le reste de Directory) ; ajout/suppression réservés `ADMIN`/`SUPER_ADMIN`.

**Portée** : uniquement créer + supprimer, pas d'édition en place — même choix que les notes d'asset (corriger une licence = la supprimer et la ré-ajouter), pour rester cohérent avec le reste de l'app plutôt que d'introduire un nouveau pattern.

**À revoir** : chiffrement au repos si des mots de passe réels de production y sont stockés (même remarque que pour les notes d'asset sensibles) ; pas d'historique des suppressions/modifications.

## Informations supplémentaires sur un asset (notes libres)

**Décision** : ajout d'un modèle `AssetNote` (label + valeur + booléen `sensitive`), plusieurs entrées possibles par asset, gérées depuis le dialogue d'édition (section dédiée, visible uniquement en mode édition). Les valeurs marquées `sensitive` sont masquées par défaut dans l'UI avec un bouton "révéler" — reprend exactement le pattern déjà utilisé pour la clé BitLocker dans `DirectoryView`.

**Pourquoi** : le besoin exprimé par l'utilisateur ("mdp pour les utilisateurs du pc, logs des routeurs") mélange des informations de nature très différente (identifiants vs. journaux) — une liste de champs libellé/valeur répétable est plus flexible qu'un unique champ notes en vrac, et couvre "ajouter quand c'est nécessaire" sans structure rigide imposée à l'avance.

**Alternative rejetée** : un seul champ texte libre par asset — écarté (choix utilisateur) car moins structuré si plusieurs informations distinctes s'accumulent sur un même asset.

**Sécurité — hypothèse à noter** : les valeurs sont stockées **en clair** en base (pas de chiffrement applicatif). Le masquage "sensible" est un contrôle d'affichage UI, pas un chiffrement au repos. Cohérent avec le niveau de sécurité du reste du MVP (pas de KMS/chiffrement envisagé ailleurs), mais à revoir explicitement si des mots de passe réels de production commencent à être stockés ici.

**Permissions** : lecture des notes incluse dans la lecture de l'asset (`ADMIN`/`AGENT`/`SUPER_ADMIN`) ; création/modification/suppression réservées à `ADMIN`/`SUPER_ADMIN`, comme le reste de la gestion d'assets.

**RLS** : `asset_notes` n'a pas de `tenant_id` propre — la policy est scopée via l'asset parent (`EXISTS (SELECT 1 FROM assets WHERE id = asset_notes.asset_id AND tenant_id = current_setting(...))`), même pattern que `ticket_comments`.

**À revoir** : chiffrement au repos si des identifiants sensibles réels y sont stockés ; historique des modifications (actuellement une modification écrase la valeur précédente sans trace).

## Types d'asset étendus (PRINTER, OTHER)

**Décision** : ajout de `PRINTER` (imprimante) et `OTHER` (divers) à l'enum `AssetType`. `PRINTER` classé non-assignable/localisé (comme le matériel réseau, migration `20260727144417_add_asset_types_printer_other`) ; `OTHER` classé assignable par défaut (comme les PC).

**Pourquoi** : les imprimantes sont typiquement un équipement partagé (comme le matériel réseau), tandis que "divers" est trop générique pour présumer qu'il s'agit toujours d'équipement partagé — l'assignable-par-défaut est le choix le moins surprenant pour un type fourre-tout.

**À revoir** : si l'usage réel de "Divers" montre que c'est surtout du matériel partagé, basculer son comportement par défaut vers non-assignable.

## Consultation en lecture seule des assets (lignes cliquables)

**Décision** : cliquer une ligne du tableau Asset Management ouvre un panneau de consultation en lecture seule (`AssetViewDialog`) accessible à `ADMIN`/`AGENT`/`SUPER_ADMIN` — pas seulement au staff pouvant éditer. Le bouton crayon (édition) reste séparé, réservé à `ADMIN`/`SUPER_ADMIN`, avec `stopPropagation()` pour ne pas déclencher la vue en même temps. Le panneau de vue inclut un bouton "Modifier" (visible seulement si `canManage`) qui bascule vers le dialogue d'édition.

**Pourquoi** : `GET /assets/:tenantId` renvoie déjà les notes (y compris sensibles, masquées côté UI) à `AGENT`, mais il n'existait auparavant aucune UI pour les consulter puisque seul le dialogue d'édition (réservé `ADMIN`/`SUPER_ADMIN`) les affichait — un agent ne pouvait rien voir en détail. Séparer "consulter" (tout le monde ayant accès à la page) d'"éditer" (admin uniquement) comble ce manque sans élargir les permissions d'écriture.

## Correctif : modal "Outils" ne floutait que le haut de l'écran

**Décision** : le composant partagé `Modal` (`apps/web/src/components/ui/modal.tsx`) rend désormais son overlay via `createPortal(..., document.body)` plutôt qu'inline dans l'arbre React du composant appelant.

**Pourquoi** : le `<header>` de `TopNav` a `backdrop-blur-sm` appliqué directement dessus. En CSS, `backdrop-filter` (comme `filter`/`transform`) crée un "containing block" pour les descendants en `position: fixed` — l'overlay du modal (`fixed inset-0`), rendu inline à l'intérieur du header, se retrouvait donc contraint à la hauteur du header (64px) au lieu de couvrir tout l'écran. Le portail sort le modal de cet arbre DOM et lui rend le viewport entier comme containing block.

**Impact** : corrige à la fois le menu Outils et le modal Classement (Leaderboard), qui partagent ce même composant `Modal`.

**À revoir** : si un futur composant applique `filter`/`backdrop-filter`/`transform` sur un ancêtre d'un élément `fixed`, le même bug peut réapparaître — vérifier en priorité si un overlay ne couvre pas tout l'écran comme attendu.

## Placeholders à remplacer

**Décision** : coordonnées de contact entreprise sur la page signup (`apps/web/src/app/[locale]/signup/page.tsx`) laissées en placeholder (`+32 X XX XX XX XX` / `contact@ticharmony.com`).

**Pourquoi** : le contenu réel n'était pas encore disponible au moment de l'implémentation.

**À revoir** : remplacer par les vraies coordonnées dès qu'elles sont fournies par l'utilisateur.

## Permissions sur les tickets : `PATCH` réservé au staff

**Décision** (2026-07-28) : `PATCH /tickets/:id` (statut, priorité, assigné) est réservé aux rôles `AGENT`/`ADMIN`/`SUPER_ADMIN` (`@Roles(...)` + `RolesGuard` ajoutés sur `TicketsController`, absents jusque-là — seul le module tickets n'avait aucune restriction de rôle explicite). `GET`/`POST /tickets` et `POST /tickets/:id/comments` restent ouverts à tout utilisateur authentifié, la visibilité par rôle étant déjà gérée dans `TicketsService` (un `CUSTOMER` ne voit/ne commente que ses propres tickets).

**Pourquoi** : trouvé lors d'un audit du système de tickets (à la demande de l'utilisateur) — l'UI (`ticket-detail.tsx`) ne proposait jamais à un `CUSTOMER` de modifier statut/priorité/assigné, mais rien côté serveur ne l'empêchait d'appeler l'endpoint directement. Le frontend ne doit jamais être la seule protection (même principe que pour l'isolation multi-tenant via RLS).

## Notifications : canal in-app d'abord, email différé

**Décision** (2026-07-28) : le module `notifications/` (existant en modèle Prisma seul, dossier vide, jamais monté) est implémenté pour le canal `IN_APP` uniquement. `EMAIL`/`WHATSAPP` (déjà dans l'enum `NotificationChannel`) restent hors scope — pas d'infra mail dans le projet (aucune librairie, pas de SMTP configuré, pas de service mail dans `docker-compose.yml`), et le choix d'un fournisseur est une décision qui revient à l'utilisateur.

**Événements déclencheurs** (depuis `TicketsService`) : ticket assigné à quelqu'un → notifie le nouvel assigné ; statut passé à `RESOLVED` → notifie le demandeur ; nouveau commentaire non-interne → notifie l'autre partie (staff commente → demandeur notifié, demandeur commente → assigné notifié s'il y en a un). Les notes internes ne génèrent jamais de notification pour le client — cohérent avec leur visibilité déjà restreinte au staff.

**Pourquoi ce choix d'événements** : couvre les moments où une personne a réellement besoin d'être alertée dans un helpdesk (on s'occupe de mon ticket / j'ai une réponse / mon problème est résolu), sans notifier sur des changements mineurs (ex. changement de priorité seul) pour éviter le bruit.

**RLS** : `notifications` avait déjà sa policy (`tenant_isolation_notifications`, scopée via le tenant de l'utilisateur propriétaire) depuis la migration initiale du projet — aucune migration nécessaire pour cette fonctionnalité.

**À revoir** : notifications email une fois un fournisseur choisi (SMTP, Resend, etc.) ; éventuellement notifier aussi à la création d'un ticket (tout le staff du tenant) si le besoin se confirme — écarté pour l'instant pour ne pas notifier toute une équipe à chaque ticket.

## Pièces jointes sur les tickets : stockage disque local

**Décision** (2026-07-28) : `TicketAttachment` (modèle Prisma présent, aucun code jusque-là) est implémenté avec un stockage **disque local** côté API (`apps/api/uploads/`, ignoré par git), pas un fournisseur cloud (S3/MinIO). Aucune infra de ce type n'est configurée dans le projet (pas de credentials, pas de variable d'env dédiée) — même raisonnement que pour l'email des notifications : ne pas bloquer sur une décision de fournisseur externe qui revient à l'utilisateur, livrer quelque chose de réel et testable maintenant. Cohérent avec la cible de déploiement (VPS/container).

**Upload toujours rattaché à un commentaire** (`commentId` requis dans l'endpoint et dans l'UI, même si le schéma autorise un `commentId` nul) : un seul flux pour l'utilisateur (écrire un message, joindre un fichier, envoyer) plutôt que deux zones d'upload séparées.

**Permissions identiques aux commentaires** : upload et téléchargement ouverts à quiconque voit le ticket (`assertVisible`, déjà utilisé par `addComment`), pas réservé au staff — un client doit pouvoir joindre une capture d'écran à sa propre demande.

**Sécurité du stockage** : nom de fichier généré sur disque (`crypto.randomUUID()` + extension d'origine) — évite collisions et path traversal ; le `filename` d'origine n'est conservé qu'en base, pour l'affichage et le `Content-Disposition` au téléchargement. Téléchargement uniquement via un endpoint authentifié (`GET /tickets/:id/attachments/:attachmentId`, `assertVisible` réutilisé) — pas de dossier statique public, donc pas d'URL devinable pour contourner l'isolation multi-tenant. Limite de taille 10 Mo côté `multer` (rejet propre en 413) pour éviter un remplissage disque trivial ; pas de liste blanche de types de fichiers stricte, cohérent avec le reste du MVP.

**RLS** : `ticket_attachments` avait déjà sa policy (`tenant_isolation_ticket_attachments`, scopée via le ticket parent) depuis la migration initiale — aucune migration nécessaire.

**À revoir** : migration vers un stockage objet (S3/MinIO) si le volume de fichiers ou un besoin de scalabilité horizontale (plusieurs instances API) l'impose — le disque local ne survit pas à un redéploiement/scaling sans volume partagé.

## Fusion Dashboard/Tickets + réassignation à un autre technicien

**Décision** (2026-07-28) : les pages `/tickets` (tableau filtrable) et `/tickets/[id]` (détail) sont supprimées. `/dashboard` devient l'écran unique du flux tickets — file filtrable + recherche + création de ticket (composants réutilisés tels quels, ex-`/tickets`), et le détail d'un ticket s'affiche **en place** via un paramètre de requête (`/dashboard?ticket=<id>`) plutôt que par navigation vers une autre page. Demande explicite de l'utilisateur, en s'inspirant du flux d'une maquette externe (liste ↔ détail sur un seul écran, lien "retour"). Question de cadrage posée via `AskUserQuestion` (fusion complète vs. dashboard léger + `/tickets` séparé conservé) — l'utilisateur a choisi la fusion complète.

**Pourquoi un paramètre de requête plutôt qu'un état client pur** : reste dans le style déjà établi du projet (composants serveur qui font le data-fetching, pas de couche de fetch client dédiée) — un changement de `searchParams` déclenche un rendu serveur pour ce segment sans navigation "en dur", et le lien reste partageable/copiable (utile pour les liens de notification, qui pointent désormais vers `/dashboard?ticket=...`).

**Réassignation par rôle** : précision apportée par l'utilisateur au moment d'approuver le plan — un `AGENT` (technicien normal) peut s'assigner un ticket à lui-même ou s'en retirer, mais **ne peut pas** l'attribuer à un autre technicien ; seuls `ADMIN`/`SUPER_ADMIN` peuvent réassigner librement à n'importe quel membre du staff du tenant. Contrôlé côté **serveur** (`TicketsService.update`, `403` sinon) — pas seulement dans l'UI, même principe que la décision "Permissions sur les tickets" ci-dessus. Le sélecteur d'assignation (`<select>` remplaçant l'ancien lien "S'assigner ce ticket", qui n'apparaissait que si le ticket était libre) n'affiche d'ailleurs même pas les options qu'un `AGENT` n'a pas le droit de choisir, pour ne pas proposer une action qui échouera.

**Pool de techniciens** : un tenant `CLIENT` n'a jamais qu'un seul `ADMIN` + des `CUSTOMER` (jamais d'`AGENT`, cf. décision "Création des comptes employés"), donc pas de vrai pool de réassignation côté client pour l'instant — la fonctionnalité prend surtout son sens côté tenant `INTERNAL`, où plusieurs `AGENT`/`ADMIN` coexistent. Réutilisation de `GET /users` (déjà accessible à `ADMIN`/`AGENT`/`SUPER_ADMIN`, déjà scopé au tenant via RLS) plutôt qu'un nouvel endpoint — filtrage sur les rôles staff fait côté frontend.

**`UpdateTicketDto.assigneeId` accepte désormais `null`** explicitement (`@ValidateIf`) pour permettre de désassigner un ticket — impossible auparavant (`@IsString()` seul rejetait `null`).

**À revoir** : pas de KPI/stat cards au-dessus de la file sur `/dashboard` pour l'instant (compteurs par statut, temps de résolution moyen) — périmètre distinct, pas traité dans ce changement.

## Visibilité cross-tenant des tickets pour le staff interne

**Décision** (2026-07-28) : le staff interne (`AGENT`/`ADMIN`/`SUPER_ADMIN` du tenant `internal`) voit désormais tous les tickets de toutes les entreprises clientes dans une **file unique agrégée** (`TicketsService.findAllForStaff`, boucle sur tous les tenants — pattern déjà établi par `TenantsService.findClients()`), chaque ticket annoté `tenant: {id, name, slug}`. Question de cadrage posée à l'utilisateur (file unique vs sélection d'entreprise d'abord, comme Assets/Annuaire) — tranchée en faveur de la file unique, style MSP/NinjaOne.

**Pourquoi ce trou existait** : `TicketsService` interrogeait exclusivement via `getTenantTx()`, la transaction liée par `TenantTransactionInterceptor` à `app.tenant_id` = tenant du JWT de l'**appelant**, jamais celui du ticket visé. Un ticket créé par un client vit dans le tenant de ce client (RLS `tenant_id = app.tenant_id`) ; le staff interne (tenant `internal`) n'a donc jamais pu le voir. Ce trou existait depuis la création du module tickets — découvert quand l'utilisateur a signalé qu'un ticket créé sous "acme" restait invisible connecté en `SUPER_ADMIN`. Le brief d'origine du projet ("support interne + support externe dans la même application") confirme que c'est bien le modèle attendu, pas un silo par entreprise cliente.

**Résolution d'un ticket précis (détail, statut, commentaire, pièce jointe)** : nouveau helper `TicketsService.withTicketTx(tenantIdHint?)` — absent ou égal au tenant de l'appelant → réutilise `getTenantTx()` (comportement inchangé pour 100% des utilisateurs `CLIENT` et pour le staff agissant sur son propre tenant) ; sinon → `assertInternalStaff`/`assertClientTenant` (mêmes gardes que `AssetsService`/`TenantsService`) puis transaction manuelle scopée au tenant cible. Le `tenantId` est transmis en **query param** (`?tenantId=`) sur les routes `GET/PATCH /tickets/:id`, `POST /tickets/:id/comments`, upload/téléchargement de pièce jointe — porté côté frontend par le champ `Ticket.tenant` (présent uniquement dans la file agrégée), propagé dans l'URL du dashboard (`/dashboard?ticket=<id>&tenant=<id>`) puis dans chaque appel de `ticket-detail.tsx`.

**Piège RLS spécifique aux tickets, jamais rencontré par Assets/Directory/Licences** : un ticket créé par un client peut être assigné à / commenté par un membre du staff interne, qui vit dans une **autre** tenant que le ticket. En interrogeant le ticket dans une transaction scopée au tenant du ticket, l'`assignee`/`comment.author` (staff interne) devient invisible sous RLS — `users` est aussi RLS-protégée, et le JOIN Prisma ne remonte rien pour une ligne hors du tenant courant. Pire : insérer une notification pour ce destinataire depuis cette même transaction violerait la policy RLS de `notifications` (implicitement `WITH CHECK` via l'utilisateur destinataire, `tenant_isolation_notifications`).

**Solution retenue — routage de transaction applicatif, aucune migration RLS** :
- **Lecture** (`resolveForeignUsers`) : après le fetch initial, les IDs d'assigné/auteur restés `null` malgré un `assigneeId`/`authorId` connu sont re-requêtés en une seule requête batchée, dans une transaction scopée spécifiquement au tenant `INTERNAL` (le seul autre pool dont un ticket tire jamais son staff) — puis réinjectés dans la réponse.
- **Écriture des notifications** : `NotificationsService.create(tx, ...)` prend désormais la transaction à utiliser en paramètre explicite (n'appelle plus `getTenantTx()` en interne). `TicketsService` choisit la bonne transaction selon le type d'événement, chacun ayant un destinataire dont le tenant est déterministe par construction :
  - `TICKET_ASSIGNED` : le destinataire (soi-même ou un technicien choisi dans `GET /users`) appartient toujours au tenant de l'**acteur courant** — jamais une supposition, conséquence directe du fait que la liste de techniciens proposée est elle-même scopée au tenant de l'acteur.
  - `TICKET_RESOLVED` : le destinataire (`requester`) appartient toujours au tenant du **ticket**.
  - `TICKET_COMMENT` vers l'assigné : peut être local au ticket (client s'auto-gérant) ou interne — un petit lookup (`tx.user.findUnique`) détermine lequel avant de choisir la transaction.
- Cette approche a été préférée à l'alternative (élargir les policies RLS de `users`/`notifications` via une deuxième variable de session type `app.actor_tenant_id`) : plus contenue, plus facile à vérifier par des tests HTTP ciblés, aucune migration, cohérente avec le style déjà établi du projet (boucles/transactions ciblées plutôt que RLS élargie).

**Sécurité vérifiée** : un utilisateur `CLIENT` qui tente de passer un `tenantId` étranger (escalade) reçoit `403` (`assertInternalStaff` bloque dès que son propre tenant n'est pas `INTERNAL`) — testé avec Alice (admin Acme) tentant d'accéder à un ticket de Beta Corp.

**Périmètre non traité** : la création de ticket reste toujours dans le tenant propre de l'auteur — pas de "créer un ticket pour le compte d'un client" par le staff interne dans ce correctif (hors périmètre du bug rapporté).

**À revoir** : `findAllForStaff` fait une transaction par tenant (`Promise.all`, même pattern que `findTenantsForEmail`/`findClients`) — coût acceptable pour l'instant, mais à surveiller si le nombre d'entreprises clientes grandit beaucoup (même remarque déjà notée pour la résolution de tenant au login).

## Détail de ticket : structure de la maquette externe, pas son thème visuel

**Décision** (2026-07-28) : suite à une remarque de l'utilisateur ("visuellement, la page detail des tickets ne ressemble pas à la maquette"), `ticket-detail.tsx` a été restructuré en carte unique centrée (au lieu du layout deux colonnes + panneau latéral "Détails"), en reprenant la **structure/mise en page** d'une maquette externe (ServiceDesk Simulator) — mais pas son thème visuel complet (fond sombre, police monospace, tout en majuscules). Question posée explicitement via `AskUserQuestion` (structure seule vs style visuel complet) : l'utilisateur a choisi la structure seule.

**Pourquoi** : la maquette a sa propre identité visuelle (thème "terminal"), distincte de celle déjà établie dans TIC Harmony (badges, avatars, `font-display`, thème clair/sombre). Importer le thème complet aurait créé une incohérence avec le reste de l'application (dashboard, annuaire, paramètres, etc., qui restent dans le style actuel) pour un seul écran.

**Ce qui a changé fonctionnellement (aucune régression de permission)** :
- Statut et priorité restent les mêmes `<select>` déjà en place pour le staff, simplement restylés en pastilles colorées (mêmes classes de couleur que `StatusBadge`/`PriorityBadge`) plutôt qu'en menus déroulants encadrés dans un panneau latéral.
- Assignation : un `AGENT` simple voit une version simplifiée (pastille + bouton unique "S'assigner à moi"/"Retirer l'assignation") qui reflète exactement la règle serveur déjà en place (voir décision "Fusion Dashboard/Tickets + réassignation technicien" ci-dessus) — il n'est jamais proposé une action qu'il n'a pas le droit de faire. Un `ADMIN`/`SUPER_ADMIN` garde le sélecteur complet de techniciens, strictement inchangé.
- Nouveau menu "⋯" (mirroring le pattern dropdown déjà utilisé dans `top-nav.tsx`) avec une seule action réelle : Clôturer/Réouvrir le ticket (bascule selon le statut courant). **Pas d'équivalent à "Escalate"/"Report ticket bug" de la maquette** — aucune logique d'escalade n'existe côté backend, décision délibérée de ne pas ajouter de bouton non-fonctionnel plutôt que de faire semblant.

**À revoir** : si une vraie fonctionnalité d'escalade (SLA, priorité automatique) est construite un jour, le menu "⋯" est l'endroit naturel pour l'exposer.

## Champs de contact utilisateur (department/location/phone) + confirmation d'assignation

**Décision** (2026-08-11) : suite à une nouvelle capture de la maquette externe (ServiceDesk Simulator) montrant un bloc d'infos ticket "Reported by / Department / Location / Contact / Issue Description", trois champs ont été ajoutés au modèle `User` : `department`, `location`, `phone` (tous nullable, migration purement additive `20260811084248_add_user_contact_fields`, aucun changement RLS — colonnes supplémentaires sur une table déjà protégée par `tenant_isolation_users`). Question posée via `AskUserQuestion` : ajouter réellement ces champs (choisi) vs se limiter aux données déjà en base (email + catégorie).

**Pourquoi** : la maquette montrait des informations qu'on n'avait pas modélisées ; plutôt que d'improviser un faux affichage, l'utilisateur a préféré les rendre réels — cohérent avec la décision équivalente prise pour les licences/appareils dans Directory (retirer les données factices `getDirectoryMock`).

**Périmètre** : les trois champs sont optionnels, saisis uniquement à la création d'un compte (`POST /users`, formulaire `/users`) — pas d'édition a posteriori (même limite que le reste de la page `/users`, créer uniquement). Le `PERSON_SELECT` partagé de `TicketsService` (déjà réutilisé pour `requester`/`assignee`/auteur de commentaire/`resolveForeignUsers`) a été étendu avec `email`/`department`/`location`/`phone` — un seul point de changement propage les champs à tous les endpoints ticket. Le type frontend `Person` porte ces champs en **optionnel** (`email?`, `department?: string | null`, etc.) délibérément, pour ne pas casser le typage de `Asset.assignee` (`apps/web/src/lib/assets.ts`) qui réutilise `Person` mais dont le select backend ne les inclut pas — non modifié, hors périmètre de ce changement.

**Affichage ticket** (`ticket-detail.tsx`) : nouveau bloc "Reported by: Nom (email) · il y a X" / "Department: X | Location: Y" (chaque partie masquée individuellement si absente, pas de `|` en trop si un seul des deux est renseigné) / "Contact: téléphone" (masqué si absent) / "Issue Description:" + texte — remplace l'ancienne ligne avatar+nom+date sous la description. Pas de "Business Impact" (non modélisé, non demandé). Avatar volontairement absent de ce bloc (texte pur, fidèle à la structure de la maquette, cohérent avec la décision "structure seule, pas le thème visuel" ci-dessus).

**Confirmation d'assignation (ADMIN/SUPER_ADMIN)** : le `<select>` d'assignation, qui appliquait auparavant chaque changement immédiatement (`onChange` → `PATCH`), a désormais un état local (`pendingAssigneeId`) — le `PATCH` ne part que via un bouton "Confirmer" qui n'apparaît que si la sélection diffère de l'assignation réellement appliquée. But : éviter une réassignation accidentelle par mauvais clic. Demandé explicitement par l'utilisateur. Le bouton simplifié d'un `AGENT` simple ("S'assigner à moi"/"Retirer l'assignation") reste inchangé — déjà une action unique et volontaire, pas de risque de clic accidentel équivalent. Implémentation : resynchronisation de l'état local pendant le rendu (pattern React "adjusting state when a prop changes"), pas dans un `useEffect` — la version `useEffect` déclenchait la règle ESLint `react-hooks/set-state-in-effect` (cascading renders).

**Vérifié** : `tsc --noEmit` et lint propres (api + web). Bout en bout via HTTP authentifié : création d'un utilisateur Acme avec les trois champs (`POST /users`), confirmés dans la réponse ; ticket créé par cet utilisateur, `GET /tickets/:id` confirme `requester.email`/`department`/`location`/`phone` présents, y compris en lecture cross-tenant (`SUPER_ADMIN` avec `?tenantId=`). Rendu SSR de `/dashboard?ticket=...` vérifié : les quatre lignes s'affichent avec les bonnes valeurs et le bon comportement conditionnel (testé avec les trois champs renseignés ; le cas "aucun champ renseigné" repose sur la même logique conditionnelle déjà lue dans le JSX, non re-testé visuellement faute d'outil navigateur). Le bouton "Confirmer" ne s'affiche pas quand il n'y a pas de changement en attente (vérifié : absent du HTML rendu pour un ticket non assigné avec sélection par défaut) — son apparition après un changement de sélection n'a pas pu être vérifiée visuellement (pas d'outil navigateur dans cet environnement). Données de test (utilisateur + ticket) supprimées après vérification.

**À confirmer visuellement par l'utilisateur** : le nouveau bloc d'infos ticket (mise en page, cas avec/sans department/location/phone) ; l'apparition/disparition du bouton "Confirmer" au fil des changements de sélection dans le `<select>` d'assignation manager ; les trois nouveaux champs dans le formulaire de création d'utilisateur (`/users`).

## Adresse : info d'entreprise (Tenant), pas d'utilisateur (User)

**Décision** (2026-08-11) : suite à la demande d'afficher l'adresse et le téléphone du client dans le bloc "Signalé par" d'un ticket, question posée à l'utilisateur sur où ajouter ces champs (formulaire `/signup` individuel, `/users` admin-entreprise, ou les deux). Réponse de l'utilisateur, plus précise que les options proposées : l'**adresse** est saisie une seule fois par le `SUPER_ADMIN` au moment de créer l'entreprise cliente (`POST /api/tenants`), alors que le **téléphone** reste une info par employé, déjà couverte par le formulaire `/users` (voir décision "Champs de contact utilisateur" ci-dessus — rien à refaire pour le téléphone).

**Pourquoi** : contrairement à `department`/`location`/`phone` (attributs personnels d'un employé), une adresse d'entreprise est une donnée d'organisation — un seul numéro/rue pour tous les employés d'Acme Corp, pas une valeur qui varie par personne. La modéliser sur `User` aurait obligé à la ressaisir (ou la dupliquer) pour chaque nouvel employé ; la modéliser sur `Tenant` la centralise là où elle logiquement appartient, et réutilise le seul point d'entrée qui crée un tenant client (`TenantsService.create`, déjà appelé une fois par entreprise).

**Implémentation** : `Tenant.address` (nullable, migration purement additive `20260811123728_add_tenant_address` — `Tenant` n'est pas RLS-protégée, donc aucune policy à toucher). Affichage sur le ticket : `TicketsService.findOne` fait désormais un fetch systématique du tenant du ticket (`id`/`name`/`slug`/`address`) et expose `tenantAddress` **indépendamment** de l'objet `tenant` — ce dernier reste réservé aux vues cross-tenant du staff interne (signal utilisé pour la colonne "Entreprise"/le badge dans le détail). Sans cette séparation, un `CLIENT` consultant son propre ticket aurait vu apparaître un badge "Entreprise" redondant (son propre nom d'entreprise sur son propre ticket), ce qui n'a pas de sens — seule l'adresse doit être universellement visible, pas le signal cross-tenant.

**Périmètre** : l'adresse n'est saisissable qu'à la création de l'entreprise (formulaire "Nouvelle entreprise cliente" sur `/directory`) — pas d'édition a posteriori pour l'instant (même limite que `department`/`location`/`phone` sur `/users`, et que le reste des formulaires de création de ce projet). Les entreprises déjà existantes (Acme Corp, Beta Corp) n'ont donc pas d'adresse tant que personne ne leur en ajoute une manuellement en base ou via un futur formulaire d'édition.

**Vérifié** : `tsc --noEmit` et lint propres (api + web). Bout en bout via HTTP authentifié : création d'un tenant client avec adresse, confirmée dans la réponse de `POST /tenants` ; ticket créé sous ce tenant — `tenantAddress` présent à la fois pour l'`ADMIN` du tenant consultant son propre ticket (sans objet `tenant`, comportement inchangé) et pour `SUPER_ADMIN` en vue cross-tenant (avec `tenant` **et** `tenantAddress` simultanément). Rendu SSR de `/dashboard?ticket=...` confirmé via `curl` authentifié. Données de test supprimées après vérification.

**À confirmer visuellement par l'utilisateur** : le nouveau champ "Adresse" sur le formulaire "Nouvelle entreprise cliente" ; la ligne "Adresse: ..." dans le bloc "Signalé par" d'un ticket.
