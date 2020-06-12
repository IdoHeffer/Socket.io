const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words'); // try to send some bad words 
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server); // New socketio instens
// We don't have the optoin to give CONST IO = socketio(app) our app. 
// That's why we created it on our own with CONST SERVER = createServer(app).
// Now we can give to CONST IO = socketio(server). 
// NOW OUR SERVER SUPPORTS SOCKET.

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

io.on('connection', (socket) => {
    // printing a message when a new client connects
    console.log('New Websocket Connection');

    // The listener to 'join':
    // socket.join can be used only in the server side and it gives us the possiblity of letting the 
    // user choose a room he wants to join to
    // We specificaly emit event to a specific room. So, all users in this room can see the messages in this room
    // options = { username, room }
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options });

        if (error) {
            return callback(error);
        };

        socket.join(user.room);
        socket.emit('message', generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
        // io.to.emit - emit an event to evrybody in a specific room 
        // socket.broadcast.to.emit - sending an event to evryone accept to a specific client, but it limiting it to specific chat-room
    });

    // The listener for 'sendMessage':
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();

        if (filter.isProfane(message)) {
            // isProfane is boolean - true by default
            // this code is going to run only if it is profane
            return callback('Profanity is not allowed!');
        };

        io.to(user.room).emit('message', generateMessage(user.username, message)); // send to all users connected
        callback();
    });

    // disconnected - reserverd word (NOT YOSSI)
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        };
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
        callback();
    });
});

server.listen(port, () => {
    console.log(`Server is up on port ${port}`);
});