const express = require("express");
var cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuidV4 } = require("uuid");
const http = require("http");

const app = express(); // initialize express

app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "s-max-age=1, stale-while-revalidate");
  next();
});

const server = http.createServer(app);

// set port to value received from environment variable or 4242 if null
const port = process.env.PORT || 4242;

// upgrade http server to websocket server
const io = new Server(server, {
  cors: "*", // allow connection from any origin
});

// Note:
// For simplicity, we’ll be making use of a Javascript Map.
// If you intend to build for production,
// consider making use of a database like Redis to store room data and game state.

const rooms = new Map();

// io.connection
io.on("connection", (socket) => {
  // socket refers to the client socket that just got connected.
  // each socket is assigned an id
  console.log(socket.id, "connected");

  //listen to username event

  socket.on("username", (username) => {
    // callback here refers to the callback function from the client passed as data
    console.log("username", username);
    socket.data.username = username;
  });

  socket.on("createRoom", async (callback) => {
    const roomId = uuidV4();
    await socket.join(roomId);

    // set roomId as a key and roomData including players as value in the map
    rooms.set(roomId, {
      roomId,
      players: [{ id: socket.id, username: socket.data?.username }],
    });

    callback(roomId);
  });

  socket.on("joinRoom", async (args, callback) => {
    // check if room exists and has a player waiting
    const room = rooms.get(args.roomId);
    let error, message;

    if (!room) {
      // if room does not exist
      error = true;
      message = "room does not exist";
    } else if (room.length <= 0) {
      // if room is empty set appropriate message
      error = true;
      message = "room is empty";
    } else if (room.length >= 2) {
      // if room is full
      error = true;
      message = "room is full"; // set message to 'room is full'
    }

    if (error) {
      // if there's an error, check if the client passed a callback,
      // call the callback (if it exists) with an error object and exit or
      // just exit if the callback is not given

      if (callback) {
        // if user passed a callback, call it with an error payload
        callback({
          error,
          message,
        });
      }

      return; // exit
    }

    await socket.join(args.roomId); // make the joining client join the room

    // add the joining user's data to the list of players in the room
    const roomUpdate = {
      ...room,
      players: [
        ...room.players,
        { id: socket.id, username: socket.data?.username },
      ],
    };

    rooms.set(args.roomId, roomUpdate);

    callback(roomUpdate); // respond to the client with the room details.

    // emit an 'opponentJoined' event to the room to tell the other player that an opponent has joined
    socket.to(args.roomId).emit("opponentJoined", roomUpdate);
  });

  socket.on("move", (data) => {
    // emit to all sockets in the room except the emitting socket.
    socket.to(data.room).emit("move", data.move);
  });

  socket.on("disconnect", () => {
    const gameRooms = Array.from(rooms.values()); // <- 1

    gameRooms.forEach((room) => {
      // <- 2
      const userInRoom = room.players.find((player) => player.id === socket.id); // <- 3

      if (userInRoom) {
        if (room.players.length < 2) {
          // if there's only 1 player in the room, close it and exit.
          rooms.delete(room.roomId);
          return;
        }

        socket.to(room.roomId).emit("playerDisconnected", userInRoom); // <- 4
      }
    });
  });

  socket.on("closeRoom", async (data) => {
    socket.to(data.roomId).emit("closeRoom", data); // <- 1 inform others in the room that the room is closing

    const clientSockets = await io.in(data.roomId).fetchSockets(); // <- 2 get all sockets in a room

    // loop over each socket client
    clientSockets.forEach((s) => {
      s.leave(data.roomId); // <- 3 and make them leave the room on socket.io
    });

    rooms.delete(data.roomId); // <- 4 delete room from rooms map
  });
});

app.get("/api", (req, res) => {
  const path = `/api/item/${v4()}`;
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "s-max-age=1, stale-while-revalidate");
  res.end(`Hello! Go to item: <a href="${path}">${path}</a>`);
});

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});

module.exports = app;
