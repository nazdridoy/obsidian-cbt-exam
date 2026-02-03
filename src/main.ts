import { Plugin, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { FlashQuizParser } from "./parser/flashquizParser";
import { ExamView, EXAM_VIEW_TYPE } from "./ui/ExamView";

export default class CBTExamPlugin extends Plugin {
    onload() {
        this.registerView(
            EXAM_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new ExamView(leaf)
        );

        // Register command to start exam
        this.addCommand({
            id: 'start-exam',
            name: 'Start exam from current file',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    if (!checking) {
                        this.startExam(activeFile).catch(e => {
                            console.error("Failed to start exam via command:", e);
                        });
                    }
                    return true;
                }
                return false;
            }
        });

        this.addRibbonIcon('graduation-cap', 'Start exam', () => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.startExam(activeFile).catch(e => {
                    console.error("Failed to start exam via ribbon:", e);
                });
            } else {
                new Notice("Please open a quiz file first.");
            }
        });
    }

    async startExam(file: TFile) {
        try {
            // Read file content
            if (!file) return;
            const content = await this.app.vault.read(file);

            // Parse
            console.debug("Parsing content from", file.path);
            const examDefinition = FlashQuizParser.parse(content, file.path);
            console.debug("Parsed Definition:", examDefinition);

            if (examDefinition.questions.length === 0) {
                new Notice("No questions found in this file. Make sure to use @mc, @tf, etc.");
                return;
            }

            // Open View
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.setViewState({
                type: EXAM_VIEW_TYPE,
                active: true,
                state: { file: file.path }
            });

        } catch (e) {
            console.error("Failed to start exam:", e);
            new Notice("Failed to start exam. Check console for details.");
            // If validation fails, stay on markdown view
        }
    }

    onunload() {

    }
}
