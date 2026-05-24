import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketClientService } from './socket-client.service';

@Injectable({
    providedIn: 'root'
})
    export class ReportService {

    constructor(private socketClient: SocketClientService) {}

    isAdmin(): boolean {

        const role = localStorage.getItem('userRole')?.toLowerCase();

        return role === 'admin';
    }

    getSummaryReport(): Observable<any> {

    return this.socketClient.request('report:summary');
    }
    }