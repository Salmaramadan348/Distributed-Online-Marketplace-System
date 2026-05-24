import { askAi, getServices } from "./ai.controller.js";
import { replyFromController } from "../../socket/socket.utils.js";

export const aiSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("ai:services", (payload, ack) => {
      replyFromController(getServices, { socket }, ack);
    });

    socket.on("ai:ask", (payload, ack) => {
      replyFromController(askAi, { socket, body: payload || {} }, ack);
    });
  });
};
