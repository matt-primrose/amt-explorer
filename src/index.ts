/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import * as express from 'express'
import * as bodyParser from 'body-parser'
import { ClassMetaData, Logger, LogType, getObject } from './common'
import { MessageHandler, MessageObject, MessageRequest } from './messageHandler'
import { DigestAuth } from './digestAuth'
import { SocketHandler, SocketParameters } from './socketHandler'

export const logLevel = 'debug'
const app = express()
const serverPort = process.env.PORT ?? 3001
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

app.route('/').get((req, res) => {
  res.sendFile('index.html')
})

app.route('/classes').get(async (req, res) => {
  if (req.query.class && req.query.method) {
    const classItem = await getObject(req.query.class as string, req.query.method as string, socketHandler, digestAuth)
    console.log(classItem)
    res.status(200).send(classItem)
  }
  else {
    res.status(200).send(ClassMetaData)
  }
})

app.route('/connect').post(async (req, res) => {
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

app.route('/wsman').post(async (req, res) => {
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

app.route('/submit').post(async (req, res) => {
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

app.route('/disconnect').delete((req, res) => {
  if (socketHandler.socket !== null) {
    socketHandler.socket.destroy()
    socketHandler.socket = null
  }
  res.status(200).send('disconnected')
})

app.listen(serverPort, () => {
  Logger(LogType.INFO, 'AMT Explorer running at', ` http://localhost:${serverPort}`)
})
