import { test, expect } from '@playwright/test';

/**
 * Demo video: showcases workflow creation via prompt, editing via Chat panel,
 * opening Agent Onboarding Flow from Published Workflows, running it, and
 * hovering over each executed step.
 *
 * Run:  npx playwright test tests/demo-video.spec.ts
 * Video output lands in test-results/ (playwright.config.ts has video: 'on').
 */
test('CogniFlow Demo - Create, Edit, Open, Run', async ({ page, request }) => {
  test.setTimeout(180_000);

  // ─── Step 1: Create a workflow using the header prompt ───────────────

  await page.goto('http://localhost:3000/workflows/new', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const promptInput = page.locator('input[placeholder*="Describe a workflow"]');
  await expect(promptInput).toBeVisible();

  await promptInput.click();
  await page.waitForTimeout(300);
  await promptInput.fill('Create a simple agent onboarding flow: Start event, then a task called "Verify Identity", then a task called "Setup Account", then End event');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/demo-01-prompt-filled.png' });

  const submitBtn = page.locator('button:has-text("Submit")');
  await submitBtn.click();

  // Poll until nodes appear on canvas (AI generation can be slow)
  let nodeCount = 0;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    nodeCount = await page.locator('.react-flow__node').count();
    if (nodeCount >= 3) break;
  }
  expect(nodeCount).toBeGreaterThanOrEqual(3);

  // Fit the view so all nodes are visible
  await page.evaluate(() => {
    const btn = document.querySelector('.react-flow__controls button[title="fit view"]') as HTMLButtonElement;
    btn?.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/demo-02-workflow-created.png' });

  // ─── Step 2: Edit workflow using the right-panel Chat ────────────────

  // Ensure right panel is open (click toggle if needed)
  const rightPanel = page.locator('aside').filter({ has: page.locator('[data-slot="tabs-trigger"]') });
  if (!(await rightPanel.isVisible())) {
    const toggleBtn = page.locator('button').filter({ has: page.locator('svg.lucide-panel-right') });
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Click the Chat tab
  const chatTab = page.locator('[data-slot="tabs-trigger"]:has-text("Chat")');
  await chatTab.click();
  await page.waitForTimeout(500);

  // Type an edit request in the chat textarea
  const chatTextarea = rightPanel.locator('textarea');
  await expect(chatTextarea).toBeVisible();
  await chatTextarea.click();
  await chatTextarea.fill('Add a new task called "Send Welcome Email" between "Setup Account" and the End event');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/demo-03-chat-edit-typed.png' });

  // Submit the chat message (press Enter)
  await chatTextarea.press('Enter');

  // Wait for the AI response and canvas update
  const nodesBefore = nodeCount;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(2000);
    nodeCount = await page.locator('.react-flow__node').count();
    // Also check if the assistant replied
    const assistantMsgs = await page.locator('.rounded-full.bg-zinc-100').count();
    if (nodeCount > nodesBefore || assistantMsgs > 0) break;
  }

  await page.evaluate(() => {
    const btn = document.querySelector('.react-flow__controls button[title="fit view"]') as HTMLButtonElement;
    btn?.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/demo-04-chat-edit-applied.png' });

  // ─── Step 3: Open Agent Onboarding Flow from Published Workflows ────

  // First, ensure "Agent Onboarding Flow" is published via API
  // (create + publish so it shows on the home page)
  const agentOnboardingData = {
    name: 'Agent Onboarding Flow',
    description: 'Register an agent (KYA passport), create a mandate, test Stripe connection, log onboarding.',
    nodes: [
      { id: 'node-1', type: 'startEventNode', position: { x: 250, y: 50 }, data: { label: 'Start', bpmnType: 'startEvent', requestBody: [{ key: 'name', type: 'string', required: true, description: 'Agent name' }, { key: 'modelProvider', type: 'string', required: true, description: 'Model provider' }, { key: 'modelVersion', type: 'string', required: false, description: 'Model version' }, { key: 'creatorName', type: 'string', required: true, description: 'Creator name' }] } },
      { id: 'node-2', type: 'integrationNode', position: { x: 250, y: 200 }, data: { label: 'Register Agent', bpmnType: 'integration', integrationTemplateId: 'tpl-kya-passport', operationId: 'registerAgent', inputMapping: { name: '{{node-1.name}}', modelProvider: '{{node-1.modelProvider}}', modelVersion: '{{node-1.modelVersion}}', creatorName: '{{node-1.creatorName}}' }, outputMapping: { id: 'body.id', fingerprint: 'body.fingerprint', status: 'body.status' }, stepConfig: { method: 'POST', path: '/', bodyTemplate: { name: '{{name}}', modelProvider: '{{modelProvider}}', modelVersion: '{{modelVersion}}', creatorName: '{{creatorName}}' } } } },
      { id: 'node-3', type: 'integrationNode', position: { x: 250, y: 350 }, data: { label: 'Create Mandate', bpmnType: 'integration', integrationTemplateId: 'tpl-kya-mandate', operationId: 'createMandate', inputMapping: { passportId: '{{node-2.id}}', description: 'Onboarding mandate', maxAmountCents: '5000', maxTotalSpendCents: '50000' }, outputMapping: { id: 'body.id', status: 'body.status' }, stepConfig: { method: 'POST', path: '/{{passportId}}/mandate', bodyTemplate: { description: '{{description}}', maxAmountCents: '{{maxAmountCents}}', maxTotalSpendCents: '{{maxTotalSpendCents}}' } } } },
      { id: 'node-4', type: 'integrationNode', position: { x: 250, y: 500 }, data: { label: 'Test Stripe (List Customers)', bpmnType: 'integration', integrationTemplateId: 'tpl-stripe', operationId: 'listCustomers', inputMapping: { limit: '10' }, outputMapping: { data: 'body.data', has_more: 'body.has_more' }, stepConfig: { method: 'GET', path: '/customers' } } },
      { id: 'node-5', type: 'integrationNode', position: { x: 250, y: 650 }, data: { label: 'Log Onboarding', bpmnType: 'integration', integrationTemplateId: 'tpl-kya-monitor', operationId: 'logAudit', inputMapping: { passportId: '{{node-2.id}}', action: 'onboarding_complete', amountCents: '0', status: 'success' }, outputMapping: { id: 'body.id' }, stepConfig: { method: 'POST', path: '/{{passportId}}/audit', bodyTemplate: { action: '{{action}}', amountCents: '{{amountCents}}', status: '{{status}}' } } } },
      { id: 'node-6', type: 'endEventNode', position: { x: 250, y: 800 }, data: { label: 'End', bpmnType: 'endEvent' } },
    ],
    edges: [
      { id: 'e-node-1-node-2', source: 'node-1', target: 'node-2', type: 'conditional', data: {} },
      { id: 'e-node-2-node-3', source: 'node-2', target: 'node-3', type: 'conditional', data: {} },
      { id: 'e-node-3-node-4', source: 'node-3', target: 'node-4', type: 'conditional', data: {} },
      { id: 'e-node-4-node-5', source: 'node-4', target: 'node-5', type: 'conditional', data: {} },
      { id: 'e-node-5-node-6', source: 'node-5', target: 'node-6', type: 'conditional', data: {} },
    ],
  };

  // Ensure built-in integrations exist (generous timeout for cold DB)
  await request.post('http://localhost:3000/api/integrations/ensure-builtin', {
    data: { integrationIds: ['tpl-kya-passport', 'tpl-kya-mandate', 'tpl-stripe', 'tpl-kya-monitor'] },
    timeout: 30_000,
  });

  // Create the workflow
  const createRes = await request.post('http://localhost:3000/api/workflows', {
    data: agentOnboardingData,
    timeout: 30_000,
  });
  expect(createRes.status()).toBe(201);
  const created = await createRes.json() as { id: string };

  // Publish it as shadow so it appears on the home page
  await request.post(`http://localhost:3000/api/workflows/${created.id}/publish`, {
    data: { mode: 'shadow' },
    timeout: 30_000,
  });

  // Navigate to the home page
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/demo-05-home-page.png' });

  // Click on the Agent Onboarding Flow link (opens in new tab due to target="_blank")
  const workflowLink = page.locator('a').filter({ hasText: 'Agent Onboarding Flow' }).first();
  await expect(workflowLink).toBeVisible({ timeout: 10_000 });

  // Highlight it visually before clicking
  await workflowLink.hover();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/demo-06-hover-workflow-link.png' });

  // Listen for the new tab, then click
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    workflowLink.click(),
  ]);

  // Switch to the new tab for the rest of the demo
  await newPage.waitForLoadState('networkidle');
  await newPage.waitForSelector('.react-flow', { timeout: 15_000 });
  await newPage.waitForTimeout(2000);

  // Use newPage from here on
  const editorPage = newPage;

  // Fit view
  await editorPage.evaluate(() => {
    const btn = document.querySelector('.react-flow__controls button[title="fit view"]') as HTMLButtonElement;
    btn?.click();
  });
  await editorPage.waitForTimeout(800);
  await editorPage.screenshot({ path: 'test-results/demo-07-agent-onboarding-loaded.png' });

  // ─── Step 4: Run the workflow and hover over each step ──────────────

  // Click the Run button in the header to open the dialog
  const runBtn = editorPage.locator('button:has-text("Run")');
  await expect(runBtn).toBeVisible();
  await runBtn.click();
  await editorPage.waitForTimeout(500);

  // The Execute Workflow dialog should be open
  const runDialog = editorPage.locator('[role="dialog"]');
  await expect(runDialog).toBeVisible();

  // Fill in the input JSON with valid data for Agent Onboarding Flow
  const inputTextarea = runDialog.locator('textarea');
  await inputTextarea.fill(JSON.stringify({
    name: 'DemoAgent',
    modelProvider: 'openai',
    modelVersion: 'gpt-4',
    creatorName: 'CogniFlow Demo',
  }, null, 2));
  await editorPage.waitForTimeout(300);
  await editorPage.screenshot({ path: 'test-results/demo-08-run-dialog-filled.png' });

  // Click Execute Workflow
  const executeBtn = runDialog.locator('button:has-text("Execute Workflow")');
  await executeBtn.click();

  // Wait for execution to complete (dialog closes, nodes get status overlays)
  await editorPage.waitForTimeout(3000);

  // Wait for execution to finish (check for completed status or spinner gone)
  for (let i = 0; i < 15; i++) {
    await editorPage.waitForTimeout(2000);
    const runningNodes = await editorPage.locator('.react-flow__node .animate-spin').count();
    if (runningNodes === 0) break;
  }
  await editorPage.waitForTimeout(1000);

  // Fit view again after execution
  await editorPage.evaluate(() => {
    const btn = document.querySelector('.react-flow__controls button[title="fit view"]') as HTMLButtonElement;
    btn?.click();
  });
  await editorPage.waitForTimeout(800);
  await editorPage.screenshot({ path: 'test-results/demo-09-execution-complete.png' });

  // Close the execution panel so it doesn't obscure nodes at the bottom
  const closePanelBtn = editorPage.locator('button[aria-label="Close execution panel"], button:has(svg.lucide-x)').first();
  if (await closePanelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closePanelBtn.click({ force: true });
    await editorPage.waitForTimeout(500);
  }

  // Fit view once more after closing the panel
  await editorPage.evaluate(() => {
    const btn = document.querySelector('.react-flow__controls button[title="fit view"]') as HTMLButtonElement;
    btn?.click();
  });
  await editorPage.waitForTimeout(800);

  // Hover over each node in execution order to show overlays/tooltips
  // The Agent Onboarding Flow nodes in order:
  // Start → Register Agent → Create Mandate → Test Stripe → Log Onboarding → End
  const nodeLabels = [
    'Start',
    'Register Agent',
    'Create Mandate',
    'Test Stripe',
    'Log Onboarding',
    'End',
  ];

  for (let i = 0; i < nodeLabels.length; i++) {
    const label = nodeLabels[i];
    const node = editorPage.locator('.react-flow__node').filter({ hasText: label }).first();
    if (await node.isVisible()) {
      // Scroll node into view before hovering
      await node.scrollIntoViewIfNeeded();
      await editorPage.waitForTimeout(300);
      await node.hover({ force: true });
      await editorPage.waitForTimeout(1200);
      await editorPage.screenshot({ path: `test-results/demo-10-hover-step-${i + 1}-${label.replace(/\s+/g, '-').toLowerCase()}.png` });

      // If the node has an I/O button (completed with data), click it to show tooltip
      const ioButton = node.locator('button:has-text("I/O")').first();
      if (await ioButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await ioButton.click({ force: true });
        await editorPage.waitForTimeout(1500);
        await editorPage.screenshot({ path: `test-results/demo-10-hover-step-${i + 1}-${label.replace(/\s+/g, '-').toLowerCase()}-io.png` });
      }
    }
  }

  await editorPage.screenshot({ path: 'test-results/demo-11-final.png' });
});
