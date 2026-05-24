import { deposit, getWallet } from "./wallet.controller.js";
import { replyFromController, requireAuth } from "../../socket/socket.utils.js";

export const walletSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("wallet:get", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(getWallet, { socket }, ack);
    });

    socket.on("wallet:deposit", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(deposit, { socket, body: payload || {} }, ack);
    });
  });
};
