import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../Services/user.service';
import { WalletService } from '../../Services/wallet.service';
import { Product } from '../../interface/product';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  user: any = null;
  wallet: any;
  showEdit: boolean = false;

  editData: any = {
    userName: '',
    email: ''
  };
  showDeposit: boolean = false;
depositAmount: number = 0;
soldItems: Product[] = [];
purchasedItems: Product[] = [];
searchHistory: string[] = [];
userRole: string | null = null;

  constructor(private userService: UserService,
    private walletService: WalletService
  ) {}

  ngOnInit(): void {
    this.getProfile();
    this.getWallet();
    this.deposit();
    this.extractUserRole();
  }
  extractUserRole() {
  const token = localStorage.getItem('Authorization');

  if (!token) return;

  try {
    const pureToken = token.split(' ')[1];
    const decoded: any = JSON.parse(atob(pureToken.split('.')[1]));

    this.userRole = decoded.role;

    console.log("User Role:", this.userRole);

  } catch (e) {
    console.log("Error decoding token", e);
  }
}
  deposit() {
  if (!this.depositAmount || this.depositAmount <= 0) {
    return;
  }

  this.walletService.deposit(this.depositAmount).subscribe({
    next: (res) => {
      console.log("Deposit success:", res);

      this.getWallet();

      // reset
      this.depositAmount = 0;
      this.showDeposit = false;
    },
    error: (err) => console.log(err)
  });
}
  getWallet() {
  this.walletService.getMyWallet().subscribe({
    next: (res) => this.wallet = res.wallet,
    error: (err) => console.log(err)
  });
}
getProfile() {
  this.userService.getMe().subscribe({
    next: (res) => {

      this.user = res.user;

      this.soldItems = res.user.soldItems || [];
      this.purchasedItems = res.user.purchasedItems || [];
      this.searchHistory = res.user.searchHistory || [];

      console.log("USER:", this.user);
      console.log("SOLD:", this.soldItems);
      console.log("PURCHASED:", this.purchasedItems);
      console.log("SEARCH:", this.searchHistory);
    },
    error: (err) => console.log(err)
  });
}

updateProfile() {

  const userId = this.user._id;

  this.userService.updateUser(userId, this.editData).subscribe({
    next: (res) => {

      console.log("Updated:", res);

      this.user = res.updatedUser;

      this.showEdit = false;
    },

    error: (err) => console.log(err)
  });
}
openEdit() {

  this.editData = {
    userName: this.user.userName,
    email: this.user.email
  };
  console.log("Edit Data:", this.editData);

  this.showEdit = true;
}
}
