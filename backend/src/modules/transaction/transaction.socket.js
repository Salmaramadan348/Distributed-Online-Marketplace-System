import { getAllTransactions } from "./transaction.controller.js";
import { replyFromController, requireAuth } from "../../socket/socket.utils.js";

export const transactionSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("transaction:list", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(getAllTransactions, { socket }, ack);
    });
  });
};
