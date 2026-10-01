import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Proxy Redirector SaaS...');

  // 1. Seed Subscription Plans
  const plans = [
    {
      name: 'Free',
      priceMonthly: 0,
      bandwidthLimitGb: 1,
      maxDevices: 1,
      allowedRegions: ['US'],
      hasAdBlock: true,
      hasDedicatedIps: false,
    },
    {
      name: 'Basic',
      priceMonthly: 500, // $5.00
      bandwidthLimitGb: 50,
      maxDevices: 2,
      allowedRegions: ['US', 'EU', 'ASIA'],
      hasAdBlock: true,
      hasDedicatedIps: false,
    },
    {
      name: 'Pro',
      priceMonthly: 1200, // $12.00
      bandwidthLimitGb: 200,
      maxDevices: 5,
      allowedRegions: ['US', 'EU', 'ASIA', 'GLOBAL'],
      hasAdBlock: true,
      hasDedicatedIps: true,
    },
    {
      name: 'Business',
      priceMonthly: 3000, // $30.00
      bandwidthLimitGb: 1000,
      maxDevices: 15,
      allowedRegions: ['US', 'EU', 'ASIA', 'GLOBAL'],
      hasAdBlock: true,
      hasDedicatedIps: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
  }
  console.log(`✅ Seeded ${plans.length} subscription plans.`);

  // 2. Seed Default Administrator Account
  const adminEmail = 'admin@proxyredirector.io';
  const adminPasswordHash = await bcrypt.hash('AdminSecret123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'ADMIN',
      emailVerified: true,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
      role: 'ADMIN',
      emailVerified: true,
    },
  });
  console.log(`✅ Seeded administrator account: ${admin.email} (Role: ${admin.role})`);

  // 3. Seed Initial Static Dedicated Proxies
  const staticProxies = [
    {
      ip: '198.51.100.10',
      port: 1080,
      protocol: 'socks5',
      poolType: 'STATIC_DEDICATED' as const,
      tier: 'TIER_2_STATIC_ISP' as const,
      providerName: 'Self-Hosted Mesh',
      countryCode: 'US',
      city: 'New York',
      asn: 7018,
      ispName: 'AT&T Services',
      fraudScore: 2,
      isAlive: true,
      lastLatencyMs: 42.5,
      uptimePercent: 99.98,
    },
    {
      ip: '198.51.100.20',
      port: 1080,
      protocol: 'socks5',
      poolType: 'STATIC_DEDICATED' as const,
      tier: 'TIER_2_STATIC_ISP' as const,
      providerName: 'Self-Hosted Mesh',
      countryCode: 'DE',
      city: 'Frankfurt',
      asn: 3320,
      ispName: 'Deutsche Telekom AG',
      fraudScore: 0,
      isAlive: true,
      lastLatencyMs: 28.1,
      uptimePercent: 100.0,
    },
    {
      ip: '198.51.100.30',
      port: 1080,
      protocol: 'socks5',
      poolType: 'STATIC_DEDICATED' as const,
      tier: 'TIER_1_PRIVATE_VPS' as const,
      providerName: 'Private VPS Node',
      countryCode: 'SG',
      city: 'Singapore',
      asn: 4657,
      ispName: 'StarHub Ltd',
      fraudScore: 1,
      isAlive: true,
      lastLatencyMs: 55.4,
      uptimePercent: 99.95,
    },
  ];

  for (const proxy of staticProxies) {
    await prisma.staticProxy.upsert({
      where: { ip: proxy.ip },
      update: proxy,
      create: proxy,
    });
  }
  console.log(`✅ Seeded ${staticProxies.length} initial static proxies.`);

  // 4. Seed Initial Relay Servers
  const relayServers = [
    {
      name: 'us-east-relay-01',
      region: 'US-East',
      country: 'US',
      publicIp: '198.51.100.100',
      grpcPort: 50051,
      socksPort: 1080,
      httpPort: 8080,
      status: 'ONLINE' as const,
      currentLoad: 12.4,
      activeSessions: 8,
      secretKeyHash: 'dummy_hash',
    },
    {
      name: 'eu-central-relay-01',
      region: 'EU-Central',
      country: 'DE',
      publicIp: '198.51.100.200',
      grpcPort: 50051,
      socksPort: 1080,
      httpPort: 8080,
      status: 'ONLINE' as const,
      currentLoad: 18.2,
      activeSessions: 14,
      secretKeyHash: 'dummy_hash',
    },
  ];

  for (const relay of relayServers) {
    await prisma.relayServer.upsert({
      where: { publicIp: relay.publicIp },
      update: relay,
      create: relay,
    });
  }
  console.log(`✅ Seeded ${relayServers.length} relay servers.`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
