import {
  getProduct,
  searchProducts,
  getSingleProduct,
  postProduct,
  updateProduct,
  deleteProduct,
  addRating,
  buyProduct,
  getMyProducts
} from "./product.controller.js";
import { replyFromController, requireAuth } from "../../socket/socket.utils.js";

export const productSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("product:list", (payload, ack) => {
      replyFromController(getProduct, { socket }, ack);
    });

    socket.on("product:search", (payload, ack) => {
      replyFromController(
        searchProducts,
        { socket, query: { keyword: payload?.keyword } },
        ack
      );
    });

    socket.on("product:get", (payload, ack) => {
      replyFromController(
        getSingleProduct,
        { socket, params: { id: payload?.id } },
        ack
      );
    });

    socket.on("product:mine", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(getMyProducts, { socket }, ack);
    });

    socket.on("product:create", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(postProduct, { socket, body: payload || {} }, ack);
    });

    socket.on("product:update", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        updateProduct,
        {
          socket,
          params: { id: payload?.id },
          body: payload?.data || payload || {}
        },
        ack
      );
    });

    socket.on("product:delete", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        deleteProduct,
        { socket, params: { id: payload?.id } },
        ack
      );
    });

    socket.on("product:rate", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        addRating,
        {
          socket,
          params: { productId: payload?.productId },
          body: {
            rating: payload?.rating,
            comment: payload?.comment
          }
        },
        ack
      );
    });

    socket.on("product:buy", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        buyProduct,
        { socket, params: { productId: payload?.productId } },
        ack
      );
    });
  });
};
