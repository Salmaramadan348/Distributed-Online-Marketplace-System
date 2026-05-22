import mongoose from 'mongoose';
import { connections } from '../config/db.js';

const userSchema = new mongoose.Schema({
  userName:    { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  role:        { type: String, enum: ["user", "admin"], default: 'user' },
  balance:     { type: Number, default: 0 },  
  purchasedItems: [{
  productId: String,
  quantity: Number
}],

soldItems: [{
  productId: String,
  quantity: Number
}],

searchHistory:[String] ,   
  isConfirmed: { type: Boolean, default: false },  // ← verifyAccount uses this
}, { timestamps: true });

export const userModel = connections.userDB.model('User', userSchema);