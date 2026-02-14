import { respData, respErr } from "@/lib/resp";
import { sendEmail, sendBulkEmails } from "@/services/email";

/**
 * 邮件发送API接口 - MVP版本
 * POST /api/emails/send
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, template, subject, variables, bulk } = body;

    // 验证必需参数
    if (!to || !template || !subject) {
      return respErr("Missing required parameters: to, template, subject");
    }

    let result;

    if (bulk && Array.isArray(to)) {
      // 批量发送
      result = await sendBulkEmails({
        emails: to,
        template,
        subject,
        variables
      });
    } else {
      // 单个发送
      const success = await sendEmail({
        to: Array.isArray(to) ? to[0] : to,
        template,
        subject,
        variables
      });

      result = {
        success: success,
        message: success ? "Email sent successfully" : "Failed to send email"
      };
    }

    return respData(result);
  } catch (error) {
    console.error("Email send API error:", error);
    return respErr("Failed to send email");
  }
}
