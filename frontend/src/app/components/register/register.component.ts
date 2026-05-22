import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  constructor(
    private _AuthService: AuthService,
    private router: Router
  ) {}

  register = new FormGroup({
    userName: new FormControl(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(10)
    ]),
    age: new FormControl(null, [
      Validators.required,
      Validators.min(18)
    ]),
    email: new FormControl(null, [
      Validators.required,
      Validators.email
    ]),
    password: new FormControl(null, [
      Validators.required
    ]),
 
  });

  sendData() {
    if (this.register.valid) {

      console.log("Form Value:", this.register.value);

      this._AuthService.register(this.register.value).subscribe({
        next: (res) => {
          console.log(res);
          this.router.navigate(['/login']);
        },
        error: (err) => console.log(err),
        complete: () => console.log("complete")
      });

    }
  }
}
