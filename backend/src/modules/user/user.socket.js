import { userModel } from "../../../db/models/user.model.js";
import {
  getUser,
  postUser,
  updateUser,
  deleteUser,
  register,
  login,
  getMe
} from "./user.controller.js";
import {
  replyFromController,
  requireAuth,
  safeAck
} from "../../socket/socket.utils.js";

export const userSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("user:register", async (payload, ack) => {
      const reply = safeAck(ack);
      if (!reply) return;

      if (!payload?.email) {
        reply({ ok: false, status: 400, error: "email is required" });
        return;
      }

      const exist = await userModel.findOne({ email: payload.email });
      if (exist) {
        reply({
          ok: false,
          status: 409,
          error: "user already registered, please login"
        });
        return;
      }

      await replyFromController(register, { socket, body: payload || {} }, ack);
    });

    socket.on("user:login", (payload, ack) => {
      replyFromController(login, { socket, body: payload || {} }, ack);
    });

    socket.on("user:profile", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(getMe, { socket }, ack);
    });

    socket.on("user:list", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(getUser, { socket }, ack);
    });

    socket.on("user:addAdmin", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(postUser, { socket, body: payload || {} }, ack);
    });

    socket.on("user:update", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        updateUser,
        { socket, params: { id: payload?.id }, body: payload?.data || {} },
        ack
      );
    });

    socket.on("user:delete", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(
        deleteUser,
        { socket, params: { id: payload?.id } },
        ack
      );
    });

    socket.on("user:listPublic", async (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      const reply = safeAck(ack);
      if (!reply) return;

      try {
        const users = await userModel.find({}, "userName email _id");
        reply({ ok: true, status: 200, data: { users } });
      } catch (error) {
        reply({
          ok: false,
          status: 500,
          error: error?.message || "Server error"
        });
      }
    });
  });
};
