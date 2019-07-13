import { v4 as uuid } from "uuid";
import WebSocket from "ws";
import { ZBClient } from "zeebe-node";
import { KeyedObject, ZBClientOptions } from "zeebe-node/dist/lib/interfaces";
import {
  demarshalWorkflowOutcome,
  publishWorkflowOutcomeToAffinityService,
  registerClient,
  registerWorker,
  WorkflowOutcome
} from "./WebSocketAPI";

const AffinityServiceOpenTimeout = 2000;

interface ZBAffinityClientOptions extends ZBClientOptions {
  affinityServiceUrl: string;
}
export class ZBAffinityClient extends ZBClient {
  affinityServiceUrl: string;
  affinityService!: WebSocket;
  ws: any;
  affinityCallbacks: {
    [workflowInstanceKey: string]: (workflowOutcome: WorkflowOutcome) => void;
  };

  constructor(gatewayAddress: string, options: ZBAffinityClientOptions) {
    super(gatewayAddress, options);
    if (!(options && options.affinityServiceUrl)) {
      this.throwNoConnectionConfigured();
    }
    this.affinityServiceUrl = options && options.affinityServiceUrl;
    this.affinityCallbacks = {};
    this.createAffinityService();
  }

  createAffinityWorker(taskType: string) {
    if (!this.affinityServiceUrl) {
      this.throwNoConnectionConfigured();
    }
    if (!this.affinityService) {
      this.throwNoConnection();
    }
    registerWorker(this.affinityService);
    super.createWorker(uuid(), taskType, (job, complete) => {
      publishWorkflowOutcomeToAffinityService(
        {
          workflowInstanceKey: job.jobHeaders.workflowInstanceKey,
          variables: job.variables
        },
        this.affinityService
      );
      // TODO error handling and fail the job?
      complete.success();
    });
  }

  async createWorkflowInstanceWithAffinity<Variables = KeyedObject>({
    bpmnProcessId,
    variables,
    version,
    cb
  }: {
    bpmnProcessId: string;
    variables: Variables;
    version?: number;
    cb: (workflowOutcome: WorkflowOutcome) => void;
  }) {
    if (!this.affinityServiceUrl && cb) {
      this.throwNoConnectionConfigured();
    }
    if (!this.affinityService) {
      // Wait two seconds for the Affinity service connection to be established...
      // This is to avoid the potential race condition on initialisation.
      await new Promise(resolve =>
        setTimeout(() => {}, AffinityServiceOpenTimeout)
      );
      if (!this.affinityService) {
        this.throwNoConnection();
      }
    }
    // TODO check for error creating workflow to prevent registering callback?
    const wfi = await super.createWorkflowInstance(
      bpmnProcessId,
      variables,
      version
    );

    if (this.affinityService) {
      this.affinityCallbacks[wfi.workflowInstanceKey] = cb; // Register callback for application code
    }
    return wfi;
  }

  async initialise(timeout = 2000) {
    const sleep = waitTimeInMs =>
      new Promise(resolve => setTimeout(resolve, waitTimeInMs));
    const timeoutFn = setTimeout(() => {
      this.throwNoConnection();
    }, timeout);
    while (this.affinityService.readyState !== WebSocket.OPEN) {
      await sleep(500);
    }
    clearTimeout(timeoutFn);
  }

  private throwNoConnectionConfigured() {
    throw new Error(
      "This ZBAffinityClient does not have a connection to a Zeebe Affinity Server configured, and cannot take a callback!"
    );
  }

  private throwNoConnection() {
    throw new Error(
      `This ZBAffinityClient has not established a connection to the Zeebe Affinity Server at ${
        this.affinityServiceUrl
      } and cannot take a callback!`
    );
  }

  private createAffinityService() {
    if (!this.affinityServiceUrl) {
      return;
    }
    this.affinityService = new WebSocket(this.affinityServiceUrl, {
      perMessageDeflate: false
    });
    this.affinityService.on("open", () => {
      registerClient(this.affinityService);
      console.log(
        `Connected to Zeebe Affinity Service at ${this.affinityServiceUrl}`
      );
    });

    this.affinityService.on("message", data => {
      const outcome = demarshalWorkflowOutcome(data);
      if (outcome) {
        const wfi = outcome.workflowInstanceKey;
        if (this.affinityCallbacks[wfi]) {
          this.affinityCallbacks[wfi](outcome);
          this.affinityCallbacks[wfi] = undefined as any; // Object.delete degrades performance with large objects
        }
      }
    });
  }
}
