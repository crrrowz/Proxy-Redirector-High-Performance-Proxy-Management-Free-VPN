import { IRelayRepository } from '../../core/ports/repositories/relay.repository.interface.js';
import { prisma } from '../../database/prisma.js';

export class PrismaRelayRepository implements IRelayRepository {
  async findBestOnlineRelay(region?: string) {
    const raw = await prisma.relayServer.findFirst({
      where: {
        status: 'ONLINE',
        ...(region ? { region } : {}),
      },
      orderBy: { currentLoad: 'asc' },
    });

    if (!raw) return null;
    return {
      id: raw.id,
      name: raw.name,
      publicIp: raw.publicIp,
      socksPort: raw.socksPort,
      httpPort: raw.httpPort,
      region: raw.region,
    };
  }

  async upsertHeartbeat(data: { publicIp: string; currentLoad: number; activeSessions: number; region?: string; country?: string }): Promise<string> {
    const relay = await prisma.relayServer.upsert({
      where: { publicIp: data.publicIp },
      update: {
        lastHeartbeat: new Date(),
        currentLoad: data.currentLoad,
        activeSessions: data.activeSessions,
        status: 'ONLINE',
      },
      create: {
        name: `relay-${data.publicIp.replace(/\./g, '-')}`,
        publicIp: data.publicIp,
        region: data.region || 'US-East',
        country: data.country || 'US',
        secretKeyHash: 'none',
        status: 'ONLINE',
        currentLoad: data.currentLoad,
        activeSessions: data.activeSessions,
      },
    });
    return relay.id;
  }

  async markStaleOffline(staleThresholdMs: number): Promise<number> {
    const threshold = new Date(Date.now() - staleThresholdMs);
    const result = await prisma.relayServer.updateMany({
      where: {
        lastHeartbeat: { lt: threshold },
        status: 'ONLINE',
      },
      data: { status: 'OFFLINE' },
    });
    return result.count;
  }

  async countOnline(): Promise<number> {
    return prisma.relayServer.count({ where: { status: 'ONLINE' } });
  }
}
