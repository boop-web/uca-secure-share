import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { User } from "@prisma/client";
import * as moment from "moment";
import * as nodemailer from "nodemailer";
import { ConfigService } from "src/config/config.service";

@Injectable()
export class EmailService {
  constructor(private config: ConfigService) {}
  private readonly logger = new Logger(EmailService.name);

  getTransporter() {
    if (!this.config.get("smtp.enabled"))
      throw new InternalServerErrorException("SMTP is disabled");

    const username = this.config.get("smtp.username");
    const password = this.config.get("smtp.password");

    return nodemailer.createTransport({
      host: this.config.get("smtp.host"),
      port: this.config.get("smtp.port"),
      secure: this.config.get("smtp.port") == 465,
      auth:
        username || password ? { user: username, pass: password } : undefined,
      tls: {
        rejectUnauthorized: !this.config.get(
          "smtp.allowUnauthorizedCertificates",
        ),
      },
    });
  }

  private async sendMail(email: string, subject: string, text: string) {
    await this.getTransporter()
      .sendMail({
        from: `"${this.config.get("general.appName")}" <${this.config.get(
          "smtp.email",
        )}>`,
        to: email,
        subject,
        text,
      })
      .catch((e) => {
        this.logger.error(e);
        throw new InternalServerErrorException("Failed to send email");
      });
  }

  async sendMailToShareRecipients(
    recipientEmail: string,
    shareId: string,
    creator?: User,
    description?: string,
    expiration?: Date,
  ) {
    if (!this.config.get("email.enableShareEmailRecipients"))
      throw new InternalServerErrorException("Email service disabled");

    const shareUrl = `${this.config.get("general.appUrl")}/s/${shareId}`;

    await this.sendMail(
      recipientEmail,
      this.config.get("email.shareRecipientsSubject"),
      this.config
        .get("email.shareRecipientsMessage")
        .replaceAll("\\n", "\n")
        .replaceAll("{creator}", creator?.username ?? "Someone")
        .replaceAll("{creatorEmail}", creator?.email ?? "")
        .replaceAll("{shareUrl}", shareUrl)
        .replaceAll("{desc}", description ?? "No description")
        .replaceAll(
          "{expires}",
          moment(expiration).unix() != 0
            ? moment(expiration).fromNow()
            : "in: never",
        ),
    );
  }

  async sendMailToReverseShareCreator(recipientEmail: string, shareId: string) {
    const shareUrl = `${this.config.get("general.appUrl")}/s/${shareId}`;

    await this.sendMail(
      recipientEmail,
      this.config.get("email.reverseShareSubject"),
      this.config
        .get("email.reverseShareMessage")
        .replaceAll("\\n", "\n")
        .replaceAll("{shareUrl}", shareUrl),
    );
  }

  async sendResetPasswordEmail(recipientEmail: string, token: string) {
    const resetPasswordUrl = `${this.config.get(
      "general.appUrl",
    )}/auth/resetPassword/${token}`;

    await this.sendMail(
      recipientEmail,
      this.config.get("email.resetPasswordSubject"),
      this.config
        .get("email.resetPasswordMessage")
        .replaceAll("\\n", "\n")
        .replaceAll("{url}", resetPasswordUrl),
    );
  }

  async sendInviteEmail(recipientEmail: string, password: string) {
    const loginUrl = `${this.config.get("general.appUrl")}/auth/signIn`;

    await this.sendMail(
      recipientEmail,
      this.config.get("email.inviteSubject"),
      this.config
        .get("email.inviteMessage")
        .replaceAll("{url}", loginUrl)
        .replaceAll("{password}", password)
        .replaceAll("{email}", recipientEmail),
    );
  }

  /** a plain text email from Share's own sender (messages from ucagg.de/admin) */
  async sendPlain(recipientEmail: string, subject: string, text: string) {
    await this.sendMail(recipientEmail, subject, text);
  }

  /** a real SMTP connect + login, no mail sent (ucagg.de's daily check); never says the password */
  async verifySmtp(): Promise<{ ok: boolean; detail: string }> {
    if (!this.config.get("smtp.enabled")) return { ok: false, detail: "SMTP is switched off" };
    if (!this.config.get("smtp.host") || !this.config.get("smtp.email")) return { ok: false, detail: "SMTP host or sender missing" };
    const t = this.getTransporter();
    try {
      await Promise.race([t.verify(), new Promise((_, rej) => setTimeout(() => rej(new Error("no answer in 15 s")), 15_000))]);
      return { ok: true, detail: `login ok at ${this.config.get("smtp.host")}:${this.config.get("smtp.port")}` };
    } catch (e) {
      return { ok: false, detail: String((e as Error).message || e).replace(/pass(word)?[^,;]*/gi, "").slice(0, 160) };
    } finally {
      t.close();
    }
  }

  async sendTestMail(recipientEmail: string) {
    await this.getTransporter()
      .sendMail({
        from: `"${this.config.get("general.appName")}" <${this.config.get(
          "smtp.email",
        )}>`,
        to: recipientEmail,
        subject: "Test email",
        text: "This is a test email",
      })
      .catch((e) => {
        this.logger.error(e);
        throw new InternalServerErrorException(e.message);
      });
  }
}
