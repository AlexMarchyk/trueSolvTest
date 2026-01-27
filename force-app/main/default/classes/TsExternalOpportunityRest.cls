@RestResource(urlMapping='/Opportunity/*')
global with sharing class TsExternalOpportunityRest {
    @HttpGet
    global static List<Opportunity> getOpportunities() {
        if (!Schema.sObjectType.Opportunity.isAccessible()) {
            RestContext.response.statusCode = 403;
            RestContext.response.responseBody = Blob.valueOf('No access to Opportunity');
            return null;
        }

        return [
            SELECT Id, Name, StageName, Amount, CloseDate
            FROM Opportunity
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }
}
