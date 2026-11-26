import cookie from "cookie";
import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDB, syncDB } from "./config/db.js";
import { env } from "./config/env.js";
import { Salary, Payroll } from "./models/Associations.model.js";
import {
  getAdminRoom,
  getManagerRoom,
  getUserRoom,
} from "./utils/socketRooms.utils.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      env.client_url?.trim(),
      env.domain_url?.trim(),
      env.custom_domain?.trim(),
      "http://localhost:5173",
    ],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      socket.disconnect();
      return;
    }

    const cookies = cookie.parse(cookieHeader);
    const token = cookies.token;

    const decoded = jwt.verify(token, env.jwt_password);
    const tenantId = decoded.tenantId;

    if (tenantId) {
      if (decoded.role === "admin") {
        socket.join(getAdminRoom(tenantId));
      } else if (decoded.role === "manager") {
        socket.join(getManagerRoom(tenantId));
      }

      socket.join(getUserRoom(decoded.id, tenantId));
    }

    socket.on("requestCreated", (data) => {
      if (tenantId) {
        io.to(getAdminRoom(tenantId)).emit("requestCreated", data);
      }
    });

    socket.on("requestUpdated", (data) => {
      if (tenantId) {
        io.to(getAdminRoom(tenantId)).emit("requestUpdated", data);
        io.to(getManagerRoom(tenantId)).emit("requestUpdated", data);
      }
    });
  } catch (err) {
    socket.disconnect();
  }

  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });
});

const startServer = async () => {
  await connectDB();

  try {
    await Salary.sync();
    await Payroll.sync();

    console.log("Salary and Payroll tables created successfully");
  } catch (error) {
    console.error("Payroll table creation failed:", error.message);
    process.exit(1);
  }

  server.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
};

startServer();

export { io };
