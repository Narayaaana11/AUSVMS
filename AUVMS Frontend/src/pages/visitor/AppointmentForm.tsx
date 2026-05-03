import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/data-display";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/overlay";
import { Calendar } from "@/components/input";
import { CalendarIcon, CheckCircle, Loader2, Search, X } from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/apiService";
import { useNavigate } from "react-router-dom";

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

const schema = z
  .object({
    visitorName: z.string().min(1, "Full name is required"),
    visitorEmail: z.string().email("Valid email required"),
    visitorPhone: z
      .string()
      .regex(/^[0-9]{10}$/, "Valid 10-digit phone is required"),
    purpose: z.string().min(1, "Purpose is required"),
    personToMeet: z.string().min(1, "Person to meet is required"),
    attendeesCount: z.number().min(0).max(5),
    attendees: z
      .array(
        z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
        }),
      )
      .optional(),
    preferredDate: z.date({ required_error: "Preferred date is required" }),
    preferredTime: z.string().min(1, "Preferred time is required"),
  })
  .refine(
    (data) => {
      if (!data.attendees || data.attendees.length === 0) return true;
      const validAttendees = data.attendees.filter((a) => a.name && a.phone);
      const phones = validAttendees.map((a) => a.phone);
      return new Set(phones).size === phones.length;
    },
    {
      message: "Duplicate phone numbers found among attendees",
      path: ["attendees"],
    },
  );

type FormValues = z.infer<typeof schema>;

type StaffMember = {
  id: string;
  name: string;
  department?: string;
  designation?: string;
  email: string;
  role: string;
};

const AdmissionLabel = "Admission Office";

export default function AppointmentForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [submitted, setSubmitted] = useState<{
    id: string;
    status: string;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      visitorName: "",
      visitorEmail: "",
      visitorPhone: "",
      purpose: "",
      personToMeet: "",
      attendeesCount: 0,
      attendees: [],
      preferredDate: undefined,
      preferredTime: "",
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "attendees",
  });

  const attendeesCount = watch("attendeesCount");

  useEffect(() => {
    // Adjust attendees array to match count
    const currentCount = fields.length;
    if (attendeesCount > currentCount) {
      for (let i = currentCount; i < attendeesCount; i++)
        append({ name: "", phone: "" });
    } else if (attendeesCount < currentCount) {
      const newList = Array.from(
        { length: attendeesCount },
        (_, i) => fields[i] ?? { name: "", phone: "" },
      );
      replace(newList as any);
    }
  }, [attendeesCount]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingStaff(true);
        const list = await apiService.getStaffMembers();
        setStaff(list);
      } catch (e) {
        setStaff([]);
        toast({
          title: "Error",
          description: "Failed to load staff list",
          variant: "destructive",
        });
      } finally {
        setLoadingStaff(false);
      }
    })();
  }, []);

  const filteredStaff = useMemo(() => {
    const base: StaffMember[] = [
      {
        id: "admission",
        name: AdmissionLabel,
        email: "admissions@aditya.edu",
        role: "staff",
        department: "Admissions",
      },
      ...staff,
    ];
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.department || "").toLowerCase().includes(q) ||
        (s.designation || "").toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }, [searchQuery, staff]);

  const onSubmit = async (values: FormValues) => {
    try {
      // Validate required fields
      if (!values.preferredDate) {
        toast({
          title: "Validation Error",
          description: "Preferred date is required",
          variant: "destructive",
        });
        return;
      }
      if (!values.preferredTime) {
        toast({
          title: "Validation Error",
          description: "Preferred time is required",
          variant: "destructive",
        });
        return;
      }

      // Find the selected staff member to get their ID
      const selectedStaff =
        values.personToMeet === "admission"
          ? null
          : staff.find((s) => s.name === values.personToMeet);

      const personToMeet =
        values.personToMeet === "admission"
          ? AdmissionLabel
          : selectedStaff?.name || values.personToMeet;

      // Filter out empty attendees
      const validAttendees = (values.attendees || [])
        .filter((a) => a.name?.trim() || a.phone?.trim())
        .map((a) => ({
          name: a.name || "",
          phone: a.phone || "",
        }));

      const payload = {
        visitorName: values.visitorName,
        visitorEmail: values.visitorEmail,
        visitorPhone: values.visitorPhone,
        purpose: values.purpose,
        personToMeet,
        staffId: selectedStaff?.id, // Send staff ID for proper identification
        attendees: validAttendees as any,
        additionalAttendees: values.attendeesCount, // Send numeric count
        preferredDate: values.preferredDate.toISOString(),
        preferredTime: values.preferredTime,
      };

      const res = await apiService.submitVisitorAppointment(payload);
      if (!res?.success) throw new Error("Submission failed");
      setSubmitted({ id: res.id!, status: res.status || "pending" });
      toast({
        title: "Appointment submitted",
        description:
          "A confirmation email has been sent to you. You will receive another email once your appointment is approved.",
      });
    } catch (e: any) {
      toast({
        title: "Submission failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Card className="w-full max-w-sm sm:max-w-md lg:max-w-lg gradient-card shadow-large">
          <CardHeader className="text-center pb-4 sm:pb-6">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-success mx-auto mb-3 sm:mb-4" />
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl">
              Request Submitted
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-1 sm:mt-2">
              Your appointment has been submitted successfully
              {submitted.status === "approved" ? " and approved" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
            <Button
              onClick={() => navigate("/")}
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      id="main-content"
      className="min-h-screen bg-background py-4 sm:py-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="container mx-auto max-w-3xl space-y-6">
        {/* Header with Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/auslogo.png"
              alt="Aditya University"
              className="h-10 sm:h-12 w-auto rounded-lg shadow-sm"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Aditya University
              </h1>
              <p className="text-sm text-muted-foreground">
                Visitor Management System
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="text-xs sm:text-sm whitespace-nowrap"
          >
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        <Card className="gradient-card shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-muted/30 pb-6 sm:pb-8 border-b">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center">
              Book Appointment
            </CardTitle>
            <CardDescription className="text-center text-base sm:text-lg mt-2">
              Schedule a visit with our staff members
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-8">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6 sm:space-y-8"
            >
              {/* Visitor Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    1
                  </span>
                  Your Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visitorName">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="visitorName"
                      {...register("visitorName")}
                      placeholder="Enter your full name"
                      className="h-11"
                    />
                    {errors.visitorName && (
                      <p className="text-red-500 text-xs">
                        {errors.visitorName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visitorPhone">
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="visitorPhone"
                      maxLength={10}
                      {...register("visitorPhone")}
                      placeholder="10-digit mobile number"
                      className="h-11"
                    />
                    {errors.visitorPhone && (
                      <p className="text-red-500 text-xs">
                        {errors.visitorPhone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visitorEmail">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="visitorEmail"
                    type="email"
                    {...register("visitorEmail")}
                    placeholder="Enter your email"
                    className="h-11"
                  />
                  {errors.visitorEmail && (
                    <p className="text-red-500 text-xs">
                      {errors.visitorEmail.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Appointment Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    2
                  </span>
                  Appointment Details
                </h3>

                <div className="space-y-2">
                  <Label>
                    Person to Meet <span className="text-red-500">*</span>
                  </Label>
                  <Select onValueChange={(v) => setValue("personToMeet", v)}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue
                        placeholder={
                          loadingStaff ? "Loading staff..." : "Select person"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-80 w-[90vw] sm:w-[var(--radix-select-trigger-width)]">
                      <div className="flex items-center px-3 py-2 border-b sticky top-0 bg-background z-10">
                        <Search className="h-4 w-4 text-muted-foreground mr-2" />
                        <Input
                          placeholder="Search staff..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="border-0 focus-visible:ring-0 h-8 text-sm"
                        />
                      </div>
                      {filteredStaff.map((s) => (
                        <SelectItem key={s.id} value={s.name} className="py-3">
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {s.department || s.role}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {filteredStaff.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No staff found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.personToMeet && (
                    <p className="text-red-500 text-xs">
                      {errors.personToMeet.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Preferred Date <span className="text-red-500">*</span>
                    </Label>
                    <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal h-11",
                            !selectedDate && "text-muted-foreground",
                          )}
                        >
                          {selectedDate ? (
                            format(selectedDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setIsSelectOpen(false);
                            setValue("preferredDate", date);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today || date.getDay() === 0;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.preferredDate && (
                      <p className="text-red-500 text-xs">
                        {errors.preferredDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Preferred Time <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={selectedTime}
                      onValueChange={(v) => {
                        setSelectedTime(v);
                        setValue("preferredTime", v);
                      }}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {timeSlots.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.preferredTime && (
                      <p className="text-red-500 text-xs">
                        {errors.preferredTime.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">
                    Purpose of Visit <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="purpose"
                    {...register("purpose")}
                    placeholder="Briefly describe the purpose of your visit..."
                    className="min-h-[100px] text-base"
                  />
                  {errors.purpose && (
                    <p className="text-red-500 text-xs">
                      {errors.purpose.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Attendees Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    3
                  </span>
                  Additional Attendees{" "}
                  <span className="text-sm font-normal text-muted-foreground ml-auto">
                    (Optional)
                  </span>
                </h3>

                <div className="space-y-2">
                  <Label>How many people are accompanying you?</Label>
                  <Select
                    value={String(attendeesCount)}
                    onValueChange={(v) => setValue("attendeesCount", Number(v))}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Just me (0)</SelectItem>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} person{n > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {fields.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-muted/30 p-4 rounded-xl space-y-3 border"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">
                            Attendee #{index + 1}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            {...register(`attendees.${index}.name` as const)}
                            placeholder="Name"
                            className="h-10 bg-background"
                          />
                          <Input
                            maxLength={10}
                            {...register(`attendees.${index}.phone` as const)}
                            placeholder="Mobile Number"
                            className="h-10 bg-background"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full text-lg h-12 font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                    Submitting...
                  </>
                ) : (
                  "Submit Appointment Request"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
