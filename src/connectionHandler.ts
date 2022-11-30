/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
import { Errback } from 'express'
import { parse, HttpZResponseModel } from 'http-z'
import * as net from 'node:net'
import * as xml2js from 'xml2js'
import { createHash } from 'crypto'
import { Messages, Methods } from '@open-amt-cloud-toolkit/wsman-messages/amt'
import { CIM } from '@open-amt-cloud-toolkit/wsman-messages'

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
  socketData: HttpZResponseModel
  response: HttpZResponseModel
  messageId: number
  connectionParameters: ConnectionParameters
  rawChunkedData: string = ''
  digestChallenge: string = ''
  message: string = ''
  resolve: (data) => void
  parser: any
  stripPrefix: any
  status: boolean = false
  nonceCounter: number = 1
  callback: any

  constructor(address: string, port: number, username: string, password: string) {
    this.socket = null
    this.connectionAttempts = 0
    this.socketData = null
    this.response = null
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

  connect = (callback?): void => {
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
    console.log(`RECEIVED FROM AMT:\n\r${data}\n\r`)
    this.rawChunkedData += data
    if (this.rawChunkedData.includes('</html>') || this.rawChunkedData.includes('0\r\n\r\n')) {
      try {
        this.socketData = parse(this.rawChunkedData) as HttpZResponseModel
        if (this.socketData.statusCode === 401) {
          this.close()
          this.connectionParameters.digestChallenge = this.parseAuthenticateResponseHeader(this.socketData.headers[0].value)
          const wrappedMessage = this.wrapIt(this.message, this.connectionParameters)
          const bufferArray = Buffer.from(wrappedMessage)
          this.connect()
          this.socket.write(bufferArray)
        } else if (this.socketData.statusCode === 200) {
          const xmlBody = this.parseBody(this.socketData)
          this.response = this.parseXML(xmlBody)
          this.callback(this.response)
        }
      } catch (err) {
        console.error(err)
        // this.callback(this.rawChunkedData)
      }
      this.rawChunkedData = null
    }
  }

  onSocketClosed = (): void => {
    console.log(`SOCKET CLOSED socket: ${this.socket.readyState}\n\r`)
  }

  onTimeout = (): void => {
    console.log(`SOCKET TIMEOUT socket: ${this.socket.readyState}\n\r`)
  }

  onError = (err: Errback): void => {
    console.error(err)
  }

  onSocketReady = (): void => {
    console.log('SOCKET READY\n\r')
    setTimeout(() => { this.amtAuthentication() }, 1000)
  }

  amtAuthentication = (): void => {
    const cim = new CIM.Messages()
    this.message = cim.SoftwareIdentity(CIM.Methods.ENUMERATE)
    const wrappedMessage = this.wrapIt(this.message, this.connectionParameters)
    this.socket.write(wrappedMessage)
  }

  sendData = async (data: string, params?: ConnectionParameters): Promise<string> => {
    return await new Promise((resolve, reject) => {

    })
  }

  parseBody = (message: HttpZResponseModel): string => {
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
        // console.log(`username: ${connectionParams.username}`)
        // console.log(`password: ${connectionParams.password}`)
        // console.log(`realm: ${connectionParams.digestChallenge.realm}`)
        // console.log(`nonce: ${connectionParams.digestChallenge.nonce}`)
        // console.log(`consoleNonce: ${connectionParams.consoleNonce}`)
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

  addAuthorizationHeader = (context) => {
    const { message } = context
    const found = message.headers?.find(item => item.name === 'Www-Authenticate')
    if (found != null) {
      return this.parseAuthenticateResponseHeader(found.value)
    }
  }
}