import type { ZodArray, ZodEnum, ZodNullable, ZodNumber, ZodObject, ZodString } from 'zod';
// import zodToJsonSchema from 'zod-to-json-schema';

import { extractFromAICalls, generateZodSchemaExtended } from '@/from-ai-parse-utils';
import type { INodeProperties, INodeType } from '@/index';

describe('Collection/option type parsing via generateZodSchemaExtended', () => {
	const node: INodeType = {
		description: {
			displayName: 'Test Node',
			name: 'testNode',
			group: ['transform'],
			version: 1,
			description: 'Test node for parsing options',
			defaults: {
				name: 'Test Node',
				color: '#772244',
			},
			inputs: ['main'],
			outputs: ['main'],
			properties: [
				{
					displayName: 'Single Option',
					name: 'singleOption',
					type: 'options',
					options: [
						{
							name: 'Option 1',
							value: 'option1',
						},
						{
							name: 'Option 2',
							value: 'option2',
						},
					],
					default: 'option1',
					description: 'Single option parameter',
					required: true,
				},
				{
					displayName: 'Collection',
					name: 'collection',
					type: 'collection',
					options: [
						{
							name: 'Option 1',
							value: 'option1',
						},
						{
							name: 'Option 2',
							value: 'option2',
						},
					],
					default: 'option1',
					description: 'Collection parameter',
				},
				{
					displayName: 'Multi Options',
					name: 'multiOptions',
					type: 'multiOptions',
					options: [
						{
							name: 'Option 1',
							value: 'option1',
						},
						{
							name: 'Option 2',
							value: 'option2',
						},
					],
					default: ['option1'],
					description: 'Multi options parameter',
					required: true,
				},
			],
		},
	};

	it('should parse a single option parameter with a valid default', () => {
		const [arg] = extractFromAICalls(
			'$fromAI("singleOption", "Single option parameter", "string")',
		);

		const schema = generateZodSchemaExtended<ZodEnum<any>>(node, arg);
		// test schema is enum
		expect(schema._def.typeName).toBe('ZodEnum');
		expect(schema._def.values).toEqual(['option1', 'option2']);
	});

	it('should parse a multiOptions parameter with a valid default', () => {
		const [arg] = extractFromAICalls(
			'$fromAI("multiOptions", "Multi options parameter", "string")',
		);

		const schema = generateZodSchemaExtended<ZodArray<ZodEnum<any>>>(node, arg);
		// test schema is array of enum values
		expect(schema._def.typeName).toBe('ZodArray');
		expect(schema._def.type.Enum).toEqual({ option1: 'option1', option2: 'option2' });
	});

	it('should parse a collection parameter with a valid default', () => {
		const [arg] = extractFromAICalls('$fromAI("collection", "Collection parameter", "string")');

		const schema = generateZodSchemaExtended<ZodNullable<ZodEnum<any>>>(node, arg);
		// test schema is array of enum values
		expect(schema._def.typeName).toBe('ZodNullable');
		expect(schema._def.innerType.Enum).toEqual({ option1: 'option1', option2: 'option2' });
	});
});

describe('JSON Type Parsing via generateZodSchemaExtended from node properties', () => {
	const stringField: INodeProperties = {
		name: 'stringField',
		displayName: 'String Field',
		type: 'string',
		default: '',
		description: 'String field',
		required: true,
	};

	const numberField: INodeProperties = {
		name: 'numberField',
		displayName: 'Number Field',
		type: 'number',
		typeOptions: {
			minValue: 10,
			maxValue: 20,
		},
		default: 10,
		description: 'Number field',
		required: true,
	};

	const optionalDateField: INodeProperties = {
		name: 'optionalDateField',
		displayName: 'Optional Date Field',
		type: 'dateTime',
		default: '',
		description: 'Optional date field',
	};

	const jsonFieldWithParams: INodeProperties = {
		name: 'jsonField',
		displayName: 'JSON Field',
		type: 'json',
		typeOptions: {
			jsonConfig: {
				properties: [numberField, stringField, optionalDateField],
			},
		},
		default: '',
		required: true,
	};

	const node: INodeType = {
		description: {
			displayName: 'Test Node',
			name: 'testNode',
			group: ['transform'],
			version: 1,
			description: 'Test node for parsing JSON types',
			defaults: {
				name: 'Test Node',
				color: '#772244',
			},
			inputs: ['main'],
			outputs: ['main'],
			properties: [numberField, stringField, optionalDateField, jsonFieldWithParams],
		},
	};

	it('should convert JSON field with provided node properties to Zod schema', () => {
		const [arg] = extractFromAICalls('$fromAI("jsonField", "JSON field description", "json")');

		const schema = generateZodSchemaExtended<ZodObject<any>>(node, arg);
		// console.log(JSON.stringify(zodToJsonSchema(schema), null, 2));

		expect(schema._def.typeName).toBe('ZodObject');
		expect(schema.description).toBe('JSON field description');

		const numberFieldSchema = schema._def.shape().numberField as ZodNumber;
		expect(numberFieldSchema._def.typeName).toBe('ZodNumber');
		expect(numberFieldSchema.minValue).toBe(numberField.typeOptions!.minValue);
		expect(numberFieldSchema.maxValue).toBe(numberField.typeOptions!.maxValue);
		expect(numberFieldSchema.description).toBe(numberField.description);

		const stringFieldSchema = schema._def.shape().stringField as ZodString;
		expect(stringFieldSchema._def.typeName).toBe('ZodString');
		expect(stringFieldSchema.description).toBe(stringField.description);

		const optionalDateFieldSchema = schema._def.shape().optionalDateField as ZodNullable<ZodString>;
		expect(optionalDateFieldSchema._def.typeName).toBe('ZodNullable');
		expect(optionalDateFieldSchema._def.innerType._def.typeName).toBe('ZodString');
		expect(optionalDateFieldSchema.description).toBe(optionalDateField.description);
	});
});

describe('JSON Type Parsing via generateZodSchemaExtended from json schema', () => {
	const jsonField: INodeProperties = {
		name: 'jsonField',
		displayName: 'JSON Field',
		type: 'json',
		typeOptions: {
			jsonConfig: {
				schema: {
					type: 'object',
					properties: {
						numberField: {
							type: 'number',
							minimum: 10,
							maximum: 20,
							description: 'Number field description',
						},
						dateField: {
							type: 'string',
							format: 'date-time',
							description: 'Date field description',
						},
					},
					required: ['numberField', 'dateField'],
				},
			},
		},
		default: '',
		required: true,
	};

	const node: INodeType = {
		description: {
			displayName: 'Test Node',
			name: 'testNode',
			group: ['transform'],
			version: 1,
			description: 'Test node for parsing JSON types',
			defaults: {
				name: 'Test Node',
				color: '#772244',
			},
			inputs: ['main'],
			outputs: ['main'],
			properties: [jsonField],
		},
	};

	it('should convert JSON field with provided schema to Zod schema', () => {
		const [arg] = extractFromAICalls('$fromAI("jsonField", "JSON field description", "json")');

		const schema = generateZodSchemaExtended<ZodObject<any>>(node, arg);
		// console.log(JSON.stringify(zodToJsonSchema(schema), null, 2));

		const numberFieldSchema = schema._def.shape().numberField as ZodNumber;
		expect(numberFieldSchema._def.typeName).toBe('ZodNumber');
		expect(numberFieldSchema.minValue).toBe(
			jsonField.typeOptions!.jsonConfig!.schema!.properties!.numberField.minimum,
		);
		expect(numberFieldSchema.maxValue).toBe(
			jsonField.typeOptions!.jsonConfig!.schema!.properties!.numberField.maximum,
		);
		expect(numberFieldSchema.description).toBe(
			jsonField.typeOptions!.jsonConfig!.schema!.properties!.numberField.description,
		);

		const dateFieldSchema = schema._def.shape().dateField as ZodString;
		expect(dateFieldSchema._def.typeName).toBe('ZodString');
		expect(dateFieldSchema._def.checks[0].kind).toBe('datetime');
	});
});
