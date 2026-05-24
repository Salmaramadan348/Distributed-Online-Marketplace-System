import { summaryReport, publicSummaryReport } from "./report.controller.js";
import { replyFromController, requireAuth } from "../../socket/socket.utils.js";

export const reportSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("report:summary", (payload, ack) => {
      if (!requireAuth(socket, ack)) return;
      replyFromController(summaryReport, { socket }, ack);
    });

    socket.on("report:publicSummary", (payload, ack) => {
      replyFromController(publicSummaryReport, { socket }, ack);
    });
  });
};
