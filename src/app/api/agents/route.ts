import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateAgentFingerprint,
  generateAgentApiKey,
  createDigitalPassport,
} from "@/lib/kya/agent-passport";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        fingerprint: true,
        apiKeyPrefix: true,
        modelProvider: true,
        modelId: true,
        creatorName: true,
        creatorEmail: true,
        creatorVerified: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });
    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list agents", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      modelProvider,
      modelId,
      modelVersion,
      creatorName,
      creatorEmail,
      creatorOrgId,
    } = body;

    if (!name || !modelProvider || !modelId || !creatorName || !creatorEmail) {
      return NextResponse.json(
        { error: "Missing required fields: name, modelProvider, modelId, creatorName, creatorEmail" },
        { status: 400 }
      );
    }

    const fingerprint = generateAgentFingerprint({ name, modelProvider, modelId, creatorEmail });
    const { apiKey, apiKeyHash, apiKeyPrefix } = generateAgentApiKey();

    const agent = await prisma.agent.create({
      data: {
        name,
        description: description ?? "",
        modelProvider,
        modelId,
        modelVersion: modelVersion ?? "",
        creatorName,
        creatorEmail,
        creatorOrgId: creatorOrgId ?? "",
        fingerprint,
        apiKeyHash,
        apiKeyPrefix,
        status: "pending_verification",
        creatorVerified: false,
      },
    });

    // Auto-verify for PoC
    const passport = createDigitalPassport(agent);

    const onboarded = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: "active",
        creatorVerified: true,
        passportData: JSON.stringify(passport),
      },
    });

    return NextResponse.json({ ...onboarded, apiKey }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to onboard agent", detail: String(error) },
      { status: 500 }
    );
  }
}
