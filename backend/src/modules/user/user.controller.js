import bcrypt from"bcrypt";
import { userModel}from "../../../db/models/user.model.js"
import jwt from"jsonwebtoken"
import { productModel } from "../../../db/models/product.model.js";
import { sendMail } from "../../utilities/email/sendEmail.js";

const emailsAdmin=["salmaramadan348@gmail.com","salma.ramadan.mohammed@gmail.com"]
const isAdmin = (email) => emailsAdmin.includes(email);

const getUser = async (req, res) => {
  try {
    if (!isAdmin(req.user.email)) {
      return res.status(403).json({ message: "You don't have access to view all users" });
    }

    const users = await userModel.find();
    res.json({ message: "All users:", users });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



const postUser = async (req, res) => {
  try {
    const { email, userName, password } = req.body; 
    let user = await userModel.findOne({ email });

    if (!user) {
      
      await userModel.collection.insertOne({
        userName: userName || "New Admin",
        email,
        password: password,
        role: "admin",
      });

      user = await userModel.findOne({ email });
    }

    if (!emailsAdmin.includes(email)) {
      emailsAdmin.push(email);
      user.role = "admin";
      await user.save();

      return res.status(201).json({
        message: "Admin added",
        emailsAdmin,
        user,
      });
    }

    res.status(400).json({ message: "This email is already admin" });
  } catch (error) {
    console.error(error); 
    res.status(500).json({ message: "Server error", error });
  }
};

const updateUser=async(req,res)=>{
    try{
        const {id}=req.params
        const updatedUser=await userModel.findByIdAndUpdate(id,{...req.body},{new:true})
        res.json({message:"updated successful",updatedUser})
    }
    catch(error){
        res.status(500).json({ message: "Server error", error });
    }
    
}
const deleteUser=async (req,res)=>{
    try{
        if (!isAdmin(req.user.email))return res.status(403).json({ message: "You don't have access to delete user" });
        const {id}=req.params
        const deletedUser=await userModel.findByIdAndDelete(id)
        res.json({message:"deleted successful",deletedUser})
    }
    catch(error){
        res.status(500).json({ message: "Server error", error });
    }
}

const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = bcrypt.hashSync(password, 8);

    let role = "user";

    if (emailsAdmin.includes(email)) {
      role = "admin";
    }

    const userData = {
      ...req.body,
      password: hashedPassword,
      role,
      isConfirmed: false
    };

    const addedUser = await userModel.create(userData);

    sendMail(email).catch((error) => {
      console.error("sendMail failed:", error?.message ?? error);
    });

    addedUser.password = undefined;

    return res.status(201).json({
      message: "register is successful, check your email",
      addedUser
    });

  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {

    const exist = await userModel.findOne({ email: req.body.email });

    if (!exist) {
      return res.status(401).json({
        message: "email or password invalid"
      });
    }

    // check email confirmation
    if (exist.isConfirmed === false) {
      return res.status(403).json({
        message: "Please verify your email first"
      });
    }

    const matchPass = bcrypt.compareSync(
      req.body.password,
      exist.password
    );

    if (!matchPass) {
      return res.status(401).json({
        message: "email or password invalid"
      });
    }

    const token = jwt.sign(
      {
        _id: exist._id,
        role: exist.role,
        email: exist.email
      },
      "Day4"
    );

    res.json({
      message: `welcome ${exist.userName}`,
      token
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error",
      error
    });

  }
};
const verifyAccount = async (req, res) => {
  let { email } = req.params;

  jwt.verify(email, "NTIG13Mail", async (err, decoded) => {

    if (err) {
      return res.send("Invalid Token");
    }

    await userModel.findOneAndUpdate(
      { email: decoded.email },
      { isConfirmed: true }
    );

    res.redirect("http://localhost:4200/login");
  });
};

const getMe = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user._id;

    const user = await userModel
      .findById(userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // get full products for purchased items
    const purchasedProducts = await productModel.find({
      _id: { $in: user.purchasedItems.map(i => i.productId) }
    });

    //  get full products for sold items
    const soldProducts = await productModel.find({
      _id: { $in: user.soldItems.map(i => i.productId) }
    });

    return res.status(200).json({
      message: "User profile fetched successfully",
      user: {
        _id: user._id,
        email: user.email,
        userName: user.userName,
        role: user.role,

        purchasedItems: purchasedProducts,
        soldItems: soldProducts,

        searchHistory: user.searchHistory || []
      }
    });

  } catch (error) {
    console.log("PROFILE ERROR:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

export{
    getUser,
    postUser,
    updateUser,
    deleteUser,
    register,
    login,
    verifyAccount,
    isAdmin,
    getMe
}