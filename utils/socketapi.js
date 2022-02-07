const io = require( "socket.io" )();
const socketapi = {
    io: io
};




io.on( "connection", function( socket ) {


    console.log( "A user connected",socket.id)

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on("order",(ids) => {
        console.log("IDS:",ids); // id trgovaca kojim treba prikazati
        io.emit("order",ids);

    })

    socket.on("poruka",(poruka,korisnik_id,ime) => {
        io.emit("poruka",poruka,korisnik_id,ime);

    })

});

module.exports = socketapi;