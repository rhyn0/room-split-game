import type * as Party from 'partykit/server';
import { describe, expect, it } from 'vitest';
import SplitTheRoomServer from '../party/server';
import type { ServerToClientMessage } from '../shared/types';

class MockConnection {
  public id: string;
  public messages: ServerToClientMessage[] = [];

  constructor(id: string) {
    this.id = id;
  }

  send(payload: string) {
    this.messages.push(JSON.parse(payload) as ServerToClientMessage);
  }

  lastState() {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      if (m.type === 'STATE_SYNC') return m.state;
    }
    return null;
  }
}

describe('PartyKit SplitTheRoomServer WebSocket Handler', () => {
  it('syncs personalized states across connected clients and isolates secret roles/votes', () => {
    const connections = new Map<string, MockConnection>();

    const mockRoom = {
      id: 'ABCD',
      getConnections: () => connections.values(),
    } as unknown as Party.Room;

    const server = new SplitTheRoomServer(mockRoom);

    const conn1 = new MockConnection('c1');
    const conn2 = new MockConnection('c2');
    const conn3 = new MockConnection('c3');
    connections.set('c1', conn1);
    connections.set('c2', conn2);
    connections.set('c3', conn3);

    server.onConnect(
      conn1 as unknown as Party.Connection,
      {
        request: { url: 'http://localhost:1999/party/ABCD?playerId=p1' },
      } as Party.ConnectionContext
    );
    server.onConnect(
      conn2 as unknown as Party.Connection,
      {
        request: { url: 'http://localhost:1999/party/ABCD?playerId=p2' },
      } as Party.ConnectionContext
    );
    server.onConnect(
      conn3 as unknown as Party.Connection,
      {
        request: { url: 'http://localhost:1999/party/ABCD?playerId=p3' },
      } as Party.ConnectionContext
    );

    server.onMessage(
      JSON.stringify({ type: 'JOIN_ROOM', playerId: 'p1', name: 'Alice' }),
      conn1 as unknown as Party.Connection
    );
    server.onMessage(
      JSON.stringify({ type: 'JOIN_ROOM', playerId: 'p2', name: 'Bob' }),
      conn2 as unknown as Party.Connection
    );
    server.onMessage(
      JSON.stringify({ type: 'JOIN_ROOM', playerId: 'p3', name: 'Charlie' }),
      conn3 as unknown as Party.Connection
    );

    expect(conn1.lastState()?.players).toHaveLength(3);

    // Start match
    server.onMessage(
      JSON.stringify({ type: 'START_MATCH' }),
      conn1 as unknown as Party.Connection
    );

    // p1 is Judge -> myRole is null; p2 and p3 are Voters -> myRole is populated only for themselves!
    expect(conn1.lastState()?.phase).toBe('PHASE1_JUDGE_QUESTION');
    expect(conn1.lastState()?.myRole).toBeNull();
    expect(conn2.lastState()?.myRole).not.toBeNull();
    expect(conn3.lastState()?.myRole).not.toBeNull();

    // Disconnect c2 and verify p2 is marked offline
    connections.delete('c2');
    server.onClose(conn2 as unknown as Party.Connection);
    expect(conn1.lastState()?.players.find((p) => p.id === 'p2')?.isConnected).toBe(
      false
    );
  });
});
