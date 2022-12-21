# AMT Explorer

## Installation
```bash
git clone https://github.com/matt-primrose/amt-explorer.git
npm install
```

## Run
```bash
npm run start
```

Open browser and navigate to address in terminal

```bash
AMT Explorer running at: http://localhost:3000/index.htm
```

Fill out Host, Port, Username, and Password for the AMT device to connect to; click connect

Select and API Call and Method from the drop down lists.  XML Transmit will auto populate with the XML formatted WSMAN call to send to AMT

Clicking Submit will send the call to the AMT device and the XML formatted WSMAN response from AMT will show up in XML Received.  A JSON formatted response will be presented in JSON Received

NOTE: AMT Explorer currently doesn't support TLS, so the only valid port is 16992