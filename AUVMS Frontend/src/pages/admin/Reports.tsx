import React from "react";
import { Card, CardContent } from "@/components/data-display";
import { CardHeader, CardTitle, CardDescription } from "@/components/data-display/card";
import { Button } from "@/components/input";
import { apiService } from "@/services/apiService";

const Reports: React.FC = () => {
  return (
    <Card className="border">
      <CardHeader>
        <CardTitle>Reports</CardTitle>
        <CardDescription>Generate and download visitor/appointment logs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => window.open(apiService.getAdminVisitorLogsExportUrl({ format: 'csv' }), '_blank')}>Download CSV</Button>
          <Button onClick={() => window.open(apiService.getAdminVisitorLogsExportUrl({ format: 'xlsx' }), '_blank')}>Download Excel</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Reports;


