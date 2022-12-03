/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import * as express from 'express'
import * as bodyParser from 'body-parser'
import { ConnectionHandler, httpRequest } from './connectionHandler'
import { ClassMetaData } from './common'
import { MessageHandler, MessageObject } from './messageHandler'
import { connect } from 'node:http2'

const app = express()
const port = 3000
let connection: ConnectionHandler
app.use(express.static('public'))
app.use(bodyParser.json({ type: 'application/json' }))

app.get('/index.htm', function (req, res) {
  res.status(200).sendFile(__dirname + "/index.htm")
})

app.get('/classes', function (req, res) {
  res.status(200).send(ClassMetaData)
})

app.post('/connect', function (req, res) {
  const request: httpRequest = req.body
  if (request.address == null || request.port == null || request.username == null || request.password == null) {
    res.status(404).json({ error: 'invalid request' })
  }
  if (connection == null) { connection = new ConnectionHandler() }
  connection.connect(request, () => {
    const connectedStatus = connection.connected()
    res.status(200).send(connectedStatus)
  })
})

app.post('/wsman', function (req, res) {
  if (req.body) {
    const messageHandler = new MessageHandler()
    const messageObj: MessageObject = messageHandler.splitAPICall(req.body.api)
    messageObj.method = req.body.method.toString()
    messageObj.xml = messageHandler.getMessage(messageObj, connection)
    res.status(200).send(messageObj.xml)
  } else {
    res.status(404).send('Missing body')
  }
})

app.post('/submit', function (req, res) {
  const request: httpRequest = req.body
  const messageHandler = new MessageHandler()
  const msgObj = messageHandler.httpRequest2MessageObject(request)
  const message = messageHandler.getMessage(msgObj, connection)
  res.status(200).send(message)
})

app.delete('/disconnect', function (req, res) {
  if (connection !== null) {
    connection.close()
    connection.connectionParameters = null
    const connectedStatus = connection.connected()
    res.status(200).send(connectedStatus)
  } else {
    res.status(200).send(false)
  }
})

app.listen(port, () => {
  console.log(`Example app running at http://localhost:3000/index.htm`)
})
