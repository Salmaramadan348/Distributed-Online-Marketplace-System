import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketClientService } from './socket-client.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private socketClient: SocketClientService) {}

  connect(token: string): void {
    this.socketClient.connect(token);
  }

  disconnect(): void {
    this.socketClient.disconnect();
  }

  joinChat(userB: string): void {
    this.socketClient.connect().emit('join-chat', { userB });
  }

  sendMessage(receiver: string, msg: string): void {
    this.socketClient.connect().emit('send-message', { receiver, msg });
  }

  onNewMessage(): Observable<any> {
    return this.socketClient.on('receive-message');
  }

  getHistory(otherUserId: string): Observable<any[]> {
    return this.socketClient.request('chat:history', { otherUserId });
  }
}
