import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketClientService {
  private socket: Socket | null = null;
  private apiUrl = 'http://localhost:3000';
  private currentToken: string | null = null;

  connect(token?: string): Socket {
    const nextToken = this.normalizeToken(token ?? this.getStoredToken());

    if (this.socket && this.socket.connected && nextToken === this.currentToken) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.currentToken = nextToken;

    const auth = nextToken ? { token: nextToken } : {};
    this.socket = io(this.apiUrl, {
      auth,
      transports: ['websocket']
    });

    return this.socket;
  }

  syncAuthFromStorage(): void {
    this.connect();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  request<T>(event: string, payload?: unknown): Observable<T> {
    return new Observable((observer) => {
      const socket = this.connect();

      socket.emit(event, payload ?? {}, (response: any) => {
        if (response?.ok) {
          observer.next(response.data as T);
          observer.complete();
          return;
        }

        const message =
          response?.error ||
          response?.data?.message ||
          'Socket request failed';

        observer.error({
          error: { message },
          status: response?.status,
          data: response?.data
        });
      });
    });
  }

  on<T>(event: string): Observable<T> {
    return new Observable((observer) => {
      const socket = this.connect();
      const handler = (data: T) => observer.next(data);

      socket.on(event, handler);

      return () => socket.off(event, handler);
    });
  }

  private getStoredToken(): string {
    return localStorage.getItem('Authorization') || '';
  }

  private normalizeToken(raw: string): string | null {
    if (!raw) return null;
    return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  }
}
