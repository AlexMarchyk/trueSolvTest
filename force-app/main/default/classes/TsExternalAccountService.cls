public with sharing class TsExternalAccountService {
    public class TsExternalAccountRow {
        @AuraEnabled public String id;
        @AuraEnabled public String Name;
        @AuraEnabled public String Phone;
        @AuraEnabled public Integer NumberOfEmployees;
    }

    @AuraEnabled(cacheable=true)
    public static List<TsExternalAccountRow> getExternalAccounts() {
        HttpRequest req = new HttpRequest();
        req.setMethod('GET');
        req.setEndpoint('callout:saleNC/services/apexrest/Account');

        HttpResponse res = send(req);
        List<Object> items = toList(JSON.deserializeUntyped(res.getBody()));

        List<TsExternalAccountRow> out = new List<TsExternalAccountRow>();
        for (Object o : items) {
            out.add(mapRow((Map<String, Object>)o));
        }
        return out;
    }

    @AuraEnabled
    public static TsExternalAccountRow updateExternalAccount(String recordId, Map<String, Object> fields) {
        if (String.isBlank(recordId)) {
            throw new AuraHandledException('Missing record id');
        }

        HttpRequest req = new HttpRequest();
        req.setMethod('PATCH');
        req.setEndpoint('callout:saleNC/services/apexrest/Account/' + recordId);
        req.setHeader('Content-Type', 'application/json');
        req.setBody(JSON.serialize(fields == null ? new Map<String, Object>() : fields));

        HttpResponse res = send(req);
        return mapRow((Map<String, Object>)JSON.deserializeUntyped(res.getBody()));
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

    @AuraEnabled
    public static void deleteExternalAccount(String recordId) {
        if (String.isBlank(recordId)) {
            throw new AuraHandledException('Missing record id');
        }

        HttpRequest req = new HttpRequest();
        req.setMethod('DELETE');
        req.setEndpoint('callout:saleNC/services/apexrest/Account/' + recordId);

        send(req);
    }

    private static TsExternalAccountRow mapRow(Map<String, Object> m) {
        TsExternalAccountRow row = new TsExternalAccountRow();
        row.id = (String)m.get('Id');
        row.Name = (String)m.get('Name');
        row.Phone = (String)m.get('Phone');
        Object noe = m.get('NumberOfEmployees');
        row.NumberOfEmployees = (noe == null) ? null : Integer.valueOf(String.valueOf(noe));
        return row;
    }

    private static List<Object> toList(Object raw) {
        return (raw instanceof List<Object>) ? (List<Object>)raw : new List<Object>();
    }
}
