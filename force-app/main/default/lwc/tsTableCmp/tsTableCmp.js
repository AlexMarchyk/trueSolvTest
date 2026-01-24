import { LightningElement, api } from "lwc";

export default class TsTableCmp extends LightningElement {
    @api objName;

    columns = [];
    rows = [];

    _objData = [];
    _draftById = {};
    _originalById = {};

    @api
    get objData() {
        return this._objData;
    }
    set objData(value) {
        if (!Array.isArray(value) || value.length === 0) {
            this._objData = [];
            this.columns = [];
            this.rows = [];
            return;
        }
        this._objData = value;
        this._draftById = {};
        this._originalById = {};
        this.configureTable();
    }

    configureTable() {
        const keySet = new Set();
        this._objData.forEach((r) => Object.keys(r || {}).forEach((k) => keySet.add(k)));

        this.columns = [...keySet].filter((key) => key !== "id");

        this._originalById = {};
        this._draftById = {};

        this.rows = this._objData.map((row) => {
            const original = {};
            this.columns.forEach((c) => {
                original[c] = row?.[c] ?? "";
            });

            this._originalById[row.id] = { ...original };
            this._draftById[row.id] = { ...original };

            return {
                id: row.id,
                isSaveDisabled: true,
                cells: this.columns.map((col) => ({
                    key: col,
                    value: row?.[col] ?? "",
                    isReadonly: col === "Mode"
                }))
            };
        });
    }

    get actionButtonLabel() {
        return 'Create';
    }

    handleDeleteClick(event) {
        const recordIdToDelete = event.currentTarget.closest("tr")?.dataset?.recordId;
        if (!recordIdToDelete) return;

        this.dispatchEvent(
            new CustomEvent("deletefromtable", {
                detail: { recordIdToDelete },
                bubbles: true,
                composed: true
            })
        );
    }

    handleCreateRecordClick() {
        this.dispatchEvent(
            new CustomEvent("createfromtable", {
                detail: { objName: this.objName },
                bubbles: true,
                composed: true
            })
        );
    }

    handleCellChange(event) {
        const recordId = event.target.dataset.recordId;
        const fieldName = event.target.dataset.fieldName;
        const value = event.target.value ?? "";

        if (!recordId || !fieldName) return;

        const prevDraft = this._draftById[recordId] || {};
        const nextDraft = {
            ...prevDraft,
            [fieldName]: value
        };

        this._draftById = {
            ...this._draftById,
            [recordId]: nextDraft
        };

        const original = this._originalById[recordId] || {};
        const isDirty = this.columns.some((c) => (nextDraft?.[c] ?? "") !== (original?.[c] ?? ""));

        this.rows = this.rows.map((r) => {
            if (r.id !== recordId) return r;

            return {
                ...r,
                isSaveDisabled: !isDirty,
                cells: r.cells.map((cell) =>
                    cell.key === fieldName ? { ...cell, value } : cell
                )
            };
        });
    }

    handleSaveClick(event) {
        const recordId = event.currentTarget.closest("tr")?.dataset?.recordId;
        if (!recordId) return;

        const fields = Object.fromEntries(
            Object.entries(this._draftById[recordId] || {})
                .filter(([key]) => key !== "Mode")
        );

        this.dispatchEvent(
            new CustomEvent("savefromtable", {
                detail: { recordId, fields },
                bubbles: true,
                composed: true
            })
        );
    }
}
