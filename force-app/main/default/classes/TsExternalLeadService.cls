public with sharing class TsExternalLeadService {
    public static final String NC_NAME = IntegrationHelper.getCorrectNC();

    public class TsExternalLeadRow {
        @AuraEnabled public String id;
        @AuraEnabled public String FirstName;
        @AuraEnabled public String LastName;
        @AuraEnabled public String Company;
        @AuraEnabled public String Email;
        @AuraEnabled public String Phone;
        @AuraEnabled public String Status;
    }

    @AuraEnabled()
    public static List<TsExternalLeadRow> getExternalLeads() {
        HttpRequest req = new HttpRequest();
        req.setMethod('GET');
        req.setEndpoint('callout:'+ NC_NAME +'/services/apexrest/Lead');

        HttpResponse res = send(req);
        List<Object> items = toList(JSON.deserializeUntyped(res.getBody()));

        List<TsExternalLeadRow> out = new List<TsExternalLeadRow>();
        for (Object o : items) {
            out.add(mapRow((Map<String, Object>)o));
        }
        return out;
    }

    @AuraEnabled
    public static TsExternalLeadRow updateExternalLead(String recordId, Map<String, Object> fields) {
        if (String.isBlank(recordId)) {
            throw new AuraHandledException('Missing record id');
        }

        HttpRequest req = new HttpRequest();
        req.setMethod('PATCH');
        req.setEndpoint('callout:'+ NC_NAME +'/services/apexrest/Lead/' + recordId);
        req.setHeader('Content-Type', 'application/json');
        req.setBody(JSON.serialize(fields == null ? new Map<String, Object>() : fields));

        HttpResponse res = send(req);
        return mapRow((Map<String, Object>)JSON.deserializeUntyped(res.getBody()));
    }

    @AuraEnabled
    public static void deleteExternalLead(String recordId) {
        if (String.isBlank(recordId)) {
            throw new AuraHandledException('Missing record id');
        }

        HttpRequest req = new HttpRequest();
        req.setMethod('DELETE');
        req.setEndpoint('callout:'+ NC_NAME +'/services/apexrest/Lead/' + recordId);

        send(req);
    }

    private static HttpResponse send(HttpRequest req) {
        Http http = new Http();
        HttpResponse res = http.send(req);

        if (res.getStatusCode() < 200 || res.getStatusCode() > 299) {
            String body = res.getBody();
            String msg = body;

            try {
                Object raw = JSON.deserializeUntyped(body);
                if (raw instanceof List<Object> && !((List<Object>)raw).isEmpty()) {
                    Map<String, Object> e0 = (Map<String, Object>)((List<Object>)raw)[0];
                    if (e0 != null && e0.containsKey('message')) {
                        msg = String.valueOf(e0.get('message'));
                    }
                } else if (raw instanceof Map<String, Object> && ((Map<String, Object>)raw).containsKey('message')) {
                    msg = String.valueOf(((Map<String, Object>)raw).get('message'));
                }
            } catch (Exception ex) {
            }

            if (String.isBlank(msg)) {
                msg = res.getStatus() != null ? res.getStatus() : 'Request failed';
            }

            throw new AuraHandledException(msg);
        }

        return res;
    }

    private static TsExternalLeadRow mapRow(Map<String, Object> m) {
        TsExternalLeadRow row = new TsExternalLeadRow();
        row.id = (String)m.get('Id');
        row.FirstName = (String)m.get('FirstName');
        row.LastName = (String)m.get('LastName');
        row.Company = (String)m.get('Company');
        row.Email = (String)m.get('Email');
        row.Phone = (String)m.get('Phone');
        row.Status = (String)m.get('Status');
        return row;
    }

    private static List<Object> toList(Object raw) {
        return (raw instanceof List<Object>) ? (List<Object>)raw : new List<Object>();
    }
}
