/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import { AMT, IPS, CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { Methods } from '@open-amt-cloud-toolkit/wsman-messages/amt'
import { ClassMetaData, Logger, LogType, parseBody } from './common'
import { DigestAuth } from './digestAuth'
import { SocketHandler } from './socketHandler'
import { HttpZResponseModel } from 'http-z'
import * as xml2js from 'xml2js'

// Object holder for MessageHandler class.  Holds all of the relevant information for the life cycle of a message
export class MessageObject {
  api: string
  apiCall: string
  class: string
  classObject: any
  enumerationContext?: string
  error: string[]
  jsonResponse?: any
  method?: string
  statusCode?: number
  xml?: string
  xmlResponse?: string
  constructor(msgClass?: string, msgAPI?: string, msgMethod?: string, msgXML?: string, enumerationContext?: string) {
    this.class = msgClass
    this.api = msgAPI
    this.method = msgMethod
    this.xml = msgXML
    this.enumerationContext = enumerationContext
  }
}

// Object specifying the data required to be provided to MessageHandler to create a MessageObject
export class MessageRequest {
  apiCall: string
  method: string
  xml?: string
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

  // Splits the apiCall coming in on the apiCall property of a MessageRequest object
  private splitAPICall = (apiCall: string): MessageObject => {
    let messageObject = new MessageObject()
    if (apiCall.includes('_')) {
      let splitAPI = apiCall.split('_')
      messageObject.class = splitAPI[0].toString()
      messageObject.api = splitAPI[1].toString()
    } else {
      messageObject.error.push('invalid apiCall property')
    }
    return messageObject
  }

  // Creates a MessageObject from a MessageRequest object
  public createMessageObject = (request: MessageRequest): MessageObject => {
    let msgObj = new MessageObject()
    if (request.apiCall == null || request.method == null) {
      msgObj.error.push('MessageRequest missing required properties')
    } else {
      msgObj = this.splitAPICall(request.apiCall)
      msgObj.apiCall = request.apiCall
      msgObj.method = request.method
      msgObj.xml = request.xml
    }
    return msgObj
  }

  // Creates a XML formatted WSMAN message
  public createMessage = async (messageObject: MessageObject): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (messageObject.api !== null && messageObject.class !== null && messageObject.method !== null) {
        if (messageObject.method === Methods.PULL) {
          const message = this.createPullMessage(messageObject)
          resolve(message)
        } else if (messageObject.method === Methods.PUT) {
          const message = this.createPutMessage(messageObject)
          resolve(message)
        } else {
          messageObject.classObject = this.setClassObject(messageObject)
          resolve(messageObject.classObject[messageObject.api](messageObject.method))
        }
      }
    })
  }

  // Creates an instance of a WSMAN-MESSAGES class to be used to create a WSMAN message
  private setClassObject = (messageObject: MessageObject): any => {
    switch (messageObject.class) {
      case 'AMT':
        return new AMT.Messages()
      case 'IPS':
        return new IPS.Messages()
      case 'CIM':
        return new CIM.Messages()
    }
  }

  private removeReadOnlyProperties = (apiCall: string, jsonObject): object => {
    ClassMetaData[apiCall].readOnlyProperties.forEach(element => {
      if (jsonObject.hasOwnProperty(element)) {
        console.log(`removing:${element}`)
        delete jsonObject[element]
      }
    })
    return jsonObject
  }

  // Handles getting the enumerationContext from AMT in order to create a PULL message
  private createPullMessage = async (messageObject: MessageObject): Promise<string> => {
    const enumerationContextRequestObj = new MessageObject(messageObject.class, messageObject.api, Methods.ENUMERATE)
    enumerationContextRequestObj.xml = await this.createMessage(enumerationContextRequestObj)
    const enumerationResponse = await this.sendMessage(enumerationContextRequestObj)
    messageObject.enumerationContext = enumerationResponse.jsonResponse.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    messageObject.classObject = this.setClassObject(messageObject)
    return (messageObject.classObject[messageObject.api](messageObject.method, messageObject.enumerationContext))
  }

  private createPutMessage = async (messageObject: MessageObject): Promise<string> => {
    const getRequestObj = new MessageObject(messageObject.class, messageObject.api, Methods.GET)
    getRequestObj.xml = await this.createMessage(getRequestObj)
    const getRequestResponse = await this.sendMessage(getRequestObj)
    messageObject.classObject = this.setClassObject(messageObject)
    const key = Object.keys(getRequestResponse.jsonResponse.Envelope.Body)[0]
    const jsonResponse = this.removeReadOnlyProperties(messageObject.apiCall, getRequestResponse.jsonResponse.Envelope.Body[key])
    console.log(JSON.stringify(jsonResponse))
    if (ClassMetaData[messageObject.apiCall].putPosition === 1) {
      return (messageObject.classObject[messageObject.api](messageObject.method, jsonResponse))
    }
    if (ClassMetaData[messageObject.apiCall].putPosition === 2) {
      return (messageObject.classObject[messageObject.api](messageObject.method, null, jsonResponse))
    } 
  }

  // Sends a message to AMT based on the MessageObject provided.  Handles auth retry.
  public sendMessage = async (messageObject: MessageObject): Promise<MessageObject> => {
    return new Promise(async (resolve, reject) => {
      if (messageObject.api == null || messageObject.class == null || messageObject.method == null || messageObject.xml == null) {
        messageObject.error.push('missing required MessageObject properties')
        resolve(messageObject)
      }
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

  // performs an auth retry based on a 401 response back from AMT
  private handleRetry = async (messageObject: MessageObject, response: HttpZResponseModel): Promise<HttpZResponseModel> => {
    const authHeaders = this.digestAuth.parseAuthorizationHeader(response)
    this.digestAuth.setDigestAuthHeaders(authHeaders)
    const retry = await this.sendToSocket(messageObject)
    return retry
  }

  // Sends a message to SocketHandler.  Adds proper headers to message
  private sendToSocket = async (messageObject: MessageObject): Promise<HttpZResponseModel> => {
    const message = this.digestAuth.createMessage(messageObject.xml, this.digestAuth.getDigestAuthHeaders())
    Logger(LogType.DEBUG, 'MESSAGEHANDLER', `SENDING:\r\n${message}`)
    const response = await this.socketHandler.write(message)
    Logger(LogType.DEBUG, 'MESSAGEHANDLER', `RESPONSE:\r\n${JSON.stringify(response)}`)
    return response
  }

  // Properly handles numbers at the beginning of ElementName or InstanceID
  private myParseNumbers = (value: string, name: string): any => {
    if (name === 'ElementName' || name === 'InstanceID') {
      if (value.length > 1 && value.charAt(0) === '0') {
        return value
      }
    }
    return xml2js.processors.parseNumbers(value, name)
  }

  // Parses the XML body from the response message to return just the XML formatted WSMAN message
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