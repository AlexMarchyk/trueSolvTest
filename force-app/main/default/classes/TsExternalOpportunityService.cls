public with sharing class TsExternalOpportunityService {
    public static final String NC_NAME = IntegrationHelper.getCorrectNC();

    public class TsExternalOpportunityRow {
        @AuraEnabled public String id;
        @AuraEnabled public String Name;
        @AuraEnabled public String StageName;
        @AuraEnabled public Decimal Amount;
        @AuraEnabled public Date CloseDate;
    }

    @AuraEnabled(cacheable=true)
    public static List<TsExternalOpportunityRow> getExternalOpportunities() {
        HttpRequest req = new HttpRequest();
        req.setMethod('GET');
        req.setEndpoint('callout:'+ NC_NAME +'/services/apexrest/Opportunity');

        HttpResponse res = send(req);
        List<Object> items = toList(JSON.deserializeUntyped(res.getBody()));

        List<TsExternalOpportunityRow> out = new List<TsExternalOpportunityRow>();
        for (Object o : items) {
            out.add(mapRow((Map<String, Object>)o));
        }
        return out;
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
                    if (e0 != null && e0.containsKey('message')) msg = String.valueOf(e0.get('message'));
                } else if (raw instanceof Map<String, Object> && ((Map<String, Object>)raw).containsKey('message')) {
                    msg = String.valueOf(((Map<String, Object>)raw).get('message'));
                }
            } catch (Exception ex) {
            }

            if (String.isBlank(msg)) msg = res.getStatus() != null ? res.getStatus() : 'Request failed';
            throw new AuraHandledException(msg);
        }

        return res;
    }

    private static TsExternalOpportunityRow mapRow(Map<String, Object> m) {
        TsExternalOpportunityRow row = new TsExternalOpportunityRow();
        row.id = (String)m.get('Id');
        row.Name = (String)m.get('Name');
        row.StageName = (String)m.get('StageName');

        Object amt = m.get('Amount');
        row.Amount = (amt == null || String.isBlank(String.valueOf(amt))) ? null : Decimal.valueOf(String.valueOf(amt));

        Object cd = m.get('CloseDate');
        row.CloseDate = (cd == null || String.isBlank(String.valueOf(cd))) ? null : Date.valueOf(String.valueOf(cd));

        return row;
    }

    private static List<Object> toList(Object raw) {
        return (raw instanceof List<Object>) ? (List<Object>)raw : new List<Object>();
    }
}
