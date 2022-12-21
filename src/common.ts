/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import { AMT, CIM, IPS } from "@open-amt-cloud-toolkit/wsman-messages"
import * as xml2js from 'xml2js'
import { HttpZResponseModel } from 'http-z'
import { logLevel } from "."

export const ClassMetaData = {
  AMT_AlarmClockService: {
    methods: [AMT.Methods.ADD_ALARM, AMT.Methods.GET],
    enumerationContextPosition: null,
    putPosition: 1,
    selectorPosition: null
  },
  AMT_AuditLog: {
    methods: [AMT.Methods.READ_RECORDS],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  AMT_AuthorizationService: {
    methods: [AMT.Methods.SET_ADMIN_ACL_ENTRY_EX],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  AMT_BootCapabilities: {
    methods: [AMT.Methods.GET],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  AMT_BootSettingData: {
    methods: [AMT.Methods.GET, AMT.Methods.PUT],
    enumerationContextPosition: null,
    putPosition: 1,
    selectorPosition: null
  },
  AMT_EnvironmentDetectionSettingData: {
    methods: [AMT.Methods.GET, AMT.Methods.PUT],
    enumerationContextPosition: null,
    putPosition: 1,
    selectorPosition: null
  },
  AMT_EthernetPortSettings: {
    methods: [AMT.Methods.PULL, AMT.Methods.ENUMERATE, AMT.Methods.PUT],
    enumerationContextPosition: 1,
    putPosition: 2,
    selectorPosition: null
  },
  AMT_GeneralSettings: {
    methods: [AMT.Methods.GET, AMT.Methods.PUT],
    readOnlyProperties: ['NetworkInterfaceEnabled', 'DigestRealm', 'PrivacyLevel', 'PowerSource'],
    enumerationContextPosition: null,
    putPosition: 1,
    selectorPosition: null
  },
  AMT_ManagementPresenceRemoteSAP: {
    methods: [AMT.Methods.PULL, AMT.Methods.ENUMERATE, AMT.Methods.DELETE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: 2
  },
  AMT_MessageLog: {
    methods: [AMT.Methods.GET_RECORDS, AMT.Methods.POSITION_TO_FIRST_RECORD],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  AMT_PublicKeyCertificate: {
    methods: [AMT.Methods.PULL, AMT.Methods.ENUMERATE, AMT.Methods.DELETE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  AMT_PublicKeyManagementService: {
    methods: [AMT.Methods.ADD_TRUSTED_ROOT_CERTIFICATE, AMT.Methods.GENERATE_KEY_PAIR, AMT.Methods.ADD_CERTIFICATE],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  AMT_PublicPrivateKeyPair: {
    methods: [AMT.Methods.ENUMERATE, AMT.Methods.PULL, AMT.Methods.DELETE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  AMT_RemoteAccessPolicyAppliesToMPS: {
    methods: [AMT.Methods.PULL, AMT.Methods.ENUMERATE, AMT.Methods.GET, AMT.Methods.DELETE, AMT.Methods.PUT],
    enumerationContextPosition: 1,
    putPosition: 2,
    selectorPosition: null
  },
  AMT_RemoteAccessService: {
    methods: [AMT.Methods.ADD_MPS, AMT.Methods.ADD_REMOTE_ACCESS_POLICY_RULE],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  AMT_RedirectionService: {
    methods: [AMT.Methods.GET, AMT.Methods.PUT, AMT.Methods.REQUEST_STATE_CHANGE],
    enumerationContextPosition: null,
    putPosition: 2,
    selectorPosition: null
  },
  AMT_RemoteAccessPolicyRule: {
    methods: [AMT.Methods.DELETE],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: 1
  },
  AMT_SetupAndConfigurationService: {
    methods: [AMT.Methods.GET, AMT.Methods.UNPROVISION, AMT.Methods.SET_MEBX_PASSWORD, AMT.Methods.COMMIT_CHANGES],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  AMT_TimeSynchronizationService: {
    methods: [AMT.Methods.GET_LOW_ACCURACY_TIME_SYNCH, AMT.Methods.SET_HIGH_ACCURACY_TIME_SYNCH],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  AMT_TLSCredentialContext: {
    methods: [AMT.Methods.ENUMERATE, AMT.Methods.PULL, AMT.Methods.CREATE, AMT.Methods.DELETE],
    enumerationContextPosition: 1,
    putPosition: 2,
    selectorPosition: 3
  },
  AMT_TLSSettingData: {
    methods: [AMT.Methods.ENUMERATE, AMT.Methods.PULL, AMT.Methods.PUT],
    enumerationContextPosition: 1,
    putPosition: 2,
    selectorPosition: null
  },
  AMT_UserInitiatedConnectionService: {
    methods: [AMT.Methods.REQUEST_STATE_CHANGE],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null,
    RequestedStatePosition: 1
  },
  AMT_WiFiPortConfigurationService: {
    methods: [AMT.Methods.ADD_WIFI_SETTINGS, AMT.Methods.PUT, AMT.Methods.GET],
    enumerationContextPosition: 3,
    putPosition: 1,
    selectorPosition: 2
  },
  CIM_BIOSElement: {
    methods: [CIM.Methods.GET],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  CIM_BootConfigSetting: {
    methods: [CIM.Methods.CHANGE_BOOT_ORDER],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  CIM_BootService: {
    methods: [CIM.Methods.SET_BOOT_CONFIG_ROLE],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  CIM_Card: {
    methods: [CIM.Methods.GET],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  CIM_Chassis: {
    methods: [CIM.Methods.GET],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  CIM_Chip: {
    methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  CIM_ComputerSystemPackage: {
    methods: [CIM.Methods.GET, CIM.Methods.ENUMERATE],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  CIM_KVMRedirectionSAP: {
    methods: [CIM.Methods.GET, CIM.Methods.REQUEST_STATE_CHANGE],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  CIM_MediaAccessDevice: {
    methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  CIM_PhysicalMemory: {
    methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  CIM_PhysicalPackage: {
    methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  CIM_PowerManagementService: {
    methods: [CIM.Methods.REQUEST_POWER_STATE_CHANGE],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  CIM_Processor: {
    methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  CIM_ServiceAvailableToElement: {
    methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  CIM_SoftwareIdentity: {
    methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  CIM_SystemPackaging: {
    methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  },
  CIM_WiFiEndpointSettings: {
    methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE, CIM.Methods.DELETE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: 2
  },
  CIM_WiFiPort: {
    methods: [CIM.Methods.REQUEST_STATE_CHANGE],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  IPS_AlarmClockOccurrence: {
    methods: [IPS.Methods.PULL, IPS.Methods.ENUMERATE, IPS.Methods.DELETE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: 2
  },
  IPS_HostBasedSetupService: {
    methods: [IPS.Methods.GET, IPS.Methods.SETUP, IPS.Methods.ADMIN_SETUP, IPS.Methods.ADD_NEXT_CERT_IN_CHAIN],
    enumerationContextPosition: null,
    putPosition: null,
    selectorPosition: null
  },
  IPS_IEEE8021xSettings: {
    methods: [IPS.Methods.PULL, IPS.Methods.ENUMERATE, IPS.Methods.PUT, IPS.Methods.SET_CERTIFICATES],
    enumerationContextPosition: 1,
    putPosition: 2,
    selectorPosition: null
  },
  IPS_OptInService: {
    methods: [IPS.Methods.GET, IPS.Methods.PUT, IPS.Methods.START_OPT_IN, IPS.Methods.CANCEL_OPT_IN, IPS.Methods.SEND_OPT_IN_CODE],
    enumerationContextPosition: null,
    putPosition: 2,
    selectorPosition: null
  },
  IEEE8021xCredentialContext: {
    methods: [IPS.Methods.PULL, IPS.Methods.ENUMERATE],
    enumerationContextPosition: 1,
    putPosition: null,
    selectorPosition: null
  }
}

export const stripPrefix = xml2js.processors.stripPrefix
export const parser = new xml2js.Parser({ ignoreAttrs: true, mergeAttrs: false, explicitArray: false, tagNameProcessors: [stripPrefix], valueProcessors: [xml2js.processors.parseNumbers, xml2js.processors.parseBooleans] })
export class error {
  status: number
  error: string
  constructor(status: number, error: string) {
    this.status = status
    this.error = error
  }
}
export const parseBody = (message: HttpZResponseModel): string => {
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

export const parseXML = (xmlBody: string): any => {
  let wsmanResponse: string
  parser.parseString(xmlBody, (err, result) => {
    if (err) {
      wsmanResponse = null
    } else {
      wsmanResponse = result
    }
  })
  return wsmanResponse
}

export enum LogType {
  ERROR = 'ERROR',
  INFO = 'INFO',
  WARNING = 'WARNING',
  DEBUG = 'DEBUG'
}
export const Logger = (type: LogType, module: string, msg: string): void => {
  switch(type.toUpperCase()) {
    case LogType.ERROR:
      console.error(`${module}:${msg}`)
      break
    case LogType.DEBUG:
      if (logLevel.toUpperCase() === 'DEBUG') { console.debug(`${module}:${msg}`) }
      break
    case LogType.INFO:
      console.info(`${module}:${msg}`)
      break
    case LogType.WARNING:
      console.warn(`${module}:${msg}`)
      break
    default:
      return
  }
}
