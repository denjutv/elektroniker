const { ipcRenderer } = require("electron");

const { ELEKTRONIKER_GET_PORT } = require("./channel");

ipcRenderer.on(ELEKTRONIKER_GET_PORT, (event, message) => {
  console.log(Object.assign(message, { event }));
});

// contextBridge.exposeInMainWorld( "startElektroniker", function() {
//   ipcRenderer.send( ELEKTRONIKER_GET_PORT, {} );
// } );

window.startElektroniker = function () {
  ipcRenderer.send(ELEKTRONIKER_GET_PORT, {});
};
