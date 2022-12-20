/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import { AMT, IPS, CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { Methods } from '@open-amt-cloud-toolkit/wsman-messages/amt'
import { Logger, LogType } from './common'
import { SocketHandler } from './socketHandler'

export class MessageObject {
  class: string
  api: string
  method?: string
  xml?: string
}

export class MessageRequest {
  address: string
  port: number
  username: string
  password: string
  apiCall: string
  method: string
}

export class MessageHandler {
  response: any
  constructor() { }

  public splitAPICall = (apiCall: string): MessageObject => {
    let messageObj = new MessageObject()
    if (apiCall.includes('_')) {
      let splitAPI = apiCall.split('_')
      messageObj.class = splitAPI[0].toString()
      messageObj.api = splitAPI[1].toString()
    }
    return messageObj
  }

  public createMessage = (messageObj: MessageObject, socketHandler?: SocketHandler): string => {
    if (messageObj.api !== null && messageObj.class !== null && messageObj.method !== null) {
      if (messageObj.method === Methods.PULL) {
        Logger(LogType.DEBUG, 'MESSAGEHANDLER', JSON.stringify(`getMessage messageObj:\n\r${JSON.stringify(messageObj)}`))
        if (socketHandler == null) { return 'error: missing socket handler' }
        this.getEnumerationContext(messageObj, socketHandler)

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

  public MessageRequest2MessageObject = (request: MessageRequest): MessageObject => {
    const msgObj = this.splitAPICall(request.apiCall)
    msgObj.method = request.method
    return msgObj
  }

  public getEnumerationContext = (msgObj: MessageObject, socketHandler: SocketHandler): void => {

  }
}