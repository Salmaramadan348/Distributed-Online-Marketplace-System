import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrderService } from '../../Services/order.service';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CartService } from '../../Services/cart.service';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.css']
})
export class OrderComponent implements OnInit {
  orders: any[] = [];

  constructor(private _OrderService: OrderService,private _CartService:CartService,private router:Router) {}

  ngOnInit(): void {
  this.orders = this._CartService.getCheckoutItems();
}

addItem() {
  this.orders.push(new FormGroup({
    productId: new FormControl(null, Validators.required),
    quantity: new FormControl(1, [Validators.required, Validators.min(1)]),
    discountApplied: new FormControl(0)
  }));
}

getorder(){
  this._OrderService.getUserOrders().subscribe({
    next:(res)=>{console.log(res);},
    error:(err)=>{console.log(err);},
    complete:()=>{console.log("complete")}

  })
}
getOrders() {
    this._OrderService.getAllOrders().subscribe({
      next: (res: any) => {
        console.log(res);
        this.orders = res.cart || [];
      },
      error: (err) => console.log(err),
      complete: () => console.log("Orders loaded")
    });
  }

orderCreate = new FormGroup({
  shippingAddress: new FormGroup({
    street: new FormControl('', Validators.required),
    city: new FormControl('', Validators.required),
    state: new FormControl(''),
    postalCode: new FormControl('', Validators.required),
    country: new FormControl('', Validators.required)
  }),
  paymentMethod: new FormControl('COD', Validators.required),
  paymentStatus: new FormControl('pending', Validators.required)
});



sendData() {
  if (this.orderCreate.valid && this.orders.length > 0) {
    const orderData = {
      items: this.orders,
      ...this.orderCreate.value
    };

    this._OrderService.postOrder(orderData).subscribe({
      next: (res) => {
        console.log('Order created:', res);
        this._CartService.deleteAllCart();
        this.router.navigate(['/orderDetails']);
      },
      error: (err) => {
  console.log(err);

  if (err.status === 400) {
    alert("❌ Insufficient balance to complete this order");
  } else {
    alert("❌ Something went wrong, please try again");
  }
},
      complete: () => console.log("Order creation complete")
    });
  } else {
    console.warn("Form is invalid or cart is empty");
  }
}


  deleteItem(Id: string) {
    this._OrderService.deleteOrder(Id).subscribe({
      next: (res) => {
        console.log('Order deleted:', res);
        this.getOrders();
      },
      error: (err) => console.log(err),
      complete: () => console.log("Delete complete")
    });
  }
}
