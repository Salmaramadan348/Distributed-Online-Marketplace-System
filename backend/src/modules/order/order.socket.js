import {
  createOrder,
  deleteOrder,
  updateOrderStatus,
  getUserOrders,
  getAllOrders
} from "./order.controller.js";
import { replyFromController, requireAuth } from "../../socket/socket.utils.js";

export const orderSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("order:create", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(createOrder, { socket, body: payload || {} }, ack);
    });

    socket.on("order:listMine", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(getUserOrders, { socket }, ack);
    });

    socket.on("order:listAll", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(getAllOrders, { socket }, ack);
    });

    socket.on("order:updateStatus", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        updateOrderStatus,
        {
          socket,
          params: { orderId: payload?.orderId },
          body: { status: payload?.status }
        },
        ack
      );
    });

    socket.on("order:delete", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        deleteOrder,
        { socket, params: { orderId: payload?.orderId } },
        ack
      );
    });
  });
};
