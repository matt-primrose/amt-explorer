/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import { AMT, IPS, CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { Methods } from '@open-amt-cloud-toolkit/wsman-messages/amt'
import { Logger, LogType, parseBody } from './common'
import { DigestAuth } from './digestAuth'
import { SocketHandler } from './socketHandler'
import { HttpZResponseModel } from 'http-z'
import * as xml2js from 'xml2js'

export class MessageObject {
  class: string
  api: string
  method?: string
  xml?: string
  enumerationContext?: string
  statusCode?: number
  xmlResponse?: string
  jsonResponse?: object
  constructor(msgClass?: string, msgAPI?: string, msgMethod?: string, msgXML?: string, enumerationContext?: string) {
    this.class = msgClass
    this.api = msgAPI
    this.method = msgMethod
    this.xml = msgXML
    this.enumerationContext = enumerationContext
  }
}

export class MessageRequest {
  address: string
  port: number
  username: string
  password: string
  apiCall: string
  method: string
  xml: string
}

export class MessageHandler {
  response: any
  stripPrefix: any
  parser: any
  socketHandler: SocketHandler
  digestAuth: DigestAuth
  constructor(socketHandler: SocketHandler, digestAuth: DigestAuth) {
    this.socketHandler = socketHandler
    this.digestAuth = digestAuth
    this.stripPrefix = xml2js.processors.stripPrefix
    this.parser = new xml2js.Parser({ ignoreAttrs: true, mergeAttrs: false, explicitArray: false, tagNameProcessors: [this.stripPrefix], valueProcessors: [this.myParseNumbers, xml2js.processors.parseBooleans] })
  }

  private splitAPICall = (apiCall: string): MessageObject => {
    let messageObj = new MessageObject()
    if (apiCall.includes('_')) {
      let splitAPI = apiCall.split('_')
      messageObj.class = splitAPI[0].toString()
      messageObj.api = splitAPI[1].toString()
    }
    return messageObj
  }

  public createMessageObject = (request: MessageRequest): MessageObject => {
    const msgObj = this.splitAPICall(request.apiCall)
    msgObj.method = request.method
    msgObj.xml = request.xml
    return msgObj
  }

  public createMessage = async (messageObj: MessageObject): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (messageObj.api !== null && messageObj.class !== null && messageObj.method !== null) {
        if (messageObj.method === Methods.PULL) {
          const message = this.createPullMessage(messageObj)
          resolve(message)
        } else if (messageObj.method === Methods.PUT) {

        } else {
          switch (messageObj.class) {
            case 'AMT':
              const amtWSMAN = new AMT.Messages()
              resolve(amtWSMAN[messageObj.api](messageObj.method))
              break
            case 'IPS':
              const ipsWSMAN = new IPS.Messages()
              resolve(ipsWSMAN[messageObj.api](messageObj.method))
              break
            case 'CIM':
              const cimWSMAN = new CIM.Messages()
              resolve(cimWSMAN[messageObj.api](messageObj.method))
              break
            default:
              reject(new Error('unsupported class'))
              break
          }
        }
      }
    })
  }

  private createPullMessage = async (messageObject: MessageObject): Promise<string> => {
    const enumerationContextRequestObj = new MessageObject(messageObject.class, messageObject.api, Methods.ENUMERATE)
    enumerationContextRequestObj.xml = await this.createMessage(enumerationContextRequestObj)
    let enumerationResponse = await this.sendToSocket(enumerationContextRequestObj)
    if (enumerationResponse.statusCode === 401) {
      enumerationResponse = await this.handleRetry(enumerationContextRequestObj, enumerationResponse)
    }
    const xmlBody = parseBody(enumerationResponse)
    const jsonBody = this.parseXML(xmlBody)
    messageObject.enumerationContext = jsonBody.Envelope.Body.EnumerateResponse.EnumerationContext
    switch (messageObject.class) {
      case 'AMT':
        const amtWSMAN = new AMT.Messages()
        return (amtWSMAN[messageObject.api](messageObject.method, messageObject.enumerationContext))
      case 'IPS':
        const ipsWSMAN = new IPS.Messages()
        return (ipsWSMAN[messageObject.api](messageObject.method, messageObject.enumerationContext))
      case 'CIM':
        const cimWSMAN = new CIM.Messages()
        return (cimWSMAN[messageObject.api](messageObject.method, messageObject.enumerationContext))
      default:
        return 'unsupported class'
    }
  }

  public sendMessage = async (messageObject: MessageObject): Promise<MessageObject> => {
    return new Promise(async (resolve, reject) => {
      console.log(JSON.stringify(messageObject))
      if (messageObject.api == null || messageObject.class == null || messageObject.method == null || messageObject.xml == null) { reject('missing required MessageObject properties') }
      let response = await this.sendToSocket(messageObject)
      if (response.statusCode === 401) {
        response = await this.handleRetry(messageObject, response)
      }
      messageObject.xmlResponse = parseBody(response)
      messageObject.statusCode = response.statusCode
      messageObject.jsonResponse = this.parseXML(messageObject.xmlResponse)
      resolve(messageObject)
    })
  }

  private handleRetry = async (messageObject: MessageObject, response: HttpZResponseModel): Promise<HttpZResponseModel> => {
    const authHeaders = this.digestAuth.parseAuthorizationHeader(response)
    this.digestAuth.setDigestAuthHeaders(authHeaders)
    const retry = await this.sendToSocket(messageObject)
    return retry
  }

  public sendToSocket = async (messageObject: MessageObject): Promise<HttpZResponseModel> => {
    const message = this.digestAuth.createMessage(messageObject.xml, this.digestAuth.getDigestAuthHeaders())
    Logger(LogType.DEBUG, 'MESSAGEHANDLER', `SENDING:\r\n${message}`)
    const response = await this.socketHandler.write(message)
    Logger(LogType.DEBUG, 'MESSAGEHANDLER', `RESPONSE:\r\n${JSON.stringify(response)}`)
    return response
  }

  private myParseNumbers = (value: string, name: string): any => {
    if (name === 'ElementName' || name === 'InstanceID') {
      if (value.length > 1 && value.charAt(0) === '0') {
        return value
      }
    }
    return xml2js.processors.parseNumbers(value, name)
  }

  public parseXML = (xmlBody: string): any => {
    let wsmanResponse: string
    const xmlDecoded: string = Buffer.from(xmlBody, 'binary').toString('utf8')
    this.parser.parseString(xmlDecoded, (err, result) => {
      if (err) {
        Logger(LogType.ERROR, 'MESSAGEHANDLER', `Failed to parse XML:${err}`)
        wsmanResponse = null
      } else {
        wsmanResponse = result
      }
    })
    return wsmanResponse
  }
}