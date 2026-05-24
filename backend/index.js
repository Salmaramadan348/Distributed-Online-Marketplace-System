import http from "http";
import { Server } from "socket.io";
import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { connectDatabases } from "./db/config/db.js";
import { UserRoutes } from "./src/modules/user/user.routes.js";
import { ProductRoutes } from "./src/modules/product/product.routes.js";
import { CartRoutes } from "./src/modules/cart/cart.routes.js";
import { OrderRoutes } from "./src/modules/order/order.routes.js";
import cors from 'cors'
import TransactionRoutes from './src/modules/transaction/transaction.routes.js';
import { walletRoutes } from "./src/modules/wallet/wallet.routes.js";
import { ReportRoutes } from "./src/modules/report/report.routes.js";
import { ChatRoutes } from "./src/modules/chat/chat.routes.js";
import { AiRoutes } from "./src/modules/ai/ai.routes.js";
import { chatSocket } from "./src/modules/chat/chat.socketio.js";
import { productSocket } from "./src/modules/product/product.socket.js";
import { cartSocket } from "./src/modules/cart/cart.socket.js";
import { orderSocket } from "./src/modules/order/order.socket.js";
import { userSocket } from "./src/modules/user/user.socket.js";
import { walletSocket } from "./src/modules/wallet/wallet.socket.js";
import { reportSocket } from "./src/modules/report/report.socket.js";
import { transactionSocket } from "./src/modules/transaction/transaction.socket.js";
import { aiSocket } from "./src/modules/ai/ai.socket.js";
import path from "path";

dotenv.config();

const app = express()
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200",
    credentials: true
  }
});

// JWT auth middleware for socket
io.use((socket, next) => {
  const rawToken = socket.handshake.auth?.token;
  if (!rawToken) {
    socket.user = null;
    return next();
  }

  const token = rawToken.startsWith("Bearer ")
    ? rawToken.slice(7)
    : rawToken;

  try {
    socket.user = jwt.verify(token, "Day4");
    return next();
  } catch {
    return next(new Error("Invalid token"));
  }
});

// Attach chat socket handlers
chatSocket(io);
productSocket(io);
cartSocket(io);
orderSocket(io);
userSocket(io);
walletSocket(io);
reportSocket(io);
transactionSocket(io);
aiSocket(io);

app.use(express.json())

app.use('/images', express.static(path.join(process.cwd(), 'src/utilities/images')));

let x = true

const isAuth = (req, res, next) => {
  if (x) next()
  else res.json({ message: "not auth" })
}

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

app.use(UserRoutes)
app.use(ProductRoutes)
app.use(CartRoutes)
app.use(OrderRoutes)
app.use(TransactionRoutes)
app.use(walletRoutes)
app.use(ReportRoutes)
app.use(ChatRoutes)
app.use(AiRoutes)

app.get('/health', (req, res) => {
  res.json({ status: "ok" })
})

app.get('/', isAuth, (req, res) => {
  res.json({ message: "done" })
})

connectDatabases().then(() => {
  server.listen(3000, () => console.log('Server running on port 3000'));
});