/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import * as express from 'express'
import * as bodyParser from 'body-parser'
import { ConnectionHandler, httpRequest } from './connectionHandler'
import { AMT, IPS, CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { BodyObj, ClassMetaData, parseBody, parseXML } from './common'

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

app.post('/wsman', function (req, res) {
  if (req.body) {
    let splitAPI = req.body.api.split('_')
    let bodyObj = new BodyObj()
    bodyObj.class = splitAPI[0].toString()
    bodyObj.api = splitAPI[1].toString()
    bodyObj.method = req.body.method.toString()
    if (req.body.message) {
      const body = parseBody(req.body.message?.toString())
      bodyObj.message = parseXML(body)
    } else {
      bodyObj.message = null
    }
    switch (bodyObj.class) {
      case 'AMT':
        const amtWSMAN = new AMT.Messages()
        res.send(amtWSMAN[bodyObj.api](bodyObj.method, bodyObj.message))
        break
      case 'IPS':
        const ipsWSMAN = new IPS.Messages()
        res.send(ipsWSMAN[bodyObj.api](bodyObj.method, bodyObj.message))
        break
      case 'CIM':
        const cimWSMAN = new CIM.Messages()
        res.send(cimWSMAN[bodyObj.api](bodyObj.method, bodyObj.message))
        break
      default:
        res.status(404).send('unsupported class')
        break
    }
  }
})

app.post('/submit', function (req, res) {
  const request: httpRequest = req.body
  connection = new ConnectionHandler(request.address, request.port, request.username, request.password, request.message)
  console.log(`Submitting message:\n\r${request.message}`)
  connection.connect((response) => {
    console.log(`sending response to page:\n\r${JSON.stringify(response)}`)
    res.status(200).json(response)
  })
})

app.listen(port, () => {
  console.log(`Example app running at http://localhost:3000/index.htm`)
})
