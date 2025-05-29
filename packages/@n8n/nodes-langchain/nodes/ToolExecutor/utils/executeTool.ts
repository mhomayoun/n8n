import type { StructuredTool } from 'langchain/tools';
import { OperationalError, type IDataObject, type INodeExecutionData } from 'n8n-workflow';

import { convertObjectBySchema } from './convertToSchema';

const validateToolSchema = async (tool: StructuredTool, query: object): Promise<void> => {
	const result = tool.schema.safeParse(query);
	if (!result.success) {
		const formatted = result.error.format();
		throw new OperationalError(
			`Tool schema validation failed: ${JSON.stringify(formatted, null, 2)}`,
			{
				description: 'The provided input does not match the tool schema.',
				extra: {
					errors: formatted,
				},
			},
		);
	}
};

export async function executeTool(
	tool: StructuredTool,
	query: string | object,
): Promise<INodeExecutionData> {
	let convertedQuery: string | object = query;
	if ('schema' in tool && tool.schema) {
		convertedQuery = convertObjectBySchema(query, tool.schema) as object;
		await validateToolSchema(tool, convertedQuery);
	}

	const result = await tool.invoke(convertedQuery);

	return {
		json: result as IDataObject,
	};
}
