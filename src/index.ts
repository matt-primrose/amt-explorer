/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import * as express from 'express'
import * as bodyParser from 'body-parser'
import { ClassMetaData, Logger, LogType, parseBody } from './common'
import { MessageHandler, MessageObject, MessageRequest } from './messageHandler'
import { DigestAuth } from './digestAuth'
import { SocketHandler, SocketParameters } from './socketHandler'
import * as xml2js from 'xml2js'

export const logLevel = 'debug'
const app = express()
const serverPort = 3000
let socketHandler: SocketHandler
let digestAuth: DigestAuth
let socketParameters: SocketParameters
class HttpRequest {
  address: string
  port: number
  username: string
  password: string
}

class HttpResponse {
  xmlBody: string
  jsonBody: any
}

app.use(express.static('public'))
app.use(bodyParser.json({ type: 'application/json' }))

app.get('/index.htm', function (req, res) {
  res.status(200).sendFile(__dirname + "/index.htm")
})

app.get('/classes', function (req, res) {
  res.status(200).send(ClassMetaData)
})

app.post('/connect', async function (req, res) {
  const request: HttpRequest = req.body
  if (request.address == null || request.port == null || request.username == null || request.password == null) {
    res.status(404).json({ error: 'invalid request' })
  }
  digestAuth = new DigestAuth(request.username, request.password, request.address, request.port)
  socketParameters = { address: request.address, port: request.port }
  if (socketHandler == null) { socketHandler = new SocketHandler(socketParameters) }
  const connectResponse = await socketHandler.connect()
  if (connectResponse === 'connected') {
    // Socket is ready for messages
    res.status(200).send(connectResponse)
  }
  if (connectResponse === 'error') {
    // Socket error
    res.status(500).send(connectResponse)
  }
})

app.post('/wsman', async function (req, res) {
  if (req.body) {
    const messageHandler = new MessageHandler(socketHandler, digestAuth)
    const messageObject: any = messageHandler.createMessageObject(req.body)
    if (messageObject.error?.length > 0) {
      messageObject.error.forEach(element => {
        Logger(LogType.ERROR, 'INDEX', element)
      });
      res.status(500).send(messageObject)
    } else {
      messageObject.xml = await messageHandler.createMessage(messageObject)
      res.status(200).send(messageObject.xml)
    }
  } else {
    res.status(500).send('Missing body')
  }
})

app.post('/submit', async function (req, res) {
  if (digestAuth == null || socketHandler == null) {
    res.status(500).send('Error: not connected')
    Logger(LogType.ERROR, 'INDEX', 'Error: not connected')
    return
  }
  const request: MessageRequest = req.body
  const messageHandler = new MessageHandler(socketHandler, digestAuth)
  const messageObject = messageHandler.createMessageObject(request)
  if (messageObject.error?.length > 0) {
    messageObject.error.forEach(element => {
      Logger(LogType.ERROR, 'INDEX', element)
    })
    res.status(500).send(messageObject)
  } else {
    const response: MessageObject = await messageHandler.sendMessage(messageObject)
    const httpResponse = new HttpResponse()
    httpResponse.xmlBody = response.xmlResponse
    httpResponse.jsonBody = response.jsonResponse
    res.status(response.statusCode).send(httpResponse)
  }
})

app.delete('/disconnect', function (req, res) {
  if (socketHandler.socket !== null) {
    socketHandler.socket.destroy()
    socketHandler.socket = null
  }
  res.status(200).send('disconnected')
})

app.listen(serverPort, () => {
  Logger(LogType.INFO, 'AMT Explorer running at', ` http://localhost:3000/index.htm`)
})
