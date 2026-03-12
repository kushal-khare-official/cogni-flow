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
  Radio,
  Database,
  CreditCard,
  Cloud,
  Building,
  Shield,
  Activity,
  Bot,
  Repeat,
  Hourglass,
  Split,
  Mail,
  Eye,
  HardDrive,
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

  [BpmnNodeType.KafkaConnector]: Radio,
  [BpmnNodeType.PostgresConnector]: Database,
  [BpmnNodeType.StripeConnector]: CreditCard,
  [BpmnNodeType.SalesforceConnector]: Cloud,
  [BpmnNodeType.SAPConnector]: Building,
  [BpmnNodeType.KeycloakConnector]: Shield,
  [BpmnNodeType.PrometheusConnector]: Activity,
  [BpmnNodeType.RPAConnector]: Bot,

  [BpmnNodeType.Loop]: Repeat,
  [BpmnNodeType.Wait]: Hourglass,
  [BpmnNodeType.SplitPath]: Split,

  [BpmnNodeType.SendEmail]: Mail,
  [BpmnNodeType.HumanReview]: Eye,
  [BpmnNodeType.UpdateDB]: HardDrive,
};

export function getNodeIcon(type: BpmnNodeType): LucideIcon {
  return NODE_ICONS[type] ?? Circle;
}
