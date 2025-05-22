/* eslint-disable complexity */
// eslint-disable-next-line import/no-extraneous-dependencies
import { JSONSchemaToZod } from '@dmitryrechkin/json-schema-to-zod';
import { z } from 'zod';

import type { FromAIArgument, INodeProperties, INodePropertyOptions, INodeType } from '.';
import { generateZodSchema } from '.';

class ParseError extends Error {}

const nodeParameterToZodSchema = (
	parameter: INodeProperties,
	placeholder: FromAIArgument,
): z.ZodTypeAny => {
	switch (parameter.type) {
		case 'dateTime':
			return z.string();

		case 'json':
			return jsonNodeParameterToZodSchema(parameter, placeholder);

		case 'number':
			let schema = z.number();
			if (parameter.typeOptions?.minValue !== undefined) {
				schema = schema.min(parameter.typeOptions.minValue);
			}
			if (parameter.typeOptions?.maxValue !== undefined) {
				schema = schema.max(parameter.typeOptions.maxValue);
			}

			return schema;

		case 'fixedCollection':
		case 'collection':
		case 'options':
		case 'multiOptions':
			const enumValues = parameter.options!.map(
				(option) => (option as INodePropertyOptions).value,
			) as [string, ...string[]];

			if (Array.isArray(parameter.default)) {
				let arraySchema = z.array(z.enum(enumValues));
				if (parameter.typeOptions?.multipleValues === false) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					arraySchema = arraySchema.max(1);
				}

				return arraySchema;
			}

			return z.enum(enumValues);

		default:
			return generateZodSchema(placeholder);
	}
};

const jsonNodeParameterToZodSchema = (
	parameter: INodeProperties,
	placeholder: FromAIArgument,
): z.ZodTypeAny => {
	if (parameter.typeOptions?.jsonConfig?.schema) {
		return JSONSchemaToZod.convert(parameter.typeOptions.jsonConfig.schema);
	}

	if (parameter.typeOptions?.jsonConfig?.properties?.length) {
		const properties = parameter.typeOptions.jsonConfig.properties.map((property) => {
			const propertySchema = nodeParameterToZodSchema(property, placeholder);
			return {
				[property.name]: propertySchema,
			};
		});

		return z.object(Object.assign({}, ...properties));
	}

	return generateZodSchema(placeholder);
};

export function generateZodSchemaExtended(
	nodeType: INodeType,
	placeholder: FromAIArgument,
): z.ZodTypeAny {
	const parameter = nodeType.description.properties.find((param) => {
		if (
			param.name === placeholder.key ||
			param.displayName === placeholder.key.replace(/_/g, ' ')
		) {
			return true;
		}

		return false;
	});

	if (!parameter) {
		throw new ParseError(
			`Parameter ${placeholder.key} not found in node type ${nodeType.description.name}`,
		);
	}

	let schema = nodeParameterToZodSchema(parameter, placeholder);

	const getDescription = (): string => {
		if (schema.description?.length) {
			return schema.description;
		}

		if (placeholder.description?.length) {
			return placeholder.description;
		}

		if (parameter.asToolOptions?.description?.length) {
			return parameter.asToolOptions.description;
		}

		if (parameter.description?.length) {
			return parameter.description;
		}

		return '';
	};

	const getInstructions = (): string => {
		if (!parameter.asToolOptions?.instructions?.length) {
			return '';
		}

		return `*NOTE*: ${parameter.asToolOptions.instructions}`;
	};

	const description = [getDescription(), getInstructions()].filter(Boolean).join('. ').trim();
	if (description.length) {
		schema = schema.describe(description);
	}

	if (placeholder.defaultValue !== undefined) {
		schema = schema.default(placeholder.defaultValue);
	}

	if (parameter.required !== true) {
		schema = schema.nullable();
	}

	return schema;
}
