import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useVaultStore } from "../../src/stores/vault";

function resetVaultStorage() {
  if (typeof localStorage?.removeItem !== "function") {
    return;
  }

  localStorage.removeItem("travel_os_vault_docs_guest");
  localStorage.removeItem("travel_os_vault_docs_tester");
}

describe("vault store", () => {
  beforeEach(() => {
    resetVaultStorage();
    setActivePinia(createPinia());
  });

  it("adds and removes document metadata", () => {
    const store = useVaultStore();
    store.initForUser("tester");

    const file = new File(["abc"], "passport.pdf", { type: "application/pdf" });
    const document = store.addDocument(file, { tag: "identity" });

    expect(document).toBeTruthy();
    expect(store.documents.length).toBe(1);
    expect(store.documents[0].tag).toBe("identity");
    expect(store.totalSizeBytes).toBeGreaterThan(0);

    store.removeDocument(store.documents[0].id);
    expect(store.documents.length).toBe(0);
  });

  it("toggles emergency pack flag", () => {
    const store = useVaultStore();
    store.initForUser("tester");

    const file = new File(["abc"], "insurance.png", { type: "image/png" });
    store.addDocument(file, { tag: "medical" });

    const firstId = store.documents[0].id;
    store.toggleEmergencyPack(firstId);

    expect(store.documents[0].emergencyPack).toBe(true);
    expect(store.emergencyPackCount).toBe(1);
  });
});
