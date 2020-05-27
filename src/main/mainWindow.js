import path from "path";
import BrowserWinHandler from "./BrowserWinHandler";
import { ipcMain } from "electron";
import IRCAgent from "./IRCAgent";
const isDev = process.env.NODE_ENV === "development";

const INDEX_PATH = path.join(__dirname, "..", "renderer", "index.html");
const DEV_SERVER_URL = process.env.DEV_SERVER_URL; // eslint-disable-line prefer-destructuring

const winHandler = new BrowserWinHandler({
  height: 600,
  width: 1000
});

winHandler.onCreated(async browserWindow => {
  if (isDev) browserWindow.loadURL(DEV_SERVER_URL);
  else browserWindow.loadFile(INDEX_PATH);

  let contents = browserWindow.webContents;
  /**
   * @type {IRCAgent}
   */
  let ircAgent;

  ipcMain.on("irc-connect", async (event, data) => {
    ipcMain.removeAllListeners("irc-command-raw");
    ipcMain.on("irc-command-raw", (ev, cmd) => {
      ircAgent.socket.write(cmd);
    });
    ircAgent = new IRCAgent(
      data.server,
      data.nick,
      data.user,
      data.host,
      data.realname
    );
    ircAgent.errors.each(err => {
      /**
       * @type {string}
       */
      let errStr;
      if (err instanceof Object) errStr = JSON.stringify(err);
      else errStr = String(err);

      if (errStr === IRCAgent.ERR_SERVER_DISCONNECTED) {
        contents.send("go-index");
        contents.send("irc-error", errStr);
      } else {
        contents.send("irc-error", errStr);
      }
    });
    console.log("Trying to connect...");
    let errors = await ircAgent.tryConnect();
    if (errors.length === 0) {
      contents.send("go-chat");
    }
    errors.forEach(err => {
      /**
       * @type {string}
       */
      let errStr;
      if (err instanceof Object) errStr = JSON.stringify(err);
      else errStr = String(err);

      contents.send("irc-error", errStr);
    });
    // TODO pipe messages to renderer
    ircAgent.messages.each(msg => {
      if (msg.command === "PRIVMSG") {
        console.debug("Sending text message to renderer");
        contents.send("irc-message", [msg.prefix, ...msg.params].join(" "));
      } else if (msg.command === "JOIN") {
        //IRC-JOIN [user, channel]
        let data = [msg.prefix, msg.params[0]];
        contents.send("irc-join", data);
      } else if (msg.command === "PART") {
        //IRC-LEAVE [user, channel, message?]
        let data = [msg.prefix, msg.params[0]];
        if (msg.params.length > 1) data.push(msg.params[1]);
        contents.send("irc-leave", data);
      } else {
      }
      // TODO handle other messages
    });
    // ircAgent.messages.pipe()
  });
});

export default winHandler;
