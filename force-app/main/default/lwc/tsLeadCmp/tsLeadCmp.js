import { LightningElement, wire } from "lwc";
import { deleteRecord, updateRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { refreshApex } from "@salesforce/apex";
import TsCreateModalCmp from "c/tsCreateModalCmp";
import getExternalLeads from "@salesforce/apex/TsExternalLeadService.getExternalLeads";
import updateExternalLead from "@salesforce/apex/TsExternalLeadService.updateExternalLead";
import deleteExternalLead from "@salesforce/apex/TsExternalLeadService.deleteExternalLead";
import getAllLeads from "@salesforce/apex/LeadController.getAllLeads";

export default class TsLeadCmp extends LightningElement {
    leadData = [];
    filteredData = [];
    isSyncedMode = false;
    isLoading = false;
    searchValue = "";
    pendingEvent = null;
    pendingMessage = "";
    hasPendingEvent = false;
    objName = "Lead";
    fieldsToShow = ["FirstName", "LastName", "Company", "Phone"];

    _leadsResult;

    @wire(getAllLeads)
    wired(result) {
        this._leadsResult = result;
        const { data, error } = result;

        if (data) {
            const internalRows = data.map((rec) => {
                const row = { id: rec.Id };

                this.fieldsToShow.forEach((f) => {
                    row[f] = rec?.[f] ?? "";
                });

                row.Mode = "Internal";
                return row;
            });

            if (this.isSyncedMode) {
                const externalRows = (this.leadData || []).filter((r) => r.Mode === "External");
                this.leadData = [...internalRows, ...externalRows];
            } else {
                this.leadData = internalRows;
            }

            this.applySearchFilter();
        } else if (error) {
            this.leadData = [];
            this.applySearchFilter();
        }
    }

    async handleDeleteFromTable(event) {
        const recordIdToDelete = event.detail?.recordIdToDelete;
        if (!recordIdToDelete) return;

        const row = (this.leadData || []).find((r) => r.id === recordIdToDelete);
        if (!row) return;

        event.stopPropagation();

        if (row.Mode === "External") {
            try {
                await deleteExternalLead({ recordId: recordIdToDelete });
                this.leadData = (this.leadData || []).filter((r) => r.id !== recordIdToDelete);
                this.applySearchFilter();
                this.showToast("Delete successful", "External record deleted successfully.", "success", "dismissable");
            } catch (e) {
                const message = e?.body?.message || e?.message || "External record cannot be deleted.";
                this.showToast("Delete failed", message, "warning", "sticky");
            }
            return;
        }

        try {
            await deleteRecord(recordIdToDelete);
            await refreshApex(this._leadsResult);
            this.showToast("Delete successful", "Record deleted successfully.", "success", "dismissable");
        } catch (e) {
            const errors = e?.body?.output?.errors;
            const message = errors && errors.length > 0 ? errors[0].message : "Record cannot be deleted.";
            this.showToast("Delete failed", message, "warning", "sticky");
        }
    }

    async handleCreateFromTable() {
        const result = await TsCreateModalCmp.open({
            size: "small",
            objName: this.objName,
            fieldsToShow: this.fieldsToShow
        });

        if (result?.status === "success") {
            await refreshApex(this._leadsResult);
            this.showToast("Create successful", "Record created successfully.", "success", "dismissable");
            return;
        }

        if (result?.status === "error") {
            this.showToast("Create failed", result?.message || "Record cannot be created.", "warning", "sticky");
        }
    }

    async handleSaveFromTable(event) {
        const recordId = event.detail?.recordId;
        const fields = event.detail?.fields;

        if (!recordId || !fields || Object.keys(fields).length === 0) return;

        const row = (this.leadData || []).find((r) => r.id === recordId);
        if (!row) return;

        event.stopPropagation();

        if (row.Mode === "External") {
            try {
                const updated = await updateExternalLead({ recordId, fields });

                this.leadData = this.leadData.map((r) =>
                    r.id === recordId ? { ...r, ...updated, Mode: "External" } : r
                );
                this.applySearchFilter();

                this.showToast("Save successful", "External record updated successfully.", "success", "dismissable");
            } catch (e) {
                const message = e?.body?.message || e?.message || "External record cannot be updated.";
                this.showToast("Save failed", message, "warning", "sticky");
            }
            return;
        }

        try {
            await updateRecord({ fields: { Id: recordId, ...fields } });
            await refreshApex(this._leadsResult);
            this.showToast("Save successful", "Record updated successfully.", "success", "dismissable");
        } catch (e) {
            const out = e?.body?.output;
            const message =
                out?.errors?.[0]?.message ||
                Object.values(out?.fieldErrors || {})?.[0]?.[0]?.message ||
                e?.body?.message ||
                "Record cannot be updated.";

            this.showToast("Save failed", message, "warning", "sticky");
        }
    }

    handleSearch(event) {
        this.searchValue = event.detail?.searchValue?.toLowerCase() ?? "";

        if (!this.searchValue) {
            this.filteredData = this.leadData;
            return;
        }

        this.filteredData = (this.leadData || []).filter((row) =>
            `${row.FirstName ?? ""} ${row.LastName ?? ""}`.toLowerCase().includes(this.searchValue)
        );

    }

    applySearchFilter() {
        if (!this.searchValue) {
            this.filteredData = this.leadData;
            return;
        }

        this.filteredData = (this.leadData || []).filter((row) =>
            `${row.FirstName ?? ""} ${row.LastName ?? ""}`.toLowerCase().includes(this.searchValue)
        );
    }

    async handleSyncedModeChange(event) {
        this.isSyncedMode = event.detail?.isSyncedMode ?? false;

        if (!this.isSyncedMode) {
            this.leadData = (this.leadData || []).filter((r) => r.Mode !== "External");
            this.applySearchFilter();
            await refreshApex(this._leadsResult);
            return;
        }

        this.isLoading = true;

        try {
            const ext = (await getExternalLeads()) || [];
            const externalRows = ext.map((rec) => {
                const row = { id: rec.id };

                this.fieldsToShow.forEach((f) => {
                    row[f] = rec?.[f] ?? "";
                });

                row.Mode = "External";
                return row;
            });

            const internalRows = (this.leadData || []).filter((r) => r.Mode !== "External");
            this.leadData = [...internalRows, ...externalRows];
            this.applySearchFilter();

            this.showToast(
                "External records loaded",
                `${externalRows.length} records loaded from external org.`,
                "success",
                "dismissable"
            );
        } catch (e) {
            const message = e?.body?.message || e?.message || "External data cannot be loaded.";
            this.showToast("External load failed", message, "warning", "sticky");
        } finally {
            this.isLoading = false;
        }
    }

    showToast(title, message, variant, mode) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant,
                mode
            })
        );
    }

    handleDataChange(event) {
        const payload = event.detail?.payload;
        if (!payload) return;

        this.pendingEvent = payload;
        this.hasPendingEvent = true;

        const fields = payload.Fields__c;
        const firstName = fields?.FirstName ?? fields?.['FirstName'] ?? '';
        const lastName = fields?.LastName ?? fields?.['LastName'] ?? '';
        const recName = payload.RecordName__c || `${firstName} ${lastName}`.trim();
        const op = payload.Operation__c || '';

        this.pendingMessage =
            `Record${recName ? ` "${recName}"` : ''} was ${op.toLowerCase()} in external org. ` +
            `To apply changes, click Accept.`;

        this.showToast(
            "External change received",
            this.pendingMessage,
            "info",
            "dismissable"
        );
    }

    async handleAccept() {
        if (!this.pendingEvent) return;

        const op = this.pendingEvent.Operation__c;
        const recordId = this.pendingEvent.RecordId__c;
        const fieldsPayload = this.pendingEvent.Fields__c || {};

        try {
            if (op === "DELETE") {
                this.leadData = (this.leadData || []).filter((r) => r.id !== recordId);
                this.applySearchFilter();
                this.showToast("Applied", "Record removed from table.", "success", "dismissable");
            }

            if (op === "UPDATE") {
                const fields = {};
                this.fieldsToShow.forEach((f) => {
                    if (fieldsPayload[f] !== undefined) fields[f] = fieldsPayload[f];
                });

                await updateRecord({ fields: { Id: recordId, ...fields } });
                await refreshApex(this._leadsResult);

                this.showToast("Applied", "Record updated from external org.", "success", "dismissable");
            }

            this.hasPendingEvent = false;
            this.pendingEvent = null;
            this.pendingMessage = "";
        } catch (e) {
            const message = e?.body?.message || e?.message || "Cannot apply external change.";
            this.showToast("Apply failed", message, "warning", "sticky");
        }
    }

}
