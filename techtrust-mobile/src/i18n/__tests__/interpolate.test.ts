import { interpolate } from "../interpolate";

describe("interpolate", () => {
  it("replaces {{key}} placeholders", () => {
    expect(interpolate("Hello {{name}}", { name: "Ada" })).toBe("Hello Ada");
  });

  it("allows spaces inside braces", () => {
    expect(interpolate("{{  x  }}", { x: 1 })).toBe("1");
  });
});
