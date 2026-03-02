import { Server } from "socket.io";
import http from "http";

let io: Server;

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // 특정 회사 호가창 구독
    socket.on("subscribe_company", (companyId: number) => {
      socket.join(`company_${companyId}`);
    });
    socket.on("unsubscribe_company", (companyId: number) => {
      socket.leave(`company_${companyId}`);
    });

    // 조직 전체 구독 (공시 뉴스 수신)
    socket.on("subscribe_org", (orgId: number) => {
      socket.join(`org_${orgId}`);
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error("Socket.io 초기화 안됨");
  return io;
}
