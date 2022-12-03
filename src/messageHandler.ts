/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import { AMT, IPS, CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { Methods } from '@open-amt-cloud-toolkit/wsman-messages/amt'
import { ClassMetaData, parseBody, parseXML } from './common'
import { ConnectionHandler, httpRequest } from './connectionHandler'

export class MessageObject {
  class: string
  api: string
  method?: string
  xml?: string
}

export class MessageHandler {
  constructor() { }

  splitAPICall = (apiCall: string): MessageObject => {
    let messageObj = new MessageObject()
    if (apiCall.includes('_')) {
      let splitAPI = apiCall.split('_')
      messageObj.class = splitAPI[0].toString()
      messageObj.api = splitAPI[1].toString()
    }
    return messageObj
  }

  getMessage = (messageObj: MessageObject, connectionHandler: ConnectionHandler): string => {
    if (messageObj.api !== null && messageObj.class !== null && messageObj.method !== null) {
      if (messageObj.method === Methods.PULL) {
        const enumerationContext = this.getEnumerationContext(messageObj)
      } else if (messageObj.method === Methods.PUT) {

      } else {
        switch (messageObj.class) {
          case 'AMT':
            const amtWSMAN = new AMT.Messages()
            return amtWSMAN[messageObj.api](messageObj.method)
          case 'IPS':
            const ipsWSMAN = new IPS.Messages()
            return ipsWSMAN[messageObj.api](messageObj.method)
          case 'CIM':
            const cimWSMAN = new CIM.Messages()
            return cimWSMAN[messageObj.api](messageObj.method)
          default:
            throw new Error('unsupported class')
        }
      }
    }
  }

  httpRequest2MessageObject = (request: httpRequest): MessageObject => {
    const msgObj = this.splitAPICall(request.apiCall)
    msgObj.method = request.method
    return msgObj
  }

  getEnumerationContext = (messageObj: MessageObject): string => {
    let enumerationContext: string
    const tempHttpRequest: httpRequest = new httpRequest()
    tempHttpRequest.apiCall = messageObj.api
    
    return enumerationContext
  }

}