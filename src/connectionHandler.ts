/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
import { Errback } from 'express'
import { parse, HttpZResponseModel } from 'http-z'
import * as net from 'node:net'
import { createHash } from 'crypto'
import { error, parseBody, parseXML } from './common'
import { AMT } from '@open-amt-cloud-toolkit/wsman-messages'
import { MessageHandler, MessageObject } from './messageHandler'

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
  constructor(address: string, port: number, username: string, password: string) {
    this.address = address
    this.port = port
    this.username = username
    this.password = password
  }
}

export class httpRequest {
  address: string
  port: number
  username: string
  password: string
  apiCall: string
  method: string
}

export class ConnectionHandler {
  socket: net.Socket
  connectionAttempts: number
  socketData: HttpZResponseModel
  request: httpRequest
  messageObject: MessageObject
  messageHandler: MessageHandler
  messageId: number
  connectionParameters: ConnectionParameters
  rawChunkedData: string = ''
  nonceCounter: number = 1
  callback: any

  constructor() {
    this.socket = null
    this.connectionAttempts = 0
    this.socketData = null
    this.request = null
    this.messageId = 0
    this.connectionParameters = null
    this.rawChunkedData = ''
    this.messageHandler = new MessageHandler()
  }

  connected = () => { if (this.connectionParameters == null || this.connectionParameters.digestChallenge == null) { return false } else { return true } }
  connect = (request: httpRequest, callback: any): void => {
    this.request = request
    this.callback = callback
    // This is just a connect call.  Use a General Settings GET call to perform authentication with AMT
    if (this.request.apiCall == null || this.request.method == null) {
      this.request.apiCall = AMT.Classes.AMT_GENERAL_SETTINGS
      this.request.method = AMT.Methods.GET
    }
    this.messageObject = this.messageHandler.httpRequest2MessageObject(request)
    if (this.connectionParameters == null) {
      this.connectionParameters = new ConnectionParameters(request.address, request.port, request.username, request.password)
    }
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

  sendCallback(err: error, response?: any) {
    if (this.callback == null) { return }
    if (err !== null) {
      this.callback(err)
    } else if (response !== null) {
      this.callback(response)
    } else {
      this.callback('no err, no response')
    }
  }

  close = (): void => {
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }

  onSocketData = (data: string): void => {
    this.rawChunkedData += data
    if (this.rawChunkedData.includes('</html>') || this.rawChunkedData.includes('0\r\n\r\n')) {
      try {
        console.log(`RECEIVED FROM AMT:\n\r${this.rawChunkedData}`)
        this.socketData = parse(this.rawChunkedData) as HttpZResponseModel
        if (this.socketData.statusCode === 401) {
          this.close()
          this.connectionParameters.digestChallenge = this.getAuthorizationHeader(this.socketData)
          this.sendData(this.messageObject)
        } else if (this.socketData.statusCode === 200) {
          const xmlBody = parseBody(this.socketData)
          this.sendCallback(null, xmlBody)
          this.close()
        } else {
          console.error(`Error: ${this.socketData.statusCode}`)
          this.sendCallback(new error(this.socketData.statusCode, 'socket data error'))
        }
      } catch (err) {
        // random garbage comes in here, ignore it
        // this.sendCallback(new error(500, err))
      }
      this.rawChunkedData = ''
    }
  }

  onSocketClosed = (): void => {
    if (this.socket !== null) {
      console.log(`onClosed socket: ${this.socket.readyState}\n\r`)
    } else {
      console.log(`onClosed socket: null`)
    }
  }

  onTimeout = (): void => {
    if (this.socket !== null) {
      console.log(`onTimeout: socket: ${this.socket.readyState}\n\r`)
    } else {
      console.log(`onTimeout socket: null`)
    }
  }

  onError = (err): void => {
    console.error(`onError:${err}`)
    this.sendCallback(new error(500, err))
  }

  onSocketReady = (): void => {
    console.log(`SOCKET READY socket: ${this.socket.readyState}`)
    this.sendData(this.messageObject)
  }

  sendData = (msgObj: MessageObject): void => {
    this.messageObject = msgObj
    if (this.socket === null) {
      if (this.request === null) {
        throw new Error('Not Connected')
      } else {
        console.log('socket null, creating new socket')
        this.connect(this.request, this.callback)
      }
    }
    if (this.socket.readyState === 'open') {
      const messageHandler = new MessageHandler()
      const msgObj: MessageObject = messageHandler.splitAPICall(this.request.apiCall)
      msgObj.method = this.request.method
      const message = messageHandler.getMessage(msgObj, this)
      console.log(`message:\n\r${message}\n\rparams:\n\r${JSON.stringify(this.connectionParameters)}`)
      const wrappedMessage = this.wrapIt(message)
      this.socket.write(wrappedMessage)
    } else {
      throw new Error('Socket not ready')
    }
  }

  wrapIt = (data) => {
    try {
      const url = '/wsman'
      const action = 'POST'
      let msg: string = `${action} ${url} HTTP/1.1\r\n`
      if (data == null) {
        return null
      }
      if (this.connectionParameters.digestChallenge != null) {
        // Prepare an Authorization request header from the 401 unauthorized response from AMT
        let responseDigest = null
        // console nonce should be a unique opaque quoted string
        this.connectionParameters.consoleNonce = Math.random().toString(36).substring(7)
        const nc = ('00000000' + (this.nonceCounter++).toString(16)).slice(-8)
        const HA1 = this.hashIt(`${this.connectionParameters.username}:${this.connectionParameters.digestChallenge.realm}:${this.connectionParameters.password}`)
        const HA2 = this.hashIt(`${action}:${url}`)
        responseDigest = this.hashIt(`${HA1}:${this.connectionParameters.digestChallenge.nonce}:${nc}:${this.connectionParameters.consoleNonce}:${this.connectionParameters.digestChallenge.qop}:${HA2}`)
        const authorizationRequestHeader = this.digestIt({
          username: this.connectionParameters.username,
          realm: this.connectionParameters.digestChallenge.realm,
          nonce: this.connectionParameters.digestChallenge.nonce,
          uri: url,
          qop: this.connectionParameters.digestChallenge.qop,
          response: responseDigest,
          nc,
          cnonce: this.connectionParameters.consoleNonce
        })
        msg += `Authorization: ${authorizationRequestHeader}\r\n`
      }
      msg += Buffer.from([
        `Host: ${this.connectionParameters.address}:${this.connectionParameters.port}`,
        `Content-Length: ${data.length}`,
        '',
        data
      ].join('\r\n'), 'utf-8')
      console.log(`SENDING TO AMT:\n\r${msg}\n\r`)
      return msg
    } catch (err) {
      console.log('THIS IS BUSTED: ', err)
    }
  }

  hashIt = (data: string): string => {
    return createHash('md5').update(data).digest('hex')
  }

  // Prepares Authorization Request Header
  digestIt = (params: object): string => {
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

  getAuthorizationHeader = (message) => {
    const found = message.headers?.find(item => item.name === 'Www-Authenticate')
    if (found != null) {
      return this.parseAuthenticateResponseHeader(found.value)
    }
  }
}