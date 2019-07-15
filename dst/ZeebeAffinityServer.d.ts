/// <reference types="node" />
import WebSocket from "ws";
interface ZBAffinityServerOptions {
    statsInterval?: number;
    logLevel?: "INFO" | "DEBUG";
}
interface WebSocketWithAlive extends WebSocket {
    isAlive: boolean;
    uuid: string;
    isWorker: boolean;
    isClient: boolean;
}
export declare class ZBAffinityServer {
    workers: {
        [key: string]: WebSocketWithAlive;
    };
    clients: {
        [key: string]: WebSocketWithAlive;
    };
    connections: {
        [key: string]: WebSocketWithAlive;
    };
    wss: WebSocket.Server;
    options: ZBAffinityServerOptions;
    removeDeadConnections: NodeJS.Timer;
    logLevel: string;
    constructor(options?: ZBAffinityServerOptions);
    listen(port: number, cb?: () => void): void;
    stats(): {
        time: string;
        workerCount: number;
        clientCount: number;
        cpu: NodeJS.CpuUsage;
        memory: NodeJS.MemoryUsage;
    };
    outputStats(): void;
    private log;
    private debug;
}
export {};
