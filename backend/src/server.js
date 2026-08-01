const app = require("./app");
const { DB_PATH } = require("./config/db");

const PORT = Number(process.env.PORT) || 5000;

function startServer(port, attemptsLeft = 5) {
  const server = app
    .listen(port, () => {
      console.log(`Backend listening on http://localhost:${port} — DB: ${DB_PATH}`);
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
        const nextPort = port + 1;
        console.warn(`Port ${port} in use, trying ${nextPort}...`);
        setTimeout(() => startServer(nextPort, attemptsLeft - 1), 300);
      } else {
        console.error("Server failed to start:", err);
        process.exit(1);
      }
    });
  return server;
}

startServer(PORT);
