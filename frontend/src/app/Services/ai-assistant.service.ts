import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketClientService } from './socket-client.service';

export interface AiAnswerResponse {
  answer: string;
  error?: string;
  raw?: string;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  constructor(private socketClient: SocketClientService) {}

  ask(question: string): Observable<AiAnswerResponse> {
    return this.socketClient.request<AiAnswerResponse>('ai:ask', { question });
  }
}
