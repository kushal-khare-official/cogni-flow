/* eslint-disable @typescript-eslint/no-explicit-any */
import { BpmnModdle } from "bpmn-moddle";

export async function parseBpmnXml(
  xmlString: string,
): Promise<{ definitions: any; warnings: string[] }> {
  const moddle = new BpmnModdle();
  const { rootElement, warnings = [] } = await moddle.fromXML(xmlString);
  return {
    definitions: rootElement,
    warnings: warnings.map((w: any) =>
      typeof w === "string" ? w : w.message ?? String(w),
    ),
  };
}
