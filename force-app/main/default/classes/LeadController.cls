public with sharing class LeadController {
    @AuraEnabled(cacheable=true)
    public static List<Lead> getAllLeads() {
        return [
            SELECT Id, FirstName, LastName, Company, Status
            FROM Lead
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }
}
