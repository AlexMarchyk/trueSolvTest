import { LightningElement, api } from 'lwc';

export default class TsMainCmp extends LightningElement {
    @api objName;
    @api objData;

    searchValue = "";
    isSynced = false;

    get title() {
        return `This is ${this.objName} component`;
    }

    handleSearchChange(event) {
        this.searchValue = event.target.value ?? "";

        if (!this.searchValue) {
            this.dispatchEvent(
                new CustomEvent("search", {
                    detail: {
                        searchValue: ""
                    },
                    bubbles: true,
                    composed: true
                })
            );
        }
    }

    handleToggleChange(event) {
        this.isSynced = event.target.checked;

        this.dispatchEvent(
            new CustomEvent("syncedmodechange", {
                detail: {
                    isSyncedMode: this.isSynced
                },
                bubbles: true,
                composed: true
            })
        );
    }

    handleSearchClick() {
        this.dispatchEvent(
            new CustomEvent("search", {
                detail: {
                    searchValue: this.searchValue,
                },
                bubbles: true,
                composed: true
            })
        );
    }

    get isSearchDisabled() {
        return !this.searchValue || this.searchValue.length < 2;
    }
}