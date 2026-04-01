import { describe, it, expect } from "vitest";
import { skeletonFromMessage, schemaFromMessage } from "../renderer/proto";
import type { GrpcMessage } from "../renderer/global";

const MESSAGES: GrpcMessage[] = [
  {
    name: "SearchRequest",
    fields: [
      { name: "query",    number: 1, type: "TYPE_STRING",  typeName: "",       repeated: false },
      { name: "page",     number: 2, type: "TYPE_INT32",   typeName: "",       repeated: false },
      { name: "enabled",  number: 3, type: "TYPE_BOOL",    typeName: "",       repeated: false },
      { name: "tags",     number: 4, type: "TYPE_STRING",  typeName: "",       repeated: true  },
      { name: "filter",   number: 5, type: "TYPE_MESSAGE", typeName: "Filter", repeated: false },
      { name: "statuses", number: 6, type: "TYPE_ENUM",    typeName: "Status", repeated: false },
    ],
  },
  {
    name: "Filter",
    fields: [
      { name: "min_score", number: 1, type: "TYPE_FLOAT", typeName: "", repeated: false },
    ],
  },
  {
    name: "Recursive",
    fields: [
      { name: "child", number: 1, type: "TYPE_MESSAGE", typeName: "Recursive", repeated: false },
    ],
  },
];

describe("skeletonFromMessage", () => {
  it("produces zero values for primitive fields", () => {
    const result = skeletonFromMessage("SearchRequest", MESSAGES);
    expect(result.query).toBe("");
    expect(result.page).toBe(0);
    expect(result.enabled).toBe(false);
  });

  it("produces empty array for repeated fields", () => {
    const result = skeletonFromMessage("SearchRequest", MESSAGES);
    expect(result.tags).toEqual([]);
  });

  it("recurses into nested messages", () => {
    const result = skeletonFromMessage("SearchRequest", MESSAGES);
    expect(result.filter).toEqual({ min_score: 0 });
  });

  it("returns empty object for unknown type", () => {
    expect(skeletonFromMessage("Unknown", MESSAGES)).toEqual({});
  });

  it("does not infinite-loop on recursive messages", () => {
    const result = skeletonFromMessage("Recursive", MESSAGES);
    expect(result.child).toEqual({});
  });
});

describe("schemaFromMessage", () => {
  it("returns type:object with properties", () => {
    const schema = schemaFromMessage("SearchRequest", MESSAGES) as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(schema.properties).toBeDefined();
  });

  it("maps string fields to {type:'string'}", () => {
    const { properties } = schemaFromMessage("SearchRequest", MESSAGES) as { properties: Record<string, unknown> };
    expect(properties.query).toEqual({ type: "string" });
  });

  it("maps bool fields to {type:'boolean'}", () => {
    const { properties } = schemaFromMessage("SearchRequest", MESSAGES) as { properties: Record<string, unknown> };
    expect(properties.enabled).toEqual({ type: "boolean" });
  });

  it("maps repeated fields to array schema", () => {
    const { properties } = schemaFromMessage("SearchRequest", MESSAGES) as { properties: Record<string, unknown> };
    expect(properties.tags).toEqual({ type: "array", items: { type: "string" } });
  });

  it("maps nested message fields recursively", () => {
    const { properties } = schemaFromMessage("SearchRequest", MESSAGES) as { properties: Record<string, unknown> };
    expect((properties.filter as Record<string, unknown>).type).toBe("object");
  });

  it("maps enum fields to {type:'number', description}", () => {
    const { properties } = schemaFromMessage("SearchRequest", MESSAGES) as { properties: Record<string, unknown> };
    expect(properties.statuses).toMatchObject({ type: "number", description: expect.stringContaining("Status") });
  });

  it("returns {type:'object'} for unknown type", () => {
    expect(schemaFromMessage("Unknown", MESSAGES)).toEqual({ type: "object" });
  });

  it("does not infinite-loop on recursive messages", () => {
    const schema = schemaFromMessage("Recursive", MESSAGES) as { properties: { child: unknown } };
    expect(schema.properties.child).toEqual({ type: "object" });
  });
});
