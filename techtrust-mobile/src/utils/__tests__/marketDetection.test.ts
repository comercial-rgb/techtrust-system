import { detectMarket, getMarketConfig } from "../marketDetection";

describe("marketDetection", () => {
  it("detectMarket returns US for English", () => {
    expect(detectMarket("en")).toBe("US");
  });

  it("detectMarket returns BR for Portuguese", () => {
    expect(detectMarket("pt")).toBe("BR");
  });

  it("getMarketConfig maps currency for US vs BR", () => {
    expect(getMarketConfig("en").currency).toBe("USD");
    expect(getMarketConfig("pt").currency).toBe("BRL");
  });
});
