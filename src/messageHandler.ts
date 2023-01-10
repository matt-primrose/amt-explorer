/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import { AMT, IPS, CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { Methods } from '@open-amt-cloud-toolkit/wsman-messages/amt'
import { ClassMetaData, Logger, LogType, parseBody, parseXML } from './common'
import { DigestAuth } from './digestAuth'
import { SocketHandler } from './socketHandler'
import { HttpZResponseModel } from 'http-z'

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
  socketHandler: SocketHandler
  digestAuth: DigestAuth
  amt = new AMT.Messages()
  cim = new CIM.Messages()
  ips = new IPS.Messages()
  constructor(socketHandler: SocketHandler, digestAuth: DigestAuth) {
    this.socketHandler = socketHandler
    this.digestAuth = digestAuth
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
        messageObject.classObject = this.setClassObject(messageObject)
        switch (messageObject.method) {
          case CIM.Methods.PULL:
            resolve(this.createPullMessage(messageObject))
            break
          case CIM.Methods.PUT:
            resolve(this.createPutMessage(messageObject))
            break
          case CIM.Methods.GET:
            resolve(messageObject.classObject[messageObject.api].Get())
            break
          case CIM.Methods.ENUMERATE:
            resolve(messageObject.classObject[messageObject.api].Enumerate())
            break
          case AMT.Methods.READ_RECORDS:
            resolve(this.amt.AuditLog.ReadRecords())
            break
          case AMT.Methods.GET_RECORDS:
            resolve(this.amt.MessageLog.GetRecords())
            break
          case AMT.Methods.POSITION_TO_FIRST_RECORD:
            resolve(this.amt.MessageLog.PositionToFirstRecord())
            break
          case AMT.Methods.GET_UUID:
            resolve(this.amt.SetupAndConfigurationService.GetUuid())
            break
          case AMT.Methods.COMMIT_CHANGES:
            resolve(this.amt.SetupAndConfigurationService.CommitChanges())
            break
          case AMT.Methods.GET_LOW_ACCURACY_TIME_SYNCH:
            resolve(this.amt.TimeSynchronizationService.GetLowAccuracyTimeSynch())
            break
          case IPS.Methods.START_OPT_IN:
            resolve(this.ips.OptInService.StartOptIn())
            break
          case IPS.Methods.CANCEL_OPT_IN:
            resolve(this.ips.OptInService.CancelOptIn())
            break
          default:
            throw new Error('unsupported method')
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

  // Handles getting the enumerationContext from AMT in order to create a PULL message
  private createPullMessage = async (messageObject: MessageObject): Promise<string> => {
    const enumerationContextRequestObj = new MessageObject(messageObject.class, messageObject.api, Methods.ENUMERATE)
    enumerationContextRequestObj.xml = await this.createMessage(enumerationContextRequestObj)
    const enumerationResponse = await this.sendMessage(enumerationContextRequestObj)
    messageObject.enumerationContext = enumerationResponse.jsonResponse.Envelope?.Body?.EnumerateResponse?.EnumerationContext
    messageObject.classObject = this.setClassObject(messageObject)
    return (messageObject.classObject[messageObject.api].Pull(messageObject.enumerationContext))
  }

  private createPutMessage = async (messageObject: MessageObject): Promise<string> => {
    const requestObject = new MessageObject(messageObject.class, messageObject.api, Methods.GET)
    requestObject.xml = await this.createMessage(requestObject)
    const requestResponse = await this.sendMessage(requestObject)
    const jsonResponse = this.getDataFromJSONResponse(requestResponse)
    messageObject.classObject = this.setClassObject(messageObject)
    if (ClassMetaData[messageObject.apiCall].putPosition === 1) {
      return (messageObject.classObject[messageObject.api].Put(jsonResponse))
    }
    if (ClassMetaData[messageObject.apiCall].putPosition === 2) {
      return (messageObject.classObject[messageObject.api].Put(null, jsonResponse))
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
      messageObject.jsonResponse = parseXML(messageObject.xmlResponse)
      resolve(messageObject)
    })
  }

  private getDataFromJSONResponse = (messageObject: MessageObject): object => {
    let keys: string[], jsonResponse: object
    if (messageObject.xmlResponse.includes('PullResponse')) {
      keys = Object.keys(messageObject.jsonResponse.Envelope?.Body?.PullResponse?.Items)
      keys.forEach(element => {
        jsonResponse = messageObject.jsonResponse.Envelope?.Body?.PullResponse?.Items[element][0]
      })
    } else if (messageObject.xmlResponse.includes('GetResponse')) {
      keys = Object.keys(messageObject.jsonResponse.Envelope?.Body)
      keys.forEach(element => {
        jsonResponse = messageObject.jsonResponse.Envelope?.Body[element]
      })
    }
    return jsonResponse
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
}