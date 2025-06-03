import type { StructuredTool } from 'langchain/tools';
import { OperationalError, type IDataObject, type INodeExecutionData } from 'n8n-workflow';
import { z } from 'zod/v4';

import { convertObjectBySchema } from './convertToSchema';

const validateToolSchema = async (tool: StructuredTool, query: object): Promise<void> => {
	const result = tool.schema.safeParse(query);
	if (!result.success) {
		const pretty = z.prettifyError(result.error);
		const flatten = result.error.issues;
		console.log(
			'Tool schema validation failed:',
			JSON.stringify(result.error.issues, null, 2),
			query,
		);
		throw new OperationalError(`Tool schema validation failed: ${pretty}`, {
			description: 'The provided input does not match the tool schema.',
			extra: {
				errors: flatten,
			},
		});
	}
};

export async function executeTool(
	tool: StructuredTool,
	query: string | object,
): Promise<INodeExecutionData> {
	let convertedQuery: string | object = query;
	if ('schema' in tool && tool.schema) {
		convertedQuery = convertObjectBySchema(query, tool.schema) as string | object;
		if (typeof convertedQuery === 'object') {
			await validateToolSchema(tool, convertedQuery);
		}
	}

	const result = await tool.invoke(convertedQuery);

	return {
		json: result as IDataObject,
	};
}
