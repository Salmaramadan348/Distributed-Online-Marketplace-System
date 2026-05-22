import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../Services/product.service';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CartService } from '../../Services/cart.service';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [RouterLink, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './product.component.html',
  styleUrl: './product.component.css'
})
export class ProductComponent implements OnInit {

  products: any[] = [];
  showCreateForm = false;
  userRole: string | null = null;
  selectedFile!: File;
  userId: string = '';
  imageBaseUrl = "http://localhost:3000";
  searchKeyword: string = '';
  showMyProducts: boolean = false;

  constructor(
    private _ProductService: ProductService,
    private router: Router,
    private _CartService: CartService
  ) {}

  // ================= ROLE =================
  extractUserRole() {
    const token = localStorage.getItem('Authorization');
    if (!token) return;

    try {
      const pureToken = token.split(' ')[1];
      const decoded: any = JSON.parse(atob(pureToken.split('.')[1]));

      this.userRole = decoded.role;
      this.userId = decoded._id; //Extract the ID from the token
      console.log("User Role:", this.userRole, "User ID:", this.userId);

    } catch (e) {
      console.log("Error decoding token", e);
    }
  }

  // ================= INIT =================
  ngOnInit(): void {
    this.extractUserRole();
    this.getProducts(); // Everyone sees the marketplace by default now
  }
  // ================= FORMS =================
  productCreate = new FormGroup({
    title: new FormControl(null, [Validators.required]),
    brand: new FormControl(null),
    description: new FormControl(null),
    price: new FormControl(null, [Validators.required]),
    quantity: new FormControl(1, [Validators.required]),
    discount: new FormControl(0),
    image: new FormControl(null)
  });

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  // ================= PRODUCTS =================
  getProducts() {
    this._ProductService.getproducts().subscribe({
      next: (res: any) => {
        if (res?.products && Array.isArray(res.products)) {
          this.products = res.products;
        } else if (Array.isArray(res)) {
          this.products = res;
        } else {
          this.products = [];
        }
      },
      error: (err) => {
        console.log(err);
        this.products = [];
      }
    });
  }

  getMyProducts() {
    this._ProductService.getMyProducts().subscribe({
      next: (res: any) => {
        if (res?.products && Array.isArray(res.products)) {
          this.products = res.products;
        } else {
          this.products = [];
        }
      },
      error: (err) => {
        console.log(err);
        this.products = [];
      }
    });
  }

  toggleMyProducts() {
    this.showMyProducts = !this.showMyProducts;

    if (this.showMyProducts) {
      this.getMyProducts();
    } else {
      this.getProducts();
    }
  }

  // ================= SEARCH =================
  search() {
    const keyword = this.searchKeyword?.trim();

    if (!keyword) {
      this.getProducts();
      return;
    }

    this._ProductService.searchProducts(keyword).subscribe({
      next: (res: any) => {
        this.products = res.products;
      },
      error: (err) => console.log(err)
    });
  }

  // ================= CREATE PRODUCT =================
  sendData() {
    if (!this.productCreate.valid) return;

    const formData = new FormData();

    formData.append('title', this.productCreate.value.title || '');
    formData.append('brand', this.productCreate.value.brand || '');
    formData.append('description', this.productCreate.value.description || '');
    formData.append('price', String(this.productCreate.value.price));
    formData.append('quantity', String(this.productCreate.value.quantity));
    formData.append('discount', String(this.productCreate.value.discount));

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this._ProductService.postProduct(formData).subscribe({
      next: (res) => {
        console.log(res);
        this.showCreateForm = false;

        // refresh correctly
       if (this.showMyProducts) {
          this.getMyProducts();
        } else {
          this.getProducts();
        }
      },
      error: (err) => console.log(err)
    });
  }

  // ================= DELETE =================
  deleteProduct(id: string) {
    if (!confirm("Are you sure?")) return;

    this._ProductService.deleteProduct(id).subscribe({
      next: () => {
       if (this.showMyProducts) {
          this.getMyProducts();
        } else {
          this.getProducts();
        }
      },
      error: (err) => console.log(err)
    });
  }

  // ================= UPDATE =================
  goToUpdatePage(id: string) {
    this.router.navigate(['/update-product', id]);
  }

  // ================= CART =================
  addToCart(product: any, event: Event) {
    event.preventDefault();

    if (product.stock === 0) {
      alert("Out of stock");
      return;
    }

    const token = localStorage.getItem('Authorization');

    if (!token) {
      alert('Please login first');
      this.router.navigate(['/login']);
      return;
    }

    const cartData = {
      productId: product._id,
      quantity: 1
    };

    this._CartService.postCart(cartData).subscribe({
      next: () => console.log("Added to cart"),
      error: (err) => console.log(err)
    });
  }
}
