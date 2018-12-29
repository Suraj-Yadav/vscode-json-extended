const tokenTypes = [
	{regex: /^\s+/, tokenType: 'WHITESPACE'},
	{regex: /^[{}]/, tokenType: 'BRACE'},
	{regex: /^[\[\]]/, tokenType: 'BRACKET'},
	{regex: /^:/, tokenType: 'COLON'},
	{regex: /^,/, tokenType: 'COMMA'},
	{regex: /^-?\d+(?:\.\d+)?(?:e[+\-]?\d+)?/i, tokenType: 'NUMBER_LITERAL'},
	{regex: /^"(?:\\.|[^"\\])*"(?=\s*:)/, tokenType: 'STRING_KEY'},
	{regex: /^"(?:\\.|[^"\\])*"/, tokenType: 'STRING_LITERAL'},
	{regex: /^true|false/, tokenType: 'BOOLEAN_LITERAL'},
	{regex: /^null/, tokenType: 'NULL_LITERAL'}
];

export function getTokens(json: string, startIndex: number) {
	let input = typeof json === 'string' ? json : JSON.stringify(json);

	let tokens = [];
	let foundToken;

	let match;
	let i;
	let numTokenTypes = tokenTypes.length;

	do {
		foundToken = false;
		for (i = 0; i < numTokenTypes; i++) {
			match = tokenTypes[i].regex.exec(input);
			if (match) {
				tokens.push({type: tokenTypes[i].tokenType, value: match[0], index: startIndex});
				input = input.substring(match[0].length);
				startIndex += match[0].length;
				foundToken = true;
				break;
			}
		}
	} while (input.length > 0 && foundToken);

	return tokens;
}
