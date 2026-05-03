import { useMemo } from "react";

type Appointment = {
  id: string;
  visitorName: string;
  staffName: string;
  purpose: string;
  office: string;
  status: "pending" | "approved" | "rejected";
  timestamp: number;
};

type Visitor = {
  id: string;
  name: string;
  office: string;
  status: "inside" | "checked-out";
  checkInTime: string;
};

type OtpEvent = {
  id: string;
  visitorName: string;
  otp: string;
  sentAt: string;
  status: "sent" | "verified" | "failed";
};

type SystemLog = {
  id: string;
  type: "info" | "success" | "warning" | "error";
  action: string;
  details: string;
  user: string;
  timestamp: string;
};

type Stats = {
  totalAppointments: number;
  pendingApprovals: number;
  activeVisitors: number;
  otpsSent: number;
};

export function useRealtimeSimulation() {
  const appointments: Appointment[] = useMemo(
    () => [
      {
        id: "apt-1",
        visitorName: "Rohit Verma",
        staffName: "Dr. Rajesh Kumar",
        purpose: "Project Discussion",
        office: "Block A - A-201",
        status: "pending",
        timestamp: Date.now() - 1000 * 60 * 5,
      },
      {
        id: "apt-2",
        visitorName: "Neha Singh",
        staffName: "Prof. Priya Sharma",
        purpose: "Lab Access",
        office: "Block B - B-305",
        status: "approved",
        timestamp: Date.now() - 1000 * 60 * 25,
      },
    ],
    []
  );

  const activeVisitors: Visitor[] = useMemo(
    () => [
      {
        id: "v-1",
        name: "Aman Gupta",
        office: "Admissions",
        status: "inside",
        checkInTime: "09:40",
      },
      {
        id: "v-2",
        name: "Pooja Patel",
        office: "CSE HOD",
        status: "inside",
        checkInTime: "10:05",
      },
    ],
    []
  );

  const otpEvents: OtpEvent[] = useMemo(
    () => [
      { id: "otp-1", visitorName: "Rohit Verma", otp: "482193", sentAt: "10:15", status: "sent" },
      { id: "otp-2", visitorName: "Neha Singh", otp: "907214", sentAt: "09:55", status: "verified" },
    ],
    []
  );

  const systemLogs: SystemLog[] = useMemo(
    () => [
      { id: "log-1", type: "success", action: "OTP Verified", details: "Visitor verified OTP successfully", user: "Guard-1", timestamp: "10:16" },
      { id: "log-2", type: "info", action: "Appointment Created", details: "New appointment request submitted", user: "Portal", timestamp: "10:10" },
    ],
    []
  );

  const stats: Stats = useMemo(
    () => ({
      totalAppointments: 342,
      pendingApprovals: 7,
      activeVisitors: activeVisitors.filter(v => v.status !== "checked-out").length,
      otpsSent: otpEvents.length + 120, // mock aggregate
    }),
    [activeVisitors, otpEvents]
  );

  return { appointments, activeVisitors, otpEvents, systemLogs, stats };
}


