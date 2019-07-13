# Zeebe Affinity Service

Zeebe Affinity Service to communicate workflow outcome to its initiator via a web socket subscription.

This server listens for workflow outcomes, which are communicated by Zeebe Affinity Workers. This relies on a task at the end of the workflow that is serviced by the included affinity worker.

Zeebe Affinity Clients subscribe to the Affinity service when they initiate a workflow, and then receive the workflow outcome on completion.

This allows you start a workflow in response to a REST request, and send the workflow outcome back to the requestor in the response.

The Zeebe Workflow Clients (which initiate workflows), and the Zeebe Affinity Workers (which collect the workflow outcomes) can be scaled.

In this Proof-of-Concept implementation, the Zeebe Affinity Service, however, must be a singleton, and cannot be load-balanced or scaled.

## Demo

You can run a demo in the `demo`  directory. You will need three terminals.

### Setup:
- Git clone this repo
- Run `npm i`

### Terminal 1
Start a Zeebe broker:

```
docker run -it --name zeebe -p 26500:26500 camunda/zeebe:0.18.0
```

### Terminal 2
Start the Affinity Server:

```
ZEEBE_AFFINITY_SERVER_STATS_INTERVAL=1 node dst/server.js
```

### Terminal 3
Start the demo workers / REST Server / REST Client:

```
cd demo
node index.js
```

## Using in your code

You can use the

## TODO

Better Documentation, an image, and Dockerfile for the Affinity Server.