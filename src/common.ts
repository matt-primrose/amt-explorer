/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

import { AMT, CIM, IPS } from "@open-amt-cloud-toolkit/wsman-messages";

export class BodyObj {
  class: string
  api: string
  method: string
}

export const ClassMetaData = {
  AMT_AuditLog: {
    Methods: [AMT.Methods.READ_RECORDS]
  },
  AMT_RedirectionService: {
    Methods: [AMT.Methods.GET, AMT.Methods.PUT, AMT.Methods.REQUEST_STATE_CHANGE]
  },
  AMT_SetupAndConfigurationService: {
    Methods: [AMT.Methods.GET, AMT.Methods.UNPROVISION, AMT.Methods.SET_MEBX_PASSWORD, AMT.Methods.COMMIT_CHANGES]
  },
  AMT_GeneralSettings: {
    Methods: [AMT.Methods.GET, AMT.Methods.PUT]
  },
  AMT_EthernetPortSettings: {
    Methods: [AMT.Methods.PULL, AMT.Methods.ENUMERATE, AMT.Methods.PUT]
  },
  AMT_RemoteAccessPolicyRule: {
    Methods: [AMT.Methods.DELETE]
  },
  AMT_ManagementPresenceRemoteSAP: {
    Methods: [AMT.Methods.PULL, AMT.Methods.ENUMERATE, AMT.Methods.DELETE]
  },
  AMT_PublicKeyCertificate: {
    Methods: [AMT.Methods.PULL, AMT.Methods.ENUMERATE, AMT.Methods.DELETE]
  },
  AMT_EnvironmentDetectionSettingData: {
    Methods: [AMT.Methods.GET, AMT.Methods.PUT]
  },
  AMT_PublicKeyManagementService: {
    Methods: [AMT.Methods.ADD_TRUSTED_ROOT_CERTIFICATE, AMT.Methods.GENERATE_KEY_PAIR, AMT.Methods.ADD_CERTIFICATE]
  },
  AMT_RemoteAccessService: {
    Methods: [AMT.Methods.ADD_MPS, AMT.Methods.ADD_REMOTE_ACCESS_POLICY_RULE]
  },
  AMT_UserInitiatedConnectionService: {
    Methods: [AMT.Methods.REQUEST_STATE_CHANGE]
  },
  AMT_BootSettingData: {
    Methods: [AMT.Methods.GET, AMT.Methods.PUT]
  },
  AMT_BootCapabilities: {
    Methods: [AMT.Methods.GET]
  },
  AMT_MessageLog: {
    Methods: [AMT.Methods.GET_RECORDS, AMT.Methods.POSITION_TO_FIRST_RECORD]
  },
  AMT_AuthorizationService: {
    Methods: [AMT.Methods.SET_ADMIN_ACL_ENTRY_EX]
  },
  AMT_TimeSynchronizationService: {
    Methods: [AMT.Methods.GET_LOW_ACCURACY_TIME_SYNCH, AMT.Methods.SET_HIGH_ACCURACY_TIME_SYNCH]
  },
  AMT_WiFiPortConfigurationService: {
    Methods: [AMT.Methods.ADD_WIFI_SETTINGS, AMT.Methods.PUT, AMT.Methods.GET]
  },
  AMT_TLSCredentialContext: {
    Methods: [AMT.Methods.ENUMERATE, AMT.Methods.PULL, AMT.Methods.CREATE, AMT.Methods.DELETE]
  },
  AMT_PublicPrivateKeyPair: {
    Methods: [AMT.Methods.ENUMERATE, AMT.Methods.PULL, AMT.Methods.DELETE]
  },
  AMT_TLSSettingData: {
    Methods: [AMT.Methods.ENUMERATE, AMT.Methods.PULL, AMT.Methods.PUT]
  },
  AMT_RemoteAccessPolicyAppliesToMPS: {
    Methods: [AMT.Methods.PULL, AMT.Methods.ENUMERATE, AMT.Methods.GET, AMT.Methods.DELETE, AMT.Methods.PUT]
  },
  AMT_AlarmClockService: {
    Methods: [AMT.Methods.ADD_ALARM, AMT.Methods.GET]
  },
  CIM_ServiceAvailableToElement: {
    Methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE]
  },
  CIM_SoftwareIdentity: {
    Methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE]
  },
  CIM_ComputerSystemPackage: {
    Methods: [CIM.Methods.GET, CIM.Methods.ENUMERATE]
  },
  CIM_SystemPackaging: {
    Methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE]
  },
  CIM_KVMRedirectionSAP: {
    Methods: [CIM.Methods.GET, CIM.Methods.REQUEST_STATE_CHANGE]
  },
  CIM_Chassis: {
    Methods: [CIM.Methods.GET]
  },
  CIM_Chip: {
    Methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE]
  },
  CIM_Card: {
    Methods: [CIM.Methods.GET]
  },
  CIM_BIOSElement: {
    Methods: [CIM.Methods.GET]
  },
  CIM_Processor: {
    Methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE]
  },
  CIM_PhysicalMemory: {
    Methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE]
  },
  CIM_MediaAccessDevice: {
    Methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE]
  },
  CIM_PhysicalPackage: {
    Methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE]
  },
  CIM_WiFiEndpointSettings: {
    Methods: [CIM.Methods.PULL, CIM.Methods.ENUMERATE, CIM.Methods.DELETE]
  },
  CIM_WiFiPort: {
    Methods: [CIM.Methods.REQUEST_STATE_CHANGE]
  },
  CIM_BootService: {
    Methods: [CIM.Methods.SET_BOOT_CONFIG_ROLE]
  },
  CIM_BootConfigSetting: {
    Methods: [CIM.Methods.CHANGE_BOOT_ORDER]
  },
  CIM_PowerManagementService: {
    Methods: [CIM.Methods.REQUEST_POWER_STATE_CHANGE]
  },
  IPS_OptInService: {
    Methods: [IPS.Methods.GET, IPS.Methods.PUT, IPS.Methods.START_OPT_IN, IPS.Methods.CANCEL_OPT_IN, IPS.Methods.SEND_OPT_IN_CODE]
  },
  IPS_HostBasedSetupService: {
    Methods: [IPS.Methods.GET, IPS.Methods.SETUP, IPS.Methods.ADMIN_SETUP, IPS.Methods.ADD_NEXT_CERT_IN_CHAIN]
  },
  IPS_AlarmClockOccurrence: {
    Methods: [IPS.Methods.PULL, IPS.Methods.ENUMERATE, IPS.Methods.DELETE]
  },
  IPS_IEEE8021xSettings: {
    Methods: [IPS.Methods.PULL, IPS.Methods.ENUMERATE, IPS.Methods.PUT, IPS.Methods.SET_CERTIFICATES]
  }
}
