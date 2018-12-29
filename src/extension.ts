'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const XRegExp = require('xregexp');

import * as lexer from './lexer';

import {performance} from 'perf_hooks';

const annotationDecoration: vscode.TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
	after: {
		margin: '0em 0em 0em 3em',
		textDecoration: 'none'
	},
	rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
} as vscode.DecorationRenderOptions);


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "json-extended" is now active!');

	let jsonExtender = new JSONExtender();
	let controller = new JSONExtenderController(jsonExtender);

	// Add to a list of disposables which are disposed when this extension is deactivated.
	context.subscriptions.push(controller);
	context.subscriptions.push(jsonExtender);
}

class JSONExtender {
	private _statusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

	public updateSizes() {
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			this._statusBarItem.hide();
			return;
		}

		let doc = editor.document;

		if (doc.languageId === 'json') {
			let startTimer = performance.now();

			let sizes = this._getSizes(doc);
			let decorations: Array<vscode.DecorationOptions> = [];
			for (let i = 0; i < sizes.length; i++) {
				const elem = sizes[i];
				let decoration = {
					renderOptions: {
						after: {
							backgroundColor: '#00000000',
							color: '#99999959',
							contentText: `Size: ${elem.size}`,
							textDecoration: 'none; position: absolute;'
						}
					} as vscode.DecorationInstanceRenderOptions,
					range: elem.range
				} as vscode.DecorationOptions;
				decorations.push(decoration);
			}
			editor.setDecorations(annotationDecoration, decorations);

			let endTimer = performance.now();

			this._statusBarItem.text = `${parseFloat((endTimer - startTimer).toFixed(2))} ms`;
			this._statusBarItem.show();
		}
		else {
			this._statusBarItem.hide();
		}
	}

	private _getSizes(doc: vscode.TextDocument): Array<{range: vscode.Range, size: number}> {
		const docContent = doc.getText();
		let returnValue: Array < {range: vscode.Range, size: number} >= [];
		const jsonStrings = XRegExp.matchRecursive(docContent, '\\{', '\\}', 'g', {valueNames: [null, 'left', 'match', 'right']});

		if (jsonStrings.length % 3 !== 0) return returnValue;

		for (let index = 0; index < jsonStrings.length; index += 3) {
			const left = jsonStrings[index], match = jsonStrings[index + 1], right = jsonStrings[index + 2];
			if (left.end !== match.start || match.end !== right.start) continue;
			const jsonString = `\{${match.value}\}`;
			let json = null;
			try {
				json = JSON.parse(jsonString);
			}
			catch (error) {
				continue;
			}
			const tokens = lexer.getTokens(jsonString, left.start);
			const sizes = this._process(json);
			sizes.reverse();
			for (let i = 0, j = 0; i < jsonString.length && j < tokens.length; i++) {
				if (tokens[j].index == i + left.start) {
					if (tokens[j].value == '[') {
						const size = sizes.pop();
						if (size === undefined) continue;
						const lineNumber = doc.positionAt(i + left.start).line;
						returnValue.push({range: new vscode.Range(lineNumber, Number.MAX_SAFE_INTEGER, lineNumber, Number.MAX_SAFE_INTEGER), size});
					}
					j++;
				}
			}
		}
		return returnValue;
	}

	private _process(obj: any, sizes?: Array<number>): Array<number> {
		if (sizes === undefined) {
			sizes = [];
		}
		if (Array.isArray(obj)) {
			sizes.push(obj.length);
			for (let index = 0; index < obj.length; index++) {
				this._process(obj[index], sizes);
			}
		}
		else if (typeof obj === 'object') {
			for (const key in obj) {
				if (obj.hasOwnProperty(key)) {
					this._process(obj[key], sizes);
				}
			}
		}
		return sizes;
	}

	dispose() {
		this._statusBarItem.dispose();
	}
}

class JSONExtenderController {
	private _jsonExtender: JSONExtender;
	private _disposable: vscode.Disposable;

	constructor(jsonExtender: JSONExtender) {
		this._jsonExtender = jsonExtender;

		let subscriptions: vscode.Disposable[] = [];
		vscode.window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
		vscode.window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

		this._jsonExtender.updateSizes();

		this._disposable = vscode.Disposable.from(...subscriptions);
	}

	dispose() {
		this._disposable.dispose();
	}

	private _onEvent() {
		this._jsonExtender.updateSizes();
	}
}
