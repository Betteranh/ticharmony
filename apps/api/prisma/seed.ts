import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.APP_DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'internal' },
    update: {},
    create: { slug: 'internal', name: 'Internal Support', type: 'INTERNAL' },
  });

  const passwordHash = await argon2.hash('ChangeMe123!');

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
    await tx.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: 'admin@internal.local' } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@internal.local',
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        roles: ['SUPER_ADMIN'],
      },
    });

    const networkCategory = await tx.category.upsert({
      where: { id: 'seed-cat-network' },
      update: {},
      create: {
        id: 'seed-cat-network',
        tenantId: tenant.id,
        nameFr: 'Réseau & connexion',
        nameEn: 'Network & connectivity',
      },
    });
    const accountCategory = await tx.category.upsert({
      where: { id: 'seed-cat-account' },
      update: {},
      create: {
        id: 'seed-cat-account',
        tenantId: tenant.id,
        nameFr: 'Comptes & mots de passe',
        nameEn: 'Accounts & passwords',
      },
    });

    await tx.knowledgeArticle.upsert({
      where: { id: 'seed-art-vpn' },
      update: {},
      create: {
        id: 'seed-art-vpn',
        tenantId: tenant.id,
        categoryId: networkCategory.id,
        titleFr: 'Se connecter au VPN',
        titleEn: 'Connect to the VPN',
        bodyFr:
          "1. Ouvrez le client VPN.\n2. Saisissez vos identifiants habituels.\n3. Sélectionnez le profil \"Bureau principal\".\n\nSi la connexion échoue, vérifiez votre connexion internet puis contactez le support.",
        bodyEn:
          '1. Open the VPN client.\n2. Enter your usual credentials.\n3. Select the "Main office" profile.\n\nIf the connection fails, check your internet connection then contact support.',
        visibility: 'PUBLIC',
      },
    });
    await tx.knowledgeArticle.upsert({
      where: { id: 'seed-art-wifi' },
      update: {},
      create: {
        id: 'seed-art-wifi',
        tenantId: tenant.id,
        categoryId: networkCategory.id,
        titleFr: 'Le Wi-Fi se déconnecte régulièrement',
        titleEn: 'Wi-Fi keeps disconnecting',
        bodyFr:
          "Procédure interne :\n1. Vérifiez le firmware du point d'accès.\n2. Redémarrez le point d'accès concerné.\n3. Si le problème persiste, escaladez au réseau niveau 2.",
        bodyEn:
          'Internal procedure:\n1. Check the access point firmware.\n2. Restart the affected access point.\n3. If it persists, escalate to network tier 2.',
        visibility: 'INTERNAL',
      },
    });
    await tx.knowledgeArticle.upsert({
      where: { id: 'seed-art-password' },
      update: {},
      create: {
        id: 'seed-art-password',
        tenantId: tenant.id,
        categoryId: accountCategory.id,
        titleFr: 'Réinitialiser mon mot de passe',
        titleEn: 'Reset my password',
        bodyFr:
          'Depuis la page de connexion, cliquez sur "Mot de passe oublié" et suivez les instructions reçues par e-mail.',
        bodyEn:
          'From the login page, click "Forgot password" and follow the instructions sent by email.',
        visibility: 'PUBLIC',
      },
    });
  });

  const clientTenant = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { slug: 'acme', name: 'Acme Corp', type: 'CLIENT' },
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${clientTenant.id}, true)`;

    const acmeAdmin = await tx.user.upsert({
      where: { tenantId_email: { tenantId: clientTenant.id, email: 'admin@acme.example' } },
      update: {},
      create: {
        tenantId: clientTenant.id,
        email: 'admin@acme.example',
        passwordHash,
        firstName: 'Alice',
        lastName: 'Martin',
        roles: ['ADMIN'],
      },
    });
    const acmeUser = await tx.user.upsert({
      where: { tenantId_email: { tenantId: clientTenant.id, email: 'bob@acme.example' } },
      update: {},
      create: {
        tenantId: clientTenant.id,
        email: 'bob@acme.example',
        passwordHash,
        firstName: 'Bob',
        lastName: 'Durand',
        roles: ['CUSTOMER'],
      },
    });

    await tx.asset.upsert({
      where: { tenantId_assetTag: { tenantId: clientTenant.id, assetTag: 'SD1001' } },
      update: {},
      create: {
        tenantId: clientTenant.id,
        assetTag: 'SD1001',
        type: 'LAPTOP',
        model: 'Dell Latitude 5440',
        status: 'DEPLOYED',
        assigneeId: acmeAdmin.id,
        serialNumber: 'DL5440-0001',
      },
    });
    await tx.asset.upsert({
      where: { tenantId_assetTag: { tenantId: clientTenant.id, assetTag: 'SD1002' } },
      update: {},
      create: {
        tenantId: clientTenant.id,
        assetTag: 'SD1002',
        type: 'DESKTOP',
        model: 'HP EliteDesk 800',
        status: 'DEPLOYED',
        assigneeId: acmeUser.id,
        serialNumber: 'HP800-0002',
      },
    });
    await tx.asset.upsert({
      where: { tenantId_assetTag: { tenantId: clientTenant.id, assetTag: 'SD1003' } },
      update: {},
      create: {
        tenantId: clientTenant.id,
        assetTag: 'SD1003',
        type: 'LAPTOP',
        model: 'Dell Latitude 5440',
        status: 'IN_STOCK',
        serialNumber: 'DL5440-0003',
      },
    });
    await tx.asset.upsert({
      where: { tenantId_assetTag: { tenantId: clientTenant.id, assetTag: 'NET-SW01' } },
      update: {},
      create: {
        tenantId: clientTenant.id,
        assetTag: 'NET-SW01',
        type: 'SWITCH',
        model: 'Cisco Catalyst 9200',
        status: 'DEPLOYED',
        location: 'Salle serveur A',
      },
    });
    await tx.asset.upsert({
      where: { tenantId_assetTag: { tenantId: clientTenant.id, assetTag: 'NET-RT01' } },
      update: {},
      create: {
        tenantId: clientTenant.id,
        assetTag: 'NET-RT01',
        type: 'ROUTER',
        model: 'Fortinet FortiGate 60F',
        status: 'DEPLOYED',
        location: 'Salle serveur A',
      },
    });
    await tx.asset.upsert({
      where: { tenantId_assetTag: { tenantId: clientTenant.id, assetTag: 'NET-SRV01' } },
      update: {},
      create: {
        tenantId: clientTenant.id,
        assetTag: 'NET-SRV01',
        type: 'SERVER',
        model: 'Dell PowerEdge R650',
        status: 'DEPLOYED',
        location: 'Salle serveur B',
      },
    });
  });

  console.log('Seeded tenant "internal" with admin@internal.local / ChangeMe123!');
  console.log('Seeded client tenant "acme" with admin@acme.example / ChangeMe123! and demo assets');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
