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

  constructor(handlers: MultiplayerClientHandlers) {
    this.handlers = handlers;
  }

  public setHandlers(handlers: MultiplayerClientHandlers): void {
    this.handlers = handlers;
  }

  public getStatus(): WsConnStatus {
    return this.status;
  }

  public connect(): void {
    if (this.disposed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    this.updateStatus('connecting');

    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onopen = () => {
      if (this.disposed || this.ws !== socket) {
        socket.close();
        return;
      }
      this.updateStatus('connected');
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

      if (msg.type === 'ws:welcome') {
        this.handlers.onWelcome?.(msg.playerId);
      } else if (msg.type === 'room:list_result') {
        this.handlers.onRoomList?.(msg.rooms);
      } else if (msg.type === 'room:state') {
        this.handlers.onRoomState?.(msg.room, msg.yourId);
      } else if (msg.type === 'room:error') {
        this.handlers.onRoomError?.(msg.message);
      } else if (msg.type === 'game:started') {
        this.handlers.onGameStarted?.(msg.room);
      } else if (msg.type === 'game:returned_lobby') {
        this.handlers.onReturnedLobby?.(msg.room);
      } else {
        this.handlers.onGameMessage?.(msg);
      }
    };

    socket.onclose = () => {
      if (this.ws === socket) {
        this.ws = null;
        this.updateStatus('disconnected');
      }
    };

    socket.onerror = () => {
      // onclose handles cleanup
    };
  }

  public send(msg: CoopClientToServerMessage): void {
    if (this.disposed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (msg.type !== 'coop:player_state' && msg.type !== 'coop:world_sync') {
        this.pendingQueue.push(msg);
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
    this.send({ type: 'room:create', profile, startLevel });
  }

  public joinRoom(code: string, profile: RoomPlayerProfile): void {
    this.send({ type: 'room:join', code, profile });
  }

  public leaveRoom(): void {
    this.send({ type: 'room:leave' });
  }

  public updateProfile(profile: RoomPlayerProfile): void {
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
    this.pendingQueue = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  private updateStatus(status: WsConnStatus): void {
    this.status = status;
    this.handlers.onStatusChange?.(status);
  }
}
