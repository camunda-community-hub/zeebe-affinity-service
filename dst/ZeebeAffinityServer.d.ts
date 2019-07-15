/// <reference types="node" />
import WebSocket from "ws";
interface ZBAffinityServerOptions {
    statsInterval?: number;
}
export declare class ZBAffinityServer {
    workers: WebSocket[];
    clients: WebSocket[];
    wss: WebSocket.Server;
    options: ZBAffinityServerOptions;
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
}
export {};
