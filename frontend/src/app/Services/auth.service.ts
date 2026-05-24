import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { SocketClientService } from './socket-client.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private roleSubject = new BehaviorSubject<string | null>(this.getRole());
  role$ = this.roleSubject.asObservable();

  constructor(private socketClient: SocketClientService) {}

  setRole(role: string | null) {
    this.roleSubject.next(role);

    // مهم جدًا: sync مع localStorage
    if (role === null) {
      localStorage.removeItem('Authorization');
    }

    this.socketClient.syncAuthFromStorage();
  }

  getRole(): string | null {
    const token = localStorage.getItem('Authorization');

    if (!token) return null;

    try {
      const pureToken = token.split(' ')[1];
      const decoded: any = JSON.parse(atob(pureToken.split('.')[1]));

      return decoded.role;
    } catch {
      return null;
    }
  }

  register(data: any): Observable<any> {
    return this.socketClient.request('user:register', data);
  }

  login(data: any): Observable<any> {
    return this.socketClient.request('user:login', data);
  }
}
