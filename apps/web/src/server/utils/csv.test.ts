import { describe, expect, it } from "bun:test";
import { serialize } from "./csv";

describe("serialize", () => {
  it("plain rows with no special characters", () => {
    const result = serialize(["a", "b"], [["foo", "bar"], ["baz", "qux"]]);
    expect(result).toBe("a,b\r\nfoo,bar\r\nbaz,qux");
  });

  it("value with a comma is double-quoted", () => {
    const result = serialize(["name"], [["hello, world"]]);
    expect(result).toBe('name\r\n"hello, world"');
  });

  it("value with a double quote doubles the quote", () => {
    const result = serialize(["name"], [['say "hi"']]);
    expect(result).toBe('name\r\n"say ""hi"""');
  });

  it("value with a newline is wrapped in quotes", () => {
    const result = serialize(["text"], [["line1\nline2"]]);
    expect(result).toBe('text\r\n"line1\nline2"');
  });

  it("null and undefined become empty cells", () => {
    const result = serialize(["a", "b", "c"], [[null, undefined, "x"]]);
    expect(result).toBe("a,b,c\r\n,,x");
  });

  it("numbers are serialized without quotes", () => {
    const result = serialize(["n"], [[42], [0], [3.14]]);
    expect(result).toBe("n\r\n42\r\n0\r\n3.14");
  });

  it("empty rows produce only the header line", () => {
    const result = serialize(["x"], []);
    expect(result).toBe("x");
  });
});
