// @ts-check
import { Socket, connect } from "net";
import * as hl from "highland";
/**
 * @typedef Message
 * @type {{
      raw: string,
      prefix: string | null,
      command: string | number,
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
            return this.command && this.command.constructor === Number;
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

        console.debug(`Successfully parsed ${JSON.stringify(message)}`);
        return hl([message]);
      })
      .map(
        /**@type {(msg: Message) => Message} */
        msg => {
          // @ts-ignore the whole point of this is to cast
          const respCode = parseInt(msg.command);
          if (respCode !== NaN) {
            msg.command = respCode;
          }
          return msg;
        }
      )
      .each(
        /**@type {(msg: Message) => void} */
        msg => {
          if (this.initialized) {
            // With the connection initialized, register callback[s] to pipe messages from the renderer process to the server
            this.messages.write(msg);
          } else {
            console.error("TODO need to actually initialize");
            // TODO if msg is a nick reject, display an error.
            // TODO on initial data, parse out 2 messages, queue any additional messages
            console.log("Connection complete! Starting message queue");
            this.messages.resume();
            // this.messages.write(msg);
          }
        }
      );

    return []; // no errors
  }
}
