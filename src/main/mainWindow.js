import path from "path";
import BrowserWinHandler from "./BrowserWinHandler";
import { ipcMain } from "electron";
import IRCAgent from "./IRCAgent";
const isDev = process.env.NODE_ENV === "development";

const INDEX_PATH = path.join(__dirname, "..", "renderer", "index.html");
const DEV_SERVER_URL = process.env.DEV_SERVER_URL; // eslint-disable-line prefer-destructuring

const winHandler = new BrowserWinHandler({
  height: 800,
  width: 1200,
  autoHideMenuBar: true
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
        let messageDisp = `<${msg.params[0]}> ${msg.prefix}: ${msg.params[1]}`;
        contents.send(messageDisp);
      } else if (msg.command === "JOIN") {
        //IRC-JOIN [user, channel]
        let data = [msg.prefix, msg.params[0]];
        contents.send("irc-join", data);
      } else if (msg.command === "PART") {
        //IRC-LEAVE [user, channel, message?]
        let data = [msg.prefix, msg.params[0]];
        if (msg.params.length > 1) data.push(msg.params[1]);
        contents.send("irc-leave", data);
      } else if (msg.command === 322) {
        // LIST entry
        console.debug("Received LIST entry", msg);
        let chanInfo = `LIST Channel: ${msg.params[0]} | Users: ${msg.params[1]} | Topic: ${msg.params[2]}`;
        contents.send("irc-message", chanInfo);
      } else if (msg.isResponse() && msg.command >= 400) {
        let errStr = [msg.command, ...msg.params].join(" ");
        contents.send("irc-error", errStr);
      }
      // TODO handle other messages
    });
    // ircAgent.messages.pipe()
  });
});

export default winHandler;
