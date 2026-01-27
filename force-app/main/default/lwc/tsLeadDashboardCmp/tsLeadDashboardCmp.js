import { LightningElement } from "lwc";
import getAllLeads from "@salesforce/apex/LeadController.getAllLeads";
import getExternalLeads from "@salesforce/apex/TsExternalLeadService.getExternalLeads";

export default class TsLeadDashboardCmp extends LightningElement {
    internalLeads = [];
    externalLeads = [];
    isLoading = false;
    errorMessage = "";

    async connectedCallback() {
        this.isLoading = true;
        this.errorMessage = "";

        try {
            const [internal, external] = await Promise.all([
                getAllLeads(),
                getExternalLeads()
            ]);

            this.internalLeads = internal || [];
            this.externalLeads = external || [];
        } catch (e) {
            this.errorMessage = e?.body?.message || e?.message || "Dashboard data cannot be loaded.";
            this.internalLeads = [];
            this.externalLeads = [];
        } finally {
            this.isLoading = false;
        }
    }

    get allLeads() {
        return [...(this.internalLeads || []), ...(this.externalLeads || [])];
    }

    get totalCount() {
        return this.allLeads.length;
    }

    get convertedCount() {
        return this.allLeads.filter((l) => (l?.Status || "") === "Closed - Converted").length;
    }

    get convertedPercent() {
        const total = this.totalCount;
        if (!total) return 0;
        return Math.round((this.convertedCount / total) * 100);
    }
}
