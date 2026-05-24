import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketClientService } from './socket-client.service';

@Injectable({
  providedIn: 'root'
})
export class WalletService {

  constructor(private socketClient: SocketClientService) {}

  getMyWallet(): Observable<any> {
    return this.socketClient.request('wallet:get');
  }
  deposit(amount: number): Observable<any> {
  return this.socketClient.request('wallet:deposit', { amount });
}
}
