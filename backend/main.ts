import { Server } from "https://deno.land/x/socket_io@0.2.1/mod.ts";

const io = new Server({
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`socket ${socket.id} connected`);

  socket.emit("hello", "world");

  socket.on("disconnect", (reason) => {
    console.log(`socket ${socket.id} disconnected due to ${reason}`);
  });

  socket.on("drawing", (message) => {
    // Send the data to all other clients
    socket.broadcast.emit("drawing", message);
  });
});

Deno.serve({
  handler: io.handler(),
  port: 3001,
});
