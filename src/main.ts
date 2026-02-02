import { Plugin, Editor, MarkdownView, Notice, TFile } from "obsidian";
import { FlashQuizParser } from "./parser/flashquizParser";
import { ExamModal } from "./ui/ExamModal";

export default class CBTExamPlugin extends Plugin {
    async onload() {
        // Register command to start exam
        this.addCommand({
            id: 'start-cbt-exam',
            name: 'Start Exam from current file',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    if (!checking) {
                        this.startExam(activeFile);
                    }
                    return true;
                }
                return false;
            }
        });

        this.addRibbonIcon('graduation-cap', 'Start CBT Exam', () => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                this.startExam(activeFile);
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
            console.log("Parsing content from", file.path);
            const examDefinition = FlashQuizParser.parse(content, file.path);
            console.log("Parsed Definition:", examDefinition);

            if (examDefinition.questions.length === 0) {
                new Notice("No questions found in this file. Make sure to use @mc, @tf, etc.");
                return;
            }

            // Open Modal
            new ExamModal(this.app, examDefinition).open();

        } catch (e) {
            console.error("Failed to start exam:", e);
            new Notice("Failed to start exam. Check console for details.");
        }
    }

    onunload() {

    }
}
