import redis from 'redis';
import { v4 as uuid } from 'uuid';
import { ZBClient, Duration } from 'zeebe-node';
import { KeyedObject } from 'zeebe-node/dist/lib/interfaces';

import { registerWorker, registerWorkflowInstance } from './RedisAffinity';

const subscriberCreateWorkflow = redis.createClient();
const subscriberPublishMessage = redis.createClient();
const publisher = redis.createClient();

subscriberCreateWorkflow.on("error", function(error) {
  console.error(error);
});
subscriberPublishMessage.on("error", function(error) {
  console.error(error);
});
publisher.on("error", function(error) {
  console.error(error);
});

export class RedisAffinityClient extends ZBClient {
  constructor(gatewayAddress: string) {
    super(gatewayAddress);
  }

  async createAffinityWorker(taskType: string) {
    const workerId: string = uuid();
    // TODO: register worker ???
    registerWorker(workerId);
    // create worker (ZB client)
    super.createWorker(workerId, taskType, async (job, complete) => {
      publisher.publish(job.workflowInstanceKey, JSON.stringify(job.variables));
      complete.success();
    });
  }

  async createWorkflowInstanceWithAffinity<Variables = KeyedObject>({
    bpmnProcessId,
    variables,
    cb,
  }: {
    bpmnProcessId: string;
    variables: Variables;
    cb: (message: any) => void;
    // cb: (workflowOutcome: WorkflowOutcome) => void;
  }) {
    // create workflow instance (ZB client)
    const wfi = await super.createWorkflowInstance(bpmnProcessId, variables);

    // TODO: register workflow instance ???
    registerWorkflowInstance(wfi.workflowInstanceKey);
    subscriberCreateWorkflow.subscribe(wfi.workflowInstanceKey);

    subscriberCreateWorkflow.on('message', (channel: string, message: string) => {
      console.log("Subscriber received message in channel '" + channel);
      subscriberCreateWorkflow.unsubscribe();
      return cb(JSON.parse(message));
    });
  }

  async publishMessageWithAffinity<Variables = KeyedObject>({
    correlationKey,
    messageId,
    name,
    variables,
    workflowInstanceKey,
    cb,
  }: {
    correlationKey: string;
    messageId: string;
    name: string;
    variables: Variables;
    workflowInstanceKey: string;
    cb: any;
    // cb: (workflowOutcome: WorkflowOutcome) => void;
  }) {
    const result = super.publishMessage({
      correlationKey,
      messageId,
      name,
      variables,
      timeToLive: Duration.seconds.of(10),
    });
    subscriberPublishMessage.subscribe(workflowInstanceKey);
    subscriberPublishMessage.on('message', (channel: string, message: string) => {
      console.log("Subscriber received message in channel '" + channel);
      subscriberPublishMessage.unsubscribe();
      return cb(JSON.parse(message));
    });
  }
  
}

