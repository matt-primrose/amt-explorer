/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
import { Errback } from 'express'
import * as HttpZ from 'http-z'
import * as net from 'node:net'
import xml2js from 'xml2js'

export class ConnectionParameters {
  address: string
  port: number
  username: string
  password: string
}

export class ConnectionHandler {
  socket: net.Socket
  connectionAttempts: number
  message: HttpZ.HttpZResponseModel
  request: HttpZ.HttpZRequestModel
  response: HttpZ.HttpZResponseModel
  messageId: number
  connectionParameters: ConnectionParameters
  rawChunkedData: string = ''
  digestChallenge: string = ''
  resolve: (data) => void
  parser: any
  stripPrefix: any

  constructor(address: string, port: number, username: string, password: string) {
    this.socket = null
    this.connectionAttempts = 0
    this.message = null
    this.request = null
    this.response = null
    this.messageId = 0
    this.connectionParameters = {
      address: address,
      port: port,
      username: username,
      password: password
    }
    this.stripPrefix = xml2js.processors.stripPrefix
    this.parser = new xml2js.Parser({ ignoreAttrs: true, mergeAttrs: false, explicitArray: false, tagNameProcessors: [this.stripPrefix], valueProcessors: [xml2js.processors.parseNumbers, xml2js.processors.parseBooleans] })
  }

  connect(): void {
    if (this.socket == null) {
      this.socket = new net.Socket()
      this.socket.setEncoding('binary')
      this.socket.setTimeout(6000)
      this.socket.on('data', this.onSocketData)
      this.socket.on('close', this.onSocketClosed)
      this.socket.on('timeout', this.onTimeout)
      this.socket.on('error', this.onError)
      this.socket.on('ready', this.onSocketReady.bind(this, this.message))
      this.socket.connect(this.connectionParameters.port, this.connectionParameters.address)
    }
  }

  close(): void {
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }

  onSocketData(data): void {
    console.log(`received data from AMT: ${data}`)
    this.rawChunkedData += data
    if (this.rawChunkedData.includes('</html>') || this.rawChunkedData.includes('0\r\n\r\n')) {
      try {
        this.message = HttpZ.parse(this.rawChunkedData) as HttpZ.HttpZResponseModel
        if (this.message.statusCode === 200) {
          const xmlBody = this.parseBody(this.message)
          this.response = this.parseXML(xmlBody)
        }
      } catch (err) {
        console.error(err)
        this.resolve(this.rawChunkedData)
      }
      this.rawChunkedData = null
    }
  }

  onSocketClosed(): void {
    console.log(`socket closed socket: ${this.socket.readyState}`)
  }

  onTimeout(): void {
    console.log(`socket timeout socket: ${this.socket.readyState}`)
  }

  onError(err: Errback): void {
    console.error(err)
  }

  onSocketReady(): void { }
  async sendData(data: string, params?: ConnectionParameters): Promise<string> {
    return await new Promise((resolve, reject) => {

    })
  }

  parseBody(message: HttpZ.HttpZResponseModel): string {
    let xmlBody: string = ''
    // parse the body until its length is greater than 5, because body ends with '0\r\n\r\n'
    while (message.body.text.length > 5) {
      const chunkLength = message.body.text.indexOf('\r\n')
      if (chunkLength < 0) {
        return ''
      }
      // converts hexadecimal chunk size to integer
      const chunkSize = parseInt(message.body.text.substring(0, chunkLength), 16)
      if (message.body.text.length < chunkLength + 2 + chunkSize + 2) {
        return ''
      }
      const data = message.body.text.substring(chunkLength + 2, chunkLength + 2 + chunkSize)
      message.body.text = message.body.text.substring(chunkLength + 2 + chunkSize + 2)
      xmlBody += data
    }
    return xmlBody
  }
  
  parseXML (xmlBody: string): any {
    let wsmanResponse: string
    this.parser.parseString(xmlBody, (err, result) => {
      if (err) {
        wsmanResponse = null
      } else {
        wsmanResponse = result
      }
    })
    return wsmanResponse
  }
}