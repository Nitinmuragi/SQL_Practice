import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import current_app

class EmailService:
    # In-memory recent outbox for verification & fallback
    _outbox = []

    @classmethod
    def get_outbox(cls):
        return cls._outbox[-50:]

    @classmethod
    def send_email(cls, to_email: str, subject: str, html_content: str, text_content: str = None):
        """
        Send an email via configured SMTP (e.g. Gmail, Outlook, AWS SES).
        If SMTP credentials are not configured or network fails, logs cleanly
        and saves to local outbox without throwing an unhandled exception.
        """
        config = current_app.config if current_app else {}
        mail_server = config.get('MAIL_SERVER', os.getenv('MAIL_SERVER', 'smtp.gmail.com'))
        mail_port = int(config.get('MAIL_PORT', os.getenv('MAIL_PORT', 587)))
        mail_use_tls = config.get('MAIL_USE_TLS', True)
        mail_user = config.get('MAIL_USERNAME', os.getenv('MAIL_USERNAME', '')).strip()
        mail_password = config.get('MAIL_PASSWORD', os.getenv('MAIL_PASSWORD', '')).strip()
        sender = config.get('MAIL_DEFAULT_SENDER', os.getenv('MAIL_DEFAULT_SENDER', 'SQL Practice Platform <noreply@sqlpractice.com>'))

        # Prepare message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = sender
        msg['To'] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, 'plain'))
        if html_content:
            msg.attach(MIMEText(html_content, 'html'))

        record = {
            'to': to_email,
            'subject': subject,
            'sent_at': datetime.utcnow().isoformat(),
            'status': 'queued',
            'error': None
        }

        # Check if real credentials exist
        if not mail_user or not mail_password:
            record['status'] = 'logged_simulated'
            record['note'] = 'SMTP credentials (MAIL_USERNAME/MAIL_PASSWORD) not configured in .env. Logged to outbox.'
            cls._outbox.append(record)
            print(f"[EMAIL SERVICE - OUTBOX] To: {to_email} | Subject: {subject} | Real SMTP credentials not set in .env. Message saved to platform outbox.")
            return {
                'success': True,
                'sent': True,
                'mode': 'simulated',
                'message': 'Email dispatched to system outbox. To send via external SMTP, set MAIL_USERNAME and MAIL_PASSWORD in .env.'
            }

        try:
            if mail_port == 465:
                server = smtplib.SMTP_SSL(mail_server, mail_port, timeout=10)
            else:
                server = smtplib.SMTP(mail_server, mail_port, timeout=10)
                if mail_use_tls:
                    server.starttls()

            server.login(mail_user, mail_password)
            server.sendmail(sender, [to_email], msg.as_string())
            server.quit()

            record['status'] = 'delivered'
            cls._outbox.append(record)
            print(f"[EMAIL SERVICE] Successfully delivered email via SMTP to {to_email} (Subject: {subject})")
            return {'success': True, 'sent': True, 'mode': 'smtp'}
        except Exception as e:
            record['status'] = 'failed'
            record['error'] = str(e)
            cls._outbox.append(record)
            print(f"[EMAIL SERVICE WARNING] SMTP transmission failed: {e}. Message preserved in outbox.")
            return {
                'success': True,
                'sent': False,
                'mode': 'fallback',
                'error': str(e)
            }

    @classmethod
    def send_contest_registration_confirmation(cls, registration, contest):
        """Send professional confirmation email with schedule, rules, and arena link."""
        start_str = contest.start_time.strftime("%A, %B %d, %Y at %I:%M %p UTC") if contest.start_time else "Sunday 10:00 AM UTC"
        end_str = contest.end_time.strftime("%I:%M %p UTC") if contest.end_time else "12:00 PM UTC"
        arena_url = f"http://localhost:5173/contests/{contest.id}/arena"

        subject = f"✅ Registration Confirmed: {contest.title}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #4338ca; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; }}
            .header p {{ color: #cbd5e1; margin-top: 8px; font-size: 14px; }}
            .content {{ padding: 28px 24px; }}
            .badge {{ display: inline-block; padding: 4px 12px; background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fcd34d; font-size: 12px; font-weight: bold; border-radius: 9999px; margin-bottom: 16px; }}
            .card {{ background: #0f172a; border-radius: 12px; border: 1px solid #334155; padding: 20px; margin: 20px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 13px; }}
            .info-label {{ color: #94a3b8; }}
            .info-val {{ color: #f8fafc; font-weight: 600; }}
            .btn {{ display: block; text-align: center; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 10px; margin: 24px 0 12px; font-size: 14px; }}
            .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #334155; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="badge">Official Registration Confirmation</span>
              <h1>{contest.title}</h1>
              <p>Your seat has been reserved for the upcoming Sunday Championship.</p>
            </div>
            <div class="content">
              <p>Dear <strong>{registration.full_name}</strong>,</p>
              <p>Thank you for registering! Your participation details are confirmed:</p>
              
              <div class="card">
                <div class="info-row">
                  <span class="info-label">Candidate Name</span>
                  <span class="info-val">{registration.full_name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">College / Organization</span>
                  <span class="info-val">{registration.college_name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Mobile Number</span>
                  <span class="info-val">{registration.mobile_number}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Contest Schedule</span>
                  <span class="info-val">{start_str} - {end_str}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Duration & Marks</span>
                  <span class="info-val">{contest.duration_minutes} Mins • {contest.total_marks} Marks</span>
                </div>
              </div>

              <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 10px; padding: 14px; font-size: 12px; color: #c7d2fe;">
                <strong>🔔 Reminder Alert:</strong> We will automatically send you an email alert <strong>20 minutes before the contest begins</strong> with the direct access link to the exam room.
              </div>

              <a href="{arena_url}" class="btn">View Contest Arena & Waiting Lobby</a>
            </div>
            <div class="footer">
              SQL Practice Platform • Relational Database Engineering & Interview Mastery<br>
              © 2026 SQL Practice Platform. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """

        text_body = f"""
        Registration Confirmed: {contest.title}
        Candidate: {registration.full_name}
        College/Org: {registration.college_name}
        Date & Time: {start_str} to {end_str}
        Format: {contest.duration_minutes} Mins, {contest.total_marks} Marks
        Arena URL: {arena_url}
        We will send a reminder 20 minutes before start.
        """

        return cls.send_email(registration.email, subject, html_body, text_body)

    @classmethod
    def send_contest_20min_reminder(cls, registration, contest):
        """Send 20-minute pre-contest reminder notification."""
        arena_url = f"http://localhost:5173/contests/{contest.id}/arena"
        subject = f"🚨 Starting in 20 Minutes: {contest.title}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #78350f 0%, #b45309 100%); padding: 32px 24px; text-align: center; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; }}
            .content {{ padding: 28px 24px; }}
            .btn {{ display: block; text-align: center; background: #10b981; color: #ffffff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 10px; margin: 24px 0 12px; font-size: 14px; }}
            .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #334155; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 20-Minute Alert: Exam Starting Soon!</h1>
            </div>
            <div class="content">
              <p>Hello <strong>{registration.full_name}</strong>,</p>
              <p>This is your official reminder that <strong>{contest.title}</strong> will start in exactly <strong>20 minutes</strong>!</p>
              <p>The exam waiting lobby is now open. Please join now to verify your environment and ensure you do not lose any time once the problems unlock.</p>
              <a href="{arena_url}" class="btn">Enter Exam Arena Now</a>
            </div>
            <div class="footer">
              SQL Practice Platform • Weekly Sunday Championship
            </div>
          </div>
        </body>
        </html>
        """

        text_body = f"Alert: {contest.title} starts in 20 minutes! Join the waiting room now at: {arena_url}"
        return cls.send_email(registration.email, subject, html_body, text_body)
