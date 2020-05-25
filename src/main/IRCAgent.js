// @ts-check
import { Socket, connect } from "net";
import * as hl from "highland";

export default class IRCAgent {
  /**
   * @param {string} server
   * @param {string} nick
   * @param {string} user
   * @param {string} host
   * @param {string} realname
   */
  constructor(server, nick, user, host, realname) {
    this.server = server;
    this.nick = nick;
    this.user = user;
    this.host = host;
    this.realname = realname;
    this.socket = null;
  }

  /**
   * @param {string} server
   * @returns {string | [string, number]} The host and port from the server string, or a string describing what went wrong
   */
  static parseServer(server) {
    // We start by validating the connection URL
    let parsed = server.split(":");
    if (parsed.length < 1 || parsed.length > 2)
      return "Server URL must be written as host:port";
    let host = parsed[0];
    let portStr = parsed[1];
    /**
     * @type {number}
     */
    let port;
    if (portStr === undefined) {
      port = 6667;
    } else {
      try {
        port = parseInt(portStr);
      } catch (err) {
        return "Port must be a number";
      }
    }
    console.log(`Parsed host ${host} port ${port}`);
    return [host, port];
  }

  /**
   * (Inefficiently because socket waste, but whatever) Attempt to connect to the specified server
   * @returns {Promise<string[]>} a list of errors, if any
   */
  async tryConnect() {
    let parseResult = IRCAgent.parseServer(this.server);
    if (parseResult instanceof String) {
      // @ts-ignore string vs String
      return [parseResult];
    }
    /**
     * @type {[string, number]}
     */
    // @ts-ignore this validity was checked above
    let [host, port] = parseResult;
    // With the connection URL validated, we try to actually connect
    /**
     * @type {Array<string>}
     */
    let connectionErrors = await new Promise(resolve => {
      this.socket = connect(port, host, () => {
        console.log("successfully connected to server");
        resolve([]);
      });
      this.socket.on("error", err => {
        resolve([err.message]);
      });
    });
    if (connectionErrors.length !== 0) return connectionErrors;

    // With a socket established, we send the initialization messages and await the response
    await new Promise((resolve, reject) => {
      this.socket.write(
        `NICK :${this.nick}\r\nUSER ${this.user} ${this.host} * :${this.realname}\r\n`,
        err => {
          if (err) reject(err);
          else resolve();
        }
      );

      /**
       * @type {Highland.Stream<Buffer>}
       */
      const datastream = hl(this.socket);

      datastream.each(data => {
        console.log(data.toString("UTF-8"));
      });
      
    });

    return []; // no errors
  }
}
