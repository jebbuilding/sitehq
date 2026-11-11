// Sending email in production: Amazon SES (v2 API), from the address the bootstrap stack verified.
//   send({ to, subject, text, html })
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

export function createSesMailer({ from, fromName = "SiteHQ", client = new SESv2Client({}) }) {
  if (!from) throw new Error("createSesMailer: from is required");
  const source = `${fromName.replace(/["\r\n]/g, "")} <${from}>`;
  return {
    async send({ to, subject, text, html }) {
      await client.send(new SendEmailCommand({
        FromEmailAddress: source,
        Destination: { ToAddresses: [to] },
        Content: { Simple: { Subject: { Data: subject, Charset: "UTF-8" }, Body: { Text: { Data: text, Charset: "UTF-8" }, Html: { Data: html, Charset: "UTF-8" } } } },
      }));
    },
  };
}
