import { LightningElement } from "lwc";
import getAllOpportunities from "@salesforce/apex/OpportunityController.getAllOpportunities";
import getExternalOpportunities from "@salesforce/apex/TsExternalOpportunityService.getExternalOpportunities";

export default class TsOpportunityDashboardCmp extends LightningElement {
    internalOpps = [];
    externalOpps = [];
    isLoading = false;
    errorMessage = "";

    async connectedCallback() {
        this.isLoading = true;
        this.errorMessage = "";

        try {
            const [internal, external] = await Promise.all([
                getAllOpportunities(),
                getExternalOpportunities()
            ]);

            this.internalOpps = internal || [];
            this.externalOpps = external || [];
        } catch (e) {
            this.errorMessage = e?.body?.message || e?.message || "Dashboard data cannot be loaded.";
            this.internalOpps = [];
            this.externalOpps = [];
        } finally {
            this.isLoading = false;
        }
    }

    get allOpps() {
        return [...(this.internalOpps || []), ...(this.externalOpps || [])];
    }

    get totalCount() {
        return this.allOpps.length;
    }

    get closedWonCount() {
        return this.allOpps.filter((o) => (o?.StageName || "") === "Closed Won").length;
    }

    get closedWonPercent() {
        const total = this.totalCount;
        if (!total) return 0;
        return Math.round((this.closedWonCount / total) * 100);
    }
}
