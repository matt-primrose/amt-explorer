/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
import { Errback } from 'express'
import * as HttpZ from 'http-z'
import * as net from 'node:net'
import * as xml2js from 'xml2js'
import * as crypto from 'node:crypto'
import { Messages, Methods } from '@open-amt-cloud-toolkit/wsman-messages/amt'

export class DigestChallenge {
  realm: string
  nonce: string
  stale: string
  qop: string
}

export class ConnectionParameters {
  address: string
  port: number
  username: string
  password: string
  digestChallenge?: DigestChallenge
  consoleNonce?: string
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
  status: boolean = false
  nonceCounter: any

  constructor(address: string, port: number, username: string, password: string) {
    this.socket = null
    this.connectionAttempts = 0
    this.message = null
    this.request = null
    this.response = null
    this.nonceCounter = null
    this.messageId = 0
    this.connectionParameters = {
      address: address,
      port: port,
      username: username,
      password: password
    }
    //this.stripPrefix = require('xml2js/lib/processors').stripPrefix
    this.stripPrefix = xml2js.processors.stripPrefix
    this.parser = new xml2js.Parser({ ignoreAttrs: true, mergeAttrs: false, explicitArray: false, tagNameProcessors: [this.stripPrefix], valueProcessors: [xml2js.processors.parseNumbers, xml2js.processors.parseBooleans] })
  }

  connect = (): void => {
    if (this.socket == null) {
      this.socket = new net.Socket()
      this.socket.setEncoding('binary')
      this.socket.setTimeout(6000)
      this.socket.on('data', this.onSocketData)
      this.socket.on('close', this.onSocketClosed)
      this.socket.on('timeout', this.onTimeout)
      this.socket.on('error', this.onError)
      this.socket.on('ready', this.onSocketReady)
      this.socket.connect(this.connectionParameters.port, this.connectionParameters.address)
    }
  }

  close = (): void => {
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }

  onSocketData = (data): void => {
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

  onSocketClosed = (): void => {
    console.log(`socket closed socket: ${this.socket.readyState}`)
  }

  onTimeout = (): void => {
    console.log(`socket timeout socket: ${this.socket.readyState}`)
  }

  onError = (err: Errback): void => {
    console.error(err)
  }

  onSocketReady = (): void => {
    console.log('socket ready')
    setTimeout(() => { this.amtAuthentication()}, 1000)
  }

  amtAuthentication = (): void => {
    const messages = new Messages()
    const generalSettingsMessage = messages.GeneralSettings(Methods.GET)
    this.wrapIt(generalSettingsMessage, this.connectionParameters)
  }

  sendData = async (data: string, params?: ConnectionParameters): Promise<string> => {
    return await new Promise((resolve, reject) => {

    })
  }

  parseBody = (message: HttpZ.HttpZResponseModel): string => {
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

  parseXML = (xmlBody: string): any => {
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

  wrapIt = (data, connectionParams) => {
    try {
      const url = '/wsman'
      const action = 'POST'
      let message = `${action} ${url} HTTP/1.1\r\n`
      if (data == null) {
        return null
      }
      if (connectionParams.digestChallenge != null) {
        // Prepare an Authorization request header from the 401 unauthorized response from AMT
        let responseDigest = null
        // console nonce should be a unique opaque quoted string
        connectionParams.consoleNonce = Math.random().toString(36).substring(7)
        const nc = ('00000000' + (this.nonceCounter++).toString(16)).slice(-8)
        const HA1 = this.hashIt(`${connectionParams.username}:${connectionParams.digestChallenge.realm}:${connectionParams.password}`)
        const HA2 = this.hashIt(`${action}:${url}`)
        responseDigest = this.hashIt(`${HA1}:${connectionParams.digestChallenge.nonce}:${nc}:${connectionParams.consoleNonce}:${connectionParams.digestChallenge.qop}:${HA2}`)
        const authorizationRequestHeader = this.digestIt({
          username: connectionParams.username,
          realm: connectionParams.digestChallenge.realm,
          nonce: connectionParams.digestChallenge.nonce,
          uri: url,
          qop: connectionParams.digestChallenge.qop,
          response: responseDigest,
          nc,
          cnonce: connectionParams.consoleNonce
        })
        message += `Authorization: ${authorizationRequestHeader}\r\n`
      }

      message += Buffer.from([
        `Host: ${connectionParams.address}:${connectionParams.port}`,
        'Transfer-Encoding: chunked',
        '',
        data.length.toString(16).toUpperCase(),
        data,
        0,
        '\r\n'
      ].join('\r\n'), 'utf8')
      console.log(message)
      return message
    } catch (err) {
      console.log('This is busted: ', err)
    }
  }

  hashIt = (data) => {
    return crypto.createHash('md5').update(data).digest('hex')
  }

  // Prepares Authorization Request Header
  digestIt = (params) => {
    const paramNames = []
    for (const i in params) {
      paramNames.push(i)
    }
    return `Digest ${paramNames.reduce((s1, ii) => `${s1},${ii}="${params[ii]}"`, '').substring(1)}`
  }

  parseAuthenticateResponseHeader = (value) => {
    const params = value.replace('Digest realm', 'realm').split(/([^=,]*)=("[^"]*"|[^,"]*)/)
    const obj: DigestChallenge = new DigestChallenge()
    for (let idx = 0; idx < params.length; idx = idx + 3) {
      if (params[idx + 1] != null) {
        obj[params[idx + 1].trim()] = params[idx + 2].replace(/"/g, '')
      }
    }
    if (obj.qop != null) {
      obj.qop = 'auth'
    }
    return obj
  }

  addAuthorizationHeader = (context) => {
    const { message } = context
    const found = message.headers?.find(item => item.name === 'Www-Authenticate')
    if (found != null) {
      return this.parseAuthenticateResponseHeader(found.value)
    }
  }
}