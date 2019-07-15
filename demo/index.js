const { ZBAffinityClient } = require("../dst"); // require("zeebe-node-affinity");

// On the internal network, we are using the Zeebe Node client with Affinity - zeebe-node-affinity
const zbc = new ZBAffinityClient("localhost:26500", {
  affinityServiceUrl: "ws://localhost:8089" //  <- you need to run an Affinity server for this to work
});

/* Emulated REST Client that requests a route that triggers a workflow, and receives the outcome in the response */
function emulateRESTClient() {
  const req = { route: "/affinity-test", params: { name: "John" } };
  const responseHandler = res => console.log("Received", res);
  console.log(`\nREST Client:`);
  // Make 100 requests
  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      console.log(`Posting`, req);
      httpGET(req, responseHandler);
      req.params.name = `John${i}`;
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
  serverRESTHandler(routedRequest, res);
}

/* Route handler */
async function serverRESTHandler(req, res) {
  const wfi = await zbc.createWorkflowInstanceWithAffinity({
    bpmnProcessId: req.route,
    variables: req.params,
    cb: ({ variables }) => res.send(variables) // <- this callback gets the workflow outcome
  });
}

async function deployWorkflow() {
  const wf = await zbc.deployWorkflow("./affinity-test.bpmn");
}

deployWorkflow().then(emulateRESTClient);
