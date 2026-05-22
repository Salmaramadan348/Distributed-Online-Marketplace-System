import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../Services/product.service';
import { CommonModule } from '@angular/common';
import { CartService } from '../../Services/cart.service';
import { Component, OnInit } from '@angular/core';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent implements OnInit {

  product: any;
  userRole: string | null = null;
  userId: string = '';
  imageBaseUrl: string = "http://localhost:3000";

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private _CartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.extractUserRole();

    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.getProduct(productId);
    }
  }

  // ================= AUTH =================
  extractUserRole() {
    const token = localStorage.getItem('Authorization');
    if (!token) return;

    try {
      const pureToken = token.split(' ')[1];
      const decoded: any = JSON.parse(atob(pureToken.split('.')[1]));

      this.userRole = decoded.role;
      this.userId = decoded._id;

      console.log("USER ID:", this.userId);

    } catch (e) {
      console.log("Error decoding token", e);
    }
  }

  // ================= PRODUCT =================
  getProduct(id: string) {
    this.productService.getSingleProduct(id).subscribe({
      next: (res) => {
        console.log("API RESPONSE:", res);

        if (res?.product) {
          this.product = res.product;

          console.log("PRODUCT OWNER:", this.product.owner);
        }
      },
      error: (err) => {
        console.error("Error loading product:", err);
      }
    });
  }

  // ================= OWNER CHECK =================
  isOwner(): boolean {
    return String(this.product?.owner) === String(this.userId);
  }

  // ================= CART =================
  addToCart(product: any, event: Event) {
    event.preventDefault();

    if (!this.product) return;

    if (this.product.stock === 0) {
      alert("Out of stock");
      return;
    }

    if (this.isOwner()) {
      alert("You cannot add your own product to cart");
      return;
    }

    const token = localStorage.getItem('Authorization');

    if (!token) {
      alert('Please log in first!');
      this.router.navigate(['/login']);
      return;
    }

    const cartData = {
      productId: product._id,
      quantity: 1
    };

    this._CartService.postCart(cartData).subscribe({
      next: () => {
        console.log("Added to cart");
        this.router.navigate(['/cart']);
      },
      error: (err) => console.log(err)
    });
  }
}
