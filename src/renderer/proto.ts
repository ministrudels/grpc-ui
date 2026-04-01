/**
 * Renderer-side interpretation of proto types.
 *
 * Two consumers, same underlying type system:
 *   - skeletonFromMessage  — produces a zero-value JSON object for the request editor
 *   - schemaFromMessage    — produces a JSON Schema for Monaco autocomplete/validation
 *
 * The shared primitive is protoToJsonType: the mapping from a proto TYPE_* wire
 * type to its JSON representation.
 */

import type { GrpcField, GrpcMessage } from "./global";

type JsonPrimitive = "string" | "number" | "boolean" | "object";

function protoToJsonType(type: string): JsonPrimitive {
  switch (type) {
    case "TYPE_STRING":
    case "TYPE_BYTES":   return "string";
    case "TYPE_BOOL":    return "boolean";
    case "TYPE_MESSAGE": return "object";
    default:             return "number"; // all numeric + enum types
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function fieldDefault(field: GrpcField, messages: GrpcMessage[], visited: Set<string>): unknown {
  if (field.repeated) return [];
  switch (protoToJsonType(field.type)) {
    case "string":  return "";
    case "boolean": return false;
    case "number":  return 0;
    case "object":  return skeletonFromMessage(field.typeName, messages, visited);
  }
}

export function skeletonFromMessage(
  typeName: string,
  messages: GrpcMessage[],
  visited = new Set<string>()
): Record<string, unknown> {
  if (visited.has(typeName)) return {};
  visited.add(typeName);
  const msg = messages.find((m) => m.name === typeName);
  if (!msg) return {};
  const result: Record<string, unknown> = {};
  for (const field of msg.fields) {
    result[field.name] = fieldDefault(field, messages, visited);
  }
  return result;
}

// ── JSON Schema ───────────────────────────────────────────────────────────────

function fieldSchema(field: GrpcField, messages: GrpcMessage[], visited: Set<string>): object {
  const base = typeSchema(field.type, field.typeName, messages, visited);
  return field.repeated ? { type: "array", items: base } : base;
}

function typeSchema(type: string, typeName: string, messages: GrpcMessage[], visited: Set<string>): object {
  const jsonType = protoToJsonType(type);
  if (jsonType !== "object") {
    return type === "TYPE_ENUM"
      ? { type: "number", description: `enum: ${typeName}` }
      : { type: jsonType };
  }
  return schemaFromMessage(typeName, messages, visited);
}

export function schemaFromMessage(
  typeName: string,
  messages: GrpcMessage[],
  visited = new Set<string>()
): object {
  if (visited.has(typeName)) return { type: "object" };
  const msg = messages.find((m) => m.name === typeName);
  if (!msg) return { type: "object" };

  const next = new Set(visited);
  next.add(typeName);

  const properties: Record<string, object> = {};
  for (const field of msg.fields) {
    properties[field.name] = fieldSchema(field, messages, next);
  }

  return { type: "object", properties };
}
