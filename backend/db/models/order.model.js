import mongoose from 'mongoose';
import { connections } from '../config/db.js';

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },

  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity:  { type: Number, required: true }
  }],

  totalPrice: { type: Number, required: true },

  status: {
    type: String,
    enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

  paymentMethod: {
    type: String,
    enum: ['COD', 'Credit Card', 'WALLET'],
    default: 'COD'
  },

  shippingAddress: {
    street: String,
    city: String,
    country: String
  }

}, { timestamps: true });


export const orderModel = connections.productDB.model('Order', orderSchema);