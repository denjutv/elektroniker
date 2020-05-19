const { ipcRenderer } = require("electron");

const { ELEKTRONIKER_GET_PORT } = require("./channel");

ipcRenderer.on(ELEKTRONIKER_GET_PORT, (event, message) => {
  const socket = require("socket.io-client")(
    "http://localhost:" + message.port
  );

  socket.on("reload", function (data) {
    location.reload();
  });
});

// contextBridge.exposeInMainWorld( "startElektroniker", function() {
//   ipcRenderer.send( ELEKTRONIKER_GET_PORT, {} );
// } );

window.startElektroniker = function () {
  ipcRenderer.send(ELEKTRONIKER_GET_PORT, {});
};
