import { App, Modal, ButtonComponent } from "obsidian";

export class ConfirmModal extends Modal {
    private message: string;
    private onConfirm: () => void;
    private onCancel?: () => void;
    private titleText: string;

    constructor(app: App, message: string, onConfirm: () => void, onCancel?: () => void, titleText: string = "Confirm action") {
        super(app);
        this.message = message;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.titleText = titleText;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("cbt-confirm-modal");

        contentEl.createEl("h3", { text: this.titleText, cls: "modal-title" });

        const messageContainer = contentEl.createDiv({ cls: "modal-message-container" });
        const lines = this.message.split("\n");
        lines.forEach(line => {
            if (line.trim().startsWith("•")) {
                messageContainer.createEl("li", { text: line.trim().substring(1).trim(), cls: "modal-error-item" });
            } else if (line.trim() !== "") {
                messageContainer.createEl("p", { text: line, cls: "modal-text" });
            }
        });

        const buttonContainer = contentEl.createDiv({ cls: "u-flex u-gap-2 u-mt-2 u-flex-justify-end" });

        new ButtonComponent(buttonContainer)
            .setButtonText("Cancel")
            .onClick(() => {
                this.close();
                if (this.onCancel) this.onCancel();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText("Launch exam")
            .setWarning()
            .onClick(() => {
                this.close();
                this.onConfirm();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
