// Send invitation Email with valid data + attached ICS file
// From the repository root:
//
// node bin/cli.js invitation send --from you@linagora.com --password "supersecret" --smtp smtp.linagora.com --to someone@mail.com --method REPLY --file ./thefile.ics

const ora = require('ora');
const fs = require('fs-extra');
const nodemailer = require('nodemailer');
const { commons } = require('../../lib');

module.exports = {
  command: 'send',
  desc: 'Send email to a recipient with attached ICS file',
  builder: {
    from: {
      alias: 'f',
      describe: 'Email Sender',
      default: 'admin@open-paas.org',
      demand: true
    },
    password: {
      alias: 'p',
      describe: 'Sender Password',
      demand: true
    },
    smtp: {
      alias: 's',
      describe: 'STMP URL'
    },
    to: {
      alias: 't',
      describe: 'Email recipient',
      default: 'admin@open-paas.org',
      demand: true
    },
    file: {
      describe: 'The ICS file to send',
      demand: true
    },
    method: {
      describe: 'The ICS method',
      demand: true,
      default: 'REPLY'
    }
  },
  handler: argv => {
    const {from, password, smtp, to, file, method} = argv;
    let ics;

    try {
      ics = fs.readFileSync(file, 'utf8');
    } catch (err) {
      commons.logError(`Error while reading file ${file}`, err);
      commons.exit(-1);
    }

    const transporter = nodemailer.createTransport({
      host: smtp,
      port: 465,
      secure: true,
      auth: {
        user: from,
        pass: password
      }
    });
    const mailOptions = {
        encoding: 'base64',
        from: `<${from}>`,
        to: to,
        subject: `OpenPaaS ${method} to Event Invitation`,
        text: `This is a ${method} to an event 🐼`,
        alternatives: [{
          content: ics,
          contentType: `text/calendar; charset=UTF-8; method=${method}`
        }],
        attachments: [{
          filename: 'meeting.ics',
          content: ics,
          contentType: 'application/ics'
        }]
    };
    const spinner = ora(`Sending email to ${to}`).start();

    transporter.sendMail(mailOptions, (err, result) => {
      let status = 0;

      if (err) {
        spinner.fail(`Failed to send email ${err.message}`);
        status = -1;
      } else {
        spinner.succeed(`Mail has been sent ${result.response}`);
      }

      commons.exit(status);
    });
  }
};
