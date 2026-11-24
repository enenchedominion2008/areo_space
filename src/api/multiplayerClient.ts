import type {
  CoopClientToServerMessage,
  CoopServerToClientMessage,
  OpenRoomListing,
  RoomPlayerProfile,
  RoomStatePayload,
} from '../game/multiplayerTypes';

export type WsConnStatus = 'disconnected' | 'connecting' | 'connected';

export interface MultiplayerClientHandlers {
  onStatusChange?: (status: WsConnStatus) => void;
  onWelcome?: (playerId: string) => void;
  onRoomList?: (rooms: OpenRoomListing[]) => void;
  onRoomState?: (room: RoomStatePayload, yourId: string) => void;
  onRoomError?: (message: string) => void;
  onConnectionIssue?: (message: string | null) => void;
  onGameStarted?: (room: RoomStatePayload) => void;
  onReturnedLobby?: (room: RoomStatePayload) => void;
  onGameMessage?: (msg: CoopServerToClientMessage) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private handlers: MultiplayerClientHandlers;
  private status: WsConnStatus = 'disconnected';
  private pendingQueue: CoopClientToServerMessage[] = [];
  private disposed = false;
  private autoReconnect = false;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private connectTimeoutTimer: number | null = null;
  private pingTimer: number | null = null;
  private wakingServer = false;
  private activeLobbySession: {
    code: string;
    playerId: string;
    profile: RoomPlayerProfile;
  } | null = null;

  private readonly handleOnline = () => {
    if (!this.disposed && this.autoReconnect) {
      this.reconnectAttempts = 0;
      this.connect();
    }
  };

  private readonly handleVisibility = () => {
    if (
      !this.disposed &&
      this.autoReconnect &&
      document.visibilityState === 'visible' &&
      (!this.ws || this.ws.readyState !== WebSocket.OPEN)
    ) {
      this.reconnectAttempts = 0;
      this.connect();
    }
  };

  constructor(handlers: MultiplayerClientHandlers) {
    this.handlers = handlers;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
  }

  public setHandlers(handlers: MultiplayerClientHandlers): void {
    this.handlers = handlers;
  }

  public getStatus(): WsConnStatus {
    return this.status;
  }

  public setAutoReconnect(enabled: boolean): void {
    this.autoReconnect = enabled;
    if (!enabled) {
      this.clearReconnectTimer();
    }
  }

  public reconnectNow(): void {
    if (this.disposed) return;
    this.clearReconnectTimer();
    this.clearConnectTimeout();
    this.reconnectAttempts = 0;
    if (this.ws) {
      const old = this.ws;
      this.ws = null;
      try {
        old.close();
      } catch {
        // Ignore close errors
      }
    }
    this.connect();
  }

  public connect(): void {
    if (this.disposed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.clearReconnectTimer();
    this.clearConnectTimeout();

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    this.updateStatus('connecting');

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.updateStatus('disconnected');
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    this.connectTimeoutTimer = window.setTimeout(() => {
      if (this.ws === socket && socket.readyState === WebSocket.CONNECTING) {
        try {
          socket.close();
        } catch {
          // Ignore timeout close failure
        }
        this.ws = null;
        this.updateStatus('disconnected');
        this.wakeBackendHttp();
        this.scheduleReconnect();
      }
    }, 8500);

    socket.onopen = () => {
      this.clearConnectTimeout();
      if (this.disposed || this.ws !== socket) {
        socket.close();
        return;
      }
      this.reconnectAttempts = 0;
      this.handlers.onConnectionIssue?.(null);
      this.updateStatus('connected');
      this.startKeepalive();

      if (this.activeLobbySession) {
        socket.send(
          JSON.stringify({
            type: 'room:rejoin',
            code: this.activeLobbySession.code,
            previousPlayerId: this.activeLobbySession.playerId,
            profile: this.activeLobbySession.profile,
          } satisfies CoopClientToServerMessage)
        );
      }

      while (this.pendingQueue.length > 0) {
        const queued = this.pendingQueue.shift()!;
        socket.send(JSON.stringify(queued));
      }
    };

    socket.onmessage = (evt) => {
      if (typeof evt.data !== 'string') return;
      let msg: CoopServerToClientMessage;
      try {
        msg = JSON.parse(evt.data) as CoopServerToClientMessage;
      } catch {
        return;
      }

      if (msg.type === 'ws:pong') {
        return;
      } else if (msg.type === 'ws:welcome') {
        this.handlers.onWelcome?.(msg.playerId);
      } else if (msg.type === 'room:list_result') {
        this.handlers.onRoomList?.(msg.rooms);
      } else if (msg.type === 'room:state') {
        const self = msg.room.players.find((p) => p.playerId === msg.yourId);
        if (msg.room.status === 'lobby' && self) {
          this.activeLobbySession = {
            code: msg.room.code,
            playerId: msg.yourId,
            profile: {
              pilotName: self.pilotName,
              pilotRank: self.pilotRank,
              jetId: self.jetId,
              skinId: self.skinId,
              trailId: self.trailId,
              equippedMods: [...self.equippedMods],
            },
          };
        } else {
          this.activeLobbySession = null;
        }
        this.handlers.onRoomState?.(msg.room, msg.yourId);
      } else if (msg.type === 'room:error') {
        this.handlers.onRoomError?.(msg.message);
      } else if (msg.type === 'game:started') {
        this.activeLobbySession = null;
        this.handlers.onGameStarted?.(msg.room);
      } else if (msg.type === 'game:returned_lobby') {
        this.handlers.onReturnedLobby?.(msg.room);
      } else {
        this.handlers.onGameMessage?.(msg);
      }
    };

    socket.onclose = () => {
      this.clearConnectTimeout();
      this.stopKeepalive();
      if (this.ws === socket) {
        this.ws = null;
        this.updateStatus('disconnected');
        if (!this.disposed && this.autoReconnect) {
          this.wakeBackendHttp();
          this.scheduleReconnect();
        }
      }
    };

    socket.onerror = () => {
      // onclose handles cleanup and reconnect scheduling
    };
  }

  public send(msg: CoopClientToServerMessage): void {
    if (this.disposed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (msg.type !== 'coop:player_state' && msg.type !== 'coop:world_sync' && msg.type !== 'ws:ping') {
        if (msg.type === 'room:list') {
          if (!this.pendingQueue.some((q) => q.type === 'room:list')) {
            this.pendingQueue.push(msg);
          }
        } else if (msg.type === 'room:join' || msg.type === 'room:create') {
          this.pendingQueue = this.pendingQueue.filter(
            (q) => q.type !== 'room:join' && q.type !== 'room:create'
          );
          this.pendingQueue.push(msg);
        } else {
          this.pendingQueue.push(msg);
        }
        this.connect();
      }
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  public refreshRooms(): void {
    this.send({ type: 'room:list' });
  }

  public createRoom(profile: RoomPlayerProfile, startLevel = 1): void {
    this.activeLobbySession = null;
    this.send({ type: 'room:create', profile, startLevel });
  }

  public joinRoom(code: string, profile: RoomPlayerProfile): void {
    this.activeLobbySession = null;
    this.send({ type: 'room:join', code, profile });
  }

  public leaveRoom(): void {
    this.activeLobbySession = null;
    this.send({ type: 'room:leave' });
  }

  public updateProfile(profile: RoomPlayerProfile): void {
    if (this.activeLobbySession) {
      this.activeLobbySession.profile = profile;
    }
    this.send({ type: 'room:profile', profile });
  }

  public setReady(ready: boolean): void {
    this.send({ type: 'room:ready', ready });
  }

  public setStartLevel(startLevel: number): void {
    this.send({ type: 'room:set_level', startLevel });
  }

  public startGame(): void {
    this.send({ type: 'game:start' });
  }

  public returnToLobby(): void {
    this.send({ type: 'game:return_lobby' });
  }

  public dispose(): void {
    this.disposed = true;
    this.autoReconnect = false;
    this.activeLobbySession = null;
    this.pendingQueue = [];
    this.clearReconnectTimer();
    this.clearConnectTimeout();
    this.stopKeepalive();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  private scheduleReconnect(): void {
    if (this.disposed || !this.autoReconnect || this.reconnectTimer !== null) return;
    const delays = [1200, 2000, 3500, 5000];
    const delay = delays[Math.min(this.reconnectAttempts, delays.length - 1)];
    this.reconnectAttempts += 1;

    if (this.reconnectAttempts >= 2) {
      this.handlers.onConnectionIssue?.('Waking up multiplayer arena server — retrying link...');
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.disposed && this.autoReconnect) {
        this.connect();
      }
    }, delay);
  }

  private wakeBackendHttp(): void {
    if (this.wakingServer || typeof fetch === 'undefined') return;
    this.wakingServer = true;
    fetch('/api/health', { cache: 'no-store' })
      .catch(() => {})
      .finally(() => {
        this.wakingServer = false;
      });
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    this.pingTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ws:ping' } satisfies CoopClientToServerMessage));
      }
    }, 15000);
  }

  private stopKeepalive(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutTimer !== null) {
      window.clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
  }

  private updateStatus(status: WsConnStatus): void {
    this.status = status;
    this.handlers.onStatusChange?.(status);
  }
}
