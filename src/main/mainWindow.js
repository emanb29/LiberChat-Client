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
    console.log("Trying to connect... errors: ", await ircAgent.tryConnect())
  });
});

export default winHandler;
