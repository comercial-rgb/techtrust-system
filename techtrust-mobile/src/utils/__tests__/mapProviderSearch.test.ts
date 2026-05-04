import { mapProviderSearchApiRow } from "../mapProviderSearch";

describe("mapProviderSearchApiRow", () => {
  it("maps API row to card shape", () => {
    const row = mapProviderSearchApiRow({
      id: "p1",
      businessName: "ACME",
      city: "Miami",
      state: "FL",
      servicesOffered: ["OIL_CHANGE", "BRAKES"],
      averageRating: 4.5,
      totalReviews: 12,
    });
    expect(row.id).toBe("p1");
    expect(row.name).toBe("ACME");
    expect(row.services).toEqual(["OIL_CHANGE", "BRAKES"]);
    expect(row.rating).toBe(4.5);
    expect(row.reviews).toBe(12);
  });
});
