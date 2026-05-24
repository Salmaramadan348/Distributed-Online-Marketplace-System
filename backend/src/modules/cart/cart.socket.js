import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} from "./cart.controller.js";
import { replyFromController, requireAuth } from "../../socket/socket.utils.js";

export const cartSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("cart:get", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(getCart, { socket }, ack);
    });

    socket.on("cart:add", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(addToCart, { socket, body: payload || {} }, ack);
    });

    socket.on("cart:update", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        updateCartItem,
        {
          socket,
          params: { productId: payload?.productId },
          body: { quantity: payload?.quantity }
        },
        ack
      );
    });

    socket.on("cart:remove", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        removeCartItem,
        { socket, params: { productId: payload?.productId } },
        ack
      );
    });

    socket.on("cart:clear", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(clearCart, { socket }, ack);
    });
  });
};
