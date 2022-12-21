/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
import { HttpZResponseModel } from 'http-z';
import { createHash } from 'crypto'

export class DigestAuthHeaders {
  realm: string
  nonce: string
  stale: string
  qop: string
  consoleNonce: string
  uri: string
  nonceCounter: number = 1
  nc: string
}

export class DigestAuth {
  private username: string;
  private password: string;
  private url: string;
  private port: number;
  private digestAuthHeaders: DigestAuthHeaders;

  constructor(username: string, password: string, url: string, port: number) {
    this.username = username;
    this.password = password;
    this.url = url;
    this.port = port;
    this.digestAuthHeaders = new DigestAuthHeaders();
  }

  public getDigestAuthHeaders = (): DigestAuthHeaders => {
    return this.digestAuthHeaders;
  }

  public setDigestAuthHeaders = (digestAuthHeaders: any): void => {
    this.digestAuthHeaders = digestAuthHeaders;
  }

  public getUsername = (): string => {
    return this.username;
  }

  public setUsername = (username: string): void => {
    this.username = username;
  }

  public getPassword = (): string => {
    return this.password;
  }

  public setPassword = (password: string): void => {
    this.password = password;
  }

  public getUrl = (): string => {
    return this.url;
  }

  public setUrl = (url: string): void => {
    this.url = url;
  }

  public getPort = (): number => {
    return this.port;
  }

  public setPort = (port: number): void => {
    this.port = port;
  }

  public parseAuthorizationHeader = (message: HttpZResponseModel): DigestAuthHeaders => {
    if (this.digestAuthHeaders.qop != null) {
      return this.digestAuthHeaders
    } else {
      const found = message.headers?.find(item => item.name === 'Www-Authenticate')
      if (found != null) {
        return this.parseAuthenticateResponseHeader(found.value)
      }
    }
  }

  public createMessage = (xml: string, digestAuthHeaders?: DigestAuthHeaders): string => {
    if (xml == null) { return null }
    const url = '/wsman'
    const action = 'POST'
    let message: string = `${action} ${url} HTTP/1.1\r\n`
    if (digestAuthHeaders.qop != null) {
      message += this.createAuthorizationString(digestAuthHeaders)
    }
    message += Buffer.from([
      `Host: ${this.url}:${this.port}`,
      `Content-Length: ${xml.length}`,
      '',
      xml
    ].join('\r\n'), 'utf-8')
    return message
  }

  public createAuthorizationString = (digestAuthHeaders: DigestAuthHeaders): string => {
    this.setDigestAuthHeaders(digestAuthHeaders)
    let msg = ''
    let responseDigest = null
    const url = '/wsman'
    const action = 'POST'
    // console nonce should be a unique opaque quoted string
    this.digestAuthHeaders.consoleNonce = Math.random().toString(36).substring(7)
    const nc = this.createNC()
    const HA1 = this.generateHash(`${this.username}:${this.digestAuthHeaders.realm}:${this.password}`)
    const HA2 = this.generateHash(`${action}:${url}`)
    responseDigest = this.generateHash(`${HA1}:${this.digestAuthHeaders.nonce}:${nc}:${this.digestAuthHeaders.consoleNonce}:${this.digestAuthHeaders.qop}:${HA2}`)
    const authorizationRequestHeader = this.generateDigest({
      username: this.username,
      realm: this.digestAuthHeaders.realm,
      nonce: this.digestAuthHeaders.nonce,
      uri: url,
      qop: this.digestAuthHeaders.qop,
      response: responseDigest,
      nc,
      cnonce: this.digestAuthHeaders.consoleNonce
    })
    msg += `Authorization: ${authorizationRequestHeader}\r\n`
    return msg
  }

  private createNC = (): string => {
    return ('00000000' + (this.digestAuthHeaders.nonceCounter++).toString(16)).slice(-8)
  }

  private parseAuthenticateResponseHeader = (value): DigestAuthHeaders => {
    const params = value.replace('Digest realm', 'realm').split(/([^=,]*)=("[^"]*"|[^,"]*)/)
    const obj: DigestAuthHeaders = new DigestAuthHeaders()
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

  private generateHash = (data: string): string => {
    return createHash('md5').update(data).digest('hex')
  }

  private generateDigest = (params: object): string => {
    const paramNames = []
    for (const i in params) {
      paramNames.push(i)
    }
    return `Digest ${paramNames.reduce((s1, ii) => `${s1},${ii}="${params[ii]}"`, '').substring(1)}`
  }
}