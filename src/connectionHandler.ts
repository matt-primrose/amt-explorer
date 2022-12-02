/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
import { Errback } from 'express'
import { parse, HttpZResponseModel } from 'http-z'
import * as net from 'node:net'
import { createHash } from 'crypto'
import { parser, parseBody, parseXML } from './common'

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

export class httpRequest {
  address: string
  port: number
  username: string
  password: string
  message: string
}

export class ConnectionHandler {
  socket: net.Socket
  connectionAttempts: number
  socketData: HttpZResponseModel
  response: any
  messageId: number
  connectionParameters: ConnectionParameters
  rawChunkedData: string = ''
  digestChallenge: string = ''
  message: string = ''
  parser: any
  stripPrefix: any
  status: boolean = false
  nonceCounter: number = 1
  callback: any

  constructor(address: string, port: number, username: string, password: string, message: string) {
    this.socket = null
    this.connectionAttempts = 0
    this.socketData = null
    this.response = null
    this.message = message
    this.messageId = 0
    this.connectionParameters = {
      address: address,
      port: port,
      username: username,
      password: password
    }
    this.parser = parser
  }

  connect = (callback: any): void => {
    this.callback = callback
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

  onSocketData = (data: string): void => {
    this.rawChunkedData += data
    if (this.rawChunkedData.includes('</html>') || this.rawChunkedData.includes('0\r\n\r\n')) {
      try {
        console.log(`RECEIVED FROM AMT:\n\r${this.rawChunkedData}`)
        this.socketData = parse(this.rawChunkedData) as HttpZResponseModel
        if (this.socketData.statusCode === 401) {
          this.close()
          this.connectionParameters.digestChallenge = this.getAuthorizationHeader(this.socketData)
          this.sendData(this.message, this.connectionParameters)
        } else if (this.socketData.statusCode === 200) {
          const xmlBody = parseBody(this.socketData)
          this.callback(xmlBody)
          this.close()
        } else {
          console.error(this.socketData.statusCode)
        }
      } catch (err) {
        console.error(err)
      }
      this.rawChunkedData = ''
    }
  }

  onSocketClosed = (): void => {
    if (this.socket !== null) {
      console.log(`SOCKET CLOSED socket: ${this.socket.readyState}\n\r`)
    } else {
      console.log(`SOCKET CLOSED socket: closed`)
    }
  }

  onTimeout = (): void => {
    if (this.socket !== null) {
      console.log(`SOCKET TIMEOUT socket: ${this.socket.readyState}\n\r`)
    } else {
      console.log(`SOCKET TIMEOUT socket: closed`)
    }
  }

  onError = (err: Errback): void => {
    console.error(err)
  }

  onSocketReady = (): void => {
    console.log(`SOCKET READY socket: ${this.socket.readyState}`)
    this.sendData(this.message, this.connectionParameters)
  }

  sendData = (data: string, params?: ConnectionParameters): void => {
    if (this.socket === null) {
      this.connect(this.callback)
    }
    if (this.socket.readyState === 'open') {
      const wrappedMessage = this.wrapIt(data, params)
      this.socket.write(wrappedMessage)
    }
  }

  wrapIt = (data, connectionParams) => {
    try {
      const url = '/wsman'
      const action = 'POST'
      let msg: string = `${action} ${url} HTTP/1.1\r\n`
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
        msg += `Authorization: ${authorizationRequestHeader}\r\n`
      }
      msg += Buffer.from([
        `Host: ${connectionParams.address}:${connectionParams.port}`,
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