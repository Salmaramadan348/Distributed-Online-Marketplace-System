import { cartModel } from "../../../db/models/cart.model.js";
import { inventoryModel } from "../../../db/models/inventory.model.js";
import { productModel } from "../../../db/models/product.model.js";
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;
    const product = await productModel.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.owner.toString() === userId.toString()) {
      return res.status(400).json({ message: "You cannot add your own product to the cart" });
    }
    // 1. check inventory
    const inventory = await inventoryModel.findOne({ productId });

    if (!inventory) {
      return res.status(404).json({ message: "Product not found in inventory" });
    }

    if (inventory.quantity < quantity) {
      return res.status(400).json({
        message: `Only ${inventory.quantity} items available in stock`
      });
    }

    // 2. get cart
    let cart = await cartModel.findOne({ userId });

    // 3. create or update cart
    if (!cart) {
      cart = new cartModel({
        userId,
        items: [{ productId, quantity }]
      });
    } else {
      const itemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
      );

      if (itemIndex > -1) {
        const newQuantity = cart.items[itemIndex].quantity + quantity;

        // re-check stock for updated quantity
        if (newQuantity > inventory.quantity) {
          return res.status(400).json({
            message: `Not enough stock. Available: ${inventory.quantity}`
          });
        }

        cart.items[itemIndex].quantity = newQuantity;
      } else {
        cart.items.push({ productId, quantity });
      }
    }

    await cart.save();

    return res.status(201).json({
      message: "Product added to cart",
      cart
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error adding product to cart",
      error: error.message
    });
  }
};


//for show the cart 
const getCart=async(req,res)=>{
    const userId = req.user._id;
  const cart = await cartModel.findOne({ userId }).populate("items.productId");
  res.json({ cart });
}

const updateCartItem = async (req, res) => {
  const {quantity}= req.body;
  const { productId } = req.params;
  const userId = req.user._id;

  const cart = await cartModel.findOne({ userId });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const itemIndex = cart.items.findIndex(item => item.productId == productId);
  if (itemIndex === -1) return res.status(404).json({ message: "Item not found in cart" });

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  res.json({ message: "Cart updated", cart });
};
const removeCartItem = async (req, res) => {
  const { productId } = req.params; 
  const userId = req.user._id;

  const cart = await cartModel.findOne({ userId });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  cart.items = cart.items.filter(item => item.productId != productId);
  await cart.save();

  res.json({ message: "Item removed", cart });
};
const clearCart = async (req, res) => {
  const userId = req.user._id;
  await cartModel.findOneAndDelete({ userId });
  res.json({ message: "Cart cleared" });
}


export{
    getCart,
   addToCart,
    clearCart,
    removeCartItem ,
    updateCartItem,
}