import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketClientService } from './socket-client.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private socketClient: SocketClientService) {}

  // Get profile ( endpoint = /profile)
  getMe(): Observable<any> {
    return this.socketClient.request('user:profile');
  }

  addAdmin(data: any): Observable<any> {
    return this.socketClient.request('user:addAdmin', data);
  }

updateUser(id: string, data: any): Observable<any> {
  return this.socketClient.request('user:update', { id, data });
}
 //updated
 getAllUsers(): Observable<any> {
  return this.socketClient.request('user:listPublic');
}

  deleteUser(id: string): Observable<any> {
    return this.socketClient.request('user:delete', { id });
  }
}
