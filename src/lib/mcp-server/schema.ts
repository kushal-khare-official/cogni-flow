export interface RequestBodyField {
  key: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface JsonSchema {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
}

const TYPE_MAP: Record<string, string> = {
  string: "string",
  number: "number",
  integer: "integer",
  boolean: "boolean",
  object: "object",
  array: "array",
};

export function requestBodyToJsonSchema(fields: RequestBodyField[]): JsonSchema {
  const properties: Record<string, { type: string; description?: string }> = {};
  const required: string[] = [];

  for (const field of fields) {
    const jsonType = TYPE_MAP[field.type] ?? "string";
    const prop: { type: string; description?: string } = { type: jsonType };
    if (field.description) {
      prop.description = field.description;
    }
    properties[field.key] = prop;

    if (field.required) {
      required.push(field.key);
    }
  }

  const schema: JsonSchema = { type: "object", properties };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
}
