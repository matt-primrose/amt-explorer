/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import * as express from 'express'
import * as bodyParser from 'body-parser'
import { ConnectionHandler, ConnectionParameters } from './connectionHandler'
import { AMT, IPS, CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { BodyObj, ClassMetaData } from './common'
import { connect } from 'node:http2'
const app = express()
const port = 3000
let connection
app.use(express.static('public'))
app.use(bodyParser.json({ type: 'application/json' }))

app.get('/index.htm', function (req, res) {
  res.sendFile(__dirname + "/index.htm")
})

app.get('/classes', function (req, res) {
  res.send(ClassMetaData)
})

app.get('/connectionStatus', function (req, res) {
  if (connection == null) {
    res.send(false)
  } else {
    res.send(connection.status)
  }
})

app.post('/wsman', function (req, res) {
  if (req.body) {
    let splitAPI = req.body.api.split('_')
    let bodyObj = new BodyObj()
    bodyObj.class = splitAPI[0].toString()
    bodyObj.api = splitAPI[1].toString()
    bodyObj.method = req.body.method.toString()
    switch (bodyObj.class) {
      case 'AMT':
        const amtWSMAN = new AMT.Messages()
        res.send(amtWSMAN[bodyObj.api](bodyObj.method))
        break
      case 'IPS':
        const ipsWSMAN = new IPS.Messages()
        res.send(ipsWSMAN[bodyObj.api](bodyObj.method))
        break
      case 'CIM':
        const cimWSMAN = new CIM.Messages()
        res.send(cimWSMAN[bodyObj.api](bodyObj.method))
        break
      default:
        res.status(404).send('unsupported class')
        break
    }
  }
})

app.post('/connect', function (req, res) {
  const request: ConnectionParameters = req.body
  console.log(request)
  connection = new ConnectionHandler(request.address, request.port, request.username, request.password)
  connection.connect()
})

app.post('/submit', function (req, res) {
  
})

app.listen(port, () => {
  console.log(`Example app running at http://localhost:3000/index.htm`)
})



// function onSocketData(data) {

//   console.log('Received from AMT:\n\r' + data + '\n\r')
//   const message = httpZ.parse(data) as httpZ.HttpZResponseModel
//   switch (message.statusCode) {
//     case 401:
//       connectionAttempts++
//       if (connectionAttempts < 4) {
        
//         httpHandler = new HttpHandler()
//         messageHolder.digestChallenge = handleAuth(message)
//         sendData(messageHolder)
//       }
//       break
//     case 200:
//       console.log('OMG IT WORKED')
//       break
//   }
// }

// function onSocketClosed(event) {
//   console.log('socket (closed) state:', socket.readyState)
// }

// function onTimeout(event) {
//   console.log('socket (timeout) state:', socket.readyState)
// }

// function sendData(data) {
//   if (!httpHandler) {
//     httpHandler = new HttpHandler()
//   }
//   messageHolder.message = httpHandler.wrapIt(data.wsman, data)
//   console.log('Sending to AMT:\n\r' + messageHolder.message + '\n\r')
//   socket.write(Buffer.from(messageHolder.message, 'ascii'))
//   // Return Response to Webpage
// }

// 
