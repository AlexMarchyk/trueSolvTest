@RestResource(urlMapping='/Lead/*')
global with sharing class TsExternalLeadRest {
    @HttpGet
    global static List<Lead> getLeads() {
        if (!Schema.sObjectType.Lead.isAccessible()) {
            RestContext.response.statusCode = 403;
            RestContext.response.responseBody = Blob.valueOf('No access to Lead');
            return null;
        }

        return [
            SELECT Id, FirstName, LastName, Company, Email, Phone, Status
            FROM Lead
            ORDER BY CreatedDate DESC
            LIMIT 200
        ];
    }

    @HttpPatch
    global static Lead updateLead() {
        if (!Schema.sObjectType.Lead.isUpdateable()) {
            RestContext.response.statusCode = 403;
            RestContext.response.responseBody = Blob.valueOf('No update access to Lead');
            return null;
        }

        String uri = RestContext.request.requestURI;
        String recordId = uri != null && uri.contains('/') ? uri.substringAfterLast('/') : null;
        if (String.isBlank(recordId)) {
            RestContext.response.statusCode = 400;
            RestContext.response.responseBody = Blob.valueOf('Missing record id');
            return null;
        }

        Map<String, Object> fields = (Map<String, Object>)JSON.deserializeUntyped(RestContext.request.requestBody.toString());
        Lead l = [
            SELECT Id, FirstName, LastName, Company, Email, Phone
            FROM Lead
            WHERE Id = :recordId
            LIMIT 1
        ];

        if (fields != null) {
            if (fields.containsKey('FirstName')) l.FirstName = (String)fields.get('FirstName');
            if (fields.containsKey('LastName')) l.LastName = (String)fields.get('LastName');
            if (fields.containsKey('Company')) l.Company = (String)fields.get('Company');
            if (fields.containsKey('Email')) l.Email = (String)fields.get('Email');
            if (fields.containsKey('Phone')) l.Phone = (String)fields.get('Phone');
        }

        try {
            update l;
        } catch (DmlException ex) {
            RestContext.response.statusCode = 400;
            RestContext.response.responseBody = Blob.valueOf(ex.getDmlMessage(0));
            return null;
        }

        return l;
    }

    @HttpDelete
    global static void deleteLead() {
        if (!Schema.sObjectType.Lead.isDeletable()) {
            RestContext.response.statusCode = 403;
            RestContext.response.responseBody = Blob.valueOf('No delete access to Lead');
            return;
        }

        String uri = RestContext.request.requestURI;
        String recordId = uri != null && uri.contains('/') ? uri.substringAfterLast('/') : null;
        if (String.isBlank(recordId)) {
            RestContext.response.statusCode = 400;
            RestContext.response.responseBody = Blob.valueOf('Missing record id');
            return;
        }

        try {
            delete [SELECT Id FROM Lead WHERE Id = :recordId LIMIT 1];
            RestContext.response.statusCode = 204;
        } catch (DmlException ex) {
            RestContext.response.statusCode = 400;
            RestContext.response.responseBody = Blob.valueOf(ex.getDmlMessage(0));
        }
    }
}
