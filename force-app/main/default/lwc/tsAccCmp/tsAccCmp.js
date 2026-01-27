import { LightningElement, wire } from "lwc";
import { getListUi } from "lightning/uiListApi";
import { deleteRecord, updateRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { refreshApex } from "@salesforce/apex";
import { NavigationMixin } from "lightning/navigation";
import TsCreateModalCmp from "c/tsCreateModalCmp";
import getExternalAccounts from "@salesforce/apex/TsExternalAccountService.getExternalAccounts";
import updateExternalAccount from "@salesforce/apex/TsExternalAccountService.updateExternalAccount";
import deleteExternalAccount from "@salesforce/apex/TsExternalAccountService.deleteExternalAccount";

export default class TsAccCmp extends NavigationMixin(LightningElement) {
    accData = [];
    filteredData = [];
    isSyncedMode = false;
    isLoading = false;
    searchValue = "";
    pendingEvent = null;
    pendingMessage = "";
    hasPendingEvent = false;
    objName = "Account";
    listViewApiName = "AllAccounts";
    fieldsToShow = ["Name", "Phone", "NumberOfEmployees"];

    _accountsListResult;

    @wire(getListUi, { objectApiName: "$objName", listViewApiName: "$listViewApiName" })
    wired(result) {
        this._accountsListResult = result;
        const { data, error } = result;

        if (data) {
            const records = data.records?.records || [];

            const internalRows = records.map((rec) => {
                const row = { id: rec.id };

                this.fieldsToShow.forEach((fieldApiName) => {
                    row[fieldApiName] =
                        rec.fields?.[fieldApiName]?.value ??
                        rec.fields?.[fieldApiName]?.displayValue ??
                        "";
                });

                row.Mode = "Internal";

                return row;
            });

            if (this.isSyncedMode) {
                const externalRows = (this.accData || []).filter((r) => r.Mode === "External");
                this.accData = [...internalRows, ...externalRows];
            } else {
                this.accData = internalRows;
            }

            this.applySearchFilter();
        } else if (error) {
            this.accData = [];
            this.applySearchFilter();
        }
    }

    async handleDeleteFromTable(event) {
        const recordIdToDelete = event.detail?.recordIdToDelete;
        if (!recordIdToDelete) return;

        const row = (this.accData || []).find((r) => r.id === recordIdToDelete);
        if (!row) return;

        event.stopPropagation();

        if (row.Mode === "External") {
            try {
                await deleteExternalAccount({ recordId: recordIdToDelete });
                this.accData = (this.accData || []).filter((r) => r.id !== recordIdToDelete);
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
            await refreshApex(this._accountsListResult);
            this.showToast("Delete successful", "Record deleted successfully.", "success", "dismissable");
        } catch (e) {
            const errors = e?.body?.output?.errors;
            const message =
                errors && errors.length > 0
                    ? errors[0].message
                    : "Record cannot be deleted.";

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
            await refreshApex(this._accountsListResult);

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

        const row = (this.accData || []).find((r) => r.id === recordId);
        if (!row) return;

        event.stopPropagation();

        if (row.Mode === "External") {
            try {
                const updated = await updateExternalAccount({ recordId, fields });

                this.accData = this.accData.map((r) =>
                    r.id === recordId
                        ? { ...r, ...updated, Mode: "External" }
                        : r
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
            await refreshApex(this._accountsListResult);

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
            this.filteredData = this.accData;
            return;
        }

        this.filteredData = (this.accData || []).filter((row) =>
            (row.Name ?? "").toLowerCase().includes(this.searchValue)
        );
    }

    applySearchFilter() {
        if (!this.searchValue) {
            this.filteredData = this.accData;
            return;
        }

        this.filteredData = (this.accData || []).filter((row) =>
            (row.Name ?? "").toLowerCase().includes(this.searchValue)
        );
    }


    async handleSyncedModeChange(event) {
        this.isSyncedMode = event.detail?.isSyncedMode ?? false;

        if (!this.isSyncedMode) {
            this.accData = (this.accData || []).filter((r) => r.Mode !== "External");
            this.applySearchFilter();
            await refreshApex(this._accountsListResult);
            return;
        }

        this.isLoading = true;

        try {
            const ext = (await getExternalAccounts()) || [];
            const externalRows = ext.map((rec) => {
                const row = { id: rec.id };

                this.fieldsToShow.forEach((f) => {
                    row[f] = rec?.[f] ?? "";
                });

                row.Mode = "External";
                return row;
            });

            const internalRows = (this.accData || []).filter((r) => r.Mode !== "External");
            this.accData = [...internalRows, ...externalRows];
            this.applySearchFilter();
            this.showToast(
                "External records loaded",
                `${externalRows.length} records loaded from external org.`,
                "success",
                "dismissable"
            );

        } catch (e) {
            const message = e?.body?.message || e?.message || "External data cannot be loaded.";
            this.showToast(
                "External load failed",
                message,
                "warning",
                "sticky"
            );
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
        const nameFromFields = fields && (fields.Name || fields['Name']) ? (fields.Name || fields['Name']) : '';
        const recName = payload.RecordName__c || nameFromFields || '';
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
                this.accData = (this.accData || []).filter((r) => r.id !== recordId);
                this.applySearchFilter();

                this.showToast("Applied", "Record removed from table.", "success", "dismissable");
            }

            if (op === "UPDATE") {
                const fields = {};
                this.fieldsToShow.forEach((f) => {
                    if (fieldsPayload[f] !== undefined) fields[f] = fieldsPayload[f];
                });

                await updateRecord({ fields: { Id: recordId, ...fields } });
                await refreshApex(this._accountsListResult);

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
