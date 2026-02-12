"use client";

import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { PageContainer } from "@/components/page-container";
import {
  SectionTitle,
  SectionDescription,
  TextLabel,
  MutedText,
  Text,
} from "@/components/typography";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SettingRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-8 py-4 first:pt-0 last:pb-0 not-last:border-b not-last:border-border-subtle">
      <div className="flex-1 space-y-0.5">
        <TextLabel className="text-text-primary">{title}</TextLabel>
        <MutedText>{description}</MutedText>
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <Topbar
        title="Settings"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />

      <PageContainer className="space-y-8">
        {/* General Settings */}
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle>General</SectionTitle>
            <SectionDescription>
              Application preferences and display settings.
            </SectionDescription>
          </div>
          <SurfaceCard elevation={2}>
            <SettingRow
              title="Language"
              description="Select the application interface language."
            >
              <Select defaultValue="pt-BR">
                <SelectTrigger className="h-8 w-[160px] border-border-subtle bg-surface-elevated text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Timezone"
              description="Select the timezone for date and time display."
            >
              <Select defaultValue="America/Sao_Paulo">
                <SelectTrigger className="h-8 w-[200px] border-border-subtle bg-surface-elevated text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                  <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Date format"
              description="Choose how dates are displayed across the application."
            >
              <Select defaultValue="dd-mm-yyyy">
                <SelectTrigger className="h-8 w-[160px] border-border-subtle bg-surface-elevated text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </SurfaceCard>
        </SurfaceCard>

        {/* Notifications */}
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle>Notifications</SectionTitle>
            <SectionDescription>
              Control how you receive alerts and notifications.
            </SectionDescription>
          </div>
          <SurfaceCard elevation={2}>
            <SettingRow
              title="Email notifications"
              description="Receive notifications via email for important events."
            >
              <Switch defaultChecked />
            </SettingRow>
            <SettingRow
              title="Divergent alerts"
              description="Get notified immediately when a reservation has divergent status."
            >
              <Switch defaultChecked />
            </SettingRow>
            <SettingRow
              title="Daily summary"
              description="Receive a daily digest of all analysis results."
            >
              <Switch />
            </SettingRow>
          </SurfaceCard>
        </SurfaceCard>

        {/* AI Configuration */}
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle>AI Configuration</SectionTitle>
            <SectionDescription>
              Settings for the AI analysis engine.
            </SectionDescription>
          </div>
          <SurfaceCard elevation={2}>
            <SettingRow
              title="AI model"
              description="Select the AI model used for contract analysis."
            >
              <Select defaultValue="gpt-4-turbo">
                <SelectTrigger className="h-8 w-[200px] border-border-subtle bg-surface-elevated text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="claude-3.5">Claude 3.5 Sonnet</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Confidence threshold"
              description="Minimum confidence level for automatic approval."
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  defaultValue="85"
                  className="h-8 w-[60px] border-border-subtle bg-surface-elevated text-right text-[13px] tabular-nums"
                />
                <MutedText>%</MutedText>
              </div>
            </SettingRow>
            <SettingRow
              title="Auto-retry on failure"
              description="Automatically retry analysis when the AI engine encounters an error."
            >
              <Switch defaultChecked />
            </SettingRow>
          </SurfaceCard>
        </SurfaceCard>

        {/* Danger Zone */}
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle className="text-status-error">Danger Zone</SectionTitle>
            <SectionDescription>
              Irreversible actions. Proceed with caution.
            </SectionDescription>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-status-error/20 bg-status-error-bg px-4 py-3">
            <div>
              <TextLabel className="text-status-error">Reset all rules</TextLabel>
              <MutedText>This will reset all validation rules to their default values.</MutedText>
            </div>
            <Button variant="destructive" size="sm" className="h-8 text-[13px]">
              Reset
            </Button>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
