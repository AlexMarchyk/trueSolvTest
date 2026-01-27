public with sharing class OpportunityController {
    @AuraEnabled(cacheable=true)
    public static List<Opportunity> getAllOpportunities() {
        return [
            SELECT Id, Name, StageName, Amount, CloseDate
            FROM Opportunity
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }
}
