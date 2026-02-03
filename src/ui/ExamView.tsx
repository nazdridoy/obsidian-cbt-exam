import { TextFileView, WorkspaceLeaf, Notice } from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { ExamUI } from "./ExamUI";
import { FlashQuizParser } from "../parser/flashquizParser";
import { ExamDefinition } from "../types/types";

export const EXAM_VIEW_TYPE = "cbt-exam-view";

export class ExamView extends TextFileView {
    private root: ReactDOM.Root | null = null;
    private definition: ExamDefinition | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return EXAM_VIEW_TYPE;
    }

    getDisplayText(): string {
        return this.file ? this.file.basename : "Exam";
    }

    async onOpen() {
        // Prepare container
        const container = this.contentEl;
        container.empty();
        container.addClass("mod-cbt-exam");
        container.addClass("exam-view-container");

        // We need a wrapper for React
        const reactContainer = container.createDiv({ cls: 'exam-react-container' });
        this.root = ReactDOM.createRoot(reactContainer);

        this.renderView();
    }

    async onClose() {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }

    // Abstract methods from TextFileView
    getViewData(): string {
        return this.data;
    }

    setViewData(data: string, clear: boolean): void {
        this.data = data;
        this.parseAndRender();
    }

    clear(): void {
        this.data = "";
        this.definition = null;
        this.renderView();
    }

    private parseAndRender() {
        try {
            if (this.file) {
                this.definition = FlashQuizParser.parse(this.data, this.file.path);
                this.renderView();
            }
        } catch (e) {
            console.error("Failed to parse exam:", e);
            new Notice("Failed to parse exam file.");
        }
    }

    private renderView() {
        if (!this.root) return;

        if (this.definition) {
            this.root.render(
                <ExamUI
                    definition={this.definition}
                    app={this.app}
                    sourcePath={this.file?.path || ""}
                    onClose={async () => {
                        // Switch back to markdown view
                        if (this.file) {
                            const leaf = this.leaf;
                            await leaf.setViewState({
                                type: 'markdown',
                                state: { file: this.file.path }
                            });
                        }
                    }}
                />
            );
        } else {
            this.root.render(<div>Loading exam...</div>);
        }
    }
}
