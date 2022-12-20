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
import { Methods } from '@open-amt-cloud-toolkit/wsman-messages/amt'
import { HttpZError, HttpZResponseModel } from 'http-z'
import * as xml2js from 'xml2js'

export const logLevel = 'debug'
const app = express()
const serverPort = 3000
let socketHandler: SocketHandler
let digestAuth: DigestAuth
let socketParameters: SocketParameters
const stripPrefix = xml2js.processors.stripPrefix
const parser = new xml2js.Parser({ ignoreAttrs: true, mergeAttrs: false, explicitArray: false, tagNameProcessors: [stripPrefix], valueProcessors: [myParseNumbers, xml2js.processors.parseBooleans] })
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

app.post('/wsman', function (req, res) {
  if (req.body) {
    const messageHandler = new MessageHandler()
    const messageObj: MessageObject = messageHandler.splitAPICall(req.body.api)
    messageObj.method = req.body.method.toString()
    messageObj.xml = messageHandler.createMessage(messageObj, socketHandler)
    res.status(200).send(messageObj.xml)
  } else {
    res.status(404).send('Missing body')
  }
})

app.post('/submit', async function (req, res) {
  if (digestAuth == null || socketHandler == null) {
    res.status(500).send('Error: not connected')
    Logger(LogType.ERROR, 'INDEX', 'Error: not connected')
    return
  }
  let message
  const request: MessageRequest = req.body
  const messageHandler = new MessageHandler()
  const msgObj = messageHandler.MessageRequest2MessageObject(request)
  msgObj.xml = messageHandler.createMessage(msgObj)
  const httpResponse = new HttpResponse()
  switch (msgObj.method) {
    case Methods.GET:
    case Methods.ENUMERATE:
      message = await sendToSocket(msgObj)
      if (message.statusCode === 401) {
        const retry = await handleRetry(msgObj, message)
        httpResponse.xmlBody = parseBody(retry)
        httpResponse.jsonBody = parseXML(httpResponse.xmlBody)
        res.status(retry.statusCode).send(httpResponse)
      } else {
        httpResponse.xmlBody = parseBody(message)
        httpResponse.jsonBody = parseXML(httpResponse.xmlBody)
        res.status(message.statusCode).send(httpResponse)
      }
      break
    case Methods.PULL:
      message = await sendToSocket(msgObj)
    default:
      res.status(500).send('unsupported method')
      return
  }
})

async function handleRetry(messageObject: MessageObject, response: HttpZResponseModel): Promise<HttpZResponseModel> {
  const authHeaders = digestAuth.parseAuthorizationHeader(response)
  digestAuth.setDigestAuthHeaders(authHeaders)
  const retry = await sendToSocket(messageObject)
  return retry
}

async function sendToSocket(messageObject: MessageObject): Promise<HttpZResponseModel> {
  const message = digestAuth.createMessage(messageObject.xml, digestAuth.getDigestAuthHeaders())
  Logger(LogType.DEBUG, 'INDEX', `SENDING:\r\n${message}`)
  const response = await socketHandler.write(message)
  Logger(LogType.DEBUG, 'INDEX', `RESPONSE:\r\n${JSON.stringify(response)}`)
  return response
}

function myParseNumbers(value: string, name: string): any {
  if (name === 'ElementName' || name === 'InstanceID') {
    if (value.length > 1 && value.charAt(0) === '0') {
      return value
    }
  }
  return xml2js.processors.parseNumbers(value, name)
}

function parseXML(xmlBody: string): any {
  let wsmanResponse: string
  const xmlDecoded: string = Buffer.from(xmlBody, 'binary').toString('utf8')
  parser.parseString(xmlDecoded, (err, result) => {
    if (err) {
      Logger(LogType.ERROR, 'INDEX', `Failed to parse XML:${err}`)
      wsmanResponse = null
    } else {
      wsmanResponse = result
    }
  })
  return wsmanResponse
}

app.delete('/disconnect', function (req, res) {
  if (socketHandler.socket !== null) {
    socketHandler.socket.destroy()
    socketHandler.socket = null
  }
  res.status(200).send('disconnected')
})

app.listen(serverPort, () => {
  Logger(LogType.INFO, 'INDEX', `Example app running at http://localhost:3000/index.htm`)
})
