const _ENV = 'development';
const socket = _ENV === 'development' ?
    ( io( 'ws://localhost:3500' ) ) :
    ( _ENV === 'production' ?
        ( io( 'https://gridchat-test-2.onrender.com' ) ) :
        ( io( 'ws://localhost:3500' ) ) );

// Activity detection element.
const activity = document.querySelector( '#content-activity' );
const msgInput = document.querySelector( '#form-message-input' );
const nameInput = document.querySelector( '#form-name-input' );
const roomInput = document.querySelector( '#form-room-input' );
const userList = document.querySelector( '#content-user-list' );
const roomList = document.querySelector( '#content-room-list' );
const chatMessages = document.querySelector( '#content-messages' );

// $( document ).ready( function () {
document.addEventListener( 'DOMContentLoaded', function() {
    socket.emit( 'onConnect' );
    document
        .querySelector( '#form-message' )
        .addEventListener( 'submit', sendMessage );

    document
        .querySelector( '#form-name' )
        .addEventListener( 'submit', createUser );

    document
        .querySelector( '#form-room' )
        .addEventListener( 'submit', enterRoom );

} );

function toggleSidebarLeft() {
    document
        .querySelector( '.sidebar-left' )
        .classList
        .toggle( 'active' );
}

function toggleSidebarRight() {
    document
        .querySelector( '.sidebar-right' )
        .classList
        .toggle( 'active' );
}

// On form submit, send message.
function sendMessage( e ) {
    e.preventDefault();

    if ( nameInput.value && msgInput.value && roomInput.value ) {
        socket.emit( 'message', {
            name: nameInput.value,
            text: msgInput.value,
            room: roomInput.value,
            timeStamp: Date.now()
        } );
        msgInput.value = "";
    }
    msgInput.focus();
}

const createUser = ( e ) => {
    e.preventDefault();
    if ( nameInput.value ) {
        // Notify the server.
        socket.emit( 'initUser', { name: nameInput.value } );
    }
}

const createRoom = ( e ) => {
    e.preventDefault();
    if ( roomInput.value ) {
        // Notify the server.
        socket.emit( 'createRoom', { room: roomInput.value } );
    }
}

const enterRoom = ( e ) => {
    e.preventDefault();
    if ( nameInput.value && roomInput.value ) {
        // Notify the server.
        socket.emit( 'enterRoom', {
            name: nameInput.value,
            room: roomInput.value
        } );

        // Clear out the chat log.
        chatMessages.innerHTML = '';
    }
}

msgInput.addEventListener( 'keypress', () => {
    // On keypress, notify server.
    socket.emit( 'activity', nameInput.value );
} );

// Listen for messages from the server and update DOM accordingly.
/*
socket.on( "message", ( data ) => {
    // Create list elements.
    activity.textContent = '';
    const li = document.createElement( 'li' );
    li.textContent = data.text;
    console.log( data );
    document
        .querySelector( '#content-messages' )
        .appendChild( li );
} );
*/

socket.on( 'onConnect', ( data ) => {
    const { id, name, room } = data;
    nameInput.value = name;
    roomInput.value = room;
    console.log( 'onConnect: ', data );
} )

socket.on( 'initUser', ( data ) => {
    const { id, name, room } = data;
    console.log( 'initUser: ', data );
} )

socket.on( "message", ( data ) => {
    // All messages visible in the current room for a given user.
    activity.textContent = ""
    const { name, text, timeStamp } = data
    const li = document.createElement( 'li' );

    console.log( 'Message received: ', data );
    li.className = 'post'
    if ( name === nameInput.value )
        li.className = 'post post-left'
    if ( name !== nameInput.value && name !== 'Admin' )
        li.className = 'post post-right'
    if ( name !== 'Admin' ) {
        li.innerHTML = `<div class="post-header ${name === nameInput.value
            ? 'post-header-user'
            : 'post-header-reply'}">
        <span class="post-header-name">${name}</span> 
        <span class="post-header-time">${timeStamp}</span> 
        </div>
        <div class="post-text">${text}</div>`
    } else {
        li.innerHTML = `<div class="post-text">${text}</div>`
    }
    document
        .querySelector( '#content-messages' )
        .appendChild( li )

    chatMessages.scrollTop = chatMessages.scrollHeight
} )

// Return-trip for activity handshake. Update DOM UI.
let activityTimer;
let activityTimerLength = 1250; // In milliseconds.
socket.on( 'activity', ( name ) => {
    activity.textContent = `${name} is typing . . .`;

    // Clear after a short delay after no activity.
    clearTimeout( activityTimer );
    activityTimer = setTimeout( () => {
        activity.textContent = '';
    }, activityTimerLength );
} );

socket.on( 'userList', ( { users } ) => {
    showUsers( users );
} )

socket.on( 'roomList', ( { rooms } ) => {
    showRooms( rooms );
} )

function showUsers( users ) {
    userList.textContent = ''
    if ( users ) {
        userList.innerHTML = `<em>Users in ${roomInput.value}:</em>`
        users.forEach( ( user, i ) => {
            userList.textContent += ` ${user.name}`
            if ( users.length > 1 && i !== users.length - 1 ) {
                userList.textContent += ","
            }
        } )
    }
}

function showRooms( rooms ) {
    roomList.textContent = ''
    if ( rooms ) {
        roomList.innerHTML = '<em>Active Rooms:</em>'
        rooms.forEach( ( room, i ) => {
            roomList.textContent += ` ${room}`
            if ( rooms.length > 1 && i !== rooms.length - 1 ) {
                roomList.textContent += ","
            }
        } )
    }
}
