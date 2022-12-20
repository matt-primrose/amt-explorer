/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
import { createHash } from 'crypto'
import { Logger, LogType } from './common'
import * as xml2js from 'xml2js'

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

function myParseNumbers(value: string, name: string): any {
  if (name === 'ElementName' || name === 'InstanceID') {
    if (value.length > 1 && value.charAt(0) === '0') {
      return value
    }
  }
  return xml2js.processors.parseNumbers(value, name)
}

export class HttpHandler {
  connectionParameters: ConnectionParameters
  nonceCounter: number = 1
  stripPrefix: any
  parser: any
  constructor() {
    this.stripPrefix = xml2js.processors.stripPrefix
    this.parser = new xml2js.Parser({ ignoreAttrs: true, mergeAttrs: false, explicitArray: false, tagNameProcessors: [this.stripPrefix], valueProcessors: [myParseNumbers, xml2js.processors.parseBooleans] })
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
      Logger(LogType.DEBUG, 'HTTPHANDLER',`SENDING TO AMT:\n\r${msg}\n\r`)
      return msg
    } catch (err) {
      Logger(LogType.ERROR, 'HTTPHANDLER', `THIS IS BUSTED:${err}`)
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