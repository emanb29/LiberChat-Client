// @ts-check
import { Socket, connect } from "net";
import * as hl from "highland";
/**
 * @typedef Message
 * @type {{
      raw: string,
      prefix: string | null,
      command: string | number | null,
      params: string[],
      isResponse: () => boolean
    }}
 */

export default class IRCAgent {
  /**
   * @param {string} server
   * @param {string} nick
   * @param {string} user
   * @param {string} host
   * @param {string} realname
   */
  constructor(server, nick, user, host, realname) {
    // TODO sanitize
    this.server = server;
    this.nick = nick;
    this.user = user;
    this.host = host;
    this.realname = realname;
    this.socket = null;
    /**
     * @type {Highland.Stream<any>}
     */
    this.errors = hl();
    /**
     * @type {Highland.Stream<Message>}
     */
    this.messages = hl();
    this.initialized = false;
    // TODO initialize an incoming messages queue
  }
  static get ERR_SERVER_DISCONNECTED() {
    return "Server disconnected!";
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
    // TODO use a single error interface (the errors stream)
    let parseResult = IRCAgent.parseServer(this.server);
    if (parseResult.constructor === String) {
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
    let initMessagesSent = new Promise((resolve, reject) => {
      this.socket.write(
        `NICK :${this.nick}\r\nUSER ${this.user} ${this.host} * :${this.realname}\r\n`,
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    /**
     * @type {Highland.Stream<Buffer>}
     */
    const datastream = hl(this.socket);

    await initMessagesSent;

    let cachedToCRLF = "";
    // With the connection initialized, pipe parsed messages directly into the queue and allow the queue to start messaging the renderer process
    datastream
      .stopOnError(err => {
        this.errors.write(IRCAgent.ERR_SERVER_DISCONNECTED);
      })
      .flatMap(buff => {
        // Chunk to CRLF-ended strings
        cachedToCRLF += buff.toString("UTF-8");
        // TODO maybe support just \n?
        let matchesReversed;
        [cachedToCRLF, ...matchesReversed] = cachedToCRLF
          .split(/\r\n/g)
          .reverse();
        const matches = matchesReversed.reverse();

        return hl(matches);
      })
      .flatMap(msgStr => {
        // parse IRC messages
        // adapted from https://github.com/tmijs/tmi.js/blob/ddced239bfce21a7618f8655b827cb52a78acd8e/lib/parser.js#L122
        /**
         * @type {Message}
         */
        let message = {
          /**
           * @type {string}
           */
          raw: msgStr,
          prefix: null,
          command: null,
          params: [],
          isResponse() {
            // @ts-ignore parseInt actually works on Numbers
            if (this.command && !isNaN(parseInt(this.command))) return true;
            else return false;
          }
        };

        // NOTE the position variable is largely unnecessary for this adaptation of the algorithm, but since I already
        // wrote an extremely thorough parser on the server-side, I feel justified in being lazy here
        let position = 0;
        let nextspace = 0;

        let data = msgStr.trimLeft();

        // attempt to parse prefix
        if (data[position] === ":") {
          nextspace = data.indexOf(" ", position);
          if (nextspace === -1) {
            // malformed message
            console.warn(`Received malformed message from server: "${data}"`);
            return hl([]);
          }
          message.prefix = data.slice(position + 1, nextspace);
          position = nextspace + 1;
          // Skip extra whitespace
          while (data[position] === " ") {
            ++position;
          }
        }
        nextspace = data.indexOf(" ", position);

        if (nextspace === -1) {
          if (data.length <= position) {
            // malformed messsage
            console.warn(`Received malformed message from server: "${data}"`);
            return hl([]);
          } else {
            // nullary command
            message.command = data.slice(position);
            return hl([message]);
          }
        }
        // non-nullary:

        message.command = data.slice(position, nextspace);
        position = nextspace + 1;
        // Skip extra whitespace
        while (data[position] === " ") {
          ++position;
        }

        //parse parameters
        while (position < data.length) {
          nextspace = data.indexOf(" ", position);
          if (data[position] === ":") {
            // trailing parameter
            message.params.push(data.slice(position + 1));
            break;
          } else if (nextspace !== -1) {
            // more parameters
            message.params.push(data.slice(position, nextspace));
            position = nextspace + 1;

            // Skip extra whitespace
            while (data[position] === " ") {
              ++position;
            }
          } else {
            // no more whitespace, non-: parameter -- this is the final parameter but has no : prefix.
            message.params.push(data.slice(position));
            break;
          }
          // TODO this might break on "NICK emanb29 \r\n"? (note the extra space and lack of :)
        }

        return hl([message]);
      })
      .map(
        /**@type {(msg: Message) => Message} */
        msg => {
          // @ts-ignore the whole point of this is to cast
          const respCode = parseInt(msg.command);
          if (!isNaN(respCode)) {
            msg.command = respCode;
          }
          return msg;
        }
      )
      .map(
        /**@type {(msg: Message) => Message} */
        msg => {
          let normalizedCommand = msg.isResponse()
            ? msg.command
            : msg.command.toString().toUpperCase();
          msg.command = normalizedCommand;
          return msg;
        }
      )
      .each(
        /**@type {(msg: Message) => void} */
        msg => {
          // Short circuit handling for "low level" messages
          console.log(`Got ${msg.command} message`);
          if (msg.command === "ERROR") {
            this.errors.write(msg.params.join(","));
          } else if (msg.command === "PING") {
            this.socket.write(`PONG :${msg.params[msg.params.length - 1]}\r\n`);
            console.debug("Got PING, returning PONG.");
          } else if (msg.command === "QUIT") {
            console.error("Server disconnected us!");
            this.errors.write(IRCAgent.ERR_SERVER_DISCONNECTED);
            this.initialized = false;
          } else {
            // Main handling
            if (!this.initialized) {
              if (msg.isResponse() && msg.command < 6) {
                // we expect the response to be some kind of welcome message (100-106)
                console.log("Connection complete! Starting message queue");
                this.messages.write(msg); // passthru the message
                this.messages.resume();
                this.initialized = true;
              } else if (msg.isResponse() && msg.command === 433) {
                // nick taken
                this.errors.write(
                  "The requested nick is unavailable, please choose a new one."
                );
              } else {
                this.errors.write(
                  `An unexpected response was returned from the server: "${msg.raw}"`
                );
              }
            } else {
              // With the connection initialized, register callback[s] to pipe messages from the renderer process to the server
              this.messages.write(msg); // passthru the message
            }
          }
        }
      );
    return []; // no errors
  }
}
