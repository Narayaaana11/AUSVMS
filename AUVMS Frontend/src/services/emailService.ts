// Email service using EmailJS (free tier)
// You'll need to sign up at https://www.emailjs.com/ and get your service ID, template ID, and user ID

interface EmailData {
  to_email: string;
  to_name: string;
  message: string;
  subject?: string;
  otp?: string;
}

class EmailService {
  private serviceId = 'your_service_id'; // Replace with your EmailJS service ID
  private templateId = 'your_template_id'; // Replace with your EmailJS template ID
  private userId = 'your_user_id'; // Replace with your EmailJS user ID

  // Initialize EmailJS
  private initEmailJS() {
    // This should be called once when the app loads
    if (typeof window !== 'undefined' && (window as any).emailjs) {
      (window as any).emailjs.init(this.userId);
    }
  }

  // Generate 6-digit OTP
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP email
  async sendOTPEmail(email: string, name: string, otp: string): Promise<boolean> {
    try {
      this.initEmailJS();
      
      if (typeof window !== 'undefined' && (window as any).emailjs) {
        const templateParams = {
          to_email: email,
          to_name: name,
          message: `Your appointment OTP is: ${otp}. Please use this OTP when visiting the university.`,
          subject: 'Appointment OTP - Aditya University',
          otp: otp
        };

        await (window as any).emailjs.send(
          this.serviceId,
          this.templateId,
          templateParams
        );

        return true;
      } else {
        // Fallback for development - just log the OTP
        console.log(`OTP for ${email}: ${otp}`);
        return true;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Send approval email
  async sendApprovalEmail(email: string, name: string, appointmentDetails: any): Promise<boolean> {
    try {
      this.initEmailJS();
      
      if (typeof window !== 'undefined' && (window as any).emailjs) {
        const templateParams = {
          to_email: email,
          to_name: name,
          message: `Your appointment request has been approved. Please visit on ${appointmentDetails.date} at ${appointmentDetails.time}. Your OTP: ${appointmentDetails.otp}`,
          subject: 'Appointment Approved - Aditya University'
        };

        await (window as any).emailjs.send(
          this.serviceId,
          this.templateId,
          templateParams
        );

        return true;
      } else {
        console.log(`Approval email for ${email}: Appointment approved for ${appointmentDetails.date} at ${appointmentDetails.time}`);
        return true;
      }
    } catch (error) {
      console.error('Error sending approval email:', error);
      return false;
    }
  }

  // Send denial email
  async sendDenialEmail(email: string, name: string, reason?: string): Promise<boolean> {
    try {
      this.initEmailJS();
      
      if (typeof window !== 'undefined' && (window as any).emailjs) {
        const templateParams = {
          to_email: email,
          to_name: name,
          message: `Your appointment request has been declined. ${reason ? `Reason: ${reason}` : ''}`,
          subject: 'Appointment Declined - Aditya University'
        };

        await (window as any).emailjs.send(
          this.serviceId,
          this.templateId,
          templateParams
        );

        return true;
      } else {
        console.log(`Denial email for ${email}: Appointment declined`);
        return true;
      }
    } catch (error) {
      console.error('Error sending denial email:', error);
      return false;
    }
  }

  // Send staff appointment approval email
  async sendStaffApprovalEmail(email: string, name: string, appointmentDetails: any): Promise<boolean> {
    try {
      this.initEmailJS();
      
      if (typeof window !== 'undefined' && (window as any).emailjs) {
        const templateParams = {
          to_email: email,
          to_name: name,
          message: `Your appointment request with ${appointmentDetails.personToMeet} has been approved. Confirmed date: ${appointmentDetails.confirmedDate} at ${appointmentDetails.confirmedTime}`,
          subject: 'Staff Appointment Approved - Aditya University'
        };

        await (window as any).emailjs.send(
          this.serviceId,
          this.templateId,
          templateParams
        );

        return true;
      } else {
        console.log(`Staff approval email for ${email}: Appointment with ${appointmentDetails.personToMeet} approved`);
        return true;
      }
    } catch (error) {
      console.error('Error sending staff approval email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
