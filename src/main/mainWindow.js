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

      // TODO send errors to renderer
      contents.send("irc-error", errStr);
    });
    console.log("Trying to connect...");
    let errors = await ircAgent.tryConnect();
    errors.forEach(err => {
      /**
       * @type {string}
       */
      let errStr;
      if (err instanceof Object) errStr = JSON.stringify(err);
      else errStr = String(err);

      // TODO send errors to renderer
      contents.send("irc-error", errStr);
    });
    // TODO pipe messages to renderer
    // ircAgent.messages.pipe()
  });
});

export default winHandler;
