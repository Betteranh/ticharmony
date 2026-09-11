// Bulk, realistic test-data generator for the EI "DUMP de la base de données" deliverable.
// Connects with the owner role (DATABASE_URL) so it can write across every tenant without
// juggling per-tenant RLS transactions — this script is a one-off fixture loader, not part
// of the running application (which always uses the RLS-scoped APP_DATABASE_URL).
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// RNG helpers (seeded, so the dataset is reproducible)
// ---------------------------------------------------------------------------
let seed = 42;
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function pickMany<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function weightedBool(pTrue: number): boolean {
  return rand() < pTrue;
}
function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 86400000 - randInt(0, 86399) * 1000);
}

// ---------------------------------------------------------------------------
// Data pools (real Belgian-context vocabulary, no lorem ipsum)
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  'Marie', 'Sophie', 'Julien', 'Thomas', 'Camille', 'Lucas', 'Emma', 'Louis', 'Chloé', 'Nathan',
  'Léa', 'Hugo', 'Manon', 'Antoine', 'Julie', 'Maxime', 'Laura', 'Alexandre', 'Céline', 'Nicolas',
  'Charlotte', 'Kevin', 'Sarah', 'David', 'Pauline', 'Simon', 'Aurélie', 'Michael', 'Inès', 'Xavier',
  'Jan', 'Els', 'Pieter', 'An', 'Bram', 'Katrien', 'Tom', 'Sofie', 'Wouter', 'Nele',
  'Amina', 'Youssef', 'Fatima', 'Karim', 'Aylin', 'Mehmet', 'Ibrahim', 'Leyla',
  'Andrei', 'Elena', 'Duy', 'Linh', 'Grace', 'Samuel', 'Victoria', 'Benoît', 'Isabelle', 'Frédéric',
];
const LAST_NAMES = [
  'Dubois', 'Peeters', 'Janssens', 'Willems', 'Wauters', 'Martin', 'Leroy', 'Lambert', 'Simon',
  'Laurent', 'Michel', 'Rousseau', 'Fontaine', 'Lefevre', 'Dupont', 'Lejeune', 'Colson', 'Dumont',
  'De Backer', 'Van Damme', 'Claes', 'Maes', 'Jacobs', 'Goossens', 'Mertens', 'Vermeulen', 'De Smet',
  'Haddad', 'Kaya', 'El Amrani', 'Nguyen', 'Popescu', 'Renard', 'Mathieu', 'Gerard', 'Bernard',
  'Deprez', 'Lemmens', 'Hermans', 'Coppens', 'Wuyts', 'De Clercq', 'Van der Linden', 'Aksoy',
];
const PME_TYPES = [
  'Boulangerie', 'Boucherie', 'Pharmacie', 'Garage', 'Menuiserie', 'Cabinet Comptable',
  "Cabinet d'Avocats", 'Cabinet Vétérinaire', "Cabinet d'Architectes", 'Agence Immobilière',
  'Auto-École', 'Institut de Beauté', 'Salon de Coiffure', 'Restaurant', 'Traiteur',
  'Librairie-Papeterie', 'Épicerie Bio', 'Kinésithérapie', 'Pressing', 'Studio Photo',
  'Atelier de Couture', 'Imprimerie', "Bureau d'Études", 'Cabinet Dentaire', 'Opticien', 'Fleuriste',
];
const ASBL_TYPES = [
  'Maison Médicale', 'École de Devoirs', 'Crèche', 'Maison de Repos', 'Centre Culturel',
  'Fondation', 'Club Sportif', 'Association des Locataires', 'Centre de Formation',
  "Association d'Aide aux Familles", 'Maison de Jeunes', 'Bibliothèque Communautaire',
  'Épicerie Solidaire', 'Atelier Créatif', "Centre d'Accueil", 'Comité de Quartier', 'Régie de Quartier',
];
const QUALIFIERS = [
  'du Quartier', 'du Parvis', 'du Centre', 'de la Gare', 'Saint-Michel', 'Les Tilleuls',
  'Le Grenier', 'du Coin', 'de la Chapelle', 'des Étangs', 'du Bois', 'de la Fontaine',
  'Sainte-Anne', 'du Vieux Marché', "de l'Avenir", 'Solidarité', 'Les Petits Pas',
  'Les Petits Curieux', "L'Envol", 'Le Tremplin', 'Cœur de Ville', 'Nouvel Horizon',
];
const COMMUNES = [
  'Bruxelles', 'Schaerbeek', 'Ixelles', 'Anderlecht', 'Molenbeek-Saint-Jean', 'Uccle',
  'Etterbeek', 'Woluwe-Saint-Lambert', 'Saint-Gilles', 'Jette', 'Forest', 'Auderghem',
  'Liège', 'Namur', 'Charleroi', 'Mons', 'Tournai', 'Louvain-la-Neuve', 'Wavre', 'Nivelles',
];
const STREETS = [
  'rue de la Loi', 'avenue Louise', 'chaussée de Wavre', 'rue Neuve', 'rue du Marché',
  'avenue de Tervueren', 'rue de la Paix', 'boulevard Anspach', 'rue Haute', 'place Flagey',
];

function makeCompanyName(usedNames: Set<string>): { name: string; isAsbl: boolean } {
  for (let attempt = 0; attempt < 50; attempt++) {
    const isAsbl = weightedBool(0.4);
    let name: string;
    if (isAsbl) {
      name = `${pick(ASBL_TYPES)} ${pick(QUALIFIERS)} ASBL`;
    } else {
      const pattern = randInt(0, 2);
      const type = pick(PME_TYPES);
      const surname = pick(LAST_NAMES);
      name =
        pattern === 0 ? `${type} ${surname}` :
        pattern === 1 ? `${type} ${pick(QUALIFIERS)}` :
        `${type} ${surname} & Fils`;
    }
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return { name, isAsbl };
    }
  }
  const fallback = `${pick(PME_TYPES)} ${pick(LAST_NAMES)} ${randInt(2, 99)}`;
  usedNames.add(fallback);
  return { name: fallback, isAsbl: false };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

const CATEGORY_POOL: [string, string][] = [
  ['Réseau & connexion', 'Network & connectivity'],
  ['Comptes & mots de passe', 'Accounts & passwords'],
  ['Matériel informatique', 'Hardware'],
  ['Logiciels & licences', 'Software & licensing'],
  ['Imprimantes', 'Printers'],
  ['Messagerie électronique', 'Email'],
  ['Téléphonie', 'Telephony'],
  ['Sauvegarde & données', 'Backup & data'],
  ['Sécurité', 'Security'],
  ['Demande générale', 'General request'],
];

const TICKET_TEMPLATES: { title: string; body: string; category: number }[] = [
  { title: 'Imprimante {model} hors service', body: "L'imprimante {model} au {location} n'imprime plus depuis ce matin, message d'erreur E-04 affiché sur l'écran.", category: 4 },
  { title: 'Impossible de se connecter au VPN', body: "Depuis mon {device}, la connexion VPN échoue systématiquement après la saisie du mot de passe.", category: 0 },
  { title: 'Demande de réinitialisation de mot de passe', body: "Je n'arrive plus à me connecter à mon compte, le lien de réinitialisation reçu par e-mail ne fonctionne pas.", category: 1 },
  { title: 'Écran externe ne s\'allume plus', body: "L'écran externe branché sur mon {device} reste noir malgré plusieurs redémarrages.", category: 2 },
  { title: 'Demande d\'installation de {software}', body: "Pourriez-vous installer {software} sur mon poste ? J'en ai besoin pour mon travail quotidien.", category: 3 },
  { title: 'Boîte mail pleine', body: "Je reçois un message d'erreur indiquant que ma boîte mail a atteint son quota de stockage.", category: 5 },
  { title: 'Problème de synchronisation des e-mails', body: "Les e-mails ne se synchronisent plus sur mon {device} depuis hier après-midi.", category: 5 },
  { title: 'Téléphone fixe sans tonalité', body: "Le poste téléphonique du bureau n'a plus de tonalité depuis ce matin.", category: 6 },
  { title: 'Demande de sauvegarde urgente', body: "Pourriez-vous vérifier que la sauvegarde automatique de nos documents fonctionne bien ? Nous avons eu une frayeur hier.", category: 7 },
  { title: 'Suspicion de tentative de phishing', body: "J'ai reçu un e-mail suspect demandant mes identifiants, pouvez-vous vérifier ?", category: 8 },
  { title: 'Nouveau collaborateur : création de compte', body: "Un nouveau collaborateur commence lundi prochain, pourriez-vous préparer son compte et son matériel ?", category: 9 },
  { title: 'Lenteur générale du poste de travail', body: "Mon {device} est devenu très lent depuis quelques jours, même pour ouvrir un simple document.", category: 2 },
  { title: 'Wi-Fi instable dans les bureaux', body: "La connexion Wi-Fi se coupe régulièrement dans la zone {location}.", category: 0 },
  { title: 'Licence {software} expirée', body: "Un message indique que ma licence {software} a expiré, pourriez-vous la renouveler ?", category: 3 },
  { title: 'Demande de matériel supplémentaire', body: "Nous aurions besoin d'un {device} supplémentaire pour le {location}.", category: 2 },
  { title: 'Bourrage papier récurrent', body: "L'imprimante {model} fait des bourrages papier plusieurs fois par jour.", category: 4 },
  { title: 'Compte verrouillé après plusieurs tentatives', body: "Mon compte semble verrouillé après plusieurs tentatives de connexion infructueuses.", category: 1 },
  { title: 'Perte de données sur un document partagé', body: "Un document partagé semble avoir perdu des modifications récentes, pouvez-vous vérifier l'historique ?", category: 7 },
  { title: 'Casque audio défectueux pour les appels', body: "Le casque audio fourni ne fonctionne plus correctement pendant les appels en visioconférence.", category: 2 },
  { title: 'Demande de formation sur {software}', body: "Serait-il possible d'organiser une courte formation sur {software} pour notre équipe ?", category: 9 },
];
const SOFTWARE = ['Office 365', 'Adobe Acrobat Pro', 'Zoom', 'Teams', 'Sage Comptabilité', 'Canva Pro', 'Slack', 'AnyDesk', 'pCloud', '7-Zip'];
const DEVICES = ['ordinateur portable', 'ordinateur de bureau', 'PC portable', 'poste de travail'];
const LOCATIONS = ['1er étage', '2e étage', 'accueil', 'salle de réunion', 'bureau administratif', 'rez-de-chaussée', 'open space'];
const PRINTER_MODELS = ['HP LaserJet Pro M404', 'Canon imageRUNNER 2530i', 'Brother HL-L2350DW', 'Epson EcoTank L3250'];

const COMMENT_TEMPLATES_AGENT = [
  "Bonjour, je prends en charge votre demande. Pouvez-vous préciser le modèle exact de l'appareil concerné ?",
  "Merci pour ces précisions. Je vérifie de mon côté et reviens vers vous rapidement.",
  "Le problème semble résolu de notre côté, pouvez-vous confirmer que tout fonctionne normalement à présent ?",
  "Un technicien passera sur place demain matin pour intervenir.",
  "J'ai relancé le service concerné, la situation devrait revenir à la normale sous peu.",
  "Pourriez-vous essayer de redémarrer l'appareil et me confirmer si cela résout le problème ?",
  "C'est noté, je transmets votre demande à l'équipe réseau pour un suivi plus approfondi.",
];
const COMMENT_TEMPLATES_CUSTOMER = [
  "Merci pour votre réactivité, j'attends votre retour.",
  "C'est toujours le même problème malheureusement.",
  "Parfait, tout fonctionne à nouveau normalement, merci beaucoup !",
  "Voici les informations demandées, en espérant que cela aide.",
  "Le problème est revenu ce matin, pourriez-vous revérifier ?",
  "Merci, je confirme que c'est résolu de mon côté.",
  "Pas de souci, je reste disponible si vous avez besoin d'informations complémentaires.",
];

const KB_TOPICS: { titleFr: string; titleEn: string; bodyFr: string; bodyEn: string; catIdx: number }[] = [
  { titleFr: 'Se connecter au VPN', titleEn: 'Connect to the VPN', bodyFr: '1. Ouvrez le client VPN.\n2. Saisissez vos identifiants habituels.\n3. Sélectionnez le profil "Bureau principal".\n\nEn cas d\'échec, vérifiez votre connexion internet puis contactez le support.', bodyEn: '1. Open the VPN client.\n2. Enter your usual credentials.\n3. Select the "Main office" profile.\n\nIf it fails, check your internet connection then contact support.', catIdx: 0 },
  { titleFr: 'Réinitialiser mon mot de passe', titleEn: 'Reset my password', bodyFr: 'Depuis la page de connexion, cliquez sur "Mot de passe oublié" et suivez les instructions reçues par e-mail. Le lien est valable 30 minutes.', bodyEn: 'From the login page, click "Forgot password" and follow the instructions sent by email. The link is valid for 30 minutes.', catIdx: 1 },
  { titleFr: 'Résoudre un bourrage papier', titleEn: 'Clear a paper jam', bodyFr: "1. Ouvrez le capot avant de l'imprimante.\n2. Retirez délicatement le papier coincé.\n3. Refermez le capot et relancez l'impression.", bodyEn: '1. Open the front cover of the printer.\n2. Gently remove the jammed paper.\n3. Close the cover and retry printing.', catIdx: 4 },
  { titleFr: 'Configurer sa messagerie sur mobile', titleEn: 'Set up email on mobile', bodyFr: "Ajoutez un compte de type Exchange dans les paramètres de messagerie de votre téléphone, avec votre adresse professionnelle et votre mot de passe habituel.", bodyEn: 'Add an Exchange-type account in your phone\'s mail settings, using your work email address and usual password.', catIdx: 5 },
  { titleFr: 'Libérer de l\'espace dans sa boîte mail', titleEn: 'Free up mailbox space', bodyFr: "Videz régulièrement votre dossier \"Éléments supprimés\" et archivez les anciens messages avec pièces jointes volumineuses.", bodyEn: 'Regularly empty your "Deleted Items" folder and archive old messages with large attachments.', catIdx: 5 },
  { titleFr: 'Reconnaître un e-mail de phishing', titleEn: 'Recognize a phishing email', bodyFr: "Méfiez-vous des e-mails demandant vos identifiants en urgence, des liens suspects et des expéditeurs inconnus. En cas de doute, contactez le support avant de cliquer.", bodyEn: 'Be wary of emails urgently requesting your credentials, suspicious links, and unknown senders. When in doubt, contact support before clicking.', catIdx: 8 },
  { titleFr: 'Demander l\'installation d\'un logiciel', titleEn: 'Request software installation', bodyFr: "Ouvrez un ticket avec le nom exact du logiciel souhaité et sa justification professionnelle. Le délai de traitement habituel est de 2 jours ouvrés.", bodyEn: 'Open a ticket with the exact name of the requested software and its business justification. Usual processing time is 2 business days.', catIdx: 3 },
  { titleFr: 'Redémarrer correctement son poste', titleEn: 'Properly restart your workstation', bodyFr: "Enregistrez vos documents ouverts, fermez les applications, puis utilisez le menu Démarrer > Redémarrer plutôt qu'un arrêt forcé.", bodyEn: 'Save your open documents, close applications, then use Start menu > Restart rather than a forced shutdown.', catIdx: 2 },
  { titleFr: 'Utiliser le stockage partagé', titleEn: 'Use shared storage', bodyFr: "Les documents d'équipe doivent être enregistrés dans le dossier partagé plutôt que sur le disque local, afin d'être inclus dans la sauvegarde automatique.", bodyEn: 'Team documents should be saved in the shared folder rather than the local disk, so they are included in automatic backups.', catIdx: 7 },
  { titleFr: 'Améliorer la réception Wi-Fi', titleEn: 'Improve Wi-Fi reception', bodyFr: "Rapprochez-vous du point d'accès le plus proche et évitez les obstacles métalliques. Si le problème persiste, signalez la zone concernée.", bodyEn: 'Move closer to the nearest access point and avoid metal obstacles. If it persists, report the affected area.', catIdx: 0 },
  { titleFr: 'Créer un compte pour un nouveau collaborateur', titleEn: 'Create an account for a new team member', bodyFr: "Procédure interne : ouvrir un ticket au moins 3 jours ouvrés avant l'arrivée, en précisant le nom, la fonction et le matériel nécessaire.", bodyEn: 'Internal procedure: open a ticket at least 3 business days before arrival, specifying name, role, and required equipment.', catIdx: 9 },
  { titleFr: 'Utiliser la visioconférence', titleEn: 'Use video conferencing', bodyFr: "Testez votre micro et votre caméra avant chaque réunion importante via le menu paramètres de l'application de visioconférence.", bodyEn: "Test your microphone and camera before each important meeting via the video conferencing app's settings menu.", catIdx: 6 },
  { titleFr: 'Éviter la perte de données', titleEn: 'Avoid data loss', bodyFr: "Enregistrez fréquemment votre travail et privilégiez le stockage partagé, sauvegardé automatiquement chaque nuit.", bodyEn: 'Save your work frequently and prefer shared storage, which is backed up automatically every night.', catIdx: 7 },
  { titleFr: 'Signaler un équipement défectueux', titleEn: 'Report faulty equipment', bodyFr: "Ouvrez un ticket dans la catégorie Matériel informatique en précisant le numéro d'inventaire de l'équipement si vous le connaissez.", bodyEn: 'Open a ticket in the Hardware category, specifying the equipment inventory number if known.', catIdx: 2 },
  { titleFr: 'Comprendre les niveaux de priorité', titleEn: 'Understand priority levels', bodyFr: "Urgente : blocage total. Haute : impact important mais contournable. Moyenne : gêne modérée. Basse : amélioration non bloquante.", bodyEn: 'Urgent: total blockage. High: significant impact but workaroundable. Medium: moderate inconvenience. Low: non-blocking improvement.', catIdx: 9 },
];

const ASSET_MODELS: { type: 'LAPTOP' | 'DESKTOP' | 'SWITCH' | 'ROUTER' | 'SERVER' | 'PRINTER' | 'OTHER'; models: string[] }[] = [
  { type: 'LAPTOP', models: ['Dell Latitude 5440', 'Lenovo ThinkPad T14', 'HP EliteBook 840', 'Dell Latitude 7440'] },
  { type: 'DESKTOP', models: ['HP EliteDesk 800', 'Dell OptiPlex 7010', 'Lenovo ThinkCentre M70'] },
  { type: 'SWITCH', models: ['Cisco Catalyst 9200', 'Ubiquiti UniFi Switch 24', 'Netgear GS724T'] },
  { type: 'ROUTER', models: ['Fortinet FortiGate 60F', 'Cisco ISR 1100', 'Ubiquiti Dream Machine Pro'] },
  { type: 'SERVER', models: ['Dell PowerEdge R650', 'HPE ProLiant DL380', 'Lenovo ThinkSystem SR650'] },
  { type: 'PRINTER', models: PRINTER_MODELS },
  { type: 'OTHER', models: ['Écran Dell 24" P2422H', 'Casque Jabra Evolve2', 'Webcam Logitech Brio', 'Onduleur APC Smart-UPS 1500'] },
];
const LICENSE_NAMES = ['Office 365 Business', 'Adobe Creative Cloud', 'pCloud 2 To', 'Bitdefender GravityZone', 'Zoom Pro', 'Canva Pro', 'Sage Comptabilité 50', '1Password Teams'];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('--- Génération du jeu de données ---');
  const passwordHash = await argon2.hash('ChangeMe123!');
  const usedNames = new Set<string>();
  const usedEmails = new Set<string>();

  function makeEmail(first: string, last: string, domain: string): string {
    const base = slugify(`${first}.${last}`);
    let email = `${base}@${domain}`;
    let n = 1;
    while (usedEmails.has(email)) {
      email = `${base}${n}@${domain}`;
      n++;
    }
    usedEmails.add(email);
    return email;
  }

  // --- 1. Tenants -----------------------------------------------------------
  const internalTenant = await prisma.tenant.create({
    data: {
      slug: 'internal',
      name: 'TIC Harmony',
      type: 'INTERNAL',
      locale: 'FR',
      address: 'Quai de Willebroeck 33, 1000 Bruxelles',
    },
  });

  const CLIENT_TENANT_COUNT = 109;
  const clientTenants: { id: string; name: string; isAsbl: boolean }[] = [];
  for (let i = 0; i < CLIENT_TENANT_COUNT; i++) {
    const { name, isAsbl } = makeCompanyName(usedNames);
    const commune = pick(COMMUNES);
    const street = pick(STREETS);
    const slugBase = slugify(name);
    let slug = slugBase;
    let n = 1;
    // slug uniqueness guard (companies names are already de-duplicated, but slugify can collapse two)
    while (clientTenants.some((t) => t.name === name)) break;
    const tenant = await prisma.tenant.create({
      data: {
        slug: `${slug}-${1000 + i}`,
        name,
        type: 'CLIENT',
        locale: weightedBool(0.12) ? 'EN' : 'FR',
        address: `${randInt(1, 250)} ${street}, ${randInt(1000, 1210)} ${commune}`,
        createdAt: daysAgo(randInt(30, 400)),
      },
    });
    clientTenants.push({ id: tenant.id, name, isAsbl });
    if ((i + 1) % 20 === 0) console.log(`  tenants: ${i + 1}/${CLIENT_TENANT_COUNT}`);
  }
  console.log(`Tenants créés: ${1 + clientTenants.length}`);

  // --- 2. Categories ----------------------------------------------------------
  const categoriesByTenant = new Map<string, { id: string }[]>();
  let categoryCount = 0;
  for (const tenant of [{ id: internalTenant.id }, ...clientTenants]) {
    const picks = pickMany(CATEGORY_POOL.map((c, idx) => idx), randInt(3, 6));
    const cats: { id: string }[] = [];
    for (const idx of picks) {
      const [nameFr, nameEn] = CATEGORY_POOL[idx];
      const c = await prisma.category.create({
        data: { tenantId: tenant.id, nameFr, nameEn },
      });
      cats.push({ id: c.id });
      categoryCount++;
    }
    categoriesByTenant.set(tenant.id, cats);
  }
  console.log(`Categories créées: ${categoryCount}`);

  // --- 3. Users ---------------------------------------------------------------
  type SeedUser = { id: string; tenantId: string; roles: string[] };
  const internalStaff: SeedUser[] = [];
  const usersByTenant = new Map<string, SeedUser[]>();

  const superAdminFirst = pick(FIRST_NAMES);
  const superAdminLast = pick(LAST_NAMES);
  const superAdmin = await prisma.user.create({
    data: {
      tenantId: internalTenant.id,
      email: 'admin@internal.local',
      passwordHash,
      firstName: superAdminFirst,
      lastName: superAdminLast,
      roles: ['SUPER_ADMIN'],
      department: 'Direction',
      createdAt: daysAgo(420),
    },
  });
  internalStaff.push({ id: superAdmin.id, tenantId: internalTenant.id, roles: superAdmin.roles });

  for (let i = 0; i < 5; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const u = await prisma.user.create({
      data: {
        tenantId: internalTenant.id,
        email: makeEmail(first, last, 'ticharmony.be'),
        passwordHash,
        firstName: first,
        lastName: last,
        roles: ['ADMIN'],
        department: pick(['Support', 'Facturation', 'Opérations']),
        createdAt: daysAgo(randInt(60, 400)),
      },
    });
    internalStaff.push({ id: u.id, tenantId: internalTenant.id, roles: u.roles });
  }
  for (let i = 0; i < 14; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const u = await prisma.user.create({
      data: {
        tenantId: internalTenant.id,
        email: makeEmail(first, last, 'ticharmony.be'),
        passwordHash,
        firstName: first,
        lastName: last,
        roles: ['AGENT'],
        department: 'Support technique',
        createdAt: daysAgo(randInt(30, 400)),
      },
    });
    internalStaff.push({ id: u.id, tenantId: internalTenant.id, roles: u.roles });
  }
  usersByTenant.set(internalTenant.id, internalStaff);
  console.log(`Staff interne créé: ${internalStaff.length}`);

  let clientUserCount = 0;
  for (const tenant of clientTenants) {
    const n = randInt(1, 5);
    const domain = `${slugify(tenant.name)}.example`;
    const tenantUsers: SeedUser[] = [];
    for (let i = 0; i < n; i++) {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      const u = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: makeEmail(first, last, domain),
          passwordHash,
          firstName: first,
          lastName: last,
          roles: ['CUSTOMER'],
          phone: `04${randInt(60, 99)} ${randInt(10, 99)} ${randInt(10, 99)} ${randInt(10, 99)}`,
          status: weightedBool(0.06) ? 'DISABLED' : 'ACTIVE',
          createdAt: daysAgo(randInt(1, 380)),
        },
      });
      tenantUsers.push({ id: u.id, tenantId: tenant.id, roles: u.roles });
      clientUserCount++;
    }
    usersByTenant.set(tenant.id, tenantUsers);
    if (clientUserCount % 50 < n) console.log(`  users: ~${clientUserCount}`);
  }
  console.log(`Users clients créés: ${clientUserCount}`);

  // --- 4. Tickets, comments, attachments, notifications, audit logs -----------
  let ticketCount = 0, commentCount = 0, attachmentCount = 0, notifCount = 0, auditCount = 0;
  const agentPool = internalStaff.filter((u) => u.roles.includes('AGENT') || u.roles.includes('ADMIN'));

  for (const tenant of clientTenants) {
    const tenantUsers = usersByTenant.get(tenant.id)!;
    const customers = tenantUsers.filter((u) => u.roles.includes('CUSTOMER'));
    if (customers.length === 0) continue;
    const cats = categoriesByTenant.get(tenant.id)!;
    const ticketsForTenant = randInt(2, 12);

    for (let n = 1; n <= ticketsForTenant; n++) {
      const tpl = pick(TICKET_TEMPLATES);
      const title = tpl.title
        .replace('{model}', pick(PRINTER_MODELS))
        .replace('{software}', pick(SOFTWARE));
      const body = tpl.body
        .replace('{model}', pick(PRINTER_MODELS))
        .replace('{device}', pick(DEVICES))
        .replace('{location}', pick(LOCATIONS))
        .replace('{software}', pick(SOFTWARE));
      const requester = pick(customers);
      const status = pick(['OPEN', 'OPEN', 'IN_PROGRESS', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'RESOLVED', 'CLOSED', 'CLOSED'] as const);
      const priority = pick(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'URGENT'] as const);
      const assignee = status === 'OPEN' && weightedBool(0.4) ? null : pick(agentPool);
      const createdAt = daysAgo(randInt(1, 350));
      const isClosed = status === 'CLOSED' || status === 'RESOLVED';
      const closedAt = isClosed ? new Date(createdAt.getTime() + randInt(1, 10) * 86400000) : null;

      const ticket = await prisma.ticket.create({
        data: {
          tenantId: tenant.id,
          number: n,
          title,
          description: body,
          status,
          priority,
          categoryId: cats.length ? pick(cats).id : null,
          requesterId: requester.id,
          assigneeId: assignee?.id ?? null,
          createdAt,
          updatedAt: closedAt ?? createdAt,
          closedAt,
        },
      });
      ticketCount++;

      await prisma.auditLog.create({
        data: { tenantId: tenant.id, actorId: requester.id, action: 'ticket.created', entity: 'Ticket', entityId: ticket.id, createdAt },
      });
      auditCount++;

      if (assignee) {
        await prisma.notification.create({
          data: { userId: assignee.id, type: 'TICKET_ASSIGNED', channel: 'IN_APP', payload: { ticketId: ticket.id, ticketNumber: ticket.number, tenantName: tenant.name }, createdAt: new Date(createdAt.getTime() + 60000) },
        });
        notifCount++;
        await prisma.auditLog.create({
          data: { tenantId: tenant.id, actorId: assignee.id, action: 'ticket.assigned', entity: 'Ticket', entityId: ticket.id, createdAt: new Date(createdAt.getTime() + 60000) },
        });
        auditCount++;
      }

      // Comments
      const commentN = status === 'OPEN' && !assignee ? randInt(0, 1) : randInt(1, 5);
      let lastCommentAt = createdAt;
      for (let c = 0; c < commentN; c++) {
        const fromAgent = assignee && (c % 2 === 1 || !customers.length);
        const author = fromAgent ? assignee! : requester;
        const isInternal = !!fromAgent && weightedBool(0.15);
        lastCommentAt = new Date(lastCommentAt.getTime() + randInt(1, 48) * 3600000);
        if (closedAt && lastCommentAt > closedAt) lastCommentAt = new Date(closedAt.getTime() - 3600000);
        const comment = await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            authorId: author.id,
            body: fromAgent ? pick(COMMENT_TEMPLATES_AGENT) : pick(COMMENT_TEMPLATES_CUSTOMER),
            isInternal,
            createdAt: lastCommentAt,
          },
        });
        commentCount++;

        if (weightedBool(0.12)) {
          await prisma.ticketAttachment.create({
            data: {
              ticketId: ticket.id,
              commentId: comment.id,
              fileUrl: `/uploads/${ticket.id}/${slugify('capture-ecran-' + randInt(1000, 9999))}.png`,
              filename: pick(['capture_ecran.png', 'photo_probleme.jpg', 'rapport_erreur.pdf', 'facture.pdf']),
              uploadedBy: author.id,
              createdAt: lastCommentAt,
            },
          });
          attachmentCount++;
        }

        if (!isInternal) {
          const recipient = fromAgent ? requester : assignee;
          if (recipient) {
            await prisma.notification.create({
              data: { userId: recipient.id, type: 'TICKET_COMMENT', channel: 'IN_APP', payload: { ticketId: ticket.id, ticketNumber: ticket.number, ticketTitle: ticket.title }, readAt: weightedBool(0.5) ? new Date(lastCommentAt.getTime() + 3600000) : null, createdAt: lastCommentAt },
            });
            notifCount++;
          }
        }
      }

      if (isClosed) {
        await prisma.notification.create({
          data: { userId: requester.id, type: status === 'RESOLVED' ? 'TICKET_RESOLVED' : 'TICKET_CLOSED', channel: 'IN_APP', payload: { ticketId: ticket.id, ticketNumber: ticket.number, ticketTitle: ticket.title }, readAt: weightedBool(0.6) ? closedAt : null, createdAt: closedAt! },
        });
        notifCount++;
        await prisma.auditLog.create({
          data: { tenantId: tenant.id, actorId: assignee?.id ?? requester.id, action: `ticket.${status.toLowerCase()}`, entity: 'Ticket', entityId: ticket.id, createdAt: closedAt! },
        });
        auditCount++;
      }
    }
    if (ticketCount % 100 < ticketsForTenant) console.log(`  tickets: ~${ticketCount}`);
  }
  console.log(`Tickets créés: ${ticketCount}, commentaires: ${commentCount}, pièces jointes: ${attachmentCount}, notifications: ${notifCount}, audit logs: ${auditCount}`);

  // --- 5. Knowledge base --------------------------------------------------------
  let kbCount = 0;
  const internalCats = categoriesByTenant.get(internalTenant.id)!;
  for (const topic of KB_TOPICS) {
    await prisma.knowledgeArticle.create({
      data: {
        tenantId: null,
        categoryId: internalCats.length ? pick(internalCats).id : null,
        titleFr: topic.titleFr,
        titleEn: topic.titleEn,
        bodyFr: topic.bodyFr,
        bodyEn: topic.bodyEn,
        visibility: 'PUBLIC',
        createdAt: daysAgo(randInt(30, 400)),
      },
    });
    kbCount++;
  }
  for (let i = 0; i < 12; i++) {
    const topic = pick(KB_TOPICS);
    await prisma.knowledgeArticle.create({
      data: {
        tenantId: internalTenant.id,
        categoryId: internalCats.length ? pick(internalCats).id : null,
        titleFr: `[Interne] ${topic.titleFr}`,
        titleEn: `[Internal] ${topic.titleEn}`,
        bodyFr: `Procédure interne TIC Harmony :\n${topic.bodyFr}`,
        bodyEn: `TIC Harmony internal procedure:\n${topic.bodyEn}`,
        visibility: 'INTERNAL',
        createdAt: daysAgo(randInt(30, 400)),
      },
    });
    kbCount++;
  }
  const kbTenants = pickMany(clientTenants, 45);
  for (const tenant of kbTenants) {
    const cats = categoriesByTenant.get(tenant.id)!;
    const n = randInt(1, 3);
    for (let i = 0; i < n; i++) {
      const topic = pick(KB_TOPICS);
      await prisma.knowledgeArticle.create({
        data: {
          tenantId: tenant.id,
          categoryId: cats.length ? pick(cats).id : null,
          titleFr: `${topic.titleFr} — ${tenant.name}`,
          titleEn: `${topic.titleEn} — ${tenant.name}`,
          bodyFr: topic.bodyFr,
          bodyEn: topic.bodyEn,
          visibility: 'INTERNAL',
          createdAt: daysAgo(randInt(10, 300)),
        },
      });
      kbCount++;
    }
  }
  console.log(`Articles de base de connaissances créés: ${kbCount}`);

  // --- 6. Assets, asset notes, user licenses ------------------------------------
  let assetCount = 0, assetNoteCount = 0, licenseCount = 0;

  async function makeAssetsForTenant(tenantId: string, users: SeedUser[], count: number, tagPrefix: string) {
    for (let i = 0; i < count; i++) {
      const category = pick(ASSET_MODELS);
      const model = pick(category.models);
      const assignable = category.type === 'LAPTOP' || category.type === 'DESKTOP';
      const assignee = assignable && users.length && weightedBool(0.75) ? pick(users) : null;
      const status = assignee ? 'DEPLOYED' : pick(['IN_STOCK', 'IN_STOCK', 'DEPLOYED', 'RETIRED'] as const);
      const asset = await prisma.asset.create({
        data: {
          tenantId,
          assetTag: `${tagPrefix}-${String(i + 1).padStart(4, '0')}`,
          type: category.type,
          model,
          status: assignee ? 'DEPLOYED' : status,
          assigneeId: assignee?.id ?? null,
          location: assignee ? null : pick(LOCATIONS),
          serialNumber: `${slugify(model).toUpperCase().slice(0, 8)}-${randInt(10000, 99999)}`,
          createdAt: daysAgo(randInt(10, 400)),
        },
      });
      assetCount++;
      if (weightedBool(0.45)) {
        await prisma.assetNote.create({
          data: {
            assetId: asset.id,
            label: pick(['Mot de passe BIOS', 'Code antivol', "Référence garantie", 'Contact fournisseur', 'Note de configuration']),
            value: pick(['Voir coffre-fort du bureau', `Garantie jusqu'au ${randInt(2026, 2029)}`, 'Contacter le revendeur pour SAV', 'Configuration standard entreprise']),
            sensitive: weightedBool(0.3),
            createdAt: daysAgo(randInt(5, 300)),
          },
        });
        assetNoteCount++;
      }
    }
  }

  await makeAssetsForTenant(internalTenant.id, internalStaff, 15, 'TIC');
  for (const tenant of clientTenants) {
    const users = usersByTenant.get(tenant.id) ?? [];
    const n = randInt(1, 4);
    await makeAssetsForTenant(tenant.id, users, n, slugify(tenant.name).toUpperCase().slice(0, 6) || 'AST');
  }
  console.log(`Assets créés: ${assetCount}, notes d'assets: ${assetNoteCount}`);

  const allUsers = [...internalStaff, ...[...usersByTenant.values()].flat()];
  for (const u of allUsers) {
    if (weightedBool(0.42)) {
      const name = pick(LICENSE_NAMES);
      await prisma.userLicense.create({
        data: {
          userId: u.id,
          name,
          email: `licence.${slugify(name)}@${randInt(1, 999)}.example`,
          password: `Lic-${randInt(10000, 99999)}!`,
          createdAt: daysAgo(randInt(5, 380)),
        },
      });
      licenseCount++;
    }
  }
  console.log(`Licences utilisateur créées: ${licenseCount}`);

  // --- Extra audit logs for user/tenant lifecycle, to comfortably clear 100 ------
  for (const tenant of clientTenants) {
    const users = usersByTenant.get(tenant.id) ?? [];
    for (const u of users) {
      await prisma.auditLog.create({
        data: { tenantId: tenant.id, actorId: internalStaff.find((s) => s.roles.includes('ADMIN'))!.id, action: 'user.created', entity: 'User', entityId: u.id, createdAt: daysAgo(randInt(1, 380)) },
      });
      auditCount++;
    }
  }
  console.log(`Audit logs (total): ${auditCount}`);

  console.log('\n--- Terminé ---');
  console.log(`Tenants: ${1 + clientTenants.length}`);
  console.log(`Users: ${internalStaff.length + clientUserCount}`);
  console.log(`Categories: ${categoryCount}`);
  console.log(`Tickets: ${ticketCount}`);
  console.log(`TicketComments: ${commentCount}`);
  console.log(`TicketAttachments: ${attachmentCount}`);
  console.log(`Notifications: ${notifCount}`);
  console.log(`KnowledgeArticles: ${kbCount}`);
  console.log(`Assets: ${assetCount}`);
  console.log(`AssetNotes: ${assetNoteCount}`);
  console.log(`UserLicenses: ${licenseCount}`);
  console.log(`AuditLogs: ${auditCount}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
