import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SocketClientService } from './socket-client.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  constructor(
    private _HttpClient: HttpClient,
    private socketClient: SocketClientService
  ) { }
  private checkoutItems: any[] = [];

setCheckoutItems(items: any[]) {
  this.checkoutItems = items;
}

getCheckoutItems(): any[] {
  return this.checkoutItems;
}

  addToCart(productId: string, quantity: number = 1): Observable<any> {
    return this.socketClient.request('cart:add', { productId, quantity });
  }
  addToCartRest(productId: string, quantity: number = 1): Observable<any> {
    return this._HttpClient.post('http://localhost:3000/cart', { productId, quantity });
  }
  getCart():Observable<any>{
    return this.socketClient.request('cart:get');
  }
  getCartRest():Observable<any>{
    const token = localStorage.getItem("Authorization") || '';
    const headers = new HttpHeaders().set('Authorization', token);
    return this._HttpClient.get('http://localhost:3000/cart',{headers:headers});
  }
  postCart(data:any):Observable<any>{
    return this.socketClient.request('cart:add', data);
  }
  postCartRest(data:any):Observable<any>{
    const token = localStorage.getItem("Authorization") || '';
    const headers = new HttpHeaders().set('Authorization', token);
    return this._HttpClient.post('http://localhost:3000/cart',data,{headers:headers})
  }
deleteItemInCart(productId: string): Observable<any> {
  return this.socketClient.request('cart:remove', { productId });
}

deleteItemInCartRest(productId: string): Observable<any> {
  const token = localStorage.getItem("Authorization") || '';
    const headers = new HttpHeaders().set('Authorization', token);

  return this._HttpClient.delete(
    `http://localhost:3000/cart/${productId}`,
    { headers }
  );
}


updateCartQuantity(productId: string, quantity: number): Observable<any> {
  return this.socketClient.request('cart:update', { productId, quantity });
}

updateCartQuantityRest(productId: string, quantity: number): Observable<any> {
  const token = localStorage.getItem("Authorization") || '';
  const headers = new HttpHeaders().set('Authorization', token);

  return this._HttpClient.put(
    `http://localhost:3000/cart/${productId}`,
    { quantity },
    { headers }
  );
}

deleteAllCart():Observable<any>{
    return this.socketClient.request('cart:clear');
  }

  deleteAllCartRest():Observable<any>{
    const token =localStorage.getItem("Authorization") || '';
    const headers=new HttpHeaders().set('Authorization', token);
    return this._HttpClient.delete(`http://localhost:3000/cart`,{headers:headers})
  }

}
