"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZBAffinityClient = void 0;
const promise_retry_1 = __importDefault(require("promise-retry"));
const uuid_1 = require("uuid");
const ws_1 = __importDefault(require("ws"));
const zeebe_node_1 = require("zeebe-node");
const WebSocketAPI_1 = require("./WebSocketAPI");
const AFFINITY_TIMEOUT_DEFAULT = 30000;
class ZBAffinityClient extends zeebe_node_1.ZBClient {
    constructor(gatewayAddress, options) {
        super(gatewayAddress, options);
        if (!(options && options.affinityServiceUrl)) {
            throw new Error("This ZBAffinityClient constructor options must have a url for a Zeebe Affinity Server!");
        }
        this.affinityServiceUrl = options && options.affinityServiceUrl;
        this.affinityTimeout =
            (options && options.affinityTimeout) || AFFINITY_TIMEOUT_DEFAULT;
        this.affinityCallbacks = {};
        this.createAffinityService();
    }
    createAffinityWorker(taskType) {
        const _super = Object.create(null, {
            createWorker: { get: () => super.createWorker }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForAffinity();
            WebSocketAPI_1.registerWorker(this.affinityService);
            _super.createWorker.call(this, uuid_1.v4(), taskType, (job, complete) => __awaiter(this, void 0, void 0, function* () {
                if (this.affinityService.readyState !== ws_1.default.OPEN) {
                    try {
                        yield this.waitForAffinity();
                    }
                    catch (e) {
                        return complete.failure(`Could not contact Affinity Server at ${this.affinityServiceUrl}`);
                    }
                }
                WebSocketAPI_1.publishWorkflowOutcomeToAffinityService({
                    workflowInstanceKey: job.workflowInstanceKey,
                    variables: job.variables
                }, this.affinityService);
                complete.success();
            }));
        });
    }
    createWorkflowInstanceWithAffinity({ bpmnProcessId, variables, version, cb }) {
        const _super = Object.create(null, {
            createWorkflowInstance: { get: () => super.createWorkflowInstance }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForAffinity();
            // TODO check for error creating workflow to prevent registering callback?
            const wfi = yield _super.createWorkflowInstance.call(this, bpmnProcessId, variables);
            if (this.affinityService) {
                this.affinityCallbacks[wfi.workflowInstanceKey] = cb; // Register callback for application code
            }
            return wfi;
        });
    }
    waitForAffinity() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.affinityService ||
                this.affinityService.readyState !== ws_1.default.OPEN) {
                const sleep = waitTimeInMs => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
                const timeoutFn = setTimeout(() => {
                    this.throwNoConnection();
                }, this.affinityTimeout);
                while (!this.affinityService ||
                    this.affinityService.readyState !== ws_1.default.OPEN) {
                    yield sleep(200);
                }
                clearTimeout(timeoutFn);
            }
        });
    }
    throwNoConnection() {
        throw new Error(`This ZBAffinityClient timed out establishing a connection to the Zeebe Affinity Server at ${this.affinityServiceUrl}!`);
    }
    createAffinityService() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.affinityServiceUrl) {
                return;
            }
            console.log("Creating affinity connection");
            const setUpConnection = this.setUpConnection.bind(this);
            yield promise_retry_1.default((retry, number) => new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    this.affinityService = new ws_1.default(this.affinityServiceUrl, {
                        perMessageDeflate: false
                    });
                    this.affinityService.on("error", err => {
                        console.log("ERRER", err);
                        reject();
                    });
                    this.affinityService.on("open", () => {
                        setUpConnection();
                        resolve();
                    });
                }
                catch (e) {
                    console.log(e.message);
                    reject(e);
                }
            })).catch(retry));
        });
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
        WebSocketAPI_1.registerClient(this.affinityService);
        console.log(`Connected to Zeebe Affinity Service at ${this.affinityServiceUrl}`);
        this.heartbeat();
        this.affinityService.on("ping", this.heartbeat.bind(this));
        this.affinityService.on("message", this.handleMessage.bind(this));
    }
    handleMessage(data) {
        const outcome = WebSocketAPI_1.demarshalWorkflowOutcome(data);
        if (outcome) {
            const wfi = outcome.workflowInstanceKey;
            if (this.affinityCallbacks[wfi]) {
                this.affinityCallbacks[wfi](outcome);
                this.affinityCallbacks[wfi] = undefined; // Object.delete degrades performance with large objects
            }
        }
    }
}
exports.ZBAffinityClient = ZBAffinityClient;
