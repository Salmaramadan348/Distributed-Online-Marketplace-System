import { messageModel } from "../../../db/models/chat.model.js";
import { getRoomId } from "./room.util.js";
import { safeAck } from "../../socket/socket.utils.js";

export const chatSocket = (io) => {

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    socket.on("join-chat", ({ userB }) => {
      if (!socket.user?._id) return;
      //const sender = socket.user.id;
      const sender = socket.user._id;
      const roomId = getRoomId(sender, userB);
      socket.join(roomId);
      console.log("Joined chat room:", roomId);
    });

    socket.on("chat:history", async (payload, ack) => {
      const reply = safeAck(ack);
      if (!reply) return;

      try {
        if (!socket.user?._id) {
          reply({ ok: false, status: 401, error: "Unauthorized" });
          return;
        }

        if (!payload?.otherUserId) {
          reply({ ok: false, status: 400, error: "otherUserId is required" });
          return;
        }

        const roomId = getRoomId(socket.user._id, payload.otherUserId);
        const messages = await messageModel.find({ roomId }).sort({ createdAt: 1 });

        reply({ ok: true, status: 200, data: messages });
      } catch (error) {
        reply({ ok: false, status: 500, error: error?.message || "Server error" });
      }
    });

    socket.on("send-message", async (data) => {
      if (!socket.user?._id) return;
      const { receiver, msg } = data;
      //const sender = socket.user.id;
      const sender = socket.user._id;

      const roomId = getRoomId(sender, receiver);

      const message = await messageModel.create({
        roomId,
        senderId: sender,
        content: msg
      });

      io.to(roomId).emit("receive-message", message);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

  });
};