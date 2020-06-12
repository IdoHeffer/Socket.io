// Calling io function to connect from the client
const socket = io();

// Elements:
// The $ sign is a common syntax to know it is an element saved in the const
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = document.querySelector('input');
const $messageFormButton = document.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages'); // the location we render the template

// Templates:
// We need the .innerHTML in order to render the template correctly
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options:
// using the qs library to parse the username and the room location the user insert when joining a chat-room
// by default it takes also the qustion mark
// in order to prevent it we added { ignoreQueryPrefix: true } as a second argument
// const { username, room } - extracting the username and the room from Qs.parse
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    // Visible height:
    const visibleHeight = $messages.offsetHeight;

    // Height of messages container:
    const containerHeight = $messages.scrollHeight;

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    // console.log(newMessageMargin);

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    };
};

// socket event listener for the message event
socket.on('message', (message) => {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a'),
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('locationMessage', (message) => {
    console.log(message);
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a'),
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomData', ({ room, users }) => {
    // console.log(room);
    // console.log(users);
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // setAttribute allow us to set attribute on our form element
    $messageFormButton.setAttribute('disabled', 'disabled'); // disable the button after one click, the second arument is the value

    const message = e.target.elements.message.value;

    socket.emit('sendMessage', message, (error) => {
        // remove the disable of setAttribute from the button
        // the button will be disabled just for a second, in order the user would be able to send message again
        $messageFormButton.removeAttribute('disabled');

        $messageFormInput.value = '';
        $messageFormInput.focus(); // after click on the send button the focus is still on the input 

        if (error) {
            return console.log(error);
        };
        console.log('Message delivered!');
    });
});

// not all browsers supports this geo-location, though most new browsers do
// we'll make sure to send the client the relevant message in this case
$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser.');
    };

    $sendLocationButton.setAttribute('disabled', 'disabled');

    // getCurrentPosition is async function, but currently does not supports the Promise API
    // so we can't use promise or async await
    navigator.geolocation.getCurrentPosition((position) => {
        // console.log(position);
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $sendLocationButton.removeAttribute('disabled');
            console.log('Location shared!');
        });
    });
});

// Sending the username and the room to the server side
// In the server side - index.js - will be a listener for 'join'
socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    };
});