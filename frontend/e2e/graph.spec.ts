import { test, expect } from "@playwright/test";

const EMAIL = "graphtest@synapse.test";
const PASSWORD = "GraphTest123!";
const WORKSPACE_NAME = `graph-demo-${Date.now()}`;

test("workspace -> 3 notes -> link via [[ -> graph view", async ({ page }) => {
  const savedCalls: Array<{ file_id: string | null; file_name: string; linked: string[] }> = [];
  page.on("request", (req) => {
    if (req.url().endsWith("/files/save") && req.method() === "POST") {
      try {
        const body = JSON.parse(req.postData() || "{}");
        savedCalls.push({
          file_id: body.file_id,
          file_name: body.file_name,
          linked: body.linked_file_names || [],
        });
      } catch {}
    }
  });

  const pendingPromptResponses: string[] = [];
  page.on("dialog", async (dialog) => {
    const msg = dialog.message();
    if (dialog.type() === "prompt") {
      const next = pendingPromptResponses.shift() ?? "";
      console.log(`PROMPT "${msg.slice(0, 40)}..." -> "${next}"`);
      await dialog.accept(next);
    } else {
      console.log(`${dialog.type().toUpperCase()} "${msg.slice(0, 60)}"`);
      await dialog.accept();
    }
  });

  // Login
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(EMAIL);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL("**/home", { timeout: 20_000 });

  // Create workspace
  await page.getByRole("button", { name: /new workspace/i }).click();
  await page.getByPlaceholder(/workspace name/i).fill(WORKSPACE_NAME);
  await page.getByRole("button", { name: /^create$/i }).click();
  await page.waitForTimeout(500);

  // Open workspace
  const card = page.locator("h3", { hasText: WORKSPACE_NAME }).locator("..");
  await card.getByRole("button", { name: /open/i }).click();
  await page.waitForURL(/\/editor\//, { timeout: 20_000 });
  await page.waitForTimeout(500);

  const newNoteBtn = () => page.locator(".newNoteButton");
  const saveBtn = () => page.getByRole("button", { name: /^save$/i });
  // TipTap renders the editable as .ProseMirror inside the .editor wrapper
  const editor = () => page.locator(".ProseMirror");

  const createAndSave = async (name: string, typeInto: () => Promise<void>) => {
    pendingPromptResponses.push(name);
    await newNoteBtn().click();
    await page.waitForTimeout(800);
    await editor().click();
    await page.waitForTimeout(200);
    await typeInto();
    await page.waitForTimeout(200);
    const savePromise = page.waitForResponse(
      (r) => r.url().endsWith("/files/save") && r.request().method() === "POST"
    );
    await saveBtn().click();
    const resp = await savePromise;
    const reqBody = JSON.parse(resp.request().postData() || "{}");
    console.log(`Save ${name} REQ: file_id=${reqBody.file_id} name=${reqBody.file_name} linked=${JSON.stringify(reqBody.linked_file_names)}`);
    await page.waitForTimeout(800);
  };

  await createAndSave("alpha.txt", async () => {
    await editor().pressSequentially("Alpha content.", { delay: 20 });
  });

  await createAndSave("beta.txt", async () => {
    await editor().pressSequentially("Beta content.", { delay: 20 });
  });

  await createAndSave("gamma.txt", async () => {
    await editor().pressSequentially("Gamma content.", { delay: 20 });
  });

  // Hub note that links to all three using the [[ dropdown
  pendingPromptResponses.push("hub.txt");
  await newNoteBtn().click();
  await page.waitForTimeout(800);
  await editor().click();
  await page.keyboard.type("Hub note linking to ", { delay: 20 });

  for (const target of ["alpha.txt", "beta.txt", "gamma.txt"]) {
    await page.keyboard.type("[[", { delay: 30 });
    // Wait for dropdown to appear, then click the matching button
    await page.waitForSelector(".tag-dropdown", { timeout: 5_000 });
    const btn = page.locator(".tag-dropdown button", { hasText: target }).first();
    await btn.click();
    await page.waitForTimeout(150);
    await page.keyboard.type(" ", { delay: 20 });
  }

  // Inspect editor HTML to confirm #note: anchors got inserted
  const hubHTML = await editor().evaluate((el) => el.innerHTML);
  console.log("Hub editor HTML BEFORE save:", hubHTML);
  expect(hubHTML).toContain('href="#note:');

  const hubSavePromise = page.waitForResponse(
    (r) => r.url().endsWith("/files/save") && r.request().method() === "POST"
  );
  await saveBtn().click();
  const hubResp = await hubSavePromise;
  const hubBody = JSON.parse(hubResp.request().postData() || "{}");
  console.log(`Hub save linked_file_names: ${JSON.stringify(hubBody.linked_file_names)}`);
  expect(hubBody.linked_file_names).toEqual(
    expect.arrayContaining(["alpha.txt", "beta.txt", "gamma.txt"])
  );
  await page.waitForTimeout(800);

  // Visit graph
  await page.getByRole("button", { name: /^graph$/i }).click();
  await page.waitForURL(/\/graph\//, { timeout: 10_000 });
  await page.waitForSelector("canvas", { timeout: 10_000 });
  await page.waitForTimeout(3000);

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();

  // Hit the graph endpoint directly to verify edges came through
  const graphData = await page.evaluate(async () => {
    const token = localStorage.getItem("access_token");
    const wsid = window.location.pathname.split("/").pop();
    const res = await fetch(`http://localhost:8000/workspaces/${wsid}/graph`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  });
  console.log("Graph endpoint:", JSON.stringify(graphData, null, 2));
  expect(graphData.nodes.length).toBeGreaterThanOrEqual(4);
  expect(graphData.edges.length).toBeGreaterThanOrEqual(3);

  console.log("Save calls:", JSON.stringify(savedCalls, null, 2));
});
