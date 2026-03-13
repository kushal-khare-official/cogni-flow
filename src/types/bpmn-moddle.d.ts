declare module "bpmn-moddle" {
  export class BpmnModdle {
    constructor(options?: Record<string, unknown>);
    fromXML(
      xml: string,
      options?: Record<string, unknown>,
    ): Promise<{ rootElement: any; warnings: any[] }>;
    toXML(element: any, options?: Record<string, unknown>): Promise<{ xml: string }>;
  }
}
