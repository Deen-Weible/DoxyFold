import * as vscode from 'vscode';

// Folding provider to identify Doxygen comments
class DoxygenFoldingProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.FoldingRange[] {
        const foldingRanges: vscode.FoldingRange[] = [];

        // Detect Doxygen block comments: /** ... */
        const blockCommentRegex = /\/\*\*[\s\S]*?\*\//g;
        let match;
        while ((match = blockCommentRegex.exec(document.getText())) !== null) {
            const startLine = document.positionAt(match.index).line;
            const endLine = document.positionAt(match.index + match[0].length - 1).line;
            // Only create a folding range if it spans multiple lines
            if (startLine < endLine) {
                foldingRanges.push(
                    new vscode.FoldingRange(startLine, endLine, vscode.FoldingRangeKind.Comment)
                );
            }
        }

        // Detect consecutive Doxygen line comments: ///
        let startLine = -1;
        for (let line = 0; line < document.lineCount; line++) {
            const text = document.lineAt(line).text.trim();
            if (text.startsWith('///')) {
                if (startLine === -1) {
                    startLine = line;
                }
            } else {
                // Fold only if there are at least two consecutive lines
                if (startLine !== -1 && line - startLine > 1) {
                    foldingRanges.push(
                        new vscode.FoldingRange(startLine, line - 1, vscode.FoldingRangeKind.Comment)
                    );
                }
                startLine = -1;
            }
        }
        // Handle consecutive /// lines at the end of the document
        if (startLine !== -1 && document.lineCount - startLine > 1) {
            foldingRanges.push(
                new vscode.FoldingRange(startLine, document.lineCount - 1, vscode.FoldingRangeKind.Comment)
            );
        }

        return foldingRanges;
    }
}

// Custom command to fold Doxygen comments
async function foldDoxygenComments() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return; // No active editor
    }
    const document = editor.document;
    const provider = new DoxygenFoldingProvider();
    const foldingRanges = provider.provideFoldingRanges(document, {}, {} as any);
    for (const range of foldingRanges) {
        // Fold each Doxygen comment range
        await vscode.commands.executeCommand('editor.fold', { selectionLines: [range.start] });
    }
}

// Extension activation function
export function activate(context: vscode.ExtensionContext) {
    // Register the folding provider for relevant languages
    const languages = ['cpp', 'c', 'javascript', 'typescript']; // Adjust as needed
    languages.forEach(language => {
        context.subscriptions.push(
            vscode.languages.registerFoldingRangeProvider({ language }, new DoxygenFoldingProvider())
        );
    });

    // Register the custom folding command
    context.subscriptions.push(
        vscode.commands.registerCommand('doxygenAutoFold.foldDoxygenComments', foldDoxygenComments)
    );

    // Automatically fold comments when a file is opened
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(async document => {
            const config = vscode.workspace.getConfiguration('doxygenAutoFold');
            if (config.get('enabled', true)) {
                await vscode.commands.executeCommand('doxygenAutoFold.foldDoxygenComments');
            }
        })
    );
}

// Extension deactivation function
export function deactivate() {}