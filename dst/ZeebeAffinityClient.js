"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZBAffinityClient = void 0;
const promise_retry_1 = __importDefault(require("promise-retry"));
const ws_1 = __importDefault(require("ws"));
const zeebe_node_1 = require("zeebe-node");
const WebSocketAPI_1 = require("./WebSocketAPI");
const AFFINITY_TIMEOUT_DEFAULT = 30000;
class ZBAffinityClient extends zeebe_node_1.ZBClient {
    constructor(gatewayAddress, options) {
        super(gatewayAddress, options);
        if (!(options && options.affinityServiceUrl)) {
            throw new Error('This ZBAffinityClient constructor options must have a url for a Zeebe Affinity Server!');
        }
        this.affinityServiceUrl = options && options.affinityServiceUrl;
        this.affinityTimeout =
            (options && options.affinityTimeout) || AFFINITY_TIMEOUT_DEFAULT;
        this.affinityCallbacks = {};
        this.createAffinityService();
    }
    async createAffinityWorker(taskType) {
        await this.waitForAffinity();
        (0, WebSocketAPI_1.registerWorker)(this.affinityService);
        super.createWorker({
            taskType,
            taskHandler: async (job) => {
                if (this.affinityService.readyState !== ws_1.default.OPEN) {
                    try {
                        await this.waitForAffinity();
                    }
                    catch (e) {
                        return job.fail(`Could not contact Affinity Server at ${this.affinityServiceUrl}`);
                    }
                }
                (0, WebSocketAPI_1.publishProcessOutcomeToAffinityService)({
                    processInstanceKey: job.processInstanceKey,
                    variables: job.variables,
                }, this.affinityService);
                return job.complete();
            },
        });
    }
    async createProcessInstanceWithAffinity({ bpmnProcessId, variables, cb, }) {
        await this.waitForAffinity();
        // TODO check for error creating process to prevent registering callback?
        const wfi = await super.createProcessInstance(bpmnProcessId, variables);
        if (this.affinityService) {
            this.affinityCallbacks[wfi.processInstanceKey] = cb; // Register callback for application code
        }
        return wfi;
    }
    async waitForAffinity() {
        if (!this.affinityService ||
            this.affinityService.readyState !== ws_1.default.OPEN) {
            const sleep = (waitTimeInMs) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs));
            const timeoutFn = setTimeout(() => {
                this.throwNoConnection();
            }, this.affinityTimeout);
            while (!this.affinityService ||
                this.affinityService.readyState !== ws_1.default.OPEN) {
                await sleep(200);
            }
            clearTimeout(timeoutFn);
        }
    }
    throwNoConnection() {
        throw new Error(`This ZBAffinityClient timed out establishing a connection to the Zeebe Affinity Server at ${this.affinityServiceUrl}!`);
    }
    async createAffinityService() {
        if (!this.affinityServiceUrl) {
            return;
        }
        console.log('Creating affinity connection');
        const setUpConnection = this.setUpConnection.bind(this);
        await (0, promise_retry_1.default)((retry) => new Promise((resolve, reject) => {
            try {
                this.affinityService = new ws_1.default(this.affinityServiceUrl, {
                    perMessageDeflate: false,
                });
                this.affinityService.on('error', (err) => {
                    console.log('ERRER', err);
                    reject();
                });
                this.affinityService.on('open', () => {
                    setUpConnection();
                    resolve(null);
                });
            }
            catch (e) {
                console.log(e.message);
                reject(e);
            }
        }).catch(retry));
    }
    heartbeat() {
        clearTimeout(this.pingTimeout);
        this.pingTimeout = setTimeout(() => {
            this.affinityService.terminate();
            this.affinityService = undefined;
            this.createAffinityService();
        }, 30000 + 1000);
    }
    setUpConnection() {
        (0, WebSocketAPI_1.registerClient)(this.affinityService);
        console.log(`Connected to Zeebe Affinity Service at ${this.affinityServiceUrl}`);
        this.heartbeat();
        this.affinityService.on('ping', this.heartbeat.bind(this));
        this.affinityService.on('message', this.handleMessage.bind(this));
    }
    handleMessage(data) {
        const outcome = (0, WebSocketAPI_1.demarshalProcessOutcome)(data);
        if (outcome) {
            const wfi = outcome.processInstanceKey;
            if (this.affinityCallbacks[wfi]) {
                this.affinityCallbacks[wfi](outcome);
                this.affinityCallbacks[wfi] = undefined; // Object.delete degrades performance with large objects
            }
        }
    }
}
exports.ZBAffinityClient = ZBAffinityClient;
