import WebSocket from "ws";
interface AffinityServerOptions {
    statsInterval?: number;
}
export declare class ZeebeAffinityServer {
    workers: WebSocket[];
    clients: WebSocket[];
    port: number;
    wss: WebSocket.Server;
    options: AffinityServerOptions;
    constructor(port?: number, options?: AffinityServerOptions);
    listen(): void;
    outputStats(): void;
}
export {};
/**
 * Client connects.
 * When it registers as a client (interest in workflow outcomes)
 * When a worker communicates a workflow outcome, we broadcast the workflow to all clients. They are responsible for determining
 * whether or not the workflow outcome is of interest to them.
 *
 * We could manage that in the server, with subscriptions for specific outcomes. However, this would multiple the roundtrips and the
 * CPU and memory usage of the server.
 */
