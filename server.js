import express from 'express';
import { Server } from "socket.io";

// Workaround to fetch __dirname in a module.
import path from 'path';
import { fileURLToPath } from 'url';
import { timeStamp } from 'console';
const __filename = fileURLToPath(
    import.meta.url );
const __dirname = path.dirname( __filename );

const PORT = process.env.PORT || 3500;
const ADMIN = "Admin";

const app = express();

// Define static folder.
app.use( express.static( path.join( __dirname, "public" ) ) );

// Start server.
const expressServer = app.listen( PORT, () => {
    console.log( `Listening on port ${ PORT }` );
} );

// State for users
const UsersState = {
    users: [],
    setUsers: function( newUsersArray ) {
        this.users = newUsersArray
    }
};

// State for rooms
const RoomsState = {
    rooms: [],
    setRooms: function( newRoomsArray ) {
        this.rooms = newRoomsArray;
    }
};

const io = new Server( expressServer, {
    cors: {
        // origin: "*",
        origin: process.env.NODE_ENV === "production" ?
            ( false ) :
            ( [ "http://localhost:5500", "http://127.0.0.1:5500" ] )
    }
} );

// On connect
io.on( 'connection', ( socket ) => {
    console.log( `User ${ socket.id } connected.` );

    // Upon connection - only to user. (instead of io.emit)
    socket.on( 'onConnect', () => {
        const user = initUser( socket.id, "Anonymous_" + Math.ceil( Math.random() * 1000000 ), 'general' );
        socket.emit( 'onConnect', user );

        socket.emit( 'message', buildMsg( ADMIN, "Welcome to the chat!", user.room ) );

    } )

    // Listener when entering a new room.
    socket.on( 'enterRoom', ( { name, room } ) => {
        // Leave previous room (if applicable).
        const userId = getUser( socket.id );
        console.log( socket.id, userId );
        if ( userId ) {

            const prevRoom = userId.room;

            if ( prevRoom ) {

                socket.leave( prevRoom );

                // Send a message to the room we just left.
                io.to( prevRoom ).emit( 'message', buildMsg( ADMIN, `${ name } has left the room.` ) );
            }

            const user = initUser( socket.id, name, room );

            // Cannot update previous users list until after the state update in activate user.
            // Update previous room user list.
            if ( prevRoom ) {
                io.to( prevRoom ).emit( 'userList', {
                    users: getRoomUsers( prevRoom )
                } );
            }

            // Join new room.
            socket.join( user.room );

            // To user that joined.
            socket.emit( 'message', buildMsg( ADMIN, `You have joined the ${ user.room } chat room.` ) );

            // To everyone else.
            socket.broadcast.to( user.room ).emit( 'message', buildMsg( ADMIN, `${ user.name } has joined the room.` ) );


            // Update new room user list.
            io.to( user.room ).emit( 'userList', {
                users: getRoomUsers( user.room )
            } );

            // Update rooms list for everyone.
            io.emit( 'roomsList', {
                rooms: getActiveRooms()
            } );

        } else {
            const user = initUser( socket.id, name, room );


            // Join new room.
            socket.join( user.room );

            // To user that joined.
            socket.emit( 'message', buildMsg( ADMIN, `You have joined the ${ user.room } chat room.` ) );

            // To everyone else.
            socket.broadcast.to( user.room ).emit( 'message', buildMsg( ADMIN, `${ user.name } has joined the room.` ) );


            // Update new room user list.
            io.to( user.room ).emit( 'userList', {
                users: getRoomUsers( user.room )
            } );

            // Update rooms list for everyone.
            io.emit( 'roomsList', {
                rooms: getActiveRooms()
            } )
        }

    } );

    // Upon connection - to all others.
    // socket.broadcast.emit( 'message', `${ userID } connected.` );

    // On disconnect - to all others.
    // Socket.on is a listener.
    socket.on( 'disconnect', () => {
        const user = getUser( socket.id );
        userLeaves( user );

        if ( user ) {
            io.to( user.room ).emit( 'message', buildMsg( ADMIN, `${ user.name } has left the room` ) );

            io.to( user.room ).emit( 'userList', {
                users: getRoomUsers( user.room )
            } );

            // Update roomlist; if nobody in room, delete room.
            io.emit( 'roomList' );
        }
    } );

    // Listen for message events.
    socket.on( 'message', ( { name, text } ) => {
        const userId = getUser( socket.id );

        if ( userId ) {
            const room = userId.room;
            if ( room ) {
                io.to( room ).emit( 'message', buildMsg( name, text ) );
            }
        } else {
            const user = initUser( socket.id, name, "general" );
        }
    } );

    // Listen for activity.
    socket.on( 'activity', ( name ) => {
        socket.broadcast.emit( 'activity', name );
    } );

    socket.on( 'initUser', ( name, room ) => {
        const user = initUser( socket.id, name, room );
        socket.emit( 'initUser', user );
    } );
} );

function buildMsg( name, text ) {
    return {
        name,
        text,
        timeStamp: new Intl.DateTimeFormat( 'default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        } ).format( new Date() )
    }
}

// User functions
function initUser( id, name, room ) {
    const user = {
        id: id,
        name: name,
        room: room
    };
    UsersState.setUsers( [
        ...UsersState.users.filter( user => user.id !== id ),
        // ...UsersState.users,
        user
    ] );

    return user;
}

// User functions
function activateUser( id, name, room ) {
    const user = { id, name, room };
    UsersState.setUsers( [
        ...UsersState.users.filter( user => user.id !== id ),
        user
    ] );
    return user;
}

function userLeaves( id ) {
    const user = { id };
    UsersState.setUsers( [
        UsersState.users.filter( user => user.id !== id )
    ] );
}

function getUser( id ) {
    return UsersState.users.find( user => user.id === id );
}

function getRoomUsers( room ) {
    return UsersState.users.filter( user => user.room === room );
}

function getActiveRooms() {
    // .map returns a set; use Array.from() to return it to an array.
    return Array.from( UsersState.users.map( user => user.room ) );
}


/*
Websockets ver
    const ws = require( 'ws' );
    const server = new ws.Server( { port: '3000' } );

    server.on( 'connection', socket => {
        // Listen for a message.
        socket.on( 'message', message => {
            //
            const b = Buffer.from( message ); // Buffer the message.
            console.log( "message: ", message, "buffer: ", b.toString() );
            socket.send( `${ message }` );
        } )
    } )
*/
