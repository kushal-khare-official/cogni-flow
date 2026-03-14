import {
  Play,
  Square,
  Circle,
  Clock,
  AlertTriangle,
  Settings,
  User,
  Code,
  Send,
  Inbox,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Webhook,
  Repeat,
  Hourglass,
  Split,
  Mail,
  Eye,
  HardDrive,
  ShieldCheck,
  FileCheck,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { BpmnNodeType } from "@/lib/workflow/types";

export const NODE_ICONS: Record<BpmnNodeType, LucideIcon> = {
  [BpmnNodeType.StartEvent]: Play,
  [BpmnNodeType.EndEvent]: Square,
  [BpmnNodeType.IntermediateEvent]: Circle,
  [BpmnNodeType.TimerEvent]: Clock,
  [BpmnNodeType.ErrorEvent]: AlertTriangle,

  [BpmnNodeType.ServiceTask]: Settings,
  [BpmnNodeType.UserTask]: User,
  [BpmnNodeType.ScriptTask]: Code,
  [BpmnNodeType.SendTask]: Send,
  [BpmnNodeType.ReceiveTask]: Inbox,

  [BpmnNodeType.ExclusiveGateway]: GitBranch,
  [BpmnNodeType.ParallelGateway]: GitMerge,
  [BpmnNodeType.InclusiveGateway]: GitPullRequest,

  [BpmnNodeType.WebhookTrigger]: Webhook,

  [BpmnNodeType.Loop]: Repeat,
  [BpmnNodeType.Wait]: Hourglass,
  [BpmnNodeType.SplitPath]: Split,

  [BpmnNodeType.SendEmail]: Mail,
  [BpmnNodeType.HumanReview]: Eye,
  [BpmnNodeType.UpdateDB]: HardDrive,

  [BpmnNodeType.AgentGate]: ShieldCheck,
  [BpmnNodeType.MandateCheck]: FileCheck,
  [BpmnNodeType.BehaviorAudit]: Activity,
};

export function getNodeIcon(type: BpmnNodeType): LucideIcon {
  return NODE_ICONS[type] ?? Circle;
}
