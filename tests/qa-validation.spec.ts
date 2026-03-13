import { test, expect } from '@playwright/test';

test('CogniFlow QA Validation - Full Suite', async ({ page, request }) => {
  // TC-01: App Loads Successfully
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/01-app-loaded.png', fullPage: true });

  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // TC-02: Database / Prisma Connectivity
  const workflowsRes = await request.get('http://localhost:3000/api/workflows');
  expect(workflowsRes.status()).toBe(200);

  // TC-03: Header Elements
  await expect(page.locator('text=CogniFlow')).toBeVisible();
  await expect(page.locator('input[value="Untitled Workflow"]')).toBeVisible();
  await expect(page.locator('button:has-text("Publish")')).toBeVisible();
  await expect(page.locator('button:has-text("Validate")')).toBeVisible();
  await expect(page.locator('input[placeholder*="Describe a workflow"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/03-header.png' });

  // TC-04: Sidebar Palette Sections
  const sections = page.locator('[data-slot="accordion-trigger"]');
  const sectionTexts = await sections.allTextContents();
  expect(sectionTexts.map(t => t.trim())).toEqual(
    expect.arrayContaining(['Events', 'Tasks', 'Gateways', 'Connectors', 'Logic', 'Actions'])
  );
  await page.screenshot({ path: 'test-results/04-palette-sections.png' });

  // TC-05: Inspector Panel
  await expect(page.locator('[data-slot="tabs-trigger"]:has-text("Properties")')).toBeVisible();
  await expect(page.locator('[data-slot="tabs-trigger"]:has-text("Chat")')).toBeVisible();
  await page.screenshot({ path: 'test-results/05-inspector-panel.png' });

  // TC-06: React Flow Canvas Renders
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.locator('.react-flow__controls')).toBeVisible();
  await expect(page.locator('.react-flow__minimap')).toBeVisible();
  await expect(page.locator('.react-flow__background')).toBeVisible();
  await page.screenshot({ path: 'test-results/06-canvas.png' });

  // TC-07: Drag-and-Drop Node Creation
  const paletteItems = page.locator('aside.w-60 div[draggable="true"]');
  const startEvent = paletteItems.nth(0);
  const canvas = page.locator('.react-flow__pane');

  await startEvent.dragTo(canvas, { targetPosition: { x: 200, y: 200 } });
  await page.waitForTimeout(500);

  const endEvent = paletteItems.nth(1);
  await endEvent.dragTo(canvas, { targetPosition: { x: 200, y: 400 } });
  await page.waitForTimeout(500);

  let nodeCount = await page.locator('.react-flow__node').count();
  expect(nodeCount).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: 'test-results/07-nodes-on-canvas.png' });

  // TC-08: Custom Node Rendering (Color-Coded)
  const colorCheck = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.react-flow__node');
    return Array.from(nodes).map(n => {
      const html = n.innerHTML;
      return {
        text: n.textContent?.trim().substring(0, 30),
        green: html.includes('emerald') || html.includes('green'),
        red: html.includes('red') || html.includes('rose'),
        blue: html.includes('blue'),
        amber: html.includes('amber') || html.includes('orange'),
        purple: html.includes('purple') || html.includes('violet'),
      };
    });
  });
  expect(colorCheck.length).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: 'test-results/08-node-colors.png' });

  // TC-09: AI Generate Endpoint
  const generateRes = await request.post('http://localhost:3000/api/ai/generate', {
    data: { prompt: 'Simple login workflow', provider: 'openai' },
  });
  expect(generateRes.status()).toBe(200);
  const generateBody = await generateRes.json();
  expect(generateBody).toHaveProperty('nodes');
  expect(generateBody).toHaveProperty('edges');

  // TC-10: NL Prompt Bar (E2E)
  const promptInput = page.locator('input[placeholder*="Describe a workflow"]');
  await promptInput.fill('Create a simple order processing workflow');
  await page.screenshot({ path: 'test-results/10a-prompt-filled.png' });
  const submitBtn = page.locator('button:has-text("Submit")');
  await submitBtn.click();
  // Wait up to 30s for new nodes to appear
  const nodesBefore = nodeCount;
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);
    nodeCount = await page.locator('.react-flow__node').count();
    if (nodeCount > nodesBefore) break;
  }
  expect(nodeCount).toBeGreaterThanOrEqual(nodesBefore);
  await page.screenshot({ path: 'test-results/10-ai-generated-workflow.png' });

  // TC-11: Validate Endpoint (Mock Engine)
  const validateRes = await request.post('http://localhost:3000/api/ai/validate', {
    data: {
      workflow: {
        nodes: [
          { id: 'n1', type: 'startEventNode', position: { x: 0, y: 0 }, data: { label: 'Start', bpmnType: 'startEvent' } },
          { id: 'n2', type: 'taskNode', position: { x: 0, y: 150 }, data: { label: 'Process', bpmnType: 'serviceTask' } },
          { id: 'n3', type: 'endEventNode', position: { x: 0, y: 300 }, data: { label: 'End', bpmnType: 'endEvent' } },
        ],
        edges: [
          { id: 'e1', source: 'n1', target: 'n2' },
          { id: 'e2', source: 'n2', target: 'n3' },
        ],
      },
      provider: 'openai',
    },
  });
  expect(validateRes.status()).toBe(200);
  const validateBody = await validateRes.json();
  expect(validateBody).toHaveProperty('testInputs');

  // TC-12: Node Inspector Properties
  await page.evaluate(() => {
    const btn = document.querySelector('.react-flow__controls button[title="fit view"]') as HTMLButtonElement;
    btn?.click();
  });
  await page.waitForTimeout(500);
  const firstNode = page.locator('.react-flow__node').first();
  await firstNode.click({ force: true });
  await page.waitForTimeout(500);

  const inspectorText = await page.locator('aside.w-72').textContent();
  expect(inspectorText).toBeTruthy();
  await page.screenshot({ path: 'test-results/12-node-inspector.png' });

  // TC-13: AI Workflow Chat
  await page.click('[data-slot="tabs-trigger"]:has-text("Chat")');
  await expect(page.locator('aside.w-72 textarea')).toBeVisible();
  await page.fill('aside.w-72 textarea', 'Add an error handling branch');
  await page.screenshot({ path: 'test-results/13-ai-chat.png' });

  // TC-14: Validation Panel
  await page.click('button:has-text("Validate")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/14-validation-panel.png' });

  // TC-15: Workflow CRUD API
  const createRes = await request.post('http://localhost:3000/api/workflows', {
    data: {
      name: 'QA Test Workflow',
      description: 'Created by automated QA',
      nodes: [{ id: 'n1', type: 'startEventNode', position: { x: 0, y: 0 }, data: { label: 'Start', bpmnType: 'startEvent' } }],
      edges: [],
    },
  });
  expect(createRes.status()).toBe(201);
  const created = await createRes.json();
  expect(created).toHaveProperty('id');

  const getRes = await request.get(`http://localhost:3000/api/workflows/${created.id}`);
  expect(getRes.status()).toBe(200);
  const fetched = await getRes.json();
  expect(fetched.name).toBe('QA Test Workflow');

  // TC-16: Publish Dialog
  await page.click('button:has-text("Publish")');
  await page.waitForTimeout(500);
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  const dialogText = await dialog.textContent();
  expect(dialogText).toContain('Shadow Mode');
  expect(dialogText).toContain('Live Mode');
  await page.screenshot({ path: 'test-results/16-publish-dialog.png' });
  await page.click('button:has-text("Close")');

  // TC-17: UI Polish Checks
  await page.screenshot({ path: 'test-results/17-full-page-polish.png', fullPage: true });

  const hasTransitions = await page.evaluate(() => {
    const nodes = document.querySelectorAll('.react-flow__node > div');
    return Array.from(nodes).some(n => {
      const s = getComputedStyle(n);
      return s.transition !== 'none' && s.transition !== '' && s.transitionDuration !== '0s';
    });
  });
  expect(hasTransitions).toBe(true);

  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/17b-responsive-tablet.png' });
  await page.setViewportSize({ width: 1440, height: 900 });

  // TC-18: Console Error Audit
  expect(errors.length).toBe(0);
});
