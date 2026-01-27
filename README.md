flowchart LR
  subgraph A["Org A (Sales)"]
    direction TB

    subgraph A_UI["LWC UI"]
      A_Acc["tsAccCmp (container)\nInternal: getListUi + UI API CRUD\nExternal: TsExternalAccountService\nPE: toast + Accept"]
      A_Lead["tsLeadCmp (container)\nInternal: LeadController + UI API CRUD\nExternal: TsExternalLeadService\nPE: toast + Accept"]

      A_Main["tsMainCmp (layout)\nSearch + Sync toggle + Accept"]
      A_Table["tsTableCmp (universal)"]
      A_Modal["tsCreateModalCmp"]
      A_EVT["tsEventListenerCmp\nsubscribe /event/Ts_DataChange__e\n(active when Sync=true)"]

      A_Acc --> A_Main --> A_Table
      A_Lead --> A_Main
      A_Acc --> A_Modal
      A_Lead --> A_Modal
      A_EVT --> A_Acc
      A_EVT --> A_Lead

      A_DashLead["tsLeadDashboardCmp (KPI LWC)\ninternal + external merge"]
      A_DashOpp["tsOpportunityDashboardCmp (KPI LWC)\ninternal + external merge"]
    end

    subgraph A_APEX["Apex (A)"]
      A_LC["LeadController.getAllLeads()"]
      A_SvcAcc["TsExternalAccountService\nGET/PATCH/DELETE via Named Credential"]
      A_SvcLead["TsExternalLeadService\nGET/PATCH/DELETE via Named Credential"]
    end

    A_Lead --> A_LC
    A_DashLead --> A_LC
    A_DashLead --> A_SvcLead
    A_Acc --> A_SvcAcc
    A_Lead --> A_SvcLead
  end

  subgraph B["Org B (Marketing)"]
    direction TB

    subgraph B_UI["LWC UI"]
      B_Acc["tsAccCmp (container)"]
      B_Lead["tsLeadCmp (container)"]
      B_Main["tsMainCmp (layout)\nSearch + Sync toggle + Accept"]
      B_Table["tsTableCmp (universal)"]
      B_Modal["tsCreateModalCmp"]
      B_EVT["tsEventListenerCmp\nsubscribe /event/Ts_DataChange__e"]

      B_Acc --> B_Main --> B_Table
      B_Lead --> B_Main
      B_Acc --> B_Modal
      B_Lead --> B_Modal
      B_EVT --> B_Acc
      B_EVT --> B_Lead

      B_DashLead["tsLeadDashboardCmp (KPI LWC)\ninternal + external merge"]
      B_DashOpp["tsOpportunityDashboardCmp (KPI LWC)\ninternal + external merge"]
    end

    subgraph B_APEX["Apex (B)"]
      B_LC["LeadController.getAllLeads()"]
      B_SvcAcc["TsExternalAccountService\nGET/PATCH/DELETE via Named Credential"]
      B_SvcLead["TsExternalLeadService\nGET/PATCH/DELETE via Named Credential"]
    end

    subgraph B_REST["Apex REST (B endpoints)"]
      B_RAcc["TsExternalAccountRest\n/services/apexrest/Account/*\nDML + publish Ts_DataChange__e"]
      B_RLead["TsExternalLeadRest\n/services/apexrest/Lead/*\nDML + publish Ts_DataChange__e"]
    end

    B_Lead --> B_LC
    B_DashLead --> B_LC
    B_DashLead --> B_SvcLead
    B_Acc --> B_SvcAcc
    B_Lead --> B_SvcLead
  end

  NC["Named Credentials\nsaleNC / marketingOrgNC"]

  A_SvcAcc -->|HTTP callout| NC --> B_RAcc
  A_SvcLead -->|HTTP callout| NC --> B_RLead

  B_SvcAcc -->|HTTP callout| NC --> A
  B_SvcLead -->|HTTP callout| NC --> A

  B_RAcc -->|publish PE| B_EVT
  B_RLead -->|publish PE| B_EVT
