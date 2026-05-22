import { productModel } from "../../../db/models/product.model.js";
import { inventoryModel } from "../../../db/models/inventory.model.js";
import { userModel } from "../../../db/models/user.model.js";
import{isAdmin} from "../user/user.controller.js"

const getProduct = async (req, res) => {
  try {

    const products = await productModel.find();

    const result = await Promise.all(
      products.map(async (product) => {

        const inventory = await inventoryModel.findOne({
          productId: product._id
        });

        const stock = inventory?.quantity || 0;

        return {
          _id: product._id,
          title: product.title,
          description: product.description,
          price: product.price,
          image: product.image,
          owner: product.owner,
          stock
        };
      })
    );

    return res.status(200).json({
      products: result.filter(p => p !== null) 
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};




const searchProducts = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({ message: "Keyword is required" });
    }

    const products = await productModel.find({
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { brand: { $regex: keyword, $options: "i" } }
      ]
    });

    res.json({ products });

  } catch (error) {
    res.status(500).json({ message: "Search error", error });
  }
};

const getMyProducts = async (req, res) => {
  try {

    const products = await productModel.find({
      owner: req.user._id
    });

    const result = await Promise.all(
      products.map(async (product) => {

        const inventory = await inventoryModel.findOne({
          productId: product._id
        });

        const stock = inventory?.quantity || 0;

        return {
          _id: product._id,
          title: product.title,
          description: product.description,
          price: product.price,
          image: product.image,
          owner: product.owner,
          stock
        };
      })
    );

    return res.status(200).json({
      products: result
    });

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }
};
const getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // fetch product safely
    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    //  safe inventory handling
    let stock = 0;

    try {
      const inventory = await inventoryModel.findOne({
        productId: id
      });

      stock = inventory ? inventory.quantity : 0;
    } catch (invError) {
      console.log("Inventory error:", invError.message);
    }

    //  response cleaned for frontend
   return res.status(200).json({
  message: "Product fetched successfully",
  product: {
    _id: product._id,
    title: product.title,
    brand: product.brand,
    description: product.description,
    price: product.price,
    quantity: product.quantity, 
    image: product.image,
    owner: product.owner,
    status: product.status,
    stock
  }
});

  } catch (error) {

    console.log("GET SINGLE PRODUCT ERROR:", error);

    return res.status(500).json({
      message: "Error fetching product",
      error: error.message
    });
  }
};


const postProduct = async (req, res) => {
  try {
    const { title, price, quantity, brand, description } = req.body;

    const image = req.file
      ? `/images/${req.file.filename}`
      : null;

    const addedProduct = await productModel.create({
  title,
  price,
  quantity,
  brand,
  description,
  image,
  owner: req.user._id
});
await userModel.findByIdAndUpdate(
   req.user._id,
   {
      $push:{
         soldItems:addedProduct._id
      }
   }
)

    await inventoryModel.create({
      productId: addedProduct._id,
      quantity: quantity || 0
    });

    res.status(201).json({
      message: "Product added successfully",
      addedProduct
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
const buyProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // 1. check product exists
    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // Prevent the user from buying their own product
    if (product.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot buy your own product."
      });
    }

    // add to user's purchased items with full data
    await userModel.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          purchasedItems: {
            productId: product._id,
            quantity: 1,
            price: product.price,
            date: new Date()
          }
        }
      }
    );

    return res.json({
      message: "Product purchased successfully"
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};

const updateProduct = async (req, res) => {
  try {

    const { id } = req.params;

    const product = await productModel.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.owner.toString() !== req.user._id.toString()&& !isAdmin(req.user.email)) {
      return res.status(403).json({ message: "Not your product" });
    }

    const updateData = {
      ...(req.body.title && { title: req.body.title }),
      ...(req.body.brand && { brand: req.body.brand }),
      ...(req.body.description && { description: req.body.description }),
      ...(req.body.price && { price: req.body.price }),
      ...(req.body.quantity && { quantity: Number(req.body.quantity) }),
    };

    if (req.file) {
      updateData.image = `/images/${req.file.filename}`;
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // 🔥 sync inventory
    if (req.body.quantity) {
      await inventoryModel.findOneAndUpdate(
        { productId: id },
        { quantity: Number(req.body.quantity) }
      );
    }

    return res.status(200).json({
      message: "Updated successfully",
      updatedProduct
    });

  } catch (error) {
    console.log("UPDATE ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.owner.toString() !== req.user._id.toString() && !isAdmin(req.user.email)) {
      return res.status(403).json({ message: "Not your product" });
    }

    await productModel.findByIdAndDelete(id);

    await inventoryModel.findOneAndDelete({ productId: id });

    res.json({ message: "Deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



const addRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyRated = product.ratings.find(
      (r) => r.userId.toString() === userId.toString()
    );

    if (alreadyRated) {
      return res.json({ message: "You already rated this product" });
    }

    product.ratings.push({ userId, rating, comment });
    await product.save();

    res.json({ message: "Rating added successfully", product });

  } catch (error) {
    res.status(500).json({ message: "Error adding rating", error });
  }
};



export {
  getProduct,
  searchProducts,
  getSingleProduct,
  postProduct,
  updateProduct,
  deleteProduct,
  addRating,
  buyProduct,
  getMyProducts
};