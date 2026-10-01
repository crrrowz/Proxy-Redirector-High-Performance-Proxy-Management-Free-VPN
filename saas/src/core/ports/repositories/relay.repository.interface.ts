export interface IRelayRepository {
  findBestOnlineRelay(region?: string): Promise<{ id: string; name: string; publicIp: string; socksPort: number; httpPort: number; region: string } | null>;
  upsertHeartbeat(data: { publicIp: string; currentLoad: number; activeSessions: number; region?: string; country?: string }): Promise<string>;
  markStaleOffline(staleThresholdMs: number): Promise<number>;
  countOnline(): Promise<number>;
}
