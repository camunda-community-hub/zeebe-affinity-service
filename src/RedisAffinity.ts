import redis from 'redis';

const client = redis.createClient();

export function registerWorker(id: string) {
  const workerId = id;
  client.LPUSH('WorkersList', workerId);
  client.HSET(
    workerId,
    'uuid',
    workerId,
    'isWorker',
    'true',
    'isClient',
    'false'
  );
  console.log('New worker connected');
}

export function registerWorkflowInstance(id: string) {
  const workflowInstanceKey = id;
  client.LPUSH('WorkflowInstancesList', workflowInstanceKey);
  client.HSET(
    workflowInstanceKey,
    'uuid',
    workflowInstanceKey,
    'isWorker',
    'false',
    'isClient',
    'true'
  );
  console.log('New workflow instance');
}
