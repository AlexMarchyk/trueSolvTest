import { LightningElement, wire } from "lwc";
import { getListUi } from "lightning/uiListApi";
import { deleteRecord, updateRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { refreshApex } from "@salesforce/apex";
import { NavigationMixin } from "lightning/navigation";
import TsCreateModalCmp from "c/tsCreateModalCmp";

export default class TsAccCmp extends NavigationMixin(LightningElement) {
    accData = [];
    filteredData = [];
    isSyncedMode = false;

    _accountsListResult;

    objName = "Account";
    listViewApiName = "AllAccounts";
    fieldsToShow = ["Name", "Phone", "NumberOfEmployees"];

    @wire(getListUi, { objectApiName: "$objName", listViewApiName: "$listViewApiName" })
    wired(result) {
        this._accountsListResult = result;
        const { data, error } = result;

        if (data) {
            const records = data.records?.records || [];

            this.accData = records.map((rec) => {
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
            this.filteredData = this.accData;
        } else if (error) {
            this.accData = [];
        }
    }


    async handleDeleteFromTable(event) {
        const recordIdToDelete = event.detail?.recordIdToDelete;
        if (!recordIdToDelete) return;

        event.stopPropagation();

        try {
            await deleteRecord(recordIdToDelete);
            this.accData = this.accData.filter(
                (row) => row.id !== recordIdToDelete
            );
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Delete successful",
                    message: "Record deleted successfully.",
                    variant: "success",
                    mode: "dismissable"
                })
            );
        } catch (e) {
            const errors = e?.body?.output?.errors;
            const message =
                errors && errors.length > 0
                    ? errors[0].message
                    : "Record cannot be deleted.";

            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Delete failed",
                    message: message,
                    variant: "warning",
                    mode: "sticky"
                })
            );
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

            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Create successful",
                    message: "Record created successfully.",
                    variant: "success",
                    mode: "dismissable"
                })
            );
            return;
        }

        if (result?.status === "error") {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Create failed",
                    message: result?.message || "Record cannot be created.",
                    variant: "warning",
                    mode: "sticky"
                })
            );
        }
    }

    async handleSaveFromTable(event) {
        const recordId = event.detail?.recordId;
        const fields = event.detail?.fields;

        if (!recordId || !fields || Object.keys(fields).length === 0) return;

        event.stopPropagation();

        try {
            await updateRecord({ fields: { Id: recordId, ...fields } });
            await refreshApex(this._accountsListResult);

            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Save successful",
                    message: "Record updated successfully.",
                    variant: "success",
                    mode: "dismissable"
                })
            );
        } catch (e) {
            const out = e?.body?.output;
            const message =
                out?.errors?.[0]?.message ||
                Object.values(out?.fieldErrors || {})?.[0]?.[0]?.message ||
                e?.body?.message ||
                "Record cannot be updated.";

            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Save failed",
                    message,
                    variant: "warning",
                    mode: "sticky"
                })
            );
        }
    }

    handleSearch(event) {
        const searchValue = event.detail?.searchValue?.toLowerCase() ?? "";

        if (!searchValue) {
            this.filteredData = this.accData;
            return;
        }

        this.filteredData = this.accData.filter((row) =>
            (row.Name ?? "").toLowerCase().includes(searchValue)
        );
    }

    handleSyncedModeChange(event) {
        this.isSyncedMode = event.detail?.isSyncedMode ?? false;
    }
}
