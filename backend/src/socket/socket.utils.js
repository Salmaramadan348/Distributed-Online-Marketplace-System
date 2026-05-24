export const safeAck = (ack) => (typeof ack === "function" ? ack : null);

export const requireAuth = (socket, ack) => {
  if (!socket?.user) {
    const reply = safeAck(ack);
    if (reply) {
      reply({ ok: false, status: 401, error: "Unauthorized" });
    }
    return false;
  }
  return true;
};

const buildRes = (resolve) => {
  let statusCode = 200;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(payload) {
      resolve({ status: statusCode, data: payload });
    },
    send(payload) {
      resolve({ status: statusCode, data: payload });
    }
  };

  return res;
};

export const runController = async (
  handler,
  { socket, body = {}, params = {}, query = {}, file = undefined }
) => {
  return new Promise((resolve) => {
    const req = {
      body,
      params,
      query,
      file,
      user: socket?.user
    };
    const res = buildRes(resolve);

    Promise.resolve(handler(req, res)).catch((error) => {
      resolve({
        status: 500,
        data: { message: error?.message || "Server error" }
      });
    });
  });
};

export const replyFromController = async (handler, context, ack) => {
  const reply = safeAck(ack);
  if (!reply) return;

  const result = await runController(handler, context);

  if (result.status >= 400) {
    reply({
      ok: false,
      status: result.status,
      error: result.data?.message || "Request failed",
      data: result.data
    });
    return;
  }

  reply({ ok: true, status: result.status, data: result.data });
};
