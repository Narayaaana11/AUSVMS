import { useState, useEffect } from "react";
import { Button } from "@/components/input/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/data-display/card";
import { Input } from "@/components/input/input";
import { Label } from "@/components/input/label";
import { Textarea } from "@/components/input/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/input/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/layout-ui/tabs";
import { Mail, MessageSquare, Send, AlertCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { Badge } from "@/components/data-display/badge";
import { Pagination } from "@/components/common/Pagination";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
}

interface NotificationLog {
  id: string;
  type: "email" | "sms";
  recipient: string;
  status: "sent" | "failed" | "pending";
  timestamp: string;
  errorMessage?: string;
}

export const EmailSMSSettings = () => {
  const { toast } = useToast();

  const [emailConfig, setEmailConfig] = useState({
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    senderEmail: "noreply@university.edu",
    senderName: "Aditya University",
    authEmail: "admin@university.edu",
    authPassword: "",
    tlsEnabled: true,
  });

  const [smsConfig, setSmsConfig] = useState({
    provider: "twilio",
    accountSid: "",
    authToken: "",
    fromNumber: "+1234567890",
    apiKey: "",
  });

  // Logs Pagination
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsPageSize] = useState(10);

  // Load configs
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const email = await apiService.getSystemConfig('email_smtp');
        if (email) setEmailConfig(prev => ({ ...prev, ...email }));

        const sms = await apiService.getSystemConfig('sms_provider');
        if (sms) setSmsConfig(prev => ({ ...prev, ...sms }));
      } catch (e) {
        console.error("Failed to load configs", e);
      }
    };
    loadConfigs();
  }, []);

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([
    {
      id: "1",
      name: "Appointment Confirmation",
      subject: "Your Appointment has been Confirmed - Aditya University",
      body: "Dear {name},\n\nYour appointment has been confirmed for {date} at {time}.\n\nPlease arrive 10 minutes early.\n\nBest regards,\nAditya University",
      enabled: true,
    },
    {
      id: "2",
      name: "OTP Verification",
      subject: "Your OTP - Aditya University Visitor Portal",
      body: "Your One-Time Password (OTP) is: {otp}\n\nThis OTP is valid for 10 minutes.\n\nPlease do not share this with anyone.",
      enabled: true,
    },
    {
      id: "3",
      name: "Appointment Reminder",
      subject: "Reminder: Your Appointment Tomorrow - Aditya University",
      body: "Dear {name},\n\nThis is a reminder of your appointment tomorrow at {time}.\n\nLocation: {location}\n\nPlease confirm your attendance.",
      enabled: true,
    },
  ]);

  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);

  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editingTemplateData, setEditingTemplateData] = useState<Partial<EmailTemplate>>({});

  const fetchLogs = async () => {
    try {
      const res = await apiService.getAuditLogs({
        type: 'NOTIFICATION',
        page: logsPage,
        pageSize: logsPageSize
      });
      const items = res.items || [];
      const total = res.total || items.length;

      const logs: NotificationLog[] = items.map((l: any) => ({
        id: l._id || l.id,
        type: l.resource === 'SMS' ? 'sms' : 'email',
        recipient: l.details?.recipient || 'Unknown',
        status: l.details?.status === 'sent' ? 'sent' : 'failed',
        timestamp: new Date(l.createdAt).toLocaleString(),
        errorMessage: l.details?.error
      }));

      setNotificationLogs(logs);
      setLogsTotalPages(Math.max(1, Math.ceil(total / logsPageSize)));
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [logsPage]);

  // Optional: fetch templates from backend on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await apiService.getNotificationTemplates();
        const templates = Array.isArray(response) ? response : response?.items || [];
        if (templates.length) {
          setEmailTemplates(templates);
        }
      } catch (error: any) {
        console.error("Failed to fetch templates:", error);
      }
    };

    // fetchTemplates();
  }, []);

  const getStatusBadge = (status: NotificationLog["status"]) => {
    const config = {
      sent: { bg: "bg-success/10", text: "text-success", label: "Sent" },
      failed: { bg: "bg-destructive/10", text: "text-destructive", label: "Failed" },
      pending: { bg: "bg-warning/10", text: "text-warning", label: "Pending" },
    };
    const c = config[status];
    return <Badge className={`${c.bg} ${c.text}`}>{c.label}</Badge>;
  };

  const handleSaveEmailConfig = async () => {
    if (!emailConfig.smtpHost || !emailConfig.smtpPort || !emailConfig.senderEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill all required email fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiService.updateSystemConfig('email_smtp', emailConfig);
      toast({
        title: "Email Configuration Saved",
        description: "Your email settings have been updated successfully",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to save email settings",
        variant: "destructive",
      });
    }
  };

  const handleTestEmail = async () => {
    try {
      // TODO: call backend API to send a real test email
      // await apiService.sendTestEmail({ ...emailConfig });

      toast({
        title: "Test Email Triggered",
        description: "If SMTP is configured correctly, you should receive a test email.",
      });

      setNotificationLogs((prev) => [
        {
          id: String(prev.length + 1),
          type: "email",
          recipient: emailConfig.senderEmail,
          status: "sent",
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (error: any) {
      toast({
        title: "Test Email Failed",
        description: "Unable to send test email. Please check your configuration.",
        variant: "destructive",
      });

      setNotificationLogs((prev) => [
        {
          id: String(prev.length + 1),
          type: "email",
          recipient: emailConfig.senderEmail,
          status: "failed",
          timestamp: new Date().toISOString(),
          errorMessage: "Failed to send test email",
        },
        ...prev,
      ]);
    }
  };

  const handleSaveSMSConfig = async () => {
    if (!smsConfig.provider || !smsConfig.fromNumber) {
      toast({
        title: "Validation Error",
        description: "Please fill all required SMS fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiService.updateSystemConfig('sms_provider', smsConfig);
      toast({
        title: "SMS Configuration Saved",
        description: "Your SMS settings have been updated successfully",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to save SMS settings",
        variant: "destructive",
      });
    }
  };

  const handleTestSMS = async () => {
    try {
      // TODO: call backend API to send a real test SMS
      toast({
        title: "Test SMS Triggered",
        description: "If SMS provider is configured correctly, you should receive a test SMS.",
      });

      setNotificationLogs((prev) => [
        {
          id: String(prev.length + 1),
          type: "sms",
          recipient: smsConfig.fromNumber,
          status: "sent",
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (error: any) {
      toast({
        title: "Test SMS Failed",
        description: "Unable to send test SMS. Please check your configuration.",
        variant: "destructive",
      });

      setNotificationLogs((prev) => [
        {
          id: String(prev.length + 1),
          type: "sms",
          recipient: smsConfig.fromNumber,
          status: "failed",
          timestamp: new Date().toISOString(),
          errorMessage: "Failed to send test SMS",
        },
        ...prev,
      ]);
    }
  };

  const handleSaveTemplate = (templateId: string) => {
    setEmailTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, ...editingTemplateData } : t))
    );
    toast({
      title: "Template Updated",
      description: "Email template has been saved successfully",
    });
    setEditingTemplate(null);
    setEditingTemplateData({});
  };

  const handleCopyTemplate = (body: string) => {
    navigator.clipboard.writeText(body);
    toast({
      title: "Copied",
      description: "Template copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Email Configuration */}
        <TabsContent value="email" className="space-y-6">
          <Card className="gradient-card shadow-soft">
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Configure email server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SMTP Host *</Label>
                  <Input
                    value={emailConfig.smtpHost}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>SMTP Port *</Label>
                  <Input
                    type="number"
                    value={emailConfig.smtpPort}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        smtpPort: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sender Email *</Label>
                  <Input
                    type="email"
                    value={emailConfig.senderEmail}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        senderEmail: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <Input
                    value={emailConfig.senderName}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        senderName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Authentication Email</Label>
                  <Input
                    type="email"
                    value={emailConfig.authEmail}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        authEmail: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Authentication Password</Label>
                  <Input
                    type="password"
                    value={emailConfig.authPassword}
                    onChange={(e) =>
                      setEmailConfig({
                        ...emailConfig,
                        authPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleTestEmail}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Email
                </Button>
                <Button className="gradient-primary" onClick={handleSaveEmailConfig}>
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Templates */}
          <Card className="gradient-card shadow-soft">
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Manage email notification templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailTemplates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{template.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Subject: {template.subject}
                      </p>
                    </div>
                    <Badge
                      variant={template.enabled ? "secondary" : "outline"}
                      className={template.enabled ? "bg-success/10 text-success" : ""}
                    >
                      {template.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  {editingTemplate === template.id ? (
                    <div className="space-y-3 bg-muted/20 p-3 rounded">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input
                          value={editingTemplateData.subject ?? template.subject}
                          onChange={(e) =>
                            setEditingTemplateData({
                              ...editingTemplateData,
                              subject: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Body</Label>
                        <Textarea
                          value={editingTemplateData.body ?? template.body}
                          onChange={(e) =>
                            setEditingTemplateData({
                              ...editingTemplateData,
                              body: e.target.value,
                            })
                          }
                          rows={6}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use variables like {"{name}"}, {"{email}"}, {"{date}"}, {"{time}"}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(null);
                            setEditingTemplateData({});
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="gradient-primary"
                          onClick={() => handleSaveTemplate(template.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template.id);
                          setEditingTemplateData(template);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyTemplate(template.body)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Configuration */}
        <TabsContent value="sms" className="space-y-6">
          <Card className="gradient-card shadow-soft">
            <CardHeader>
              <CardTitle>SMS Gateway Configuration</CardTitle>
              <CardDescription>Configure SMS provider for OTP and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>SMS Provider *</Label>
                <Select
                  value={smsConfig.provider}
                  onValueChange={(value) =>
                    setSmsConfig({ ...smsConfig, provider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="msg91">MSG91</SelectItem>
                    <SelectItem value="fast2sms">Fast2SMS</SelectItem>
                    <SelectItem value="amazon-sns">Amazon SNS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {smsConfig.provider === "twilio" && (
                <>
                  <div className="space-y-2">
                    <Label>Account SID *</Label>
                    <Input
                      value={smsConfig.accountSid}
                      onChange={(e) =>
                        setSmsConfig({
                          ...smsConfig,
                          accountSid: e.target.value,
                        })
                      }
                      placeholder="Your Twilio Account SID"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Auth Token *</Label>
                    <Input
                      type="password"
                      value={smsConfig.authToken}
                      onChange={(e) =>
                        setSmsConfig({
                          ...smsConfig,
                          authToken: e.target.value,
                        })
                      }
                      placeholder="Your Twilio Auth Token"
                    />
                  </div>
                </>
              )}

              {(smsConfig.provider === "msg91" || smsConfig.provider === "fast2sms") && (
                <div className="space-y-2">
                  <Label>API Key *</Label>
                  <Input
                    type="password"
                    value={smsConfig.apiKey}
                    onChange={(e) =>
                      setSmsConfig({
                        ...smsConfig,
                        apiKey: e.target.value,
                      })
                    }
                    placeholder="Your API Key"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>From Number/Sender ID *</Label>
                <Input
                  value={smsConfig.fromNumber}
                  onChange={(e) =>
                    setSmsConfig({
                      ...smsConfig,
                      fromNumber: e.target.value,
                    })
                  }
                  placeholder="e.g., +1234567890 or SENDER_ID"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleTestSMS}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test SMS
                </Button>
                <Button className="gradient-primary" onClick={handleSaveSMSConfig}>
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Logs */}
        <TabsContent value="logs" className="space-y-6">
          <Card className="gradient-card shadow-soft">
            <CardHeader>
              <CardTitle>Notification Logs</CardTitle>
              <CardDescription>View and troubleshoot notification delivery</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notificationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {log.type === "email" ? (
                          <Mail className="h-5 w-5 text-primary" />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-success" />
                        )}
                        <div>
                          <p className="font-medium capitalize">{log.type}</p>
                          <p className="text-sm text-muted-foreground">
                            To: {log.recipient}
                          </p>
                          {log.errorMessage && (
                            <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {log.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-2">
                        {log.timestamp}
                      </p>
                      {getStatusBadge(log.status)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <Pagination
                  currentPage={logsPage}
                  totalPages={logsTotalPages}
                  onPageChange={setLogsPage}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
