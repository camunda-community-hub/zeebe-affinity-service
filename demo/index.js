/* eslint-disable promise/catch-or-return */
/* eslint-disable @typescript-eslint/no-var-requires */
const { ZBAffinityClient } = require("../dst"); // require("zeebe-node-affinity");

// On the internal network, we are using the Zeebe Node client with Affinity - zeebe-node-affinity
const zbc = new ZBAffinityClient("localhost:26500", {
  affinityServiceUrl: "ws://localhost:8089" //  <- you need to run an Affinity server for this to work
});

/* Emulated REST Client that requests a route that triggers a workflow, and receives the outcome in the response */
function emulateRESTClient() {
  console.log(`\nREST Client:`);
  // Make 100 requests
  for (let i = 0; i < 50; i++) {
    const req = { route: "/affinity-test", params: { name: `John${i}` } };
    const responseHandler = res => console.log("Received response from server:", res);
    setTimeout(() => {
      console.log(`Posting`, req);
      httpGET(req, responseHandler);
    }, i * 200);
  }
}

/* ^^^ REST Client ^^^ */
/* Here is the REST boundary. We will return a workflow outcome to emulateRESTClient in a req-res */
/* vvv REST Server vvv */

/* Emulated REST Middleware */
function httpGET(req, clientResponseHandler) {
  const res = {
    send: clientResponseHandler
  };
  const routedRequest = { ...req, route: req.route.split("/")[1] }; // Remove slash
  console.log('Sent request to server:', routedRequest);
  serverRESTHandler(routedRequest, res);
}

/* Route handler */
async function serverRESTHandler(req, res) {
  try {
    const variables = await zbc.createProcessInstanceWithAffinity({
      bpmnProcessId: req.route,
      variables: req.params,
    });
    console.log('Received response from server:', JSON.stringify(variables));
    res.send(variables);
  } catch (error) {
    console.error('Error in serverRESTHandler:', error);
    res.send(error);
  }
}

async function deployWorkflow() {
  const bpmnFilePath = "../demo/affinity-test.bpmn";
  const wf = await zbc.deployProcess(bpmnFilePath);
  console.log(`VF => ${JSON.stringify(wf)}`);
}

deployWorkflow().then(emulateRESTClient).catch((error) => {
  console.error('Error in deployWorkflow:', error);
});
