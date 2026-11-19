import { Socket } from "node:net";

// This preload is inherited by fixture subprocesses through BUN_OPTIONS.
// Tests can replace fetch with a fake; restoring it restores this offline guard.
globalThis.fetch = Object.assign(
  async () => {
    throw new Error(
      "Smoke tests cannot call live HTTP providers. Install a fixture response.",
    );
  },
  { preconnect: () => undefined },
);

const connect = Socket.prototype.connect;
Object.defineProperty(Socket.prototype, "connect", {
  configurable: true,
  writable: true,
  value: function (this: Socket, ...parameters: unknown[]) {
    const argumentsList = Array.isArray(parameters[0])
      ? parameters[0]
      : parameters;
    const first = argumentsList[0];
    const options =
      typeof first === "object" && first !== null
        ? (first as { host?: string; port?: number | string })
        : { port: first, host: argumentsList[1] };
    if (
      Number(options.port) !== 55432 ||
      !["127.0.0.1", "localhost"].includes(String(options.host))
    )
      throw new Error(
        "Smoke tests cannot open network sockets except the isolated PostgreSQL server on localhost:55432.",
      );
    return Reflect.apply(connect, this, parameters);
  },
});
