import { LightningElement, api } from "lwc";
import { subscribe, unsubscribe, onError } from "lightning/empApi";

export default class TsEventListenerCmp extends LightningElement {
    @api objName;

    channelName = "/event/Ts_DataChange__e";
    subscription = null;

    connectedCallback() {
        this.registerErrorListener();
        this.handleSubscribe();
    }

    disconnectedCallback() {
        this.handleUnsubscribe();
    }

    normalizeHost(host) {
        if (!host) return "";
        return host
            .replace(/\.lightning\.force\.com$/i, ".my.salesforce.com")
            .replace(/\.develop\.my\.salesforce\.com$/i, ".my.salesforce.com");
    }

    registerErrorListener() {
        onError(() => { });
    }

    async handleSubscribe() {
        if (this.subscription) return;

        this.subscription = await subscribe(
            this.channelName,
            -1,
            (message) => {
                const payload = message?.data?.payload || {};
                const obj = payload.ObjectApiName__c;

                if (this.objName && obj && obj !== this.objName) return;


                this.dispatchEvent(
                    new CustomEvent("datachange", {
                        detail: { payload },
                        bubbles: true,
                        composed: true
                    })
                );
            }
        );
    }

    async handleUnsubscribe() {
        if (!this.subscription) return;

        await unsubscribe(this.subscription, () => { });
        this.subscription = null;
    }
}
