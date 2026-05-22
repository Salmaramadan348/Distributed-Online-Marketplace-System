import { orderModel } from "../../../db/models/order.model.js";
import { cartModel } from "../../../db/models/cart.model.js";
import { walletModel } from "../../../db/models/wallet.model.js";
import { transactionModel } from "../../../db/models/transaction.model.js";
import { inventoryModel } from "../../../db/models/inventory.model.js";
import { userModel } from "../../../db/models/user.model.js";
import { productModel } from "../../../db/models/product.model.js";

const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. get cart
    const cart = await cartModel
      .findOne({ userId })
      .populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 2. calculate total price
    let totalPrice = 0;

    for (let item of cart.items) {
      if (!item.productId || !item.productId.price) continue;

      //Prevent user from checking out with their own items
      if (item.productId.owner.toString() === userId.toString()) {
        return res.status(400).json({ 
          message: `You cannot buy your own product: ${item.productId.title}. Please remove it from your cart.` 
        });
      }

      totalPrice += Number(item.productId.price) * Number(item.quantity);
    }

    // 3. buyer wallet + user
    const buyerWallet = await walletModel.findOne({ userId });
    const buyer = await userModel.findById(userId);

    if (!buyerWallet || !buyer) {
      return res.status(400).json({ message: "Buyer not found" });
    }

    if (buyerWallet.balance < totalPrice) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 4. deduct buyer money
    buyerWallet.balance -= totalPrice;
    buyer.balance -= totalPrice;

    await buyerWallet.save();
    await buyer.save();

    const orderItems = [];

    // 5. loop items
    for (let item of cart.items) {

      const product = await productModel.findById(item.productId._id);

      const itemTotal = product.price * item.quantity;

      // =========================
      // INVENTORY
      // =========================
      let inventory = await inventoryModel.findOne({
        productId: product._id
      });

      if (!inventory) {
        inventory = await inventoryModel.create({
          productId: product._id,
          sellerId: product.owner,
          quantity: 0
        });
      }

      if (inventory.quantity < item.quantity) {
        return res.status(400).json({
          message: "Out of stock"
        });
      }

      inventory.quantity -= item.quantity;
      await inventory.save();

      // =========================
      // PRODUCT UPDATE
      // =========================
      product.quantity -= item.quantity;

      if (product.quantity <= 0) {
        product.quantity = 0;
        product.status = "sold";
      }

      await product.save();

      // =========================
      // ORDER ITEMS
      // =========================
      orderItems.push({
        productId: product._id,
        quantity: item.quantity
      });

      // =========================
      // SELLER WALLET
      // =========================
      let sellerWallet = await walletModel.findOne({
        userId: product.owner
      });

      if (!sellerWallet) {
        sellerWallet = await walletModel.create({
          userId: product.owner,
          balance: 0
        });
      }

      sellerWallet.balance += itemTotal;
      await sellerWallet.save();

      // =========================
      //  USER TRACKING FIX (IMPORTANT)
      // =========================

      // Buyer purchasedItems
      await userModel.findByIdAndUpdate(userId, {
        $push: {
          purchasedItems: {
            productId: product._id,
            quantity: item.quantity,
            price: product.price,
            date: new Date()
          }
        }
      });

      //  Seller soldItems
      await userModel.findByIdAndUpdate(product.owner, {
        $push: {
          soldItems: {
            productId: product._id,
            quantity: item.quantity,
            price: product.price,
            date: new Date()
          }
        }
      });

      // =========================
      // TRANSACTION
      // =========================
      await transactionModel.create({
        buyer: userId,
        seller: product.owner,
        product: product._id,
        price: itemTotal,
        sellerAmount: itemTotal,
        type: "ORDER_PAYMENT"
      });
    }

    // 6. create order
    const order = await orderModel.create({
      userId,
      items: orderItems,
      totalPrice,
      paymentMethod: "WALLET",
      status: "paid"
    });

    // 7. clear cart
    cart.items = [];
    await cart.save();

    return res.status(201).json({
      message: "Order created successfully",
      order
    });

  } catch (err) {
    return res.status(500).json({
      message: "Error creating order",
      error: err.message
    });
  }
};


const getAllOrders = async (req, res) => {
  try {
    if (!isAdmin(req.user.email))return res.status(403).json({ message: "You don't have access to get all Orders of programmer" });
    const orders = await orderModel.find().populate("items.productId userId");
    res.json({ message: "All orders", orders });
  } catch (err) {
    res.status(500).json({ message: "Error fetching orders", error: err.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await orderModel.find({ userId }).populate("items.productId");
    res.json({ message: "Your orders", orders });
  } catch (err) {
    res.status(500).json({ message: "Error fetching user orders", error: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    const order = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({ message: "Updated", order });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const deletedOrder = await orderModel.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted", order: deletedOrder });
  } catch (err) {
    res.status(500).json({ message: "Error deleting order", error: err.message });
  }
};
export{
    createOrder,
    deleteOrder,
    updateOrderStatus,
    getUserOrders,
    getAllOrders
}