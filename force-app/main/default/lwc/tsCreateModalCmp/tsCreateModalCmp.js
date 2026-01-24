import LightningModal from "lightning/modal";
import { api } from "lwc";

export default class TsCreateModalCmp extends LightningModal {
    @api objName;
    @api fieldsToShow = [];

    get headerLabel() {
        return `New ${this.objName || ""}`.trim();
    }

    handleCancel() {
        this.close({ status: "cancel" });
    }

    handleSave() {
        const form = this.template.querySelector("lightning-record-edit-form");
        if (form) form.submit();
    }

    handleSuccess(event) {
        const recordId = event.detail?.id;
        this.close({ status: "success", recordId });
    }

    handleError(event) {
        const message = event.detail?.message || "Create failed";
        this.close({ status: "error", message });
    }
}
