public with sharing class IntegrationHelper {
  public static String getCorrectNC() {
    String orgHost = URL.getOrgDomainUrl().getHost();

    if (orgHost.contains('orgfarm')) {
      return 'saleNC';
    } else {
      return 'marketingOrgEC';
    }
  }
}
