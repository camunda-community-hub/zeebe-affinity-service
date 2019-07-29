You can run a demo in the demo directory. You will need three terminals.

Setup:
Git clone this repo
Run npm i
Terminal 1
Start a Zeebe broker:

docker run -it --name zeebe -p 26500:26500 camunda/zeebe:0.18.0
Terminal 2
Start the Affinity Server:

cd demo
node affinity-server.js
Terminal 3
Start the demo workers / REST Server / REST Client:

cd demo
node index.js
Using in your code
You can install this from npm:

npm i zeebe-node-affinity
