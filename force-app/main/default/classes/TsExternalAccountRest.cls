@RestResource(urlMapping='/Account/*')
global with sharing class TsExternalAccountRest {

    private static void publishDataChange(String operation, String recordId) {
        List<Ts_DataChange__e> eventsToPublish = new List<Ts_DataChange__e>();
        eventsToPublish.add(
            new Ts_DataChange__e(
                SourceOrgHost__c = URL.getOrgDomainUrl().getHost(),
                TargetOrgHost__c = null,
                ObjectApiName__c = 'Account',
                Operation__c = operation,
                RecordId__c = recordId
            )
        );
        EventBus.publish(eventsToPublish);
    }

    @HttpGet
    global static List<Account> getAccounts() {
        if (!Schema.sObjectType.Account.isAccessible()) {
            throw new AuraHandledException('No access to Account');
        }

        return [
            SELECT Id, Name, Phone, NumberOfEmployees
            FROM Account
        ];
    }

    @HttpPatch
    global static Account updateAccount() {
        if (!Schema.sObjectType.Account.isUpdateable()) {
            throw new AuraHandledException('No update access to Account');
        }

        String uri = RestContext.request.requestURI;
        String recordId = uri != null && uri.contains('/')
            ? uri.substringAfterLast('/')
            : null;

        if (String.isBlank(recordId)) {
            throw new AuraHandledException('Missing record id');
        }

        Map<String, Object> fields =
            (Map<String, Object>)JSON.deserializeUntyped(
                RestContext.request.requestBody.toString()
            );

        Account a = [
            SELECT Id, Name, Phone, NumberOfEmployees
            FROM Account
            WHERE Id = :recordId
            LIMIT 1
        ];

        if (fields != null) {
            if (fields.containsKey('Name')) a.Name = (String)fields.get('Name');
            if (fields.containsKey('Phone')) a.Phone = (String)fields.get('Phone');
            if (fields.containsKey('NumberOfEmployees')) {
                Object v = fields.get('NumberOfEmployees');
                if (v == null || String.isBlank(String.valueOf(v))) {
                    a.NumberOfEmployees = null;
                } else {
                    a.NumberOfEmployees = Integer.valueOf(String.valueOf(v));
                }
            }
        }

        update a;

        publishDataChange('UPDATE', recordId);

        return a;
    }

    @HttpDelete
    global static void deleteAccount() {
        if (!Schema.sObjectType.Account.isDeletable()) {
            RestContext.response.statusCode = 403;
            RestContext.response.responseBody = Blob.valueOf('No delete access to Account');
            return;
        }

        String uri = RestContext.request.requestURI;
        String recordId = uri != null && uri.contains('/')
            ? uri.substringAfterLast('/')
            : null;

        if (String.isBlank(recordId)) {
            RestContext.response.statusCode = 400;
            RestContext.response.responseBody = Blob.valueOf('Missing record id');
            return;
        }

        try {
            delete [SELECT Id FROM Account WHERE Id = :recordId LIMIT 1];

            publishDataChange('DELETE', recordId);

            RestContext.response.statusCode = 204;
        } catch (DmlException ex) {
            RestContext.response.statusCode = 400;
            RestContext.response.responseBody = Blob.valueOf(ex.getDmlMessage(0));
        }
    }
}
